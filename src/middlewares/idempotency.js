const crypto = require("crypto");
const fs = require("fs");
const pool = require("../config/dbConnection");

/**
 * Normalizes an object or array to produce a deterministic JSON representation
 * regardless of key ordering.
 */
function canonicalize(data) {
  if (data === null || typeof data !== "object") {
    return data;
  }
  if (Array.isArray(data)) {
    return data.map(canonicalize);
  }
  const sorted = {};
  const keys = Object.keys(data).sort();
  for (const key of keys) {
    sorted[key] = canonicalize(data[key]);
  }
  return sorted;
}

/**
 * Computes a deterministic SHA-256 fingerprint for the incoming request.
 */
function computeRequestHash(req) {
  const payload = {
    method: req.method,
    url: req.baseUrl ? req.baseUrl + req.path : req.path,
    body: canonicalize(req.body || {}),
  };

  if (req.file) {
    payload.file = {
      fieldname: req.file.fieldname,
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
    };
  }

  return crypto
    .createHash("sha256")
    .update(JSON.stringify(payload))
    .digest("hex");
}

/**
 * Safely unlinks a file from disk if present.
 */
function cleanupUploadedFile(req) {
  if (req.file && req.file.path) {
    fs.unlink(req.file.path, (err) => {
      if (err && err.code !== "ENOENT") {
        console.error("[Idempotency] Failed to unlink uploaded file:", err.message);
      }
    });
  }
}

/**
 * Middleware factory for HTTP Idempotency.
 * Complies with standard IETF Idempotency-Key specification patterns.
 *
 * @param {Object} options
 * @param {number} [options.ttlSeconds=86400] - Time-to-live for cached responses in seconds (default: 24h)
 * @param {number} [options.lockTimeoutSeconds=60] - Maximum duration in-flight status can hold before considered stale
 */
