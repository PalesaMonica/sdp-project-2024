const express = require("express");
const path = require("path");
const mysql = require("mysql2");
const fs = require("fs");
const bodyParser = require("body-parser");
const session = require("express-session");
const Reservation = require("./src/reservation/reservation");
const pool = require("./src/reservation/db-connection");
const passport = require("passport");
const bcrypt = require("bcryptjs"); // For password hashing
const GoogleStrategy = require("passport-google-oauth20").Strategy;
require("dotenv").config();

// Import routes
const userRoutes = require("./auth-routes/userRoute");
const lunchRoute = require("./src/menu_backend/menuRoutes/lunchRoute");
const breakfastRoute=require('./src/menu_backend/menuRoutes/breakfastRoute');
const dinnerRoute=require('./src/menu_backend/menuRoutes/dinnerRoute');

// Initialize the Express app
const app = express();
app.use(express.json());

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
  const { username, email, password } = req.body;

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
          "INSERT INTO users (username, email, password) VALUES (?, ?, ?)";
        connection.query(
          sql,
          [username, email, hashedPassword],
          (err, result) => {
            if (err) {
              console.error("Database insert error:", err);
              return res
                .status(500)
                .json({ msg: "Server Error: Unable to insert user" });
            }

            return res
              .status(200)
              .json({ msg: "Signup successful, redirecting..." });
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
          return res
            .status(200)
            .json({ msg: "Login successful, redirecting..." });
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

app.use('/breakfast',breakfastRoute);
app.use('/lunch',lunchRoute);
app.use('/dinner',dinnerRoute);

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
app.get('/dining-halls', async (req, res) => {
  try {
      const diningHalls = await Reservation.getDiningHalls(); // Ensure this is the correct method for fetching dining halls
      res.status(200).json(diningHalls);
  } catch (error) {
      console.error('Error in /dining-halls route:', error);
      res.status(500).json({ message: 'Error fetching dining halls', error: error.message });
  }
});

// Route to handle POST requests to /api/reservations
app.post('/api/reservations', async (req, res) => {
  const { diningHallId, name, surname, date, time, mealType } = req.body;

  if (!name || !surname || !date || !mealType) {
      return res.status(400).json({ message: 'Missing required fields: name, surname, date, and mealType are required.' });
  }

  try {
      // Creating a reservation with default 'confirmed' status
      const { reservationId, qrCode } = await Reservation.createReservation({
          diningHallId,
          name,
          surname,
          date,
          time,
          mealType,  // Ensure mealType is passed to createReservation
          specialRequests: null,
          status: 'confirmed'
      });
      res.status(201).json({ reservationId, qrCode });
  } catch (error) {
      console.error('Error creating reservation:', error);
      res.status(500).json({ message: 'Error creating reservation', error: error.message });
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

// Start the server
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

// Export the app for testing
module.exports = app;