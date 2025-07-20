const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const cookieParser = require("cookie-parser");
const { v4: uuidv4 } = require("uuid");
const path = require("path");
const session = require("express-session");
const jwt = require("jsonwebtoken");
const multer = require('multer');
const { getStorage } = require('firebase-admin/storage');
const nodemailer = require('nodemailer');
const fs = require('fs');
require('dotenv').config();

// Firebase Admin Setup
let serviceAccount;
if (process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
  try {
    serviceAccount = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);
  } catch (e) {
    console.error("FATAL: GOOGLE_APPLICATION_CREDENTIALS_JSON is not valid JSON.");
    process.exit(1);
  }
} else {
  try {
    serviceAccount = require(path.join(__dirname, "serviceAccountKey.json"));
  } catch (e) {
    console.error("FATAL: Could not load service account from environment variable or serviceAccountKey.json.");
    process.exit(1);
  }
}

const admin = require("firebase-admin");
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://volunteerhub-9ae56.firebaseio.com",
  storageBucket: "volunteerhub-9ae56.appspot.com"
});

const db = admin.firestore();
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware Setup
app.use(cors({
  origin: [
    "http://127.0.0.1:5500",
    "http://localhost:5500",
    "http://127.0.0.1:3000",
    "http://localhost:3000",
    "http://127.0.0.1:3001",
    "http://localhost:3001",
    "https://neighborhood-liard.vercel.app",
    "https://neighborhood-1bs9w1ohe-aeresals-projects.vercel.app"
  ],
  credentials: true,
  methods: ["GET", "POST", "DELETE", "PUT", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

// Add debugging middleware RIGHT AFTER CORS
app.use((req, res, next) => {
  console.log(`📝 ${req.method} ${req.path} - Origin: ${req.get('Origin') || 'none'}`);
  console.log('Headers:', {
    'content-type': req.get('content-type'),
    'authorization': req.get('authorization') ? 'Bearer ***' : 'none',
    'content-length': req.get('content-length') || '0'
  });
  
  // Log raw body for debugging
  if (req.method === 'POST' || req.method === 'PUT') {
    console.log('Raw body type:', typeof req.body);
    console.log('Body keys:', req.body ? Object.keys(req.body) : 'no body');
    if (req.body && Object.keys(req.body).length > 0) {
      console.log('Body content:', JSON.stringify(req.body, null, 2));
    }
  }
  
  next();
});

app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));
app.use(session({
  secret: process.env.SESSION_SECRET || "volunteerhub_secret",
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, httpOnly: true, maxAge: 7 * 24 * 60 * 60 * 1000 }
}));

// Multer configuration for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image files are allowed!'));
    }
    cb(null, true);
  }
});

// Authentication Middleware
function authenticateJWT(req, res, next) {
  let token = null;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }
  if (!token) return res.status(401).json({ message: 'No token provided' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'volunteerhub_jwt_secret');
    req.userID = decoded.userID;
    req.username = decoded.username;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
}

// Utility Functions
async function ensureActivityIdsForUser(username) {
  const activitiesRef = db.collection('activities').doc(username);
  const doc = await activitiesRef.get();
  if (!doc.exists) return;
  let activitiesArr = doc.data().activities || [];
  let changed = false;
  activitiesArr = activitiesArr.map(act => {
    if (!act.id) {
      changed = true;
      return { ...act, id: uuidv4() };
    }
    return act;
  });
  if (changed) {
    await activitiesRef.set({ activities: activitiesArr }, { merge: true });
  }
}

// Routes
app.get("/", (req, res) => {
  res.json({ 
    message: "VolunteerHub Backend API", 
    version: "1.0.0",
    status: "running",
    endpoints: [
      "POST /signup",
      "POST /login", 
      "GET /validate-session",
      "POST /logout",
      "POST /activities",
      "GET /activities/:username",
      "DELETE /activities/:id",
      "GET /users",
      "GET /leaderboard",
      "GET /api/community-posts",
      "POST /api/community-posts",
      "GET /api/friends/search",
      "POST /api/friends/add",
      "GET /themes",
      "POST /themes",
      "GET /api/mapbox-key"
    ]
  });
});

