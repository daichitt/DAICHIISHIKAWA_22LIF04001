const express = require('express');
const cookieParser = require('cookie-parser');
const mysql = require('mysql2');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 8000;

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// MySQL connection setup
const dbConfig = {
    host: 'localhost',
    user: 'wpr',
    password: 'fit2024',
    database: 'wpr22LIF04001',
};
const connection = mysql.createConnection(dbConfig);

// Middleware to get current user
app.use((req, res, next) => {
  const userId = req.cookies.userId;

  if (!userId) {
      req.currentUser = null;
      return next();
  }

  const userQuery = 'SELECT * FROM users WHERE id = ?';
  connection.query(userQuery, [userId], (err, results) => {
      if (err) {
          console.error('Error fetching user:', err);
          req.currentUser = null;
          return next();
      }
      
      req.currentUser = results[0]; 
      next();
  });
});

// Home / Sign-in page
app.get('/', (req, res) => {
    if (req.cookies.userId) {
        return res.redirect('/inbox'); 
    }
    res.render('index', { error: null });
});


app.get('/signin', (req, res) => {
    if (req.cookies.userId) {
        return res.redirect('/inbox');
    }
    res.render('index', { error: null });
});


app.post('/signin', (req, res) => {
    const { email, password } = req.body;
    const query = 'SELECT * FROM users WHERE email = ? AND password = ?';
    
    connection.query(query, [email, password], (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.render('index', { error: 'An error occurred' });
        }
        if (results.length > 0) {
            res.cookie('userId', results[0].id);
            return res.redirect('/inbox?signup=success'); // with success
        } else {
            res.render('index', { error: 'User not exist' });
        }
    });
});

app.get('/signup', (req, res) => {
    res.render('signup', { error: null, message: null });
});

app.post('/signup', (req, res) => {
    const { full_name, email, password, confirm_password} = req.body;

    if (!full_name || !email || !password ) {
        return res.render('signup', { error: 'All fields are required', message: null });
    }

    if (password.length < 6) {
        return res.render('signup', { error: 'Password must be at least 6 characters' , message: null});
    }

    if (password !== confirm_password) {
        return res.render('signup', { error: 'Passwords do not match', message: null });
    }

    const checkEmailQuery = 'SELECT * FROM users WHERE email = ?';
    connection.query(checkEmailQuery, [email], (err, results) => {
        if (err) {
            return res.render('signup', { error: 'An error occurred. Please try again.', message: null });
        }
        if (results.length > 0) {
            return res.render('signup', { error: 'Email already in use', message: null });
        }

        const insertUserQuery = 'INSERT INTO users (full_name, email, password) VALUES (?, ?, ?)';
        connection.query(insertUserQuery, [full_name, email, password], (err) => {
            if (err) {
                return res.render('signup', { error: 'An error occurred. Please try again.', message: null });
            }
            res.render('signup', { error: null, message: 'Signup messageful! You can now log in.' });
        });
    });
});

app.get('/inbox', async (req, res) => {
    const userId = req.cookies.userId; 

    if (!userId) {
        return res.status(403).send('Access denied'); 
    }

    const page = parseInt(req.query.page) || 1;
    const limit = 5;
    const offset = (page - 1) * limit;
    const signupSuccess = req.query.signup === 'success';
    const sentmailSuccess = req.query.sentEmail === 'success';

    try {
        const emails = await getInboxEmails(userId, offset, limit);
        const totalEmails = await getInboxEmailCount(userId);
        const totalPages = Math.ceil(totalEmails / limit);

       
        const userQuery = 'SELECT full_name FROM users WHERE id = ?';
        
        connection.query(userQuery, [userId], (err, userResults) => {
            if (err) throw err;
            const user = userResults[0]; 

            
            res.render('inbox', { emails, page, totalPages, user, message: signupSuccess ? signupSuccess : null, sentmailSuccess: sentmailSuccess ? sentmailSuccess : null}); 
        });
    } catch (error) {
        res.status(500).send('Error loading inbox');
    }
});

