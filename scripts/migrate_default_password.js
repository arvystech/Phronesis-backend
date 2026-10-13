const mysql = require('mysql2');
require('dotenv').config();

const connection = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME
});

connection.connect((err) => {
  if (err) {
    console.error('Error connecting to database:', err.message);
    process.exit(1);
  }

  connection.query(
    "SHOW COLUMNS FROM students LIKE 'is_default_password'",
    (err, results) => {
      if (err) {
        console.error('Error checking column:', err.message);
        connection.end();
        process.exit(1);
      }

      if (results.length === 0) {
        console.log("Column 'is_default_password' not found. Adding it...");
        connection.query(
          "ALTER TABLE students ADD COLUMN is_default_password TINYINT(1) NOT NULL DEFAULT 1",
          (alterErr) => {
            if (alterErr) {
              console.error('Error adding column:', alterErr.message);
            } else {
              console.log("Successfully added column 'is_default_password' to students table.");
            }
            connection.end();
          }
        );
      } else {
        console.log("Column 'is_default_password' already exists.");
        connection.end();
      }
    }
  );
});