// Add test endpoint after the root route
app.get("/test", (req, res) => {
  res.json({ 
    message: "Test endpoint working!",
    timestamp: new Date().toISOString(),
    method: req.method,
    path: req.path
  });
});

// Add Firebase connectivity test endpoint
app.get("/test-firebase", async (req, res) => {
  try {
    console.log("🔥 Testing Firebase connectivity...");
    
    // Test 1: Check if Firebase Admin is initialized
    const app = admin.app();
    console.log("✅ Firebase Admin SDK initialized:", app.name);
    
    // Test 2: Test Firestore connection
    const testDoc = db.collection('_test').doc('connectivity');
    const timestamp = new Date().toISOString();
    
    // Try to write to Firestore
    await testDoc.set({
      message: "Firebase connectivity test",
      timestamp: timestamp,
      status: "connected"
    });
    console.log("✅ Firestore write test successful");
    
    // Try to read from Firestore
    const doc = await testDoc.get();
    const data = doc.data();
    console.log("✅ Firestore read test successful:", data);
    
    // Test 3: Test Firebase Storage (optional)
    let storageStatus = "not tested";
    try {
      const bucket = getStorage().bucket();
      const bucketName = bucket.name;
      storageStatus = `connected to bucket: ${bucketName}`;
      console.log("✅ Firebase Storage accessible:", bucketName);
    } catch (storageError) {
      storageStatus = `error: ${storageError.message}`;
      console.warn("⚠️ Firebase Storage test failed:", storageError.message);
    }
    
    // Clean up test document
    await testDoc.delete();
    console.log("🧹 Cleaned up test document");
    
    res.json({
      status: "success",
      message: "Firebase connectivity test passed",
      results: {
        admin: "initialized",
        firestore: "connected",
        storage: storageStatus,
        timestamp: timestamp
      },
      firebase_project: serviceAccount.project_id,
      database_url: "https://volunteerhub-9ae56.firebaseio.com"
    });
    
  } catch (error) {
    console.error("❌ Firebase connectivity test failed:", error);
    
    res.status(500).json({
      status: "error",
      message: "Firebase connectivity test failed",
      error: {
        name: error.name,
        message: error.message,
        code: error.code || "unknown",
        details: error.details || "no additional details"
      },
      troubleshooting: {
        check_service_account: "Verify serviceAccountKey.json is valid",
        check_firestore: "Ensure Firestore is enabled in Firebase Console",
        check_rules: "Verify Firestore security rules allow operations",
        check_network: "Ensure server can reach Firebase services"
      }
    });
  }
});