// Helper function to get emails with pagination
function getInboxEmails(userId, offset, limit) {
    return new Promise((resolve, reject) => {
        const query = `
            SELECT emails.*, users.full_name AS sender_name 
            FROM emails 
            JOIN users ON emails.sender_id = users.id 
            WHERE recipient_id = ?
            ORDER BY timestamp DESC
            LIMIT ? OFFSET ?`;
        
        connection.query(query, [userId, limit, offset], (err, results) => {
            if (err) return reject(err);
            resolve(results);
        });
    });
}

// Helper function to get the total email count
function getInboxEmailCount(userId) {
    return new Promise((resolve, reject) => {
        const query = `
            SELECT COUNT(*) AS count 
            FROM emails 
            WHERE recipient_id = ?`;
        
        connection.query(query, [userId], (err, results) => {
            if (err) return reject(err);
            resolve(results[0].count);
        });
    });
}


app.get('/compose', (req, res) => {
    const userId = req.cookies.userId;

    if (!userId) {
        return res.status(403).send('Access denied'); 
    }

    const query = 'SELECT * FROM users WHERE id != ?';
    
    connection.query(query, [userId], (err, users) => {
        if (err) throw err;
        res.render('compose', { users, error: null, user: req.currentUser });
    });
});


app.post('/send-email', (req, res) => {
    const userId = req.cookies.userId; 

    if (!userId) {
        return res.status(403).send('Access denied'); 
    }

    const { recipient_id, subject, body } = req.body;

    if (!recipient_id) {
        return res.status(400).send('Recipient is required');
    }

    const insertEmailQuery = `
        INSERT INTO emails (sender_id, recipient_id, subject, body)
        VALUES (?, ?, ?, ?)`;
    
    connection.query(insertEmailQuery, [userId, recipient_id, subject || null, body || null], (err) => {
        if (err) throw err;
        // res.redirect('/inbox');
        return res.redirect('/inbox?sentEmail=success'); // with success
    });
});

// 
app.get('/outbox', async (req, res) => {
    const userId = req.cookies.userId;

    if (!userId) {
        return res.status(403).send('Access denied');
    }

    const page = parseInt(req.query.page) || 1;
    const limit = 5;
    const offset = (page - 1) * limit;

    try {
        const emails = await getEmails(userId, offset, limit);
        const totalEmails = await getEmailCount(userId);
        const totalPages = Math.ceil(totalEmails / limit);

        res.render('outbox', { emails, page, totalPages, user: req.currentUser });
    } catch (error) {
        res.status(500).send('Error loading outbox');
    }
});


app.get('/emails/:id', (req, res) => {
    const emailId = req.params.id;

    const query = `
        SELECT emails.*, users.full_name AS sender_name 
        FROM emails 
        JOIN users ON emails.sender_id = users.id 
        WHERE emails.id = ?`;
    
    connection.query(query, [emailId], (err, results) => {
        if (err || results.length === 0) return res.status(404).send('Email not found');
        
        const emailDetails = results[0];
        
        res.render('detail', { email: emailDetails, user: req.currentUser });
    });
});


app.get('/logout', (req, res) => {
   res.clearCookie('userId');
   res.redirect('/'); 
});

// Start server
app.listen(PORT, () => {
   console.log(`Server is running on http://localhost:${PORT}`);
});
// Helper function to get emails with pagination
function getEmails(userId, offset, limit) {
    return new Promise((resolve, reject) => {
        const query = `
            SELECT emails.*, users.full_name AS recipient_name 
            FROM emails 
            JOIN users ON emails.recipient_id = users.id 
            WHERE sender_id = ?
            ORDER BY timestamp DESC
            LIMIT ? OFFSET ?`;
        
        connection.query(query, [userId, limit, offset], (err, results) => {
            if (err) return reject(err);
            resolve(results);
        });
    });
}

// Helper function to get the total email count
function getEmailCount(userId) {
    return new Promise((resolve, reject) => {
        const query = `
            SELECT COUNT(*) AS count 
            FROM emails 
            WHERE sender_id = ?`;
        
        connection.query(query, [userId], (err, results) => {
            if (err) return reject(err);
            resolve(results[0].count);
        });
    });
}