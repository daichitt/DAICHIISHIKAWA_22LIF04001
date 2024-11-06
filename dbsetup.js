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
    initializeDatabase().then(() => {
        console.log('Database setup completed.');
        connection.end();
    }).catch((error) => {
        console.error('Error during database initialization:', error);
        connection.end();
    });
});

// init DB
async function initializeDatabase() {
    await createDatabase();
    await useDatabase();
    await dropTables();
    await createTables();
    await insertInitialData();
}

// Create database
function createDatabase() {
    return new Promise((resolve, reject) => {
        connection.query('CREATE DATABASE IF NOT EXISTS wpr22LIF04001', (err) => {
            if (err) return reject(err);
            console.log('Database created');
            resolve();
        });
    });
}

// Use database
function useDatabase() {
    return new Promise((resolve, reject) => {
        connection.query('USE wpr22LIF04001', (err) => {
            if (err) return reject(err);
            resolve();
        });
    });
}

// Drop tables
function dropTables() {
    return new Promise((resolve, reject) => {
        connection.query('DROP TABLE IF EXISTS emails', (err) => {
            if (err) return reject(err);
            connection.query('DROP TABLE IF EXISTS users', (err) => {
                if (err) return reject(err);
                console.log('Tables dropped');
                resolve();
            });
        });
    });
}

// Create tables
function createTables() {
    return new Promise((resolve, reject) => {
        const createUsersTable = `
            CREATE TABLE users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                full_name VARCHAR(100),
                email VARCHAR(100) UNIQUE,
                password VARCHAR(100)
            )`;

        const createEmailsTable = `
            CREATE TABLE emails (
                id INT AUTO_INCREMENT PRIMARY KEY,
                sender_id INT,
                recipient_id INT,
                subject VARCHAR(255),
                body TEXT,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (sender_id) REFERENCES users(id),
                FOREIGN KEY (recipient_id) REFERENCES users(id)
            )`;

        connection.query(createUsersTable, (err) => {
            if (err) return reject(err);
            console.log('Users table created');

            connection.query(createEmailsTable, (err) => {
                if (err) return reject(err);
                console.log('Emails table created');
                resolve();
            });
        });
    });
}

//  Insert initial data
function insertInitialData() {
    return new Promise((resolve, reject) => {
        const insertUsers = `
            INSERT INTO users (full_name, email, password)
            VALUES 
                ('User One', 'a@a.com', '123'),
                ('User Two', 'b@b.com', '123456'),
                ('User Three', 'c@c.com', '123456')`;

        const insertEmails = `
            INSERT INTO emails (sender_id, recipient_id, subject, body)
            VALUES 
                (1, 2, 'Hello', 'This is a test email from User One to User Two'),
                (2, 1, 'Re: Hello', 'This is a reply from User Two to User One'),
                (1, 3, 'Meeting Reminder', 'Don t forget our meeting tomorrow.'),
                (3, 1, 'Re: Meeting Reminder', 'Thanks for the reminder! Looking forward to it.'),
                (2, 3, 'Project Update', 'Here is the latest update on the project.'),
                (3, 2, 'Re: Project Update', 'Thanks for the update! Lets discuss it in our next meeting.'),
                (1, 2, 'Lunch Plans', 'Are we still on for lunch this Friday?'),
                (2, 1, 'Re: Lunch Plans', 'Yes! Looking forward to it.')`;

        connection.query(insertUsers, (err) => {
            if (err) return reject(err);
            console.log('Initial users inserted');

            connection.query(insertEmails, (err) => {
                if (err) return reject(err);
                console.log('Initial emails inserted');
                resolve();
            });
        });
    });
}
