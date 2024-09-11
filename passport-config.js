// passport-config.js
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const Sequelize = require('sequelize');

// Configure Sequelize for MySQL
const sequelize = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASSWORD, {
    host: process.env.DB_HOST,
    dialect: 'mysql',
    port: process.env.DB_PORT || 3306,
    ssl: {
        ca: process.env.SSL_CA,
        rejectUnauthorized: false,
    }
});

// Define the User model
const User = sequelize.define('user', {
    google_id: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true
    },
    email: {
        type: Sequelize.STRING,
        allowNull: false
    },
    name: Sequelize.STRING,
    picture: Sequelize.STRING
});

// Set up the Google Strategy
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: 'http://localhost:3000/auth/google/callback'
},
async (token, tokenSecret, profile, done) => {
    try {
        const user = await User.findOrCreate({
            where: { google_id: profile.id },
            defaults: {
                email: profile.emails[0].value,
                name: profile.displayName,
                picture: profile.photos[0].value
            }
        });
        return done(null, user[0]);
    } catch (err) {
        return done(err);
    }
}));

// Serialize and Deserialize User
passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findByPk(id);
        done(null, user);
    } catch (err) {
        done(err);
    }
});

module.exports = passport;
