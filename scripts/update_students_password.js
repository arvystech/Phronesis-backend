const mysql = require('mysql2');
const bcrypt = require('bcrypt');
require('dotenv').config();

const connection = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME
});

connection.connect(async (err) => {
  if (err) {
    console.error('Error connecting to database:', err.message);
    process.exit(1);
  }

  const defaultPass = process.env.DEFAULT_STUDENT_PASSWORD || "Password123";
  console.log(`Hashing default password "${defaultPass}"...`);

  try {
    const hashedPassword = await bcrypt.hash(defaultPass, 12);
    console.log(`Generated Hash: ${hashedPassword}`);

    connection.query(
      `UPDATE students SET password = ?, is_default_password = 1`,
      [hashedPassword],
      (queryErr, result) => {
        if (queryErr) {
          console.error('Error updating student passwords:', queryErr.message);
          connection.end();
          process.exit(1);
        }

        console.log(`Successfully updated ${result.affectedRows} student account(s) to use default password "${defaultPass}" and set is_default_password = 1.`);
        connection.end();
        process.exit(0);
      }
    );
  } catch (error) {
    console.error('Error hashing password:', error.message);
    connection.end();
    process.exit(1);
  }
});
