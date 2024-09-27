const express = require("express");
const path = require("path");
const mysql = require("mysql2");
const fs = require("fs");
const bodyParser = require("body-parser");
const session = require("express-session");
const Reservation = require("./src/reservation/reservation");
const pool = require("./src/reservation/db-connection");
const passport = require("passport");
const cors = require('cors');
const bcrypt = require("bcryptjs"); // For password hashing
const GoogleStrategy = require("passport-google-oauth20").Strategy;
require("dotenv").config();

// Initialize the Express app
const app = express();
app.use(express.json());
app.use(cors());

// Log environment variables (for debugging purposes, remove in production)
// console.log(
//   process.env.DB_HOST,
//   process.env.DB_USER,
//   process.env.DB_PASSWORD,
//   process.env.DB_NAME,
//   process.env.SSL_CA
// );

// Create a MySQL connection with SSL
const connection = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 3306, // Default MySQL port
  ssl: {
    ca: fs.readFileSync(process.env.SSL_CA), // Ensure this path is correct
    rejectUnauthorized: false,
  },
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Connect to the database
connection.connect((err) => {
  if (err) {
    console.error("Error connecting to the database:", err.stack);
    return;
  }
  console.log("Connected to the database as ID " + connection.threadId);
});

// Make the connection globally accessible
global.connection = connection;

// Set up session management
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

// Configure Passport.js to use Google OAuth strategy
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
      connection.query(
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
            connection.query(
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
  done(null, user);
});

// Deserialize user information from the session
passport.deserializeUser((user, done) => {
  done(null, user);
});

// Serve static files from the "public" directory
app.use(express.static(path.join(__dirname, "public")));

// Serve JavaScript from 'src/js' folder
app.use('/src', express.static(path.join(__dirname, 'src/')));

// Use body-parser middleware to parse incoming requests
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Google OAuth routes
app.get(
  "/auth/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

app.get(
  "/auth/google/callback",
  passport.authenticate("google", { failureRedirect: "/" }),
  (req, res) => {
    res.redirect("/userDashboard");
  }
);

// Route to get all menu items or filter by meal type
app.get('/api/menu', (req, res) => {
  const mealType = req.query.mealType || '';  // Check if mealType query param is provided
  
  let query = `
    SELECT m.item_name, m.ingredients, m.meal_type, d.name as dining_hall, m.diet_type, m.image_url 
    FROM menu m 
    JOIN dining_halls d ON m.dining_hall_id = d.id
  `;
  
  if (mealType) {
    query += ` WHERE m.meal_type = ?`;
  }

  connection.query(query, mealType ? [mealType] : [], (err, results) => {
    if (err) {
      console.error('Error fetching menu items:', err);
      return res.status(500).json({ message: 'Error fetching menu items' });
    }

    res.json(results);
  });
});


app.get("/userDashboard", (req, res) => {
  if (req.isAuthenticated()) {
    const username =
      req.user.displayName || req.user.username || "{{username}}";

    // Read the HTML file
    fs.readFile(
      path.join(__dirname, "public", "userDashboard.html"),
      "utf8",
      (err, data) => {
        if (err) {
          console.error("Error reading the HTML file:", err);
          return res
            .status(500)
            .send("Server Error: Unable to load the dashboard");
        }

        // Inject the user's name into the HTML
        const modifiedData = data.replace("{{username}}", username);

        // Send the modified HTML as a response
        res.send(modifiedData);
      }
    );
  } else {
    res.redirect("/login");
  }
});

app.post("/logout", (req, res) => {
  req.logout((err) => {
    if (err) {
      console.error("Error during logout:", err);
      return res.status(500).json({ msg: "Server Error: Unable to log out" });
    }
    res.redirect("/login");
  });
});

// Route to serve the signup page
app.get("/signup", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "signup.html"));
});

// Route to serve the login page
app.get("/login", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "login.html"));
});

