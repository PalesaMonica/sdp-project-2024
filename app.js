const express = require('express');
const cors = require('cors');
const db = require('./config/dbConfig');  // Import the MySQL connection

const app = express();
app.use(cors());  // Enable CORS to allow frontend requests

// Endpoint to get meal credits and transactions for a user
app.get('/api/meal-credits/:userId', (req, res) => {
    const userId = req.params.userId;

    // Check if user exists
    db.query('SELECT COUNT(*) AS count FROM users WHERE id = ?', [userId], (err, results) => {
        if (err) {
            console.error('Error checking user existence:', err);
            res.status(500).json({ message: 'Server error', error: err });
            return;
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
                res.status(500).json({ message: 'Server error', error: err });
                return;
            }

            const remainingCredits = results[0][0]?.remaining_credits || 0;
            const transactions = results[1];
            res.json({ remainingCredits, transactions });
        });
    });
});

app.get('/api/transactions/:userId', (req, res) => {
    const userId = req.params.userId;
    const filter = req.query.filter;

    // Check if user exists
    db.query('SELECT COUNT(*) AS count FROM users WHERE id = ?', [userId], (err, results) => {
        if (err) {
            console.error('Error checking user existence:', err);
            res.status(500).json({ message: 'Server error', error: err });
            return;
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
                res.status(500).json({ message: 'Server error', error: err });
                return;
            }

            res.json({ transactions: results });
        });
    });
});



// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