// Test specific Firebase collections
app.get("/test-collections", async (req, res) => {
  try {
    console.log("📋 Testing Firebase collections...");
    
    const collections = ['users', 'userData', 'activities', 'communityPosts', 'themes'];
    const results = {};
    
    for (const collectionName of collections) {
      try {
        const snapshot = await db.collection(collectionName).limit(1).get();
        results[collectionName] = {
          status: "accessible",
          exists: !snapshot.empty,
          documentCount: snapshot.size
        };
        console.log(`✅ Collection '${collectionName}': ${snapshot.size} documents`);
      } catch (error) {
        results[collectionName] = {
          status: "error",
          error: error.message
        };
        console.error(`❌ Collection '${collectionName}' error:`, error.message);
      }
    }
    
    res.json({
      status: "success",
      message: "Collection accessibility test completed",
      collections: results,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error("❌ Collection test failed:", error);
    res.status(500).json({
      status: "error",
      message: "Collection test failed",
      error: error.message
    });
  }
});

// Authentication Routes
app.post("/signup", async (req, res) => {
  try {
    const { firstName, lastName, email, phoneNumber, username, password, zipCode } = req.body;

    if (!firstName || !lastName || !email || !username || !password) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const safePhoneNumber = typeof phoneNumber === "undefined" ? "" : phoneNumber;

    // Check if username exists
    const userRef = db.collection("users").doc(username);
    const userDoc = await userRef.get();
    if (userDoc.exists) {
      return res.status(400).json({ message: "Username already exists" });
    }

    // Check if email exists
    const emailQuery = await db.collection("users").where("email", "==", email).get();
    if (!emailQuery.empty) {
      return res.status(400).json({ message: "Email already registered" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const userID = uuidv4();

    const newUser = {
      userID,
      firstName,
      lastName,
      email,
      phoneNumber: safePhoneNumber,
      zipCode,
      password: hashedPassword
    };

    await db.collection("users").doc(username).set(newUser);

    const userData = {
      name: `${firstName} ${lastName}`,
      email,
      preferences: {},
      activities: []
    };
    await db.collection("userData").doc(userID).set(userData);

    res.status(201).json({ message: "User registered successfully", userID });
  } catch (error) {
    console.error("Signup error", error);
    res.status(500).json({ message: "Server error" });
  }
});

app.post("/login", async (req, res) => {
  try {
    const { username, password, rememberMe } = req.body;
    let user;
    const userRef = db.collection("users").doc(username);
    const userDoc = await userRef.get();
    if (userDoc.exists) {
      user = userDoc.data();
    }
    if (!user) return res.status(401).json({ message: "User does not exist" });
    if (!(await bcrypt.compare(password, user.password))) return res.status(401).json({ message: "Incorrect password" });
    
    const token = jwt.sign({ userID: user.userID, username }, process.env.JWT_SECRET || "volunteerhub_jwt_secret", { expiresIn: "7d" });
    res.status(200).json({ message: "Login successful", userID: user.userID, username, token });
  } catch (error) {
    console.error("Login error", error);
    res.status(500).json({ message: "Server error" });
  }
});

app.get("/validate-session", (req, res) => {
  const { token } = req.query;
  if (!token) return res.status(400).json({ valid: false, message: "Token missing" });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "volunteerhub_jwt_secret");
    res.status(200).json({ valid: true, userID: decoded.userID, username: decoded.username });
  } catch (error) {
    res.status(401).json({ valid: false, message: "Invalid or expired token" });
  }
});

app.post("/logout", (req, res) => {
  res.clearCookie("username");
  req.session.destroy();
  res.status(200).json({ message: "Logged out successfully" });
});

// Activity Routes
app.get('/get-activities', authenticateJWT, async (req, res) => {
  try {
    const userDataRef = db.collection('userData').doc(req.userID);
    const userDataDoc = await userDataRef.get();
    if (!userDataDoc.exists) return res.status(404).json({ activities: [] });
    const userData = userDataDoc.data();
    res.status(200).json({ activities: userData.activities || [] });
  } catch (error) {
    console.error('Get activities error', error);
    res.status(500).json({ activities: [] });
  }
});

app.post('/add-activity', authenticateJWT, async (req, res) => {
  try {
    const { title, place, activityDate, startTime, endTime, supervisorName, supervisorEmail } = req.body;
    const userDataRef = db.collection('userData').doc(req.userID);
    const userDataDoc = await userDataRef.get();
    if (!userDataDoc.exists) return res.status(404).json({ message: 'User data not found' });
    const userData = userDataDoc.data();
    const newActivity = {
      title,
      place,
      activityDate,
      startTime,
      endTime,
      supervisorName,
      supervisorEmail
    };
    const updatedActivities = userData.activities ? [...userData.activities, newActivity] : [newActivity];
    await userDataRef.update({ activities: updatedActivities });
    res.status(201).json({ message: 'Activity added successfully' });
  } catch (error) {
    console.error('Add activity error', error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/activities', authenticateJWT, async (req, res) => {
  try {
    console.log('POST /activities incoming body:', req.body);
    const { name, date, start_time, end_time, location, supervisorName, supervisorEmail } = req.body;
    if (!name || !date || !start_time || !end_time || !location || !supervisorName || !supervisorEmail) {
      console.error('Missing required activity fields', req.body);
      return res.status(400).json({ message: 'Missing required activity fields' });
    }
    
    const activitiesRef = db.collection('activities').doc(req.username);
    const doc = await activitiesRef.get();
    let activitiesArr = [];
    if (doc.exists) {
      const data = doc.data();
      activitiesArr = data.activities || [];
    }
    const newActivity = {
      id: uuidv4(),
      name,
      date,
      start_time,
      end_time,
      location,
      supervisorName,
      supervisorEmail,
      approved: false
    };
    activitiesArr.push(newActivity);
    await activitiesRef.set({ activities: activitiesArr }, { merge: true });
    res.status(201).json({ message: 'Activity added successfully' });
  } catch (error) {
    console.error('Add activity error', error, req.body);
    res.status(500).json({ message: 'Server error' });
  }
});

app.get('/activities/:username', authenticateJWT, async (req, res) => {
  try {
    const { username } = req.params;
    await ensureActivityIdsForUser(username);
    const doc = await db.collection('activities').doc(username).get();
    if (!doc.exists) return res.status(200).json({ activities: [] });
    const data = doc.data();
    res.status(200).json({ activities: data.activities || [] });
  } catch (error) {
    console.error('Get activities error', error);
    res.status(500).json({ activities: [] });
  }
});

app.delete('/activities/:id', authenticateJWT, async (req, res) => {
  const activityId = req.params.id;
  if (!activityId) {
    return res.status(400).json({ message: 'Activity ID is required.' });
  }
  try {
    await ensureActivityIdsForUser(req.username);
    const activitiesRef = db.collection('activities').doc(req.username);
    const doc = await activitiesRef.get();
    if (!doc.exists) {
      return res.status(404).json({ message: 'No activities found for user.' });
    }
    let activitiesArr = doc.data().activities || [];
    const initialLength = activitiesArr.length;
    activitiesArr = activitiesArr.filter(act => act.id !== activityId);
    if (activitiesArr.length === initialLength) {
      return res.status(404).json({ message: 'Activity not found.' });
    }
    await activitiesRef.set({ activities: activitiesArr }, { merge: true });
    res.json({ message: 'Activity deleted successfully.' });
  } catch (err) {
    res.status(500).json({ message: 'Error deleting activity.', error: err.message });
  }
});

// Signature Routes
app.post('/send-signature-request', authenticateJWT, async (req, res) => {
  try {
    const { name, date, start_time, end_time, location, supervisorName, supervisorEmail } = req.body;
    if (!name || !date || !start_time || !end_time || !location || !supervisorName || !supervisorEmail) {
      return res.status(400).json({ message: 'Missing required activity fields' });
    }

    const signatureToken = uuidv4();

    const activitiesRef = db.collection('activities').doc(req.username);
    const doc = await activitiesRef.get();
    let activitiesArr = [];
    if (doc.exists) {
      activitiesArr = doc.data().activities || [];
    }
    const idx = activitiesArr.findIndex(
      a => a.name === name && a.date === date && a.start_time === start_time && a.end_time === end_time && a.location === location
    );
    if (idx === -1) return res.status(404).json({ message: "Activity not found" });
    activitiesArr[idx].signatureToken = signatureToken;
    activitiesArr[idx].signed = false;
    await activitiesRef.set({ activities: activitiesArr }, { merge: true });

    const userRef = db.collection('users').doc(req.username);
    const userDoc = await userRef.get();
    let submitterName = req.username;
    let studentEmail = '';
    if (userDoc.exists) {
      const userData = userDoc.data();
      submitterName = userData.firstName && userData.lastName ? `${userData.firstName} ${userData.lastName}` : req.username;
      studentEmail = userData.email || '';
    }

    const templatePath = path.join(__dirname, 'email_template.html');
    let emailHtml = fs.readFileSync(templatePath, 'utf8');
    let baseUrl;
    if (process.env.NODE_ENV === 'development') {
      baseUrl = 'http://localhost:3000';
    } else {
      baseUrl = 'https://neighborhood-liard.vercel.app';
    }
    const signatureFormUrl = `${baseUrl}/signature-form.html?token=${signatureToken}`;
    emailHtml = emailHtml
      .replace(/{{supervisorName}}/g, supervisorName)
      .replace(/{{submitterName}}/g, submitterName)
      .replace(/{{name}}/g, name)
      .replace(/{{date}}/g, date)
      .replace(/{{start_time}}/g, start_time)
      .replace(/{{end_time}}/g, end_time)
      .replace(/{{location}}/g, location)
      .replace(/{{studentEmail}}/g, studentEmail)
      .replace(/{{signatureFormUrl}}/g, signatureFormUrl);

    const transporter = nodemailer.createTransporter({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    const mailOptions = {
      from: `VolunteerHub <${process.env.EMAIL_USER}>`,
      to: supervisorEmail,
      subject: `Signature Request for Activity: ${name}`,
      html: emailHtml
    };

    await transporter.sendMail(mailOptions);
    res.status(200).json({ message: 'Signature request email sent to supervisor.' });
  } catch (error) {
    console.error('Send signature request error', error);
    res.status(500).json({ message: 'Failed to send signature request email.' });
  }
});

app.get('/activity-by-token/:token', async (req, res) => {
  const { token } = req.params;
  try {
    const snapshot = await db.collection('activities').get();
    let found = null;
    snapshot.forEach(doc => {
      const activities = doc.data().activities || [];
      const match = activities.find(a => a.signatureToken === token);
      if (match) found = { ...match, username: doc.id };
    });
    if (!found || found.signed) return res.status(404).send();
    res.json(found);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

app.post('/sign-activity/:token', async (req, res) => {
  const { token } = req.params;
  const { signature } = req.body;
  try {
    const snapshot = await db.collection('activities').get();
    let updated = false;
    for (const doc of snapshot.docs) {
      const activities = doc.data().activities || [];
      const idx = activities.findIndex(a => a.signatureToken === token);
      if (idx !== -1 && !activities[idx].signed) {
        activities[idx].signed = true;
        activities[idx].signatureData = signature;
        await db.collection('activities').doc(doc.id).update({ activities });
        updated = true;
        break;
      }
    }
    if (!updated) return res.status(404).send();
    res.json({ message: "Signed!" });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// User Routes
app.get('/users', authenticateJWT, async (req, res) => {
  try {
    const userRef = db.collection('users').doc(req.username);
    const userDoc = await userRef.get();
    if (!userDoc.exists) return res.status(404).json({});
    const userData = userDoc.data();
    if (userData && userData.password) delete userData.password;

    const userDataRef = db.collection('userData').doc(req.userID);
    const userDataDoc = await userDataRef.get();
    let activities = [];
    if (userDataDoc.exists) {
      const userDataObj = userDataDoc.data();
      activities = userDataObj.activities || [];
    }
    userData.activities = activities;

    res.status(200).json(userData);
  } catch (error) {
    console.error('Get user info error', error);
    res.status(500).json({});
  }
});

app.put('/users', authenticateJWT, async (req, res) => {
  try {
    const { username, firstName, lastName, email, phone, profilePic } = req.body;
    const userRef = db.collection('users').doc(req.username);
    const userDoc = await userRef.get();
    if (!userDoc.exists) return res.status(404).json({ message: 'User not found' });

    const updates = {};
    if (username) updates.username = username;
    if (firstName) updates.firstName = firstName;
    if (lastName) updates.lastName = lastName;
    if (email) updates.email = email;
    if (phone) updates.phone = phone;
    if (profilePic) updates.profilePic = profilePic;

    await userRef.update(updates);
    res.status(200).json({ message: 'Profile updated' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Dashboard Route
app.get("/dashboard.html", (req, res) => {
  let userName = "";
  if (req.session && req.session.username) {
    userName = req.session.username;
  } else if (req.query && req.query.username) {
    userName = req.query.username;
  } else {
    userName = "Guest";
  }
  const dashboardPath = path.join(__dirname, "public", "dashboard.html");
  fs.readFile(dashboardPath, "utf8", (err, html) => {
    if (err) return res.status(500).send("Error loading dashboard");
    const replaced = html.replace(/const userName = ".*?";/, `const userName = "${userName}";`);
    res.send(replaced);
  });
});

// Leaderboard Route
app.get('/leaderboard', async (req, res) => {
  try {
    const snapshot = await db.collection('activities').get();
    const users = [];
    for (const doc of snapshot.docs) {
      const username = doc.id;
      const activities = doc.data().activities || [];
      let approvedHours = 0;
      let unapprovedHours = 0;
      for (const act of activities) {
        let hours = 0;
        if (act.start_time && act.end_time) {
          const [sh, sm] = act.start_time.split(':').map(Number);
          const [eh, em] = act.end_time.split(':').map(Number);
          let diff = (eh * 60 + em) - (sh * 60 + sm);
          if (diff < 0) diff += 24 * 60;
          hours = diff / 60;
        }
        if (act.signed) {
          approvedHours += hours;
        } else {
          unapprovedHours += hours;
        }
      }
      users.push({ username, approvedHours, unapprovedHours });
    }
    users.sort((a, b) => b.approvedHours - a.approvedHours);
    const leaderboard = [];
    for (const user of users) {
      let displayName = user.username;
      try {
        const userDoc = await db.collection('users').doc(user.username).get();
        if (userDoc.exists) {
          const d = userDoc.data();
          if (d.firstName || d.lastName) displayName = `${d.firstName || ''} ${d.lastName || ''}`.trim() || user.username;
        }
      } catch {}
      leaderboard.push({
        username: user.username,
        displayName,
        approvedHours: Math.round(user.approvedHours * 100) / 100,
        unapprovedHours: Math.round(user.unapprovedHours * 100) / 100
      });
    }
    res.json({ leaderboard });
  } catch (error) {
    console.error('Leaderboard error', error);
    res.status(500).json({ leaderboard: [] });
  }
});

// Community Posts Routes
app.get('/api/community-posts', async (req, res) => {
  try {
    const postsSnap = await db.collection('communityPosts').orderBy('createdAt', 'desc').get();
    const posts = postsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json({ posts });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch posts.' });
  }
});

app.post('/api/community-posts', upload.single('image'), async (req, res) => {
  try {
    const { content, author } = req.body;
    if (!content || !author) return res.status(400).json({ message: 'Missing content or author.' });
    let imageUrl = null;
    if (req.file) {
      const bucket = getStorage().bucket();
      const fileName = `community-posts/${Date.now()}_${req.file.originalname}`;
      const file = bucket.file(fileName);
      await file.save(req.file.buffer, {
        metadata: { contentType: req.file.mimetype },
        public: true
      });
      await file.makePublic();
      imageUrl = file.publicUrl();
    }
    let isActivity = false;
    let activityData = undefined;
    if (typeof req.body.isActivity !== 'undefined') {
      isActivity = req.body.isActivity === 'true' || req.body.isActivity === true;
    }
    if (typeof req.body.activityData !== 'undefined') {
      try {
        activityData = JSON.parse(req.body.activityData);
      } catch (e) {
        activityData = undefined;
      }
    }
    const post = {
      content,
      author,
      imageUrl,
      createdAt: new Date().toISOString(),
      ...(typeof isActivity !== 'undefined' ? { isActivity } : {}),
      ...(typeof activityData !== 'undefined' ? { activityData } : {})
    };
    const docRef = await db.collection('communityPosts').add(post);
    res.status(201).json({ post: { id: docRef.id, ...post } });
  } catch (err) {
    res.status(500).json({ message: 'Failed to create post.' });
  }
});

app.delete('/api/community-posts/:id', async (req, res) => {
  const postId = req.params.id;
  const username = req.query.username || req.body?.username || req.headers['x-username'] || req.headers['username'] || '';
  try {
    const postDoc = await db.collection('communityPosts').doc(postId).get();
    if (!postDoc.exists) return res.status(404).json({ message: 'Post not found.' });
    const postData = postDoc.data();
    if (!username || postData.author !== username) {
      return res.status(403).json({ message: 'Not authorized to delete this post.' });
    }
    await db.collection('communityPosts').doc(postId).delete();
    res.json({ message: 'Post deleted.' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete post.' });
  }
});

// Friends API Routes
app.get('/api/friends/search', async (req, res) => {
  const { query, username } = req.query;
  if (!query) return res.json({ users: [] });
  try {
    const usersSnap = await db.collection('users').get();
    const allUsers = usersSnap.docs.map(doc => doc.data().username).filter(Boolean);
    let friends = [];
    if (username) {
      const userDoc = await db.collection('users').where('username', '==', username).get();
      if (!userDoc.empty) {
        friends = userDoc.docs[0].data().friends || [];
      }
    }
    const results = allUsers.filter(u => u.toLowerCase().includes(query.toLowerCase()) && u !== username && !friends.includes(u));
    res.json({ users: results });
  } catch (err) {
    res.status(500).json({ users: [], error: err.message });
  }
});

app.get('/api/friends', async (req, res) => {
  const { username } = req.query;
  if (!username) return res.status(400).json({ friends: [] });
  try {
    const userDoc = await db.collection('users').where('username', '==', username).get();
    if (userDoc.empty) return res.json({ friends: [] });
    const friends = userDoc.docs[0].data().friends || [];
    res.json({ friends });
  } catch (err) {
    res.status(500).json({ friends: [], error: err.message });
  }
});

app.post('/api/friends/add', express.json(), async (req, res) => {
  const { username, friend } = req.body;
  if (!username || !friend) return res.status(400).json({ message: 'Missing username or friend.' });
  if (username === friend) return res.status(400).json({ message: 'Cannot add yourself.' });
  try {
    const userSnap = await db.collection('users').where('username', '==', username).get();
    const friendSnap = await db.collection('users').where('username', '==', friend).get();
    if (userSnap.empty || friendSnap.empty) return res.status(404).json({ message: 'User not found.' });
    const userRef = userSnap.docs[0].ref;
    const userData = userSnap.docs[0].data();
    const friends = userData.friends || [];
    if (friends.includes(friend)) return res.status(400).json({ message: 'Already friends.' });
    friends.push(friend);
    await userRef.update({ friends });
    res.json({ message: 'Friend added.', friend });
  } catch (err) {
    res.status(500).json({ message: 'Error adding friend.', error: err.message });
  }
});

// Theme Routes
app.post('/themes', async (req, res) => {
  try {
    const { name, colors, description, createdBy } = req.body;
    if (!name) {
      return res.status(400).json({ message: 'Theme name is required.' });
    }
    const newTheme = {
      name,
      colors: colors || {},
      description: description || '',
      createdBy: createdBy || null,
      createdAt: new Date().toISOString(),
    };
    const docRef = await db.collection('themes').add(newTheme);
    res.status(201).json({ message: 'Theme created successfully.', id: docRef.id });
  } catch (error) {
    console.error('Error creating theme:', error);
    res.status(500).json({ message: 'Failed to create theme.' });
  }
});

app.get('/themes', async (req, res) => {
  try {
    const snapshot = await db.collection('themes').get();
    const themes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json({ themes });
  } catch (error) {
    console.error('Error fetching themes:', error);
    res.status(500).json({ message: 'Failed to fetch themes.' });
  }
});

// API Routes
app.get('/api/mapbox-key', (req, res) => {
  res.json({ key: process.env.MAPBOX_API_KEY || '' });
});

app.use('/uploads', express.static(path.join(__dirname, 'public', 'uploads')));

// Add error handling middleware
app.use((err, req, res, next) => {
  console.error('❌ Server Error:', err);
  
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({ 
      message: 'Invalid JSON format',
      error: 'Request body contains invalid JSON'
    });
  }
  
  if (err.type === 'entity.too.large') {
    return res.status(400).json({
      message: 'Request body too large',
      error: 'File or data size exceeds limit'
    });
  }
  
  res.status(500).json({ 
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// Start Server
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});


