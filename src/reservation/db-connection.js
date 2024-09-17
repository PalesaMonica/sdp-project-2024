const mysql = require('mysql2/promise');
const fs = require("fs");
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

// Retrieve the environment variables
const dbHost = process.env.DB_HOST;
const dbUser = process.env.DB_USER;
const dbPassword = process.env.DB_PASSWORD;
const dbDatabase = process.env.DB_NAME;
const sslCaPath = process.env.SSL_CA;

// Ensure that sslCaPath is defined correctly
if (!sslCaPath) {
    console.error('SSL_CA environment variable is not defined or is incorrect.');
    process.exit(1); // Exit the process with an error
}

// Create a MySQL connection pool with SSL
const pool = mysql.createPool({
    connectionLimit: 10,
    host: dbHost,
    user: dbUser,
    password: dbPassword,
    database: dbDatabase,
    waitForConnections: true,
    queueLimit: 0,
    ssl: {
        ca: fs.readFileSync(path.resolve(__dirname, '../../', sslCaPath)), // Resolve path correctly
        rejectUnauthorized: false
    }
});

// Function to execute a query using the connection pool
function query(sql, values) {
    return new Promise((resolve, reject) => {
        connection.query(sql, values, (err, results) => {
            if (err) {
                return reject(err);
            }
            resolve(results);
        });
    });
}
module.exports = pool;
