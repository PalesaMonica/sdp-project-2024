const mysql = require('mysql2');
const fs = require('fs');
require('dotenv').config();

// Check if SSL_CA is defined
if (!process.env.SSL_CA) {
    console.error('SSL_CA environment variable is not defined');
    process.exit(1);
}

// Check if the file exists at the given path
if (!fs.existsSync(process.env.SSL_CA)) {
    console.error(`SSL certificate file does not exist at path: ${process.env.SSL_CA}`);
    process.exit(1);
}


// Create a connection to the database
const db = mysql.createConnection({
    host: process.env.DB_HOST,       // Use environment variable
    user: process.env.DB_USER,       // Use environment variable
    port: process.env.DB_PORT || 3306,
    password: process.env.DB_PASSWORD, // Use environment variable
    database: process.env.DB_NAME,   // Use environment variable
    ssl: {
        ca: fs.readFileSync(process.env.SSL_CA) // Path to SSL certificate
    },
    multipleStatements: true,
});

// Connect to the database
db.connect((err) => {
    if (err) {
        console.error('Error connecting to the database:', err.message);
        return;
    }
    console.log('Connected to the MySQL database');
});

// Export the db connection so it can be used in other parts of our application
module.exports = db;
