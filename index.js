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
      
      req.currentUser = results[0]; // Attach the user info to req
      next();
  });
});

// Home / Sign-in page
app.get('/', (req, res) => {
    if (req.cookies.userId) {
        return res.redirect('/inbox'); // 既にサインインしている場合は受信トレイにリダイレクト
    }
    res.render('index'); // サインインページを表示
});

// サインイン処理
app.post('/signin', (req, res) => {
    console.log(req.body);
    const { email, password } = req.body;
    const query = 'SELECT * FROM users WHERE email = ? AND password = ?';
    
    connection.query(query, [email, password], (err, results) => {
        if (err) throw err;
        if (results.length > 0) {
            res.cookie('userId', results[0].id); // クッキーにユーザーIDを保存
            return res.redirect('/inbox'); // 受信トレイにリダイレクト
        } else {
            res.render('index', { error: 'Invalid credentials' }); // エラーメッセージを表示
        }
    });
});

// サインアップページ表示
app.get('/signup', (req, res) => {
    res.render('signup'); // サインアップページを表示
});

// サインアップ処理
app.post('/signup', (req, res) => {
    const { full_name, email, password } = req.body;

    // 簡単なバリデーション
    if (!full_name || !email || !password) {
        return res.render('signup', { error: 'All fields are required' });
    }
    
    const checkEmailQuery = 'SELECT * FROM users WHERE email = ?';
    
    connection.query(checkEmailQuery, [email], (err, results) => {
        if (err) throw err;
        if (results.length > 0) {
            return res.render('signup', { error: 'Email already in use' });
        }

        const insertUserQuery = 'INSERT INTO users (full_name, email, password) VALUES (?, ?, ?)';
        
        connection.query(insertUserQuery, [full_name, email, password], (err) => {
            if (err) throw err;
            res.redirect('/'); // サインインページにリダイレクト
        });
    });
});

// 受信トレイページ - 認証チェックが必要
app.get('/inbox', (req, res) => {
    const userId = req.cookies.userId; // クッキーからユーザーIDを取得

    if (!userId) {
        return res.status(403).send('Access denied'); // アクセス拒否
    }

    const query = `
        SELECT emails.*, users.full_name AS sender_name 
        FROM emails 
        JOIN users ON emails.sender_id = users.id 
        WHERE recipient_id = ?
        ORDER BY timestamp DESC`;
    
    connection.query(query, [userId], (err, results) => {
        if (err) throw err;

        // ユーザー情報を取得するクエリ
        const userQuery = 'SELECT full_name FROM users WHERE id = ?';
        
        connection.query(userQuery, [userId], (err, userResults) => {
            if (err) throw err;
            const user = userResults[0]; // ユーザー情報を取得

            // ユーザー情報をビューに渡す
            res.render('inbox', { emails: results, user }); 
        });
    });
});

// メール作成ページ
app.get('/compose', (req, res) => {
    const userId = req.cookies.userId; // クッキーからユーザーIDを取得

    if (!userId) {
        return res.status(403).send('Access denied'); // アクセス拒否
    }

    const query = 'SELECT * FROM users WHERE id != ?'; // 自分以外のユーザーを取得
    
    connection.query(query, [userId], (err, users) => {
        if (err) throw err;
        res.render('compose', { users, error: null, user: req.currentUser }); // 受信者リストを表示し、エラーはnull
    });
});

// メール送信処理
app.post('/send-email', (req, res) => {
    const userId = req.cookies.userId; // クッキーからユーザーIDを取得

    if (!userId) {
        return res.status(403).send('Access denied'); // アクセス拒否
    }

    const { recipient_id, subject, body } = req.body;

    if (!recipient_id) {
        return res.status(400).send('Recipient is required'); // エラーメッセージ
    }

    const insertEmailQuery = `
        INSERT INTO emails (sender_id, recipient_id, subject, body)
        VALUES (?, ?, ?, ?)`;
    
    connection.query(insertEmailQuery, [userId, recipient_id, subject || null, body || null], (err) => {
        if (err) throw err;
        res.redirect('/inbox'); // 受信トレイにリダイレクト
    });
});

// 送信済みメールページ
app.get('/outbox', (req, res) => {
    const userId = req.cookies.userId; // クッキーからユーザーIDを取得

    if (!userId) {
        return res.status(403).send('Access denied'); // アクセス拒否
    }

    const query = `
        SELECT emails.*, users.full_name AS recipient_name 
        FROM emails 
        JOIN users ON emails.recipient_id = users.id 
        WHERE sender_id = ?
        ORDER BY timestamp DESC`;
    
    connection.query(query, [userId], (err, results) => {
        if (err) throw err;
        res.render('outbox', { emails: results , user: req.currentUser}); // 送信済みメールを表示
    });
});

// メール詳細ページ
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
        
        res.render('detail', { email: emailDetails }); // メール詳細を表示
    });
});

// サインアウト処理
app.get('/logout', (req, res) => {
   res.clearCookie('userId'); // クッキーを削除してサインアウト
   res.redirect('/'); // サインインページにリダイレクト
});

// Start server
app.listen(PORT, () => {
   console.log(`Server is running on http://localhost:${PORT}`);
});