function idempotency(options = {}) {
  const ttlSeconds = options.ttlSeconds || 86400; // 24 hours
  const lockTimeoutSeconds = options.lockTimeoutSeconds || 60; // 1 minute

  return async (req, res, next) => {
    // 1. Check for Idempotency-Key header
    const rawKey = req.headers["idempotency-key"] || req.headers["x-idempotency-key"];

    // If no key is provided, bypass idempotency tracking cleanly (100% backward compatible)
    if (!rawKey) {
      return next();
    }

    // 2. Validate key format
    if (typeof rawKey !== "string" || !rawKey.trim() || rawKey.trim().length > 255) {
      cleanupUploadedFile(req);
      return res.status(400).json({
        success: false,
        statusCode: 400,
        title: "Invalid Idempotency Key",
        message: "The Idempotency-Key header must be a non-empty string up to 255 characters.",
      });
    }

    const idempotencyKey = rawKey.trim();
    const userId = req.user ? `${req.user.role}:${req.user.id}` : (req.ip || "anonymous");
    const route = req.baseUrl ? req.baseUrl + req.path : (req.originalUrl || req.path);
    const requestHash = computeRequestHash(req);

    const promisePool = pool.promise();

    // 3. Atomically attempt to acquire the idempotency key lock in MySQL
    try {
      await promisePool.query(
        `INSERT INTO idempotency_keys
           (idempotency_key, user_id, route, request_hash, status, created_at, expires_at)
         VALUES
           (?, ?, ?, ?, 'processing', NOW(), DATE_ADD(NOW(), INTERVAL ? SECOND))`,
        [idempotencyKey, userId, route, requestHash, ttlSeconds]
      );

      // Successfully acquired lock! Hook response to record the result when finished.
      hookResponseCapture(res, idempotencyKey);
      return next();
    } catch (insertErr) {
      if (insertErr.code !== "ER_DUP_ENTRY") {
        console.error("[Idempotency] Unexpected database error on key insertion:", insertErr);
        return next(insertErr);
      }

      // Key already exists in database. Fetch current state.
      try {
        const [rows] = await promisePool.query(
          `SELECT * FROM idempotency_keys WHERE idempotency_key = ?`,
          [idempotencyKey]
        );

        if (!rows || rows.length === 0) {
          return next(insertErr);
        }

        const existing = rows[0];

        // A. Check for expired key -> Reclaim lock
        const isExpired = existing.expires_at && new Date(existing.expires_at).getTime() < Date.now();
        if (isExpired) {
          await promisePool.query(
            `UPDATE idempotency_keys
             SET user_id = ?, route = ?, request_hash = ?, status = 'processing',
                 response_status = NULL, response_headers = NULL, response_body = NULL,
                 created_at = NOW(), expires_at = DATE_ADD(NOW(), INTERVAL ? SECOND)
             WHERE idempotency_key = ?`,
            [userId, route, requestHash, ttlSeconds, idempotencyKey]
          );
          hookResponseCapture(res, idempotencyKey);
          return next();
        }

        // B. Check user scoping -> Disallow cross-user key hijacking
        if (existing.user_id && existing.user_id !== userId) {
          cleanupUploadedFile(req);
          return res.status(403).json({
            success: false,
            statusCode: 403,
            title: "Forbidden",
            message: "This idempotency key belongs to another user session.",
          });
        }

        // C. Check payload fingerprint -> Detect key reuse with different parameters
        if (existing.request_hash !== requestHash) {
          cleanupUploadedFile(req);
          return res.status(422).json({
            success: false,
            statusCode: 422,
            title: "Idempotency Conflict",
            message: "Idempotency key was previously used with a different request payload.",
          });
        }

        // D. Check in-progress status
        if (existing.status === "processing") {
          // Check for stale crashed process lock
          const createdAtTime = new Date(existing.created_at).getTime();
          const isStaleLock = Date.now() - createdAtTime > lockTimeoutSeconds * 1000;

          if (isStaleLock) {
            // Lock was abandoned or crashed; allow this request to take over
            await promisePool.query(
              `UPDATE idempotency_keys
               SET status = 'processing', response_status = NULL, response_headers = NULL, response_body = NULL,
                   created_at = NOW(), expires_at = DATE_ADD(NOW(), INTERVAL ? SECOND)
               WHERE idempotency_key = ?`,
              [ttlSeconds, idempotencyKey]
            );
            hookResponseCapture(res, idempotencyKey);
            return next();
          }

          cleanupUploadedFile(req);
          return res.status(409).json({
            success: false,
            statusCode: 409,
            title: "Request In Progress",
            message: "A request with this idempotency key is currently being processed. Please retry shortly.",
          });
        }

        // E. Check completed status -> Return cached response
        if (existing.status === "completed") {
          cleanupUploadedFile(req);

          res.setHeader("Idempotent-Replayed", "true");
          const statusCode = existing.response_status || 200;
          res.status(statusCode);

          try {
            const parsedBody = JSON.parse(existing.response_body);
            return res.json(parsedBody);
          } catch (_) {
            return res.send(existing.response_body);
          }
        }

        // F. Check failed status -> Allow retry
        if (existing.status === "failed") {
          await promisePool.query(
            `UPDATE idempotency_keys
             SET status = 'processing', response_status = NULL, response_headers = NULL, response_body = NULL,
                 created_at = NOW(), expires_at = DATE_ADD(NOW(), INTERVAL ? SECOND)
             WHERE idempotency_key = ?`,
            [ttlSeconds, idempotencyKey]
          );
          hookResponseCapture(res, idempotencyKey);
          return next();
        }

        return next();
      } catch (queryErr) {
        console.error("[Idempotency] Error inspecting existing key:", queryErr);
        cleanupUploadedFile(req);
        return next(queryErr);
      }
    }
  };
}

/**
 * Intercepts res.send and res.json to persist the response payload
 * when the request finishes.
 */
function hookResponseCapture(res, idempotencyKey) {
  let responseHandled = false;
  const originalSend = res.send.bind(res);
  const originalJson = res.json.bind(res);

  const saveResponse = async (statusCode, bodyContent) => {
    if (responseHandled) return;
    responseHandled = true;

    try {
      const isSuccess = statusCode >= 200 && statusCode < 500;
      const status = isSuccess ? "completed" : "failed";
      const bodyStr = typeof bodyContent === "string" ? bodyContent : JSON.stringify(bodyContent);

      await pool.promise().query(
        `UPDATE idempotency_keys
         SET status = ?, response_status = ?, response_body = ?
         WHERE idempotency_key = ?`,
        [status, statusCode, bodyStr, idempotencyKey]
      );
    } catch (saveErr) {
      console.error("[Idempotency] Error saving response state:", saveErr.message);
    }
  };

  res.send = function (body) {
    saveResponse(res.statusCode, body);
    return originalSend(body);
  };

  res.json = function (json) {
    saveResponse(res.statusCode, JSON.stringify(json));
    return originalJson(json);
  };

  // Clean up if client aborts connection before responding
  res.on("close", () => {
    if (!responseHandled && !res.writableEnded) {
      responseHandled = true;
      pool.promise().query(
        `UPDATE idempotency_keys SET status = 'failed' WHERE idempotency_key = ?`,
        [idempotencyKey]
      ).catch(() => {});
    }
  });
}

module.exports = idempotency;
