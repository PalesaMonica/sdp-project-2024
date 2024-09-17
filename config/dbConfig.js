const mysql = require('mysql2');
const fs = require('fs');

// Create a connection to the database
const db = mysql.createConnection({
    host: 'dining-service-db.mysql.database.azure.com',     //  MySQL host (use Azure host)
    user: 'dining',          // MySQL username
    port : '3306',
    password: 'Service123',  // MySQL password
    database: 'dining_services', // database name
    ssl: {
        ca: fs.readFileSync('C:/Users/nonhl/DigiCertGlobalRootCA.crt.pem') // Path to SSL certificate
    },
    multipleStatements:true,
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
