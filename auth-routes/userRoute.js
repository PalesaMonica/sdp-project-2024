//userRoute.js
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const auth = require('../middlewares/jwt_middleware');
require('dotenv').config();
const router = express.Router();

router.post('/signup', async (req, res) => {
    const { username, email, password } = req.body;
    
    try {
        // Check if the user already exists
        connection.query('SELECT * FROM users WHERE email = ?', [email], async (err, results) => {
            if (err) {
                console.error('Database query error:', err);
                return res.status(500).json({ msg: 'Server Error: Database query failed' });
            }

            if (results.length > 0) {
                return res.status(400).json({ msg: 'User already exists' });
            }

            // Hash the password
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);

            // Insert new user into the database
            const sql = 'INSERT INTO users (username, email, password) VALUES (?, ?, ?)';
            connection.query(sql, [username, email, hashedPassword], (err, result) => {
                if (err) {
                    console.error('Database insert error:', err);
                    return res.status(500).json({ msg: 'Server Error: Unable to insert user' });
                }

                const payload = { id: result.insertId };
                const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });

                res.redirect('/data.html'); // Redirect after successful registration
            });
        });
    } catch (err) {
        console.error('Unexpected error:', err);
        res.status(500).json({ msg: `Server Error: Unexpected error occurred - ${err.message}` });
    }
});

module.exports = router;