require('dotenv').config();  // Add this at the top of your app.js
const express = require('express');
const cors = require('cors');
const session = require('express-session');
const passport = require('passport');
const db = require('./config/dbConfig');  // Import the MySQL connectionn
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const path = require('path');
const bodyParser = require('body-parser');



const app = express();
app.use(cors());  // Enable CORS to allow frontend requests

// Initialize Passport and restore session state
app.use(
  session({
    secret: "your_secret_key", // Replace with a strong secret in production
    resave: false,
    saveUninitialized: true,
  })
);

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL:
        process.env.GOOGLE_CALLBACK_URL ||
        "http://localhost:3000/auth/google/callback",
    },
    function (accessToken, refreshToken, profile, done) {
      // Check if the user already exists in the database
      db.query(
        "SELECT * FROM users WHERE google_id = ?",
        [profile.id],
        async (err, results) => {
          if (err) {
            return done(err);
          }

          if (results.length > 0) {
            // User already exists, pass the user to the next middleware
            return done(null, results[0]);
          } else {
            // User doesn't exist, save them to the database
            const newUser = {
              google_id: profile.id,
              displayName: profile.displayName,
              email: profile.emails[0].value, // Google's email
            };

            // Insert the new user into the database
            db.query(
              "INSERT INTO users (google_id, username, email) VALUES (?, ?, ?)",
              [newUser.google_id, newUser.displayName, newUser.email],
              (err, result) => {
                if (err) {
                  return done(err);
                }
                newUser.id = result.insertId; // Get the new user's ID
                return done(null, newUser);
              }
            );
          }
        }
      );
    }
  )
);

// Serialize user information into the session
passport.serializeUser((user, done) => {
  done(null, user.id);
});

// Deserialize user information from the session
passport.deserializeUser((id, done) => {
  db.query("SELECT * FROM users WHERE id = ?", [id], (err, results) => {
    if (err) return done(err);
    done(null, results[0]);  // Pass the user object to req.user
  });
});


// Serve static files from the "public" directory
app.use(express.static(path.join(__dirname, "public")));

// Serve JavaScript from 'src/js' folder
app.use('/src', express.static(path.join(__dirname, 'src/')));

// Use body-parser middleware to parse incoming requests
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Endpoint to get meal credits and transactions for the logged-in user
app.get('/api/meal-credits', (req, res) => {
    if (!req.isAuthenticated()) {
        return res.status(401).json({ message: 'User not authenticated' });
    }

    const userId = req.user.id;

    // Check if user exists
    db.query('SELECT COUNT(*) AS count FROM users WHERE id = ?', [userId], (err, results) => {
        if (err) {
            console.error('Error checking user existence:', err);
            return res.status(500).json({ message: 'Server error', error: err });
        }

        if (results[0].count === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        // User exists, proceed to fetch meal credits and transactions
        const query = `
            SELECT remaining_credits 
            FROM meal_credits 
            WHERE user_id = ?;

            SELECT date, amount, description 
            FROM transactions 
            WHERE user_id = ? 
            ORDER BY date DESC 
            LIMIT 5;
        `;

        db.query(query, [userId, userId], (err, results) => {
            if (err) {
                console.error('Error fetching data:', err);
                return res.status(500).json({ message: 'Server error', error: err });
            }

            const remainingCredits = results[0][0]?.remaining_credits || 0;
            const transactions = results[1];
            res.json({ remainingCredits, transactions });
        });
    });
});

// Endpoint to fetch transactions for the logged-in user with optional filters
app.get('/api/transactions', (req, res) => {
    if (!req.isAuthenticated()) {
        return res.status(401).json({ message: 'User not authenticated' });
    }

    const userId = req.user.id;
    const filter = req.query.filter;

    // Check if user exists
    db.query('SELECT COUNT(*) AS count FROM users WHERE id = ?', [userId], (err, results) => {
        if (err) {
            console.error('Error checking user existence:', err);
            return res.status(500).json({ message: 'Server error', error: err });
        }

        if (results[0].count === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        // User exists, fetch transactions
        let query = `
            SELECT date, amount, description 
            FROM transactions 
            WHERE user_id = ? 
        `;

        // Apply filter
        if (filter === 'day') {
            query += ' AND DATE(date) = CURDATE()';
        } else if (filter === 'week') {
            query += ' AND YEARWEEK(date, 1) = YEARWEEK(CURDATE(), 1)';
        } else if (filter === 'month') {
            query += ' AND MONTH(date) = MONTH(CURDATE()) AND YEAR(date) = YEAR(CURDATE())';
        }

        query += ' ORDER BY date DESC LIMIT 50';  // Adjust limit as needed

        db.query(query, [userId], (err, results) => {
            if (err) {
                console.error('Error fetching transactions:', err);
                return res.status(500).json({ message: 'Server error', error: err });
            }

            res.json({ transactions: results });
        });
    });
});



// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
