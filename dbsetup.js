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
    // create database
    connection.query('CREATE DATABASE IF NOT EXISTS wpr22LIF04001', (err) => {
        if (err) throw err;
        console.log('Database created');

        // USE DB
        connection.query('USE wpr22LIF04001', (err) => {
            if (err) throw err;

        // usersテーブルの作成
        const createUsersTable = `
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                full_name VARCHAR(100),
                email VARCHAR(100) UNIQUE,
                password VARCHAR(100)
            )`;
        connection.query(createUsersTable, (err) => {
            if (err) throw err;
            console.log('Users table created');

            // emailsテーブルの作成
            const createEmailsTable = `
                CREATE TABLE IF NOT EXISTS emails (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    sender_id INT,
                    recipient_id INT,
                    subject VARCHAR(255),
                    body TEXT,
                    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (sender_id) REFERENCES users(id),
                    FOREIGN KEY (recipient_id) REFERENCES users(id)
                )`;
                connection.query(createEmailsTable, (err) => {
                    if (err) throw err;
                    console.log('Emails table created');

                    // inser users
                    const insertUsers = `
                        INSERT INTO users (full_name, email, password)
                        VALUES 
                            ('User One', 'a@a.com', '123'),
                            ('User Two', 'b@b.com', '123456'),
                            ('User Three', 'c@c.com', '123456')`;
                    connection.query(insertUsers, (err) => {
                        if (err) throw err;
                        console.log('Initial users inserted');
                    });

                    // insert emails
                    const insertEmails = `
                        INSERT INTO emails (sender_id, recipient_id, subject, body)
                        VALUES 
                            (1, 2, 'Hello', 'This is a test email from User One to User Two'),
                            (2, 1, 'Re: Hello', 'This is a reply from User Two to User One'),
                            (1, 3, 'Meeting Reminder', 'Don　t forget our meeting tomorrow.'),
                            (3, 1, 'Re: Meeting Reminder', 'Thanks for the reminder! Looking forward to it.'),
                            (2, 3, 'Project Update', 'Here is the latest update on the project.'),
                            (3, 2, 'Re: Project Update', 'Thanks for the update! Lets discuss it in our next meeting.'),
                            (1, 2, 'Lunch Plans', 'Are we still on for lunch this Friday?'),
                            (2, 1, 'Re: Lunch Plans', 'Yes! Looking forward to it.')`;
                    connection.query(insertEmails, (err) => {
                        if (err) throw err;
                        console.log('Initial emails inserted');
                    });
                });
            });
        });
    });
});