// Handle the signup form submission
app.post("/signup", async (req, res) => {
  const { username, email, password, role } = req.body;

  try {
    connection.query(
      "SELECT * FROM users WHERE email = ?",
      [email],
      async (err, results) => {
        if (err) {
          console.error("Database query error:", err);
          return res
            .status(500)
            .json({ msg: "Server Error: Database query failed" });
        }

        if (results.length > 0) {
          return res.status(400).json({ msg: "User already exists" });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const sql =
          "INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)";
        connection.query(
          sql,
          [username, email, hashedPassword, role],
          (err, result) => {
            if (err) {
              console.error("Database insert error:", err);
              return res
                .status(500)
                .json({ msg: "Server Error: Unable to insert user" });
            }

            const redirectUrl = '/login.html';
            return res
              .status(200)
              .json({ msg: "Signup successful, redirecting...", redirectUrl });
          }
        );
      }
    );
  } catch (err) {
    console.error("Unexpected error:", err);
    res.status(500).json({
      msg: `Server Error: Unexpected error occurred - ${err.message}`,
    });
  }
});

// Handle the login form submission
app.post("/login", (req, res) => {
  const { email, password } = req.body;

  try {
    connection.query(
      "SELECT * FROM users WHERE email = ?",
      [email],
      async (err, results) => {
        if (err) {
          console.error("Database query error:", err);
          return res
            .status(500)
            .json({ msg: "Server Error: Database query failed" });
        }

        if (results.length === 0) {
          return res.status(400).json({ msg: "Invalid email or password" });
        }

        const user = results[0];
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
          return res.status(400).json({ msg: "Invalid email or password" });
        }

        req.login(user, (err) => {
          if (err) {
            console.error("Error during login:", err);
            return res
              .status(500)
              .json({ msg: "Server Error: Unable to log in" });
          }

          // Check the role of the user and redirect accordingly
          const redirectUrl = user.role === 'staff' ? '/meal-management.html' : '/userDashboard.html';
          return res.status(200).json({ msg: "Login successful, redirecting...", redirectUrl });
        });
      }
    );
  } catch (err) {
    console.error("Unexpected error:", err);
    res.status(500).json({
      msg: `Server Error: Unexpected error occurred - ${err.message}`,
    });
  }
});


app.post('/saveDietPreference', (req, res) => {
  const { dietPlan } = req.body;
  const username = req.user.username;
  const user_id = req.user.id;

  const query = `
    INSERT INTO dietary_preference (username, preference, user_id) 
    VALUES (?, ?, ?)
    ON DUPLICATE KEY UPDATE preference = VALUES(preference)
  `;

  connection.query(query, [username, dietPlan, user_id], (err, result) => {
      if (err) {
          return res.status(500).json({ msg: 'Error saving preference' });
      }
      res.status(200).json({ msg: 'Diet preference saved or updated' });
  });
});


app.get('/get-username', (req, res) => {
  if (req.isAuthenticated()) {
    const username = req.user.username; // Directly get the username from the session
    res.json({ username }); // Send the username as a JSON response
  } else {
    res.status(401).json({ error: "User not authenticated" });
  }
});

//Get Dietary preference
app.get('/get-dietary_preference', (req, res) => {
  if (req.isAuthenticated()) {
    const user = req.user.id; // Get the username from the session

    // Query to retrieve dietary preference based on the username
    connection.query(
      "SELECT preference FROM dietary_preference WHERE user_id = ?",
      [user],
      (err, result) => {
        if (err) {
          return res.status(500).json({ msg: 'Error retrieving dietary preference' });
        }
        if (result.length > 0) {
          res.status(200).json({ preference: result[0].preference });
        } else {
          res.status(404).json({ msg: 'No dietary preference found' });
        }
      }
    );
  } else {
    res.status(401).json({ error: "User not authenticated" });
  }
});


