const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const GoogleStrategy = require('passport-google-oauth20').Strategy;
// const FacebookStrategy = require('passport-facebook').Strategy;
// const TwitterStrategy = require('passport-twitter').Strategy;
// const GitHubStrategy = require('passport-github').Strategy;
const multer = require('multer');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.json());
app.use(session({ secret: 'secret', resave: false, saveUninitialized: false }));
app.use(passport.initialize());
app.use(passport.session());

// User model and data (in-memory storage for demonstration)
let users = [];
let userIdCounter = 1;

// Configure Passport Strategies
passport.use(
  new LocalStrategy({ usernameField: "email" }, (email, password, done) => {
    const user = users.find((user) => user.email === email);
    if (!user) {
      return done(null, false, { message: "Incorrect email" });
    }
    // Simple password check for demonstration (Replace with proper hashing in production)
    if (user.password !== password) {
      return done(null, false, { message: "Incorrect password" });
    }
    return done(null, user);
  })
);


// Google OAuth strategy
passport.use(new GoogleStrategy({
  clientID: 'google_client_id',
  clientSecret: 'google_client_secret',
  callbackURL: 'http://localhost:3000/auth/google/callback'
}, (accessToken, refreshToken, profile, done) => {
  const user = {
    id: userIdCounter++,
    email: profile.emails[0].value,
    name: profile.displayName,
    photo: profile.photos[0].value,
    isPublic: true // Google users are public by default
  };
  users.push(user);
  return done(null, user);
}));

// Facebook OAuth strategy
// Implement Facebook OAuth strategy similarly to Google

// Twitter OAuth strategy
// Implement Twitter OAuth strategy similarly to Google

// GitHub OAuth strategy
// Implement GitHub OAuth strategy similarly to Google

// Serialize and deserialize user
passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser((id, done) => {
  const user = users.find(user => user.id === id);
  done(null, user);
});

// Authentication middleware
function isAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: 'Unauthorized' });
}

// User registration
app.post('/register', (req, res) => {
  const { email, password } = req.body;
  const existingUser = users.find(user => user.email === email);
  if (existingUser) {
    return res.status(400).json({ message: 'Email already exists' });
  }
  const newUser = {
    id: userIdCounter++,
    email,
    password // Password should be hashed in production
  };
  users.push(newUser);
  res.status(201).json({ message: 'User registered successfully' });
});

// User login
app.post('/login', passport.authenticate('local'), (req, res) => {
  res.json({ message: 'Login successful' });
});

// OAuth login routes
// Implement routes for Google, Facebook, Twitter, and GitHub OAuth login

// User logout
app.get('/logout', (req, res) => {
  req.logout();
  res.json({ message: 'Logged out successfully' });
});

// Get current user profile
app.get('/profile', isAuthenticated, (req, res) => {
  const { id, name, email, photo, isPublic } = req.user;
  res.json({ id, name, email, photo, isPublic });
});

// Update user profile
app.put('/profile', isAuthenticated, (req, res) => {
  const { name, bio, phone, email, password, isPublic } = req.body;
  const user = req.user;
  if (name) user.name = name;
  if (bio) user.bio = bio;
  if (phone) user.phone = phone;
  if (email) user.email = email;
  if (password) user.password = password; // Password should be hashed in production
  if (isPublic !== undefined) user.isPublic = isPublic;
  res.json({ message: 'Profile updated successfully', user });
});

// Upload profile photo
const storage = multer.diskStorage({
  destination: 'uploads/',
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const upload = multer({ storage });

app.post('/profile/photo', isAuthenticated, upload.single('photo'), (req, res) => {
  const user = req.user;
  const oldPhotoPath = user.photo;
  if (oldPhotoPath) {
    fs.unlinkSync(oldPhotoPath);
  }
  user.photo = req.file.path;
  res.json({ message: 'Photo uploaded successfully', photo: user.photo });
});

// Make profile public or private
app.put('/profile/visibility', isAuthenticated, (req, res) => {
  const { isPublic } = req.body;
  const user = req.user;
  user.isPublic = isPublic;
  res.json({ message: `Profile visibility set to ${isPublic ? 'public' : 'private'}` });
});

// Get public user profiles
app.get('/profiles', (req, res) => {
  const publicUsers = users.filter(user => user.isPublic);
  const publicProfiles = publicUsers.map(({ id, name, email, photo }) => ({ id, name, email, photo }));
  res.json({ profiles: publicProfiles });
});

// Get all user profiles (only accessible to admin users)
app.get('/profiles/all', isAuthenticated, (req, res) => {
  if (req.user.isAdmin) {
    res.json({ profiles: users });
  } else {
    res.status(403).json({ message: 'Forbidden' });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
