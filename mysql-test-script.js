require('dotenv').config();
const mysql = require('mysql');
const fs = require('fs');

var conn = mysql.createConnection({
  host: process.env.MYSQL_HOST,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
  port: 3306,
  ssl: { ca: fs.readFileSync(process.env.MYSQL_CA_CERT) }
});

conn.connect(function(err) {
  if (err) throw err;
  console.log("Connected to the database!");

  const sql = fs.readFileSync('./dining-service-db.session.sql', 'utf8');
  conn.query(sql, function (err, result) {
    if (err) throw err;
    console.log("SQL script executed successfully.");
    conn.end();
  });
});