// Route to get all dining halls
// Route to get all dining halls with one main image and additional images
app.get('/dining-halls', async (req, res) => {
  try {
    // Fetch all dining halls
    const [diningHalls] = await pool.query('SELECT * FROM dining_halls');
    
    // Fetch images for each dining hall
    const [images] = await pool.query('SELECT dining_hall_id, image_url FROM images');
    
    // Create a map of dining hall images
    const imageMap = {};
    images.forEach(image => {
      if (!imageMap[image.dining_hall_id]) {
        imageMap[image.dining_hall_id] = [];
      }
      imageMap[image.dining_hall_id].push(image.image_url);
    });

    // Attach images to the dining halls
    const diningHallsWithImages = diningHalls.map(diningHall => {
      const hallImages = imageMap[diningHall.id] || [];
      return {
        ...diningHall,
        mainImage: hallImages[0] || null,  // First image is the main image
        additionalImages: hallImages.slice(1)  // Remaining images
      };
    });

    res.status(200).json(diningHallsWithImages);
  } catch (error) {
    console.error('Error in /dining-halls route:', error);
    res.status(500).json({ message: 'Error fetching dining halls', error: error.message });
  }
});

// Route to get a dining hall by ID with its associated images
// Route to get a dining hall by ID with images
app.get('/dining-halls/:id', async (req, res) => {
  const { id } = req.params;
  try {
    // Fetch dining hall info
    const [diningHall] = await pool.query('SELECT * FROM dining_halls WHERE id = ?', [id]);

    // Check if the dining hall exists
    if (diningHall.length === 0) {
      return res.status(404).json({ message: 'Dining hall not found' });
    }

    // Fetch associated images from the images table
    const [images] = await pool.query('SELECT image_url FROM images WHERE dining_hall_id = ?', [id]);

    // Respond with the dining hall and associated images
    res.status(200).json({
      diningHall: diningHall[0],
      images: images.map(image => image.image_url), // Map to just the image URLs
    });
  } catch (error) {
    console.error('Error in /dining-halls/:id route:', error);
    res.status(500).json({ message: 'Error fetching dining hall', error: error.message });
  }
});
app.get('/api/dining-halls/:id', async (req, res) => {
  const diningHallId = req.params.id;
  try {
    const [diningHall] = await pool.query('SELECT name FROM dining_halls WHERE id = ?', [diningHallId]);
    if (diningHall.length === 0) {
      return res.status(404).json({ message: 'Dining hall not found' });
    }
    res.json({ name: diningHall[0].name });
  } catch (error) {
    console.error('Error fetching dining hall:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});



app.post('/api/reservations', async (req, res) => {
  const { diningHallId, name, surname, date, meals, specialRequest } = req.body;

  // Validate required fields
  if (!name || !surname || !date || !meals) {
    return res.status(400).json({ message: 'Missing required fields: name, surname, date, and meals are required.' });
  }

  try {
    // Call createReservation function to store reservation in the database
    const { reservationId, qrCode } = await Reservation.createReservation({
      diningHallId,
      name,
      surname,
      date,
      meals,
      specialRequest: specialRequest || '', // Handle optional specialRequest
      status: 'confirmed' // Default status
    });

    // Respond with reservation ID and QR code
    res.status(201).json({ reservationId, qrCode });
  } catch (error) {
    console.error('Error creating reservation:', error);
    res.status(500).json({ message: 'Error creating reservation', error: error.message });
  }
});
app.get('/api/meal-prices', async (req, res) => {
  try {
      const prices = await Reservation.getMealPrices();
      res.json(prices);
  } catch (err) {
      res.status(500).json({
          error: 'Failed to fetch meal prices',
          message: err.message,
          stack: err.stack
      });
  }
});
app.post('/api/update-price', async (req, res) => {
  const { id, price } = req.body;
  if (typeof id !== 'number' || typeof price !== 'number') {
      return res.status(400).json({ error: 'Invalid input' });
  }

  try {
      await Reservation.updateMealPrice(id, price);
      res.status(200).json({ message: 'Price updated successfully' });
  } catch (err) {
      res.status(500).json({
          error: 'Failed to update meal price',
          message: err.message,
          stack: err.stack
      });
  }
});

// Route to get all reservations
app.get('/api/reservations', async (req, res) => {
  try {
      const reservations = await Reservation.getReservations();
      res.status(200).json(reservations);
  } catch (error) {
      res.status(500).json({ message: 'Error fetching reservations', error: error.message });
  }
});

// Route to update a reservation
// Route to update a reservation
app.put('/api/reservations/:id', async (req, res) => {
  const { id } = req.params;
  const { newTime, newMealType } = req.body;
  const currentDate = new Date().toISOString(); // Current date and time

  if (!newTime && !newMealType) {
      return res.status(400).json({ message: 'At least one of newTime or newMealType must be provided.' });
  }

  try {
      const result = await Reservation.updateReservation(id, newTime, newMealType, currentDate);
      res.status(200).json(result);
  } catch (error) {
      console.error('Error updating reservation:', error.message); // Enhanced logging
      res.status(400).json({ message: 'Error updating reservation', error: error.message });
  }
});


// Route to cancel a reservation
app.delete('/api/reservations/:id', async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;
  try {
      await Reservation.cancelReservation(id, reason);
      res.status(200).json({ message: 'Reservation cancelled successfully' });
  } catch (error) {
      res.status(400).json({ message: 'Error cancelling reservation', error: error.message });
  }
});

//feedback routing

// Feedback route to get reviews with optional rating filter

// Post a review
app.post('/feedback', (req, res) => {
  const { review_text, rating, dining_hall, review_type } = req.body;

  // SQL query to insert feedback into the feedback table
  const sql = `
      INSERT INTO feedback (dining_hall, review_text, review_type, rating, created_at)
      VALUES (?, ?, ?, ?, NOW())
  `;

  // Execute the query with the provided data
  connection.query(sql, [dining_hall, review_text, review_type, rating], (err, result) => {
      if (err) {
          console.error('Error inserting feedback:', err);
          return res.status(500).json({ message: 'Error submitting feedback' });
      }
      res.send('Feedback submitted successfully!');
  });
});


app.get('/feedback', (req, res) => {
  const rating = req.query.rating;
  let sql = 'SELECT * FROM feedback';
  const queryParams = [];

  // If a rating is provided, add a WHERE clause to filter by rating
  if (rating) {
    sql += ' WHERE rating = ?';
    queryParams.push(rating);
  }

  // Execute the SQL query
  connection.query(sql, queryParams, (err, results) => {
    if (err) {
      console.error('Error fetching reviews:', err);
      return res.status(500).json({ message: 'Error fetching reviews' });
    }

    // Return the reviews in JSON format
    res.status(200).json(results);
  });
});


//Meal Management
app.get('/api/current-menu', async (req, res) => {
  try {
      const [rows] = await pool.query('SELECT * FROM menu');
      res.json(rows);
  } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/available-meals', async (req, res) => {
  try {
      const [rows] = await pool.query('SELECT * FROM meals');
      res.json(rows);
  } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/add-to-menu', async (req, res) => {
  const { mealId } = req.body;
  try {
      await pool.query('INSERT INTO menu (meal_id) VALUES (?)', [mealId]);
      res.json({ success: true });
  } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/remove-from-menu/:id', async (req, res) => {
  const { id } = req.params;
  try {
      await pool.query('DELETE FROM menu WHERE id = ?', [id]);
      res.json({ success: true });
  } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/add-new-meal', async (req, res) => {
  const { name, ingredients, diet_type, image_url, meal_type } = req.body;
  try {
      await pool.query(
          'INSERT INTO meals (name, ingredients, diet_type, image_url, meal_type) VALUES (?, ?, ?, ?, ?)',
          [name, ingredients, diet_type, image_url, meal_type]
      );
      res.json({ success: true });
  } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Internal server error' });
  }
});
//

// Start the server
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

// Export the app for testing
module.exports = app;