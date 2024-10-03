const express = require("express");
const path = require("path");
const mysql = require("mysql2");
const fs = require("fs");
const jwt = require('jsonwebtoken');
const bodyParser = require("body-parser");
const session = require("express-session");
const passport = require("passport");
const cors = require('cors');
const bcrypt = require("bcryptjs"); // For password hashing
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const compression = require('compression'); // Added compression middleware
const http = require('http');
require("dotenv").config();


// Initialize the Express app
const app = express();
const server = http.createServer(app);
const io = require('socket.io')(server, {
  cors: {
      origin: "*", // Allow any origin for now
      methods: ["GET", "POST"]
  }
});
// Enable Gzip compression
app.use(compression());

// Password validation regex
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])[A-Za-z\d!@#$%^&*]{8,}$/;
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
passport.serializeUser(function(user, done) {
  done(null, user.id); // Store user ID in session
});

// Deserialize user information into the session
passport.deserializeUser(function(id, done) {
  connection.query('SELECT * FROM users WHERE id = ?', [id], function(err, results) {
    if (err) return done(err);
    done(null, results[0]); // Retrieve full user object from DB using ID
  });
});


// Serve static files from the "public" directory
// app.use(express.static(path.join(__dirname, "public")));

// Serve static files with cache-control
app.use(express.static(path.join(__dirname, 'public'), {
  maxAge: '1y', // Cache static files for 1 year
  etag: false  // Disable ETag to rely on cache-control
}));


// Serve JavaScript from 'src/js' folder
app.use('/src', express.static(path.join(__dirname, 'src/')));
app.use('/socket.io', express.static(path.join(__dirname, 'node_modules', 'socket.io', 'client-dist')));
// Use body-parser middleware to parse incoming requests


// Limit the size of request body to optimize performance
app.use(bodyParser.json({ limit: '10kb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10kb' }));


// Google OAuth routes
app.get(
  "/auth/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

app.get(
  "/auth/google/callback",
  passport.authenticate("google", { failureRedirect: "/" }),
  (req, res) => {
    const user = req.user;

    // Check if the student has selected a meal plan
    connection.query(
      "SELECT * FROM meal_credits WHERE user_id = ?",
      [user.id],
      (err, mealPlanResults) => {
        if (err) {
          console.error("Database query error:", err);
          return res.redirect("/errorPage"); // Handle the error case
        }

        let redirectUrl;
        if (mealPlanResults.length === 0) {
          // No meal plan found, redirect to plan selection
          redirectUrl = '/planSelection/index.html';
        } else {
          // Meal plan exists, redirect to the user dashboard
          redirectUrl = '/userDashboard.html';
        }

        return res.redirect(redirectUrl);
      }
    );
  }
);

const LocalStrategy = require('passport-local').Strategy;

passport.use(new LocalStrategy(
  { usernameField: 'email', passwordField: 'password' }, 
  function(email, password, done) {
    connection.query('SELECT * FROM users WHERE email = ?', [email], (err, results) => {
      if (err) { return done(err); }
      if (results.length === 0) { 
        return done(null, false, { message: 'Incorrect email.' }); 
      }

      const user = results[0];

      bcrypt.compare(password, user.password, function(err, isMatch) {
        if (err) return done(err);
        if (isMatch) {
          return done(null, user); // Password matches, log in user
        } else {
          return done(null, false, { message: 'Incorrect password.' });
        }
      });
    });
  }
));

function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
      return next();
  }
  res.status(401).json({ message: 'Please log in to access this resource.' });
}

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
  const { username, email, password} = req.body;
  role = 'student';

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

app.post("/staffSignup", async (req, res) => {
  const { username, email, password, diningHall } = req.body;
  const role = 'staff';  // Set role as 'staff'

  try {
    // Check if the user already exists by email
    connection.query(
      "SELECT * FROM users WHERE email = ?",
      [email],
      async (err, results) => {
        if (err) {
          console.error("Database query error:", err);
          return res.status(500).json({ msg: "Server Error: Database query failed" });
        }

        if (results.length > 0) {
          return res.status(400).json({ msg: "User already exists" });
        }

        // Hash the password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Insert new staff user with dining_hall_id
        const sql =
          "INSERT INTO users (username, email, password, role, dining_hall_id) VALUES (?, ?, ?, ?, ?)";
        connection.query(
          sql,
          [username, email, hashedPassword, role, diningHall],  // Insert diningHall as dining_hall_id
          (err, result) => {
            if (err) {
              console.error("Database insert error:", err);
              return res.status(500).json({ msg: "Server Error: Unable to insert user" });
            }

            // On successful signup, redirect the user to the login page
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
app.post('/login', (req, res, next) => {
  passport.authenticate('local', (err, user, info) => {
    if (err) {
      return res.status(500).json({ msg: 'Server Error: Authentication failed' });
    }
    if (!user) {
      // console.log('Info:', info);
      return res.status(400).json({ msg: 'Invalid email or password' });
    }

    // Log the user in and establish session
    req.logIn(user, (err) => {
      if (err) {
        return res.status(500).json({ msg: 'Server Error: Could not log in user' });
      }

      // Now handle redirection based on the user's role
      const redirectAfterLogin = () => {
        // If user is a student
        if (user.role === 'student') {
          connection.query('SELECT * FROM meal_credits WHERE user_id = ?', [user.id], (err, mealPlanResults) => {
            if (err) {
              return res.status(500).json({ msg: 'Server Error: Meal plan query failed' });
            }

            const redirectUrl = mealPlanResults.length === 0 ? '/planSelection/index.html' : '/userDashboard.html';
            return res.status(200).json({ msg: 'Login successful, redirecting...', redirectUrl });
          });
        } else {
          // Non-student users
          return res.status(200).json({ msg: 'Login successful, redirecting...', redirectUrl: '/staffDashboard.html' });
        }
      };

      // Save the session and redirect after
      req.session.save((err) => {
        if (err) {
          return res.status(500).json({ msg: 'Server Error: Could not save session' });
        }
        redirectAfterLogin();
      });
    });
  })(req, res, next);
});

// Dynamic route for other HTML files
/*app.get('/:page', ensureAuthenticated, (req, res) => {
  const page = req.params.page;
  const filePath = path.join(__dirname, 'public', `${page}.html`);
  
  // Serve the file if it exists
  res.sendFile(filePath, (err) => {
    if (err) {
      res.status(404).send('Page not found');
    }
  });
});*/

app.get("/userDashboard",ensureAuthenticated, (req, res) => {
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
  req.logout(function(err) {
    if (err) {
      return res.status(500).json({ message: 'Error logging out' });
    }
    req.session.destroy(() => {
      res.status(200).json({ message: 'Logout successful', redirectUrl: '/login' });
    });
  });
});

app.post('/saveDietPreference',ensureAuthenticated, (req, res) => {
  const { dietPlan } = req.body;
  const user_id = req.user.id;
  const email = req.user.email;
  const username = req.user.username;

  const query = `
    INSERT INTO dietary_preference (email, preference, user_id, username) 
    VALUES (?, ?, ? , ?)
    ON DUPLICATE KEY UPDATE preference = VALUES(preference)
  `;

  connection.query(query, [email, dietPlan, user_id, username], (err, result) => {
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

app.get('/get-userid', (req, res) => {
  if (req.isAuthenticated()) {
      // Send the user data (like userId) to the client
      res.json({ userId: req.user.id });
  } else {
      res.status(401).json({ message: 'Unauthorized' });
  }
});

app.get('/user/account', (req, res) => {
  // Check if the user is authenticated
  if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Unauthorized access. Please log in.' });
  }

  const user = {
      id: req.user.id,
      email: req.user.email,
      created_at: req.user.created_at // Make sure the created_at field exists in the user data
  };

  // Respond with the user's data
  res.json(user);
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

// Route to get all reservations for user
app.get('/api/reservations', ensureAuthenticated,(req, res) => {
  const userId = req.user.id;
  const { fromDate, toDate } = req.query;

  const query = `
      SELECT r.id, r.date, r.start_time, r.end_time, r.time, r.special_requests, 
             r.status, r.meal_type, dh.name as dining_hall_name
      FROM reservations r
      JOIN dining_halls dh ON r.dining_hall_id = dh.id
      WHERE r.user_id = ? AND r.date BETWEEN ? AND ?
  `;

  connection.query(query, [userId, fromDate, toDate], (err, results) => {
      if (err) {
          console.error('Error fetching reservations:', err);
          res.status(500).json({ error: 'Failed to fetch reservations' });
      } else {
          res.json(results);
      }
  });
});

// Route to get a specific reservation by ID
app.get('/api/reservations/:reservationId',ensureAuthenticated, (req, res) => {
  const reservationId = req.params.reservationId;

  // Query to fetch the reservation details by ID
  const query = `
    SELECT r.id, r.date, r.start_time, r.end_time, r.meal_type, r.special_requests, dh.name as dining_hall_name
    FROM reservations r
    JOIN dining_halls dh ON r.dining_hall_id = dh.id
    WHERE r.id = ?
  `;

  connection.query(query, [reservationId], (err, results) => {
    if (err) {
      console.error('Error fetching reservation details:', err);
      return res.status(500).json({ error: 'Error fetching reservation details' });
    }

    if (results.length === 0) {
      return res.status(404).json({ error: 'Reservation not found' });
    }

    // Send the reservation details as a JSON response
    res.json(results[0]);
  });
});

// Route to post a new reservation
app.post('/api/confirm-reservation',ensureAuthenticated, (req, res) => {
  const userId = req.user.id;  
  const username = req.user.username;

  const queryCart = `
      SELECT ci.id, ci.date, ci.meal_type, ci.dining_hall_id
      FROM cart_items ci
      WHERE ci.user_id = ?
  `;

  connection.query(queryCart, [userId], (err, cartItems) => {
      if (err) {
          console.error('Error fetching cart items:', err);
          return res.status(500).json({ error: 'Failed to fetch cart items' });
      }

      if (cartItems.length === 0) {
          return res.status(400).json({ error: 'Cart is empty' });
      }

      connection.beginTransaction(err => {
          if (err) {
              console.error('Error starting transaction:', err);
              return res.status(500).json({ error: 'Failed to start transaction' });
          }

          const checkDuplicateQuery = `
              SELECT * FROM reservations
              WHERE user_id = ? AND meal_type = ? AND date = ? AND status = 'confirmed'
          `;

          const insertReservation = `
              INSERT INTO reservations 
              (dining_hall_id, user_id, username, date, meal_type, start_time, end_time, status) 
              VALUES (?, ?, ?, ?, ?, ?, ?, 'confirmed')
          `;

          let duplicateFound = false;
          cartItems.forEach((item, index) => {
              let startTime, endTime;
              switch (item.meal_type) {
                  case 'breakfast':
                      startTime = '07:00:00';
                      endTime = '09:00:00';
                      break;
                  case 'lunch':
                      startTime = '11:00:00';
                      endTime = '14:00:00';
                      break;
                  case 'dinner':
                      startTime = '16:00:00';
                      endTime = '19:00:00';
                      break;
                  default:
                      return res.status(400).json({ error: 'Unknown meal type' });
              }

              const localDate = new Date(new Date(item.date).getTime() + (2 * 60 * 60 * 1000));

              connection.query(checkDuplicateQuery, [userId, item.meal_type, localDate.toISOString().split('T')[0]], (err, results) => {
                  if (err) {
                      return connection.rollback(() => {
                          console.error('Error checking for duplicates:', err);
                          return res.status(500).json({ error: 'Failed to check duplicates' });
                      });
                  }

                  if (results.length > 0) {
                      if (!duplicateFound) {
                          duplicateFound = true;
                          return connection.rollback(() => {
                              res.status(409).json({
                                  error: 'Duplicate reservation found',
                                  duplicateReservation: {
                                      id: results[0].id,
                                      date: results[0].date,
                                      meal_type: results[0].meal_type,
                                      dining_hall_id: results[0].dining_hall_id
                                  }
                              });
                          });
                      }
                  } else {
                      connection.query(insertReservation, [
                          item.dining_hall_id,
                          userId,
                          username,
                          localDate.toISOString().split('T')[0],
                          item.meal_type,
                          startTime,
                          endTime
                      ], (err, result) => {
                          if (err) {
                              return connection.rollback(() => {
                                  console.error('Error inserting reservation:', err);
                                  return res.status(500).json({ error: 'Failed to insert reservation' });
                              });
                          }

                          if (index === cartItems.length - 1 && !duplicateFound) {
                              connection.commit(err => {
                                  if (err) {
                                      return connection.rollback(() => {
                                          console.error('Transaction commit failed:', err);
                                          return res.status(500).json({ error: 'Failed to commit transaction' });
                                      });
                                  }

                                  const clearCartQuery = `DELETE FROM cart_items WHERE user_id = ?`;
                                  connection.query(clearCartQuery, [userId], (err) => {
                                      if (err) {
                                          console.error('Error clearing cart:', err);
                                          return res.status(500).json({ error: 'Failed to clear cart' });
                                      }

                                      res.status(201).json({ message: 'Reservation confirmed and cart cleared', redirectUrl: `/reservations.html?id=${result.insertId}` });
                                  });
                              });
                          }
                      });
                  }
              });
          });
      });
  });

  function handleResponse(res, connection, duplicateReservations, failedInserts) {
    if (duplicateReservations.length > 0 || failedInserts.length > 0) {
      connection.rollback(() => {
        let errorMessage = '';
        if (duplicateReservations.length > 0) {
          errorMessage += 'Duplicate reservations found. ';
        }
        if (failedInserts.length > 0) {
          errorMessage += 'Some reservations failed to insert. ';
        }
        return res.status(409).json({
          success: false,
          error: errorMessage.trim(),
          duplicateReservations,
          failedInserts
        });
      });
    } else {
      connection.commit(err => {
        if (err) {
          return connection.rollback(() => {
            console.error('Transaction commit failed:', err);
            return res.status(500).json({
              success: false,
              error: 'Failed to commit transaction'
            });
          });
        }

        // Clear the cart after successful reservation
        const clearCartQuery = `DELETE FROM cart_items WHERE user_id = ?`;
        connection.query(clearCartQuery, [userId], (err) => {
          if (err) {
            console.error('Error clearing cart:', err);
            return res.status(500).json({
              success: false,
              error: 'Failed to clear cart'
            });
          }

          // Send a success response
          res.status(201).json({
            success: true,
            message: 'Reservations confirmed and cart cleared'
          });
        });
      });
    }
  }
});

app.put('/api/replace-reservation/:id',ensureAuthenticated, (req, res) => {
  const userId = req.user.id;
  const username = req.user.username;
  const existingReservationId = req.params.id;
  const { cartItemId } = req.body;

  // Begin transaction
  connection.beginTransaction(err => {
    if (err) {
      console.error('Error starting transaction:', err);
      return res.status(500).json({ error: 'Failed to start transaction' });
    }

    // 1. Fetch the existing reservation
    const fetchExistingReservation = `
      SELECT * FROM reservations
      WHERE id = ? AND user_id = ?
    `;

    connection.query(fetchExistingReservation, [existingReservationId, userId], (err, existingReservations) => {
      if (err) {
        return connection.rollback(() => {
          console.error('Error fetching existing reservation:', err);
          res.status(500).json({ error: 'Failed to fetch existing reservation' });
        });
      }

      if (existingReservations.length === 0) {
        return connection.rollback(() => {
          res.status(404).json({ error: 'Existing reservation not found' });
        });
      }

      const existingReservation = existingReservations[0];

      // 2. Fetch the cart item
      const fetchCartItem = `
        SELECT * FROM cart_items
        WHERE id = ? AND user_id = ?
      `;

      connection.query(fetchCartItem, [cartItemId, userId], (err, cartItems) => {
        if (err) {
          return connection.rollback(() => {
            console.error('Error fetching cart item:', err);
            res.status(500).json({ error: 'Failed to fetch cart item' });
          });
        }

        if (cartItems.length === 0) {
          return connection.rollback(() => {
            res.status(404).json({ error: 'Cart item not found' });
          });
        }

        const cartItem = cartItems[0];

        // 3. Check for conflicts
        const checkConflicts = `
          SELECT * FROM reservations
          WHERE user_id = ? AND date = ? AND meal_type = ? AND id != ? AND status = 'confirmed'
        `;

        connection.query(checkConflicts, [userId, cartItem.date, cartItem.meal_type, existingReservationId], (err, conflicts) => {
          if (err) {
            return connection.rollback(() => {
              console.error('Error checking for conflicts:', err);
              res.status(500).json({ error: 'Failed to check for conflicts' });
            });
          }

          if (conflicts.length > 0) {
            return connection.rollback(() => {
              res.status(409).json({ error: 'Conflict with existing reservation', conflictingReservation: conflicts[0] });
            });
          }

          // 4. Update the existing reservation
          let startTime, endTime;
          switch (cartItem.meal_type) {
            case 'breakfast':
              startTime = '07:00:00';
              endTime = '09:00:00';
              break;
            case 'lunch':
              startTime = '11:00:00';
              endTime = '14:00:00';
              break;
            case 'dinner':
              startTime = '16:00:00';
              endTime = '19:00:00';
              break;
            default:
              return connection.rollback(() => {
                console.error('Unknown meal type');
                res.status(400).json({ error: 'Unknown meal type' });
              });
          }

          const updateReservation = `
            UPDATE reservations
            SET dining_hall_id = ?, date = ?, meal_type = ?, start_time = ?, end_time = ?
            WHERE id = ?
          `;

          connection.query(updateReservation, [
            cartItem.dining_hall_id,
            cartItem.date,
            cartItem.meal_type,
            startTime,
            endTime,
            existingReservationId
          ], (err, result) => {
            if (err) {
              return connection.rollback(() => {
                console.error('Error updating reservation:', err);
                res.status(500).json({ error: 'Failed to update reservation' });
              });
            }

            // 5. Remove the item from the cart
            const removeFromCart = `
              DELETE FROM cart_items
              WHERE id = ?
            `;

            connection.query(removeFromCart, [cartItemId], (err) => {
              if (err) {
                return connection.rollback(() => {
                  console.error('Error removing item from cart:', err);
                  res.status(500).json({ error: 'Failed to remove item from cart' });
                });
              }

              // Commit the transaction
              connection.commit(err => {
                if (err) {
                  return connection.rollback(() => {
                    console.error('Error committing transaction:', err);
                    res.status(500).json({ error: 'Failed to commit transaction' });
                  });
                }

                res.json({
                  message: 'Reservation replaced successfully',
                  newReservationId: existingReservationId
                });
              });
            });
          });
        });
      });
    });
  });
});

app.get('/api/cart-item/:id',ensureAuthenticated, (req, res) => {
  const cartItemId = req.params.id;
  
  const getCartItemQuery = `
    SELECT * FROM cart_items WHERE id = ?
  `;

  connection.query(getCartItemQuery, [cartItemId], (err, results) => {
    if (err) {
      console.error('Error fetching cart item:', err);
      return res.status(500).json({ error: 'Failed to fetch cart item' });
    }

    if (results.length === 0) {
      return res.status(404).json({ error: 'Cart item not found' });
    }

    res.json(results[0]);
  });
});

// Route to cancel a reservation
app.delete('/api/reservations/:id',ensureAuthenticated, (req, res) => {
  const reservationId = req.params.id;

  // First, query to get the reservation details by ID (user_id, date, meal_type)
  const getReservationQuery = `
    SELECT user_id, date, meal_type 
    FROM reservations 
    WHERE id = ?
  `;

  connection.query(getReservationQuery, [reservationId], (error, results) => {
    if (error) {
      console.error('Error retrieving reservation:', error);
      res.status(500).json({ error: 'Internal server error' });
      return;
    }

    if (results.length === 0) {
      res.status(404).json({ error: 'Reservation not found' });
      return;
    }

    const { user_id, date, meal_type } = results[0];

    // Check if there is already a "cancelled" reservation with the same user_id, date, and meal_type
    const checkCancelledQuery = `
      SELECT id 
      FROM reservations 
      WHERE user_id = ? AND date = ? AND meal_type = ? AND status = 'cancelled'
    `;

    connection.query(checkCancelledQuery, [user_id, date, meal_type], (error, cancelledResults) => {
      if (error) {
        console.error('Error checking for cancelled reservation:', error);
        res.status(500).json({ error: 'Internal server error' });
        return;
      }

      // If a cancelled reservation is found, delete it
      if (cancelledResults.length > 0) {
        const deleteCancelledQuery = `DELETE FROM reservations WHERE id = ?`;
        connection.query(deleteCancelledQuery, [cancelledResults[0].id], (error, deleteResults) => {
          if (error) {
            console.error('Error deleting cancelled reservation:', error);
            res.status(500).json({ error: 'Internal server error' });
            return;
          }

          console.log('Cancelled reservation deleted successfully');
        });
      }

      // Now check if a "confirmed" reservation exists and change it to "cancelled"
      const checkConfirmedQuery = `
        SELECT id 
        FROM reservations 
        WHERE user_id = ? AND date = ? AND meal_type = ? AND status = 'confirmed'
      `;

      connection.query(checkConfirmedQuery, [user_id, date, meal_type], (error, confirmedResults) => {
        if (error) {
          console.error('Error checking for confirmed reservation:', error);
          res.status(500).json({ error: 'Internal server error' });
          return;
        }

        // If a confirmed reservation is found, update it to "cancelled"
        if (confirmedResults.length > 0) {
          const updateConfirmedQuery = `UPDATE reservations SET status = 'cancelled' WHERE id = ?`;
          connection.query(updateConfirmedQuery, [confirmedResults[0].id], (error, updateResults) => {
            if (error) {
              console.error('Error updating confirmed reservation:', error);
              res.status(500).json({ error: 'Internal server error' });
              return;
            }

            res.status(200).json({ message: 'Reservation status updated to cancelled successfully' });
          });
        } else {
          res.status(404).json({ error: 'No confirmed reservation found' });
        }
      });
    });
  });
});

app.get('/api/transactions',ensureAuthenticated, (req, res) => {
  const query = 'SELECT * FROM transactions WHERE user_id = ?';
  const userId = req.user.id;

  connection.query(query, [userId], (error, results) => {
    if (error) {
      console.error('Error fetching transactions:', error);
      res.status(500).json({ error: 'Internal server error' });
      return;
    }

    res.status(200).json(results);
  });
});

app.get('/api/transactions/recent',ensureAuthenticated, (req, res) => {
  const query = 'SELECT * FROM transactions WHERE user_id = ? ORDER BY date DESC LIMIT 4'; // adjust query as needed
  const userId = req.user.id;

  connection.query(query, [userId], (error, results) => {
    if (error) {
      console.error('Error fetching transactions:', error);
      res.status(500).json({ error: 'Internal server error' });
      return;
    }

    res.status(200).json(results);
  });
});

app.get('/api/credits/remaining',ensureAuthenticated, (req, res) => {
  const userId = req.user.id; 
  
  const query = 'SELECT remaining_credits FROM meal_credits WHERE user_id = ?';

  connection.query(query, [userId], (error, results) => {
    if (error) {
      console.error('Error fetching remaining credits:', error);
      res.status(500).json({ error: 'Internal server error' });
      return;
    }

    if (results.length > 0) {
      res.status(200).json({ remaining_credits: results[0].remaining_credits });
    } else {
      res.status(404).json({ error: 'No credits found for the user' });
    }
  });
});

//feedback routing
// Post a review
app.post('/feedback', ensureAuthenticated,(req, res) => {
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

app.get('/feedback',ensureAuthenticated, (req, res) => {
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

// Get all dining halls
app.get('/api/dining-halls', ensureAuthenticated, (req, res) => {
  connection.query('SELECT * FROM dining_halls', (error, results) => {
    if (error) {
      console.error('Error fetching dining halls:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
    res.json(results);
  });
});

// Get weekly menu for a specific dining hall and day
app.get('/api/weekly-menu/:diningHallId/:day', ensureAuthenticated, (req, res) => {
  const { diningHallId, day } = req.params;
  connection.query(
    'SELECT * FROM weekly_menu WHERE dining_hall_id = ? AND day_of_week = ?',
    [diningHallId, day],
    (error, results) => {
      if (error) {
        console.error('Error fetching weekly menu:', error);
        return res.status(500).json({ error: 'Internal server error' });
      }
      res.json(results);
    }
  );
});

// Get all menu items
app.get('/api/menu-items', ensureAuthenticated, (req, res) => {
  connection.query('SELECT * FROM menu_item', (error, results) => {
    if (error) {
      console.error('Error fetching menu items:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
    res.json(results);
  });
});

// Add a new menu item
app.post('/api/add-menu-item', ensureAuthenticated, (req, res) => {
  const { item_name, ingredients, diet_type, meal_type, image_url } = req.body;
  connection.query(
    'INSERT INTO menu_item (item_name, ingredients, diet_type, meal_type, image_url) VALUES (?, ?, ?, ?, ?)',
    [item_name, ingredients, diet_type, meal_type, image_url],
    (error) => {
      if (error) {
        console.error('Error adding menu item:', error);
        return res.status(500).json({ error: 'Internal server error' });
      }
      res.json({ message: 'Menu item added successfully' });
    }
  );
});

// Get all menu options
app.get('/api/menu-options', ensureAuthenticated, (req, res) => {
  connection.query('SELECT * FROM menu_option_tracker', (error, trackerResults) => {
    if (error) {
      console.error('Error fetching menu options:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }

    const options = [];
    let completedQueries = 0;

    const lastOptionNumber = trackerResults[0].last_option_number;

    if (lastOptionNumber === 0) {
      return res.json(options);
    }

    for (let i = 1; i <= lastOptionNumber; i++) {
      connection.query(`SELECT * FROM menu_option_${i}`, (error, menuItems) => {
        if (error) {
          console.error(`Error fetching menu option ${i}:`, error);
          completedQueries++;
        } else {
          const optionItems = menuItems.map(item => ({
            id: item.id,
            itemName: item.item_name,
            ingredients: item.ingredients,
            dietType: item.diet_type,
            imageUrl: item.image_url,
            mealType: item.meal_type
          }));

          options.push({ id: i, items: optionItems });
          completedQueries++;
        }
        
        if (completedQueries === lastOptionNumber) {
          res.json(options);
        }
      });
    }
  });
});

// Create a new menu option
app.post('/api/create-menu-option', ensureAuthenticated, (req, res) => {
  const { itemIds } = req.body;
  if (!itemIds || itemIds.length < 8) {
    return res.status(400).json({ error: 'At least 8 items are required' });
  }

  connection.beginTransaction((err) => {
    if (err) {
      console.error('Error starting transaction:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }

    // Get the next option number
    connection.query('SELECT last_option_number FROM menu_option_tracker', (err, trackerRows) => {
      if (err) {
        return connection.rollback(() => {
          console.error('Error getting last option number:', err);
          res.status(500).json({ error: 'Internal server error' });
        });
      }

      const newOptionNumber = trackerRows[0].last_option_number + 1;

      // Create new menu option table
      connection.query(`CREATE TABLE menu_option_${newOptionNumber} LIKE menu_item`, (err) => {
        if (err) {
          return connection.rollback(() => {
            console.error('Error creating menu option table:', err);
            res.status(500).json({ error: 'Internal server error' });
          });
        }

        // Get menu items
        connection.query('SELECT * FROM menu_item WHERE id IN (?)', [itemIds], (err, menuItems) => {
          if (err) {
            return connection.rollback(() => {
              console.error('Error fetching menu items:', err);
              res.status(500).json({ error: 'Internal server error' });
            });
          }

          let insertedItems = 0;
          menuItems.forEach((item) => {
            connection.query(
              `INSERT INTO menu_option_${newOptionNumber} 
              (item_name, ingredients, diet_type, image_url, meal_type)
              VALUES (?, ?, ?, ?, ?)`,
              [item.item_name, item.ingredients, item.diet_type, item.image_url, item.meal_type],
              (err) => {
                if (err) {
                  return connection.rollback(() => {
                    console.error('Error inserting menu item:', err);
                    res.status(500).json({ error: 'Internal server error' });
                  });
                }
                
                insertedItems++;
                if (insertedItems === menuItems.length) {
                  // Update tracker
                  connection.query(
                    'UPDATE menu_option_tracker SET last_option_number = ?',
                    [newOptionNumber],
                    (err) => {
                      if (err) {
                        return connection.rollback(() => {
                          console.error('Error updating tracker:', err);
                          res.status(500).json({ error: 'Internal server error' });
                        });
                      }

                      connection.commit((err) => {
                        if (err) {
                          return connection.rollback(() => {
                            console.error('Error committing transaction:', err);
                            res.status(500).json({ error: 'Internal server error' });
                          });
                        }
                        res.json({ message: 'Menu option created successfully', optionNumber: newOptionNumber });
                      });
                    }
                  );
                }
              }
            );
          });
        });
      });
    });
  });
});

// Add menu option to weekly menu
app.post('/api/add-menu-option', ensureAuthenticated, (req, res) => {
  const { menuOptionId, diningHallId, day } = req.body;
  
  connection.beginTransaction((err) => {
    if (err) {
      console.error('Error starting transaction:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }

    // First, get the meal type
    connection.query(
      `SELECT meal_type FROM menu_option_${menuOptionId} LIMIT 1`,
      (err, optionItems) => {
        if (err) {
          return connection.rollback(() => {
            console.error('Error getting meal type:', err);
            res.status(500).json({ error: 'Internal server error' });
          });
        }

        const mealType = optionItems[0].meal_type;

        // Remove existing items
        connection.query(
          'DELETE FROM weekly_menu WHERE dining_hall_id = ? AND day_of_week = ? AND meal_type = ?',
          [diningHallId, day, mealType],
          (err) => {
            if (err) {
              return connection.rollback(() => {
                console.error('Error removing existing menu items:', err);
                res.status(500).json({ error: 'Internal server error' });
              });
            }

            // Add new items
            connection.query(`
              INSERT INTO weekly_menu 
              (item_name, ingredients, meal_type, dining_hall_id, diet_type, image_url, day_of_week)
              SELECT 
                item_name, 
                ingredients, 
                meal_type, 
                ?, 
                diet_type, 
                image_url, 
                ?
              FROM menu_option_${menuOptionId}
            `, [diningHallId, day], (err) => {
              if (err) {
                return connection.rollback(() => {
                  console.error('Error adding new menu items:', err);
                  res.status(500).json({ error: 'Internal server error' });
                });
              }

              connection.commit((err) => {
                if (err) {
                  return connection.rollback(() => {
                    console.error('Error committing transaction:', err);
                    res.status(500).json({ error: 'Internal server error' });
                  });
                }
                res.json({ message: 'Menu option added to weekly menu successfully' });
              });
            });
          }
        );
      }
    );
  });
});

// Remove item from weekly menu
app.delete('/api/remove-menu-item', ensureAuthenticated, (req, res) => {
  const { itemId, diningHallId, day } = req.body;
  connection.query(
    'DELETE FROM weekly_menu WHERE id = ? AND dining_hall_id = ? AND day_of_week = ?',
    [itemId, diningHallId, day],
    (error) => {
      if (error) {
        console.error('Error removing menu item:', error);
        return res.status(500).json({ error: 'Internal server error' });
      }
      res.json({ message: 'Menu item removed successfully' });
    }
  );
});
///////////


// Define a route to fetch menu items based on dining hall and day
app.get('/api/menu',ensureAuthenticated, (req, res) => {
  const { dining_hall, day_of_week } = req.query;

  let query;
  let queryParams = [dining_hall];

  // If the request is for "Today", use the current day of the week
  if (day_of_week !== 'week') {
      query = `SELECT * FROM weekly_menu WHERE dining_hall_id = ? AND day_of_week = ?`;
      queryParams.push(day_of_week);
  } else {
      // If the request is for "Week", fetch all menu items for that dining hall
      query = `SELECT * FROM weekly_menu WHERE dining_hall_id = ?`;
  }

  connection.query(query, queryParams, (err, results) => {
      if (err) {
          console.error('Error fetching menu data:', err);
          res.status(500).send('Error fetching menu data');
      } else {
          res.json(results);  // Send results as JSON
      }
  });
});

// Add item to cart
app.post('/api/add-to-cart',ensureAuthenticated, (req, res) => {
  const { item, date } = req.body;
  const userId = req.user.id;  // Assuming you have user authentication

  // Query to check if the item already exists in the cart
  const checkDuplicateQuery = `
    SELECT * FROM cart_items 
    WHERE user_id = ? AND date = ? AND meal_type = ?
  `;

  connection.query(checkDuplicateQuery, [userId, date, item.meal_type], (err, results) => {
    if (err) {
      console.error('Error checking for duplicate cart items:', err);
      return res.status(500).json({ error: 'Failed to check cart items' });
    }

    if (results.length > 0) {
      // Duplicate found, return 409 Conflict
      return res.status(409).json({ error: 'Meal type already exists in the cart', duplicateItemId: results[0].id });
    } else {
      // No duplicate, proceed with inserting the item into the cart
      const insertQuery = `
        INSERT INTO cart_items (user_id, item_id, dining_hall_id, date, meal_type)
        VALUES (?, ?, ?, ?, ?)
      `;

      connection.query(insertQuery, [userId, item.id, item.dining_hall_id, date, item.meal_type], (err, result) => {
        if (err) {
          console.error('Error adding item to cart:', err);
          return res.status(500).json({ error: 'Failed to add item to cart' });
        } else {
          // Get the updated cart count
          connection.query('SELECT COUNT(*) as count FROM cart_items WHERE user_id = ?', [userId], (err, results) => {
            if (err) {
              console.error('Error getting cart count:', err);
              return res.status(500).json({ error: 'Failed to get cart count' });
            } else {
              return res.json({ message: 'Item added to cart', cartCount: results[0].count });
            }
          });
        }
      });
    }
  });
});

app.put('/api/cart-items/:id',ensureAuthenticated, (req, res) => {
  const { item, date } = req.body;
  const userId = req.user.id;  // Assuming you have user authentication
  const itemId = req.params.id;  // The ID of the existing cart item to replace

  const updateQuery = `
    UPDATE cart_items 
    SET item_id = ?, dining_hall_id = ?, date = ?, meal_type = ? 
    WHERE id = ? AND user_id = ?
  `;

  connection.query(updateQuery, [item.id, item.dining_hall_id, date, item.meal_type, itemId, userId], (err, result) => {
    if (err) {
      console.error('Error replacing item in cart:', err);
      return res.status(500).json({ error: 'Failed to replace item in cart' });
    } else {
      // Get the updated cart count
      connection.query('SELECT COUNT(*) as count FROM cart_items WHERE user_id = ?', [userId], (err, results) => {
        if (err) {
          console.error('Error getting cart count:', err);
          return res.status(500).json({ error: 'Failed to get cart count' });
        } else {
          return res.json({ message: 'Item replaced in cart', cartCount: results[0].count });
        }
      });
    }
  });
});

// Get cart items
app.get('/api/cart-items', ensureAuthenticated,(req, res) => {
  const userId = req.user.id;  // Assuming user authentication

  const query = `
      SELECT ci.id, ci.date, ci.meal_type, m.item_name, m.image_url, dh.name as dining_hall_name
      FROM cart_items ci
      JOIN weekly_menu m ON ci.item_id = m.id
      JOIN dining_halls dh ON ci.dining_hall_id = dh.id
      WHERE ci.user_id = ?
  `;

  connection.query(query, [userId], (err, results) => {
      if (err) {
          console.error('Error fetching cart items:', err);
          res.status(500).json({ error: 'Failed to fetch cart items' });
      } else {
          res.json(results);  // Return the fetched cart items including the image_url
      }
  });
});

// Route to get cart item count
app.get('/api/cart-count',ensureAuthenticated, (req, res) => {
  const userId = req.user.id;

  const query = `
      SELECT COUNT(*) as cartCount
      FROM cart_items
      WHERE user_id = ?
  `;

  connection.query(query, [userId], (err, results) => {
      if (err) {
          console.error('Error fetching cart count:', err);
          res.status(500).json({ error: 'Failed to fetch cart count' });
      } else {
          res.json({ cartCount: results[0].cartCount });
      }
  });
});

// Remove item from cart
app.delete('/api/remove-from-cart/:id', ensureAuthenticated,(req, res) => {
  const itemId = req.params.id;
  const userId = req.user.id; // Assuming you have user authentication in place

  const deleteQuery = 'DELETE FROM cart_items WHERE id = ? AND user_id = ?';
  const resetAutoIncrementQuery = 'ALTER TABLE cart_items AUTO_INCREMENT = ?';

  connection.beginTransaction((err) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to remove item from cart' });
    }

    connection.query(deleteQuery, [itemId, userId], (err, result) => {
      if (err) {
        return connection.rollback(() => {
          console.error('Error removing item from cart:', err);
          res.status(500).json({ error: 'Failed to remove item from cart' });
        });
      }

      // Get the current max ID after deletion
      connection.query('SELECT MAX(id) AS max_id FROM cart_items', (err, results) => {
        if (err) {
          return connection.rollback(() => {
            console.error('Error fetching max id:', err);
            res.status(500).json({ error: 'Failed to reset auto-increment' });
          });
        }

        const maxId = results[0].max_id || 0;
        const newAutoIncrementValue = maxId + 1;

        // Reset the auto-increment value
        connection.query(resetAutoIncrementQuery, [newAutoIncrementValue], (err, result) => {
          if (err) {
            return connection.rollback(() => {
              console.error('Error resetting auto-increment:', err);
              res.status(500).json({ error: 'Failed to reset auto-increment' });
            });
          }

          connection.commit((err) => {
            if (err) {
              return connection.rollback(() => {
                console.error('Transaction commit failed:', err);
                res.status(500).json({ error: 'Failed to remove item from cart' });
              });
            }

            res.json({ message: 'Item removed from cart and auto-increment reset' });
          });
        });
      });
    });
  });
});

// Helper function to group cart items by date
function groupCartItemsByDate(cartItems) {
  return cartItems.reduce((acc, item) => {
      if (!acc[item.date]) {
          acc[item.date] = [];
      }
      acc[item.date].push(item);
      return acc;
  }, {});
}

// Helper functions to get meal start and end times
function getMealStartTime(mealType) {
  switch (mealType.toLowerCase()) {
      case 'breakfast': return '07:00:00';
      case 'lunch': return '11:00:00';
      case 'dinner': return '16:00:00';
      default: return '00:00:00';
  }
}

function getMealEndTime(mealType) {
  switch (mealType.toLowerCase()) {
      case 'breakfast': return '09:00:00';
      case 'lunch': return '14:00:00';
      case 'dinner': return '19:00:00';
      default: return '23:59:59';
  }
}
app.get('/get-userrole', (req, res) => {
  if (req.isAuthenticated()) {
    const role = req.user.role; // Get the role from the user session
    res.json({ role }); // Send the role as a JSON response
  } else {
    res.status(401).json({ error: "User not authenticated" });
  }
});

app.get('/get-useremail', (req, res) => {
  if (req.isAuthenticated()) {
    const email = req.user.email; // Get the email from the user session
    res.json({ email }); // Send the email as a JSON response
  } else {
    res.status(401).json({ error: "User not authenticated" });
  }
});

app.get("/user-profile",ensureAuthenticated, (req, res) => {
  // Assuming user ID is stored in req.user after authentication
  const userId = req.user.id; // Adjust as necessary

  connection.query("SELECT id, email, role FROM users WHERE id = ?", [userId], (err, results) => {
    if (err) {
      console.error("Database query error:", err);
      return res.status(500).json({ msg: "Server Error: Database query failed" });
    }

    if (results.length === 0) {
      return res.status(404).json({ msg: "User not found." });
    }

    // Return user data (excluding sensitive information)
    const user = results[0];
    return res.status(200).json({ id: user.id, email: user.email, role: user.role });
  });
});

app.post("/change-password",ensureAuthenticated, async (req, res) => {
  const { oldPassword, newPassword, confirmPassword } = req.body;

  // Validate input fields
  if (!oldPassword || !newPassword || !confirmPassword) {
    return res.status(400).json({ msg: "All fields are required." });
  }

  // Validate new password requirements
  if (
    newPassword.length < 8 ||
    !/[A-Z]/.test(newPassword) ||
    !/[a-z]/.test(newPassword) ||
    !/[!@#$%^&*]/.test(newPassword)
  ) {
    return res.status(400).json({
      msg: "New password must be at least 8 characters long and include at least one uppercase letter, one lowercase letter, and one special character.",
    });
  }

  // Check if new password matches confirm password
  if (newPassword !== confirmPassword) {
    return res.status(400).json({ msg: "New password and confirm password do not match." });
  }

  try {
    // Assuming user ID is stored in req.user after authentication
    const userId = req.user.id; // Adjust as necessary

    connection.query("SELECT * FROM users WHERE id = ?", [userId], async (err, results) => {
      if (err) {
        console.error("Database query error:", err);
        return res.status(500).json({ msg: "Server Error: Database query failed" });
      }

      if (results.length === 0) {
        return res.status(404).json({ msg: "User not found." });
      }

      const user = results[0];
      const isMatch = await bcrypt.compare(oldPassword.trim(), user.password); // Trimmed comparison

      if (!isMatch) {
        return res.status(400).json({ msg: "Old password is incorrect." });
      }

      // Hash the new password
      const hashedNewPassword = await bcrypt.hash(newPassword, 10);

      // Update the password in the database
      connection.query("UPDATE users SET password = ? WHERE id = ?", [hashedNewPassword, userId], (err) => {
        if (err) {
          console.error("Error updating password:", err);
          return res.status(500).json({ msg: "Server Error: Unable to update password." });
        }

        return res.status(200).json({ msg: "Password updated successfully." });
      });
    });
  } catch (err) {
    console.error("Unexpected error:", err);
    res.status(500).json({
      msg: `Server Error: Unexpected error occurred - ${err.message}`,
    });
  }
});

app.get('/notifications', ensureAuthenticated,(req, res) => {
  const userId = req.user.id; // Access the user ID from the request

  const query = `
      SELECT n.id, n.title, n.message, n.dining_hall, 
             un.is_read, n.created_at 
      FROM notifications n
      LEFT JOIN user_notifications un ON n.id = un.notification_id AND un.user_id = ?
      ORDER BY n.created_at DESC
  `;

  connection.query(query, [userId], (err, notifications) => {
      if (err) {
          console.error('Error fetching notifications:', err);
          return res.status(500).send('Internal Server Error');
      }

      // Map the notifications to a user-friendly format
      const formattedNotifications = notifications.map(notification => ({
          id: notification.id,
          title: notification.title,
          message: notification.message,
          is_read: notification.is_read ? notification.is_read : false, // Default to false if not found
          created_at: new Date(notification.created_at).toLocaleString() // Format the timestamp
      }));

      // Send the notifications back to the client
      res.json(formattedNotifications);
  });
});

app.post('/notifications',ensureAuthenticated, (req, res) => {
  const { title, message, dining_hall } = req.body;

  if (!title || !message || !dining_hall) {
      return res.status(400).send('All fields are required');
  }

  // Insert the notification into the notifications table
  const query = 'INSERT INTO notifications (title, message, dining_hall) VALUES (?, ?, ?)';
  
  connection.query(query, [title, message, dining_hall], (err, result) => {
      if (err) {
          console.error('Error inserting notification:', err);
          return res.status(500).send('Internal Server Error');
      }

      // Insert an entry for each user in the user_notifications table
      const notificationId = result.insertId;
      const userQuery = 'SELECT id FROM users';

      connection.query(userQuery, (err, users) => {
          if (err) {
              console.error('Error fetching users:', err);
              return res.status(500).send('Internal Server Error');
          }

          const insertPromises = users.map(user => {
              return new Promise((resolve, reject) => {
                  const userNotificationQuery = 'INSERT INTO user_notifications (user_id, notification_id) VALUES (?, ?)';
                  connection.query(userNotificationQuery, [user.id, notificationId], (err) => {
                      if (err) {
                          return reject(err);
                      }
                      resolve();
                  });
              });
          });

          Promise.all(insertPromises)
              .then(() => {
                  // Emit notification to all connected clients if needed
                  const notificationPayload = {
                      id: notificationId,
                      title,
                      message,
                      dining_hall,
                  };
                  io.emit('new_notification', notificationPayload);
                  res.sendStatus(200);
              })
              .catch(() => {
                  res.status(500).send('Internal Server Error');
              });
      });
  });
});

// Endpoint to mark a notification as read
app.post('/notifications/:id/read',ensureAuthenticated, (req, res) => {
  const notificationId = req.params.id;
  const userId = req.user.id;

  // Update the read status for the user
  const query = 'UPDATE user_notifications SET is_read = 1 WHERE notification_id = ? AND user_id = ?';

  connection.query(query, [notificationId, userId], (err, result) => {
      if (err) {
          console.error('Error updating notification read status:', err);
          return res.status(500).send('Internal Server Error');
      }

      if (result.affectedRows > 0) {
          res.sendStatus(200); // Successfully updated
      } else {
          res.status(404).send('Notification not found'); // No matching notification
      }
  });
});

// Route to handle meal plan selection
app.post("/selectPlan", (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ msg: 'Unauthorized' }); // Ensure user is authenticated
  }
  
  const { selectedPlan } = req.body;
  const user_id = req.user.id;
  console.log(user_id, selectedPlan);

  const query = `
    INSERT INTO meal_credits (user_id, plan_name, total_credits, used_credits)
    VALUES (?, ?, ?, 0)
    ON DUPLICATE KEY UPDATE plan_name = VALUES(plan_name), total_credits = VALUES(total_credits)
  `;

  let total_credits = 0;
  if (selectedPlan === 'thrice-daily') {
    total_credits = 35000;
  } else if (selectedPlan === 'twice-daily') {
    total_credits = 25000;
  }

  connection.query(query, [user_id, selectedPlan, total_credits, total_credits], (err, result) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ msg: 'Error saving meal plan' });
    }
    res.status(200).json({ msg: 'Meal plan saved or updated' });
  });
});

app.get('/get-meal-plan', (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: 'User not authenticated' });
  }

  const user_id = req.user.id;
  console.log('Authenticated user ID:', user_id);  // Add this logging to check user

  connection.query(
    "SELECT plan_name FROM meal_credits WHERE user_id = ?",
    [user_id],
    (err, result) => {
      if (err) {
        return res.status(500).json({ msg: 'Error retrieving meal plan' });
      }
      if (result.length > 0) {
        res.status(200).json({ plan_name: result[0].plan_name });
      } else {
        res.status(404).json({ msg: 'No meal plan found' });
      }
    }
  );
});

//infrastructure booking api connection
const infrastructureApiKey = process.env.INFRASTRUCTURE_API_KEY;

app.get('/api/dining/bookings', ensureAuthenticated,async (req, res) => {
  try {
    const infrastructureApiUrl = 'https://wits-infrastructure-management.web.app/'; // Replace with actual API URL

    // Fetch bookings from the Infrastructure System API, passing the API key
    const response = await axios.get(infrastructureApiUrl, {
      headers: {
        'Authorization': `Bearer ${infrastructureApiKey}` // Include API key in the request headers
      }
    });

    const bookings = response.data;

    // Filter for dining hall bookings
    const diningHallBookings = bookings.filter(booking => booking.venueType === 'Dining hall');

    // Send the filtered dining hall bookings to the frontend
    res.json(diningHallBookings);
  } catch (error) {
    console.error('Error fetching dining hall bookings:', error);
    res.status(500).json({ message: 'Failed to fetch dining hall bookings' });
  }
});

// Removed the mark-as-read endpoint


io.on('connection', (socket) => {
  console.log('A user connected');

  // Handle disconnect
  socket.on('disconnect', () => {
    console.log('User disconnected');
  });
});


// Start the server
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
// Export the app for testing
module.exports = app;
