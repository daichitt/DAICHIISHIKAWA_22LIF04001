const mysql = require('mysql2');
const connection = mysql.createConnection({
    host: 'localhost',
    user: 'wpr',
    password: 'fit2024',
    port: 3306,
    database: 'wpr22LIF04001'
});

// Connect to the MySQL database
connection.connect((error) => {
    if (error) {
        console.error('Database connection failed:', error.stack);
        return;
    }
    console.log('Connected to the database.');
});
