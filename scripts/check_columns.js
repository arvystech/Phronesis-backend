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

  const tables = ['subjects', 'teachers', 'timetables', 'classes'];
  let index = 0;

  function nextTable() {
    if (index >= tables.length) {
      connection.end();
      process.exit(0);
    }
    const t = tables[index];
    connection.query(`DESCRIBE ${t}`, (err, results) => {
      if (err) {
        console.error(`Error describing ${t}:`, err.message);
      } else {
        console.log(`\n--- Schema of ${t} ---`);
        console.log(results);
      }
      index++;
      nextTable();
    });
  }

  nextTable();
});
