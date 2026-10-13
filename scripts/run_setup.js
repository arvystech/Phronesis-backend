const mysql = require('mysql2');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

console.log('Starting database setup and seed...');

const connection = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  multipleStatements: true
});

connection.connect((err) => {
  if (err) {
    console.error('Error connecting to MySQL:', err.message);
    process.exit(1);
  }
  console.log('Connected to MySQL successfully.');

  const sqlPath = path.join(__dirname, 'setup_db.sql');
  if (!fs.existsSync(sqlPath)) {
    console.error(`SQL script not found at ${sqlPath}`);
    process.exit(1);
  }

  const sql = fs.readFileSync(sqlPath, 'utf8');

  connection.query(sql, (err, results) => {
    if (err) {
      console.error('Error executing SQL script:', err.message);
      connection.end();
      process.exit(1);
    }
    console.log('Database tables created and seeded successfully!');
    connection.end();
  });
});
