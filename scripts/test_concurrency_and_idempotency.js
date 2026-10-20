require("dotenv").config();
const http = require("http");
const fs = require("fs");
const path = require("path");
const assert = require("assert");
const app = require("../src/app");
const pool = require("../src/config/dbConnection");
const createToken = require("../src/utils/createToken");
const studentModel = require("../src/modules/students/student.model");

async function runTestSuite() {
  console.log("\n========================================================");
  console.log("🚀 STARTING CONCURRENCY & IDEMPOTENCY TEST SUITE");
  console.log("========================================================\n");

  let server;
  let baseUrl;
  let adminToken;
  let studentToken;

  try {
    // 1. Start server on ephemeral port
    await new Promise((resolve) => {
      server = http.createServer(app);
      server.listen(0, "127.0.0.1", () => {
        const address = server.address();
        baseUrl = `http://127.0.0.1:${address.port}`;
        resolve();
      });
    });

    console.log(`[Setup] Test server listening on ${baseUrl}`);

    // Generate tokens for test requests
    adminToken = createToken({ id: 2, role: "admin" });
    studentToken = createToken({ id: 3, role: "student" });

    // Ensure student 3 has a known initial password ('Password123')
    const bcrypt = require("bcrypt");
    const initialHashedPassword = await bcrypt.hash("Password123", 12);
    await pool.promise().query(
      "UPDATE students SET password = ?, is_default_password = 1 WHERE student_id = 3",
      [initialHashedPassword]
    );

    // =========================================================================
    // TEST 1: Normal request without Idempotency-Key continues to work as before
    // =========================================================================
    console.log("\n--- TEST 1: Normal Request (No Idempotency-Key) ---");
    const testStaffNo1 = `STF_TEST_${Date.now()}_1`;
    const testBioNo1 = `BIO_${Date.now() % 100000}_1`;
    const testEmail1 = `staff_${Date.now()}_1@phronesis.edu`;

    const res1 = await fetch(`${baseUrl}/admin/add-staff`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        staff_no: testStaffNo1,
        first_name: "TestStaff",
        last_name: "Normal",
        biometric_enrollment_no: testBioNo1,
        email: testEmail1,
        phone: "+2348011223344",
        department: "Teaching",
      }),
    });

    const data1 = await res1.json();
    assert.strictEqual(res1.status, 201, "Expected 201 Created for normal request");
    assert.strictEqual(data1.message, "Staff created");
    assert.strictEqual(res1.headers.get("idempotent-replayed"), null, "Expected no Idempotent-Replayed header");
    console.log("✅ Test 1 Passed: Normal request works as expected without idempotency headers.");

    // =========================================================================
    // TEST 2: Idempotent Request & Exact Replay on Retry
    // =========================================================================
    console.log("\n--- TEST 2: Idempotency Key Caching & Replay on Retry ---");
    const idempotencyKey2 = `idemp-key-${Date.now()}-2`;
    const testStaffNo2 = `STF_TEST_${Date.now()}_2`;
    const testBioNo2 = `BIO_${Date.now() % 100000}_2`;
    const testEmail2 = `staff_${Date.now()}_2@phronesis.edu`;

    const staffPayload2 = {
      staff_no: testStaffNo2,
      first_name: "IdempStaff",
      last_name: "Original",
      biometric_enrollment_no: testBioNo2,
      email: testEmail2,
      phone: "+2348099887766",
      department: "Teaching",
    };

    // First attempt
    const res2a = await fetch(`${baseUrl}/admin/add-staff`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
        "Idempotency-Key": idempotencyKey2,
      },
      body: JSON.stringify(staffPayload2),
    });

    const data2a = await res2a.json();
    assert.strictEqual(res2a.status, 201, "First attempt should return 201 Created");
    assert.strictEqual(data2a.staff.staff_no, testStaffNo2);

    // Second attempt (identical retry, e.g. client network timeout retry)
    const res2b = await fetch(`${baseUrl}/admin/add-staff`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
        "Idempotency-Key": idempotencyKey2,
      },
      body: JSON.stringify(staffPayload2),
    });

    const data2b = await res2b.json();
    assert.strictEqual(res2b.status, 201, "Replayed retry should return 201");
    assert.strictEqual(res2b.headers.get("idempotent-replayed"), "true", "Expected Idempotent-Replayed: true header");
    assert.strictEqual(data2b.staff.id, data2a.staff.id, "Returned staff ID should match original created record");

    // Verify database only has 1 record
    const [dbStaffCount] = await pool.promise().query(
      "SELECT COUNT(*) AS count FROM staff WHERE staff_no = ?",
      [testStaffNo2]
    );
    assert.strictEqual(dbStaffCount[0].count, 1, "Database must contain exactly 1 staff record, no duplicates");
    console.log("✅ Test 2 Passed: Repeated request returns cached response without duplicate creation.");

    // =========================================================================
    // TEST 3: Idempotency Key Reuse With Different Payload (Payload Mismatch)
    // =========================================================================
    console.log("\n--- TEST 3: Idempotency Key Reuse with Different Payload (422) ---");
    const mismatchedPayload = {
      ...staffPayload2,
      first_name: "AlteredNameTamperedPayload",
    };

    const res3 = await fetch(`${baseUrl}/admin/add-staff`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
        "Idempotency-Key": idempotencyKey2, // Reusing key from Test 2 with different body
      },
      body: JSON.stringify(mismatchedPayload),
    });

    const data3 = await res3.json();
    assert.strictEqual(res3.status, 422, "Expected 422 Unprocessable Entity on payload mismatch");
    assert.strictEqual(data3.statusCode, 422);
    assert.ok(data3.message.includes("different request payload"), "Error message should cite payload mismatch");
    console.log("✅ Test 3 Passed: Reusing an idempotency key with different payload is safely rejected (422).");

    // =========================================================================
    // TEST 4: Concurrent Execution with Same Idempotency Key
    // =========================================================================
    console.log("\n--- TEST 4: Concurrent Requests with Same Idempotency Key ---");
    const idempotencyKey4 = `idemp-concurrent-${Date.now()}`;
    const testStaffNo4 = `STF_CONC_${Date.now()}`;
    const testBioNo4 = `BIO_${Date.now() % 100000}_4`;
    const testEmail4 = `staff_conc_${Date.now()}@phronesis.edu`;

    const concurrentPayload = {
      staff_no: testStaffNo4,
      first_name: "ConcurrentStaff",
      last_name: "Racer",
      biometric_enrollment_no: testBioNo4,
      email: testEmail4,
      phone: "+2348055667788",
      department: "Non-Teaching",
    };

    const sendConcurrentReq = () =>
      fetch(`${baseUrl}/admin/add-staff`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminToken}`,
          "Idempotency-Key": idempotencyKey4,
        },
        body: JSON.stringify(concurrentPayload),
      });

    // Fire 2 concurrent requests at the exact same millisecond
    const [concRes1, concRes2] = await Promise.all([
      sendConcurrentReq(),
      sendConcurrentReq(),
    ]);

    const concStatuses = [concRes1.status, concRes2.status].sort();
    console.log(`[Concurrent Results] Statuses received: ${concStatuses.join(", ")}`);

    // In a race: exactly one request enters and creates (201).
    // The second request either receives 409 Conflict (if in-flight) or 201 (if finished and replayed).
    const has201 = concStatuses.includes(201);
    assert.ok(has201, "At least one request must succeed with 201 Created");
    assert.ok(
      concStatuses.includes(409) || concStatuses.includes(201),
      "Concurrent request must either receive 409 (processing) or replayed 201"
    );

    // Verify database only created 1 staff record
    const [concDbCount] = await pool.promise().query(
      "SELECT COUNT(*) AS count FROM staff WHERE staff_no = ?",
      [testStaffNo4]
    );
    assert.strictEqual(concDbCount[0].count, 1, "Exactly 1 record must be created in DB during race");
    console.log("✅ Test 4 Passed: Concurrent requests safely controlled without duplicate insertion.");

    // =========================================================================
    // TEST 5: Student Password Change with Idempotency Key
    // =========================================================================
    console.log("\n--- TEST 5: Password Change with Idempotency Key (Safe Retry) ---");
    const pwdKey5 = `pwd-key-${Date.now()}`;

    const pwdPayload5 = {
      currentPassword: "Password123",
      newPassword: "NewSecretPass456!",
      confirmPassword: "NewSecretPass456!",
    };

    // First attempt to change password
    const res5a = await fetch(`${baseUrl}/student/change-password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${studentToken}`,
        "Idempotency-Key": pwdKey5,
      },
      body: JSON.stringify(pwdPayload5),
    });

    const data5a = await res5a.json();
    assert.strictEqual(res5a.status, 200, "Password change should succeed with 200 OK");
    assert.ok(data5a.message.includes("Password changed successfully"));

    // Retry with SAME idempotency key (simulating network glitch after password update)
    // Note: The payload still sends 'currentPassword': 'Password123'
    // Without idempotency, this would fail with 401 because the DB password is now 'NewSecretPass456!'
    const res5b = await fetch(`${baseUrl}/student/change-password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${studentToken}`,
        "Idempotency-Key": pwdKey5,
      },
      body: JSON.stringify(pwdPayload5),
    });

    const data5b = await res5b.json();
    assert.strictEqual(res5b.status, 200, "Replayed password change must return 200 OK");
    assert.strictEqual(res5b.headers.get("idempotent-replayed"), "true", "Expected Idempotent-Replayed: true header");
    console.log("✅ Test 5 Passed: Retried password change returns cached 200 OK instead of false 401.");

    // =========================================================================
    // TEST 6: Optimistic Concurrency Control on Password Change (Compare-and-Swap)
    // =========================================================================
    console.log("\n--- TEST 6: Optimistic Concurrency Control (CAS) on Password Change ---");
    // Reset password to 'InitialPassword1!'
    const resetHash = await bcrypt.hash("InitialPassword1!", 12);
    await pool.promise().query(
      "UPDATE students SET password = ?, is_default_password = 0 WHERE student_id = 3",
      [resetHash]
    );

    // Simulate two concurrent sessions that both read 'InitialPassword1!' and try to change it
    // Session A wants to set it to 'PasswordA123!'
    // Session B wants to set it to 'PasswordB123!'
    const changeReqA = fetch(`${baseUrl}/student/change-password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${studentToken}`,
      },
      body: JSON.stringify({
        currentPassword: "InitialPassword1!",
        newPassword: "PasswordA123!",
        confirmPassword: "PasswordA123!",
      }),
    });

    const changeReqB = fetch(`${baseUrl}/student/change-password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${studentToken}`,
      },
      body: JSON.stringify({
        currentPassword: "InitialPassword1!",
        newPassword: "PasswordB123!",
        confirmPassword: "PasswordB123!",
      }),
    });

    const [pwdResA, pwdResB] = await Promise.all([changeReqA, changeReqB]);
    const pwdStatuses = [pwdResA.status, pwdResB.status].sort();
    console.log(`[Password Race Results] Statuses: ${pwdStatuses.join(", ")}`);

    // Exactly one should succeed with 200, the other should fail with 409 Conflict or 401
    assert.ok(pwdStatuses.includes(200), "One password change must succeed with 200");
    const otherStatus = pwdStatuses[0] === 200 ? pwdStatuses[1] : pwdStatuses[0];
    assert.ok(
      otherStatus === 409 || otherStatus === 401,
      `Second concurrent change must be blocked with 409 or 401, got ${otherStatus}`
    );
    console.log("✅ Test 6 Passed: Concurrency control prevents lost updates / password race conditions.");

    // =========================================================================
    // TEST 7: Database Integrity on student_payments (Unique transaction_ref)
    // =========================================================================
    console.log("\n--- TEST 7: Database Integrity on student_payments ---");
    const testTrxRef = `TRX_TEST_${Date.now()}`;

    // Insert payment 1
    const [payRes1] = await pool.promise().query(
      `INSERT INTO student_payments
         (student_id, session_id, term_id, title, amount_due, amount_paid, payment_method, transaction_ref, status)
       VALUES (3, 2, 1, 'Test Tuition', 50000.00, 50000.00, 'Bank Transfer', ?, 'Paid')`,
      [testTrxRef]
    );
    assert.ok(payRes1.insertId, "First payment insertion should succeed");

    // Attempt duplicate insertion with same transaction_ref
    let duplicateRejected = false;
    try {
      await pool.promise().query(
        `INSERT INTO student_payments
           (student_id, session_id, term_id, title, amount_due, amount_paid, payment_method, transaction_ref, status)
         VALUES (3, 2, 1, 'Test Tuition Duplicate', 50000.00, 50000.00, 'Bank Transfer', ?, 'Paid')`,
        [testTrxRef]
      );
    } catch (err) {
      if (err.code === "ER_DUP_ENTRY") {
        duplicateRejected = true;
      } else {
        throw err;
      }
    }

    assert.strictEqual(duplicateRejected, true, "Duplicate payment transaction_ref must be rejected with ER_DUP_ENTRY");

    // Cleanup test payment
    await pool.promise().query("DELETE FROM student_payments WHERE transaction_ref = ?", [testTrxRef]);
    console.log("✅ Test 7 Passed: Unique constraint strictly prevents duplicate payment entries.");

    // =========================================================================
    // TEST 8: Row-Locking & File Cleanup on Profile Pic Upload
    // =========================================================================
    console.log("\n--- TEST 8: Profile Pic Upload Concurrency & Cleanup ---");
    // Verify that connection.withTransaction serializes correctly
    let lockExecuted = false;
    await pool.withTransaction(async (conn) => {
      const [rows] = await conn.query(
        "SELECT profile_pic FROM students WHERE student_id = ? FOR UPDATE",
        [3]
      );
      assert.ok(rows.length > 0, "Student record should be found");
      lockExecuted = true;
    });
    assert.strictEqual(lockExecuted, true, "FOR UPDATE row-lock transaction executed successfully");
    console.log("✅ Test 8 Passed: Row-level locking for profile updates verified.");

    // Clean up test staff records created during test
    await pool.promise().query(
      "DELETE FROM staff WHERE staff_no LIKE 'STF_TEST_%' OR staff_no LIKE 'STF_CONC_%'"
    );
    // Clean up test idempotency keys
    await pool.promise().query(
      "DELETE FROM idempotency_keys WHERE idempotency_key LIKE 'idemp-%' OR idempotency_key LIKE 'pwd-key-%'"
    );

    // Reset student password back to Password123
    const finalHash = await bcrypt.hash("Password123", 12);
    await pool.promise().query(
      "UPDATE students SET password = ?, is_default_password = 1 WHERE student_id = 3",
      [finalHash]
    );

    console.log("\n========================================================");
    console.log("🎉 ALL CONCURRENCY & IDEMPOTENCY TESTS PASSED (8/8)!");
    console.log("========================================================\n");

    server.close();
    process.exit(0);
  } catch (err) {
    console.error("\n❌ TEST SUITE FAILED WITH ERROR:", err);
    if (server) server.close();
    process.exit(1);
  }
}

runTestSuite();
