const mysql = require("mysql2");

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

pool.getConnection((err, conn) => {
  if (err) return console.error("Error connecting to database pool:", err.message);

  console.log("Database connection successful");
  conn.release();
});

/**
 * Execute a unit of work inside a dedicated transaction.
 * Automatically handles acquiring a connection from the pool,
 * beginTransaction, commit on success, rollback on failure,
 * and releasing the connection back to the pool.
 *
 * @param {Function} callback - async (conn) => Promise<any>
 * @returns {Promise<any>}
 */
pool.withTransaction = async (callback) => {
  const conn = await pool.promise().getConnection();
  try {
    await conn.beginTransaction();
    const result = await callback(conn);
    await conn.commit();
    return result;
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
};

module.exports = pool;

