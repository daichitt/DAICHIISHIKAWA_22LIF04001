const express = require('express');
const cookieParser = require('cookie-parser');
const path = require('path');
const app = express();
const PORT = 8000;
// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.set('view engine', 'ejs'); // Set EJS as the template engine
app.set('views', path.join(__dirname, 'views')); // Set views directory

// Routes
app.get('/', (req, res) => {
  res.render('signin'); // Render sign-in page
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});