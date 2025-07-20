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
require('dotenv').config();
// const { setupMobileSupport } = require('./mobile-backend-setup');

// Load service account from environment variable or fallback to serviceAccountKey.json
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
  databaseURL: "https://volunteerhub-9ae56.firebaseio.com"
});

const db = admin.firestore();

const app = express();
const PORT = process.env.PORT || 3000;

// After initializing Firebase and before your existing routes:
// setupMobileSupport(app, admin, db);

// CORS Configuration for Backend API
app.use(cors({
  origin: [
    "http://127.0.0.1:5500",
    "http://localhost:5500",
    "http://localhost:3000",
    "https://neighborhood-liard.vercel.app",
    "https://neighborhood-1bs9w1ohe-aeresals-projects.vercel.app",
    "https://volunteerhub.saitrseelam.com"
  ],
  credentials: true,
  methods: ["GET", "POST", "DELETE", "PUT", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(express.json());
app.use(cookieParser());

// Add session middleware for signature forms only
app.use(session({
  secret: process.env.SESSION_SECRET || "volunteerhub_secret",
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, httpOnly: true, maxAge: 7 * 24 * 60 * 60 * 1000 }
}));

// API Health Check
app.get("/api/health", (req, res) => {
  res.json({ 
    status: "healthy", 
    timestamp: new Date().toISOString(),
    service: "VolunteerHub Backend API"
  });
});

// Serve static files for testing interface only
app.use('/test', express.static(path.join(__dirname, "test")));

// Serve Homepage (redirect to API documentation)
app.get("/", (req, res) => {
  res.json({
    message: "VolunteerHub Backend API",
    version: "1.0.0",
    endpoints: {
      "health": "GET /api/health",
      "auth": {
        "signup": "POST /signup",
        "login": "POST /login", 
        "logout": "POST /logout",
        "validate": "GET /validate-session"
      },
      "users": {
        "get": "GET /users",
        "update": "PUT /users"
      },
      "activities": {
        "get": "GET /activities/:username",
        "add": "POST /activities",
        "delete": "DELETE /activities/:id"
      },
      "community": {
        "posts": "GET|POST|DELETE /api/community-posts",
        "friends": "GET|POST /api/friends"
      },
      "testing": "GET /test for API testing interface"
    }
  });
});

// Signup Route
app.post("/signup", async (req, res) => {
  try {
    const { firstName, lastName, email, phoneNumber, username, password, zipCode } = req.body;

    if (!firstName || !lastName || !email || !username || !password) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // Ensure phoneNumber is never undefined
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

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    const userID = uuidv4();

    // Create user object
    const newUser = {
      userID,
      firstName,
      lastName,
      email,
      phoneNumber: safePhoneNumber,
      zipCode,
      password: hashedPassword
    };

    // Add to 'users' collection
    await db.collection("users").doc(username).set(newUser);

    // Add to 'userData' collection
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

// Login Route
app.post("/login", async (req, res) => {
  try {
    const { username, password, rememberMe } = req.body;
    let user;
    // Get user from 'users' collection
    const userRef = db.collection("users").doc(username);
    const userDoc = await userRef.get();
    if (userDoc.exists) {
      user = userDoc.data();
    }
    if (!user) return res.status(401).json({ message: "User does not exist" });
    // Check hashed password
    if (!(await bcrypt.compare(password, user.password))) return res.status(401).json({ message: "Incorrect password" });
    // Generate JWT token
    const token = jwt.sign({ userID: user.userID, username }, process.env.JWT_SECRET || "volunteerhub_jwt_secret", { expiresIn: "7d" });
    res.status(200).json({ message: "Login successful", userID: user.userID, username, token });
  } catch (error) {
    console.error("Login error", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Token validation endpoint
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

// Logout Route
app.post("/logout", (req, res) => {
  res.clearCookie("username");
  req.session.destroy();
  res.status(200).json({ message: "Logged out successfully" });
});

// Middleware to extract user from JWT (for API endpoints)
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

// Get Activities Route (JWT protected)
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

// Add Activity Route (JWT protected)
app.post('/add-activity', authenticateJWT, async (req, res) => {
  try {
    const { title, place, activityDate, startTime, endTime, supervisorName, supervisorEmail } = req.body;
    // Add activity to userData
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

// Add Activity to 'activities' collection, one document per user (JWT protected)
app.post('/activities', authenticateJWT, async (req, res) => {
  try {
    console.log('POST /activities incoming body:', req.body);
    const { name, date, start_time, end_time, location, supervisorName, supervisorEmail } = req.body;
    if (!name || !date || !start_time || !end_time || !location || !supervisorName || !supervisorEmail) {
      console.error('Missing required activity fields', req.body);
      return res.status(400).json({ message: 'Missing required activity fields' });
    }
    // The document name is the username
    const activitiesRef = db.collection('activities').doc(req.username);
    const doc = await activitiesRef.get();
    let activitiesArr = [];
    if (doc.exists) {
      const data = doc.data();
      activitiesArr = data.activities || [];
    }
    const newActivity = {
      id: uuidv4(), // Add unique id to each activity
      name,
      date,
      start_time,
      end_time,
      location,
      supervisorName,
      supervisorEmail,
      approved: false // Always set approved property for new activities
    };
    activitiesArr.push(newActivity);
    await activitiesRef.set({ activities: activitiesArr }, { merge: true });
    res.status(201).json({ message: 'Activity added successfully' });
  } catch (error) {
    console.error('Add activity error', error, req.body);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get current user info (JWT protected)
app.get('/users', authenticateJWT, async (req, res) => {
  try {
    const userRef = db.collection('users').doc(req.username);
    const userDoc = await userRef.get();
    if (!userDoc.exists) return res.status(404).json({});
    const userData = userDoc.data();
    // Remove sensitive info
    if (userData && userData.password) delete userData.password;

    // Fetch activities created by this user from userData
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

// Get activities for a user from the 'activities' collection (JWT protected)
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

// Email sending dependencies
const nodemailer = require('nodemailer');
const fs = require('fs');


// Send Signature Request to Supervisor (JWT protected)
app.post('/send-signature-request', authenticateJWT, async (req, res) => {
  try {
    const { name, date, start_time, end_time, location, supervisorName, supervisorEmail } = req.body;
    if (!name || !date || !start_time || !end_time || !location || !supervisorName || !supervisorEmail) {
      return res.status(400).json({ message: 'Missing required activity fields' });
    }

    // Generate a unique token for this signature request
    const signatureToken = uuidv4();

    // Store the token and signed:false with the activity in the user's activities
    const activitiesRef = db.collection('activities').doc(req.username);
    const doc = await activitiesRef.get();
    let activitiesArr = [];
    if (doc.exists) {
      activitiesArr = doc.data().activities || [];
    }
    // Find the activity and add the token
    const idx = activitiesArr.findIndex(
      a => a.name === name && a.date === date && a.start_time === start_time && a.end_time === end_time && a.location === location
    );
    if (idx === -1) return res.status(404).json({ message: "Activity not found" });
    activitiesArr[idx].signatureToken = signatureToken;
    activitiesArr[idx].signed = false;
    await activitiesRef.set({ activities: activitiesArr }, { merge: true });

    // Get submitter's name and email from user profile
    const userRef = db.collection('users').doc(req.username);
    const userDoc = await userRef.get();
    let submitterName = req.username;
    let studentEmail = '';
    if (userDoc.exists) {
      const userData = userDoc.data();
      submitterName = userData.firstName && userData.lastName ? `${userData.firstName} ${userData.lastName}` : req.username;
      studentEmail = userData.email || '';
    }

    // Load and fill the email template
    const templatePath = path.join(__dirname, 'email_template.html');
    let emailHtml = fs.readFileSync(templatePath, 'utf8');
    // Construct the signature form URL
    let baseUrl;
    if (process.env.NODE_ENV === 'development') {
      baseUrl = 'http://localhost:3000';
    } else {
      baseUrl = 'https://neighborhood-liard.vercel.app';
    }
    const signatureFormUrl = `${baseUrl}/api/signature-form?token=${signatureToken}`;
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

    // Configure nodemailer transporter
    const transporter = nodemailer.createTransport({
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

// Simple signature form endpoint (returns basic HTML for signature collection)
app.get('/api/signature-form', async (req, res) => {
  const { token } = req.query;
  if (!token) {
    return res.status(400).send('Invalid signature request');
  }
  
  // Simple HTML form for signature collection
  const signatureFormHTML = `
    <!DOCTYPE html>
    <html>
    <head>
        <title>VolunteerHub - Activity Signature</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
            body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; }
            .form-container { background: #f9f9f9; padding: 30px; border-radius: 10px; }
            h1 { color: #2c3e50; text-align: center; }
            .activity-info { background: white; padding: 20px; border-radius: 5px; margin: 20px 0; }
            canvas { border: 2px solid #ddd; border-radius: 5px; display: block; margin: 20px auto; }
            .btn { background: #3498db; color: white; padding: 12px 24px; border: none; border-radius: 5px; cursor: pointer; margin: 10px; }
            .btn:hover { background: #2980b9; }
            .btn-clear { background: #e74c3c; }
            .btn-clear:hover { background: #c0392b; }
            .status { text-align: center; margin: 20px 0; padding: 10px; border-radius: 5px; }
            .success { background: #d4edda; color: #155724; }
            .error { background: #f8d7da; color: #721c24; }
        </style>
    </head>
    <body>
        <div class="form-container">
            <h1>🖋️ Activity Signature</h1>
            <div id="activityInfo" class="activity-info">Loading activity details...</div>
            <div style="text-align: center;">
                <p><strong>Please sign below to confirm the activity:</strong></p>
                <canvas id="signatureCanvas" width="400" height="200"></canvas>
                <br>
                <button class="btn btn-clear" onclick="clearSignature()">Clear</button>
                <button class="btn" onclick="submitSignature()">Submit Signature</button>
            </div>
            <div id="status" class="status" style="display: none;"></div>
        </div>
        
        <script>
            const canvas = document.getElementById('signatureCanvas');
            const ctx = canvas.getContext('2d');
            let isDrawing = false;
            
            // Set up canvas for signature
            ctx.strokeStyle = '#2c3e50';
            ctx.lineWidth = 2;
            ctx.lineCap = 'round';
            
            // Mouse events
            canvas.addEventListener('mousedown', startDrawing);
            canvas.addEventListener('mousemove', draw);
            canvas.addEventListener('mouseup', stopDrawing);
            
            // Touch events for mobile
            canvas.addEventListener('touchstart', handleTouch);
            canvas.addEventListener('touchmove', handleTouch);
            canvas.addEventListener('touchend', stopDrawing);
            
            function startDrawing(e) {
                isDrawing = true;
                const rect = canvas.getBoundingClientRect();
                ctx.beginPath();
                ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
            }
            
            function draw(e) {
                if (!isDrawing) return;
                const rect = canvas.getBoundingClientRect();
                ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
                ctx.stroke();
            }
            
            function stopDrawing() {
                isDrawing = false;
            }
            
            function handleTouch(e) {
                e.preventDefault();
                const touch = e.touches[0];
                const mouseEvent = new MouseEvent(e.type === 'touchstart' ? 'mousedown' : 
                                                 e.type === 'touchmove' ? 'mousemove' : 'mouseup', {
                    clientX: touch.clientX,
                    clientY: touch.clientY
                });
                canvas.dispatchEvent(mouseEvent);
            }
            
            function clearSignature() {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
            }
            
            async function submitSignature() {
                const signatureData = canvas.toDataURL();
                const token = '${token}';
                
                try {
                    const response = await fetch(\`/sign-activity/\${token}\`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ signature: signatureData })
                    });
                    
                    const result = await response.json();
                    const statusDiv = document.getElementById('status');
                    
                    if (response.ok) {
                        statusDiv.className = 'status success';
                        statusDiv.textContent = '✅ Signature submitted successfully! Thank you.';
                        document.querySelector('.btn').disabled = true;
                    } else {
                        statusDiv.className = 'status error';
                        statusDiv.textContent = '❌ Error: ' + (result.message || 'Failed to submit signature');
                    }
                    statusDiv.style.display = 'block';
                } catch (error) {
                    const statusDiv = document.getElementById('status');
                    statusDiv.className = 'status error';
                    statusDiv.textContent = '❌ Network error. Please try again.';
                    statusDiv.style.display = 'block';
                }
            }
            
            // Load activity details
            async function loadActivity() {
                try {
                    const token = '${token}';
                    const response = await fetch(\`/activity-by-token/\${token}\`);
                    
                    if (response.ok) {
                        const activity = await response.json();
                        document.getElementById('activityInfo').innerHTML = \`
                            <h3>\${activity.name}</h3>
                            <p><strong>Date:</strong> \${activity.date}</p>
                            <p><strong>Time:</strong> \${activity.start_time} - \${activity.end_time}</p>
                            <p><strong>Location:</strong> \${activity.location}</p>
                            <p><strong>Volunteer:</strong> \${activity.username}</p>
                        \`;
                    } else {
                        document.getElementById('activityInfo').innerHTML = 
                            '<p style="color: red;">❌ Invalid or expired signature request.</p>';
                        document.querySelector('.btn').disabled = true;
                    }
                } catch (error) {
                    document.getElementById('activityInfo').innerHTML = 
                        '<p style="color: red;">❌ Error loading activity details.</p>';
                }
            }
            
            loadActivity();
        </script>
    </body>
    </html>
  `;
  
  res.send(signatureFormHTML);
});

// GET activity by signature token (for signature form)
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

// Sign activity (for signature form)
app.post('/sign-activity/:token', async (req, res) => {
  const { token } = req.params;
  const { signature } = req.body; // this is the data URL from the canvas
  try {
    const snapshot = await db.collection('activities').get();
    let updated = false;
    for (const doc of snapshot.docs) {
      const activities = doc.data().activities || [];
      const idx = activities.findIndex(a => a.signatureToken === token);
      if (idx !== -1 && !activities[idx].signed) {
        activities[idx].signed = true;
        activities[idx].signatureData = signature; // store the image data URL
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

// Update user info (JWT protected)
app.put('/users', authenticateJWT, async (req, res) => {
  try {
    const { username, firstName, lastName, email, phone, profilePic } = req.body;
    const userRef = db.collection('users').doc(req.username);
    const userDoc = await userRef.get();
    if (!userDoc.exists) return res.status(404).json({ message: 'User not found' });

    // Only update fields that are provided
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

// Leaderboard endpoint: returns top users by approved (signed) hours
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
        // Calculate hours for each activity
        let hours = 0;
        if (act.start_time && act.end_time) {
          const [sh, sm] = act.start_time.split(':').map(Number);
          const [eh, em] = act.end_time.split(':').map(Number);
          let diff = (eh * 60 + em) - (sh * 60 + sm);
          if (diff < 0) diff += 24 * 60; // handle overnight
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
    // Sort by approvedHours descending
    users.sort((a, b) => b.approvedHours - a.approvedHours);
    // Optionally, get display names from users collection
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

// Utility: Ensure all activities in the user's activities array have an id
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

// DELETE /activities/:id - Delete an activity by ID (requires authentication)
app.delete('/activities/:id', authenticateJWT, async (req, res) => {
  const activityId = req.params.id;
  if (!activityId) {
    return res.status(400).json({ message: 'Activity ID is required.' });
  }
  try {
    await ensureActivityIdsForUser(req.username);
    // Find the user's activities document
    const activitiesRef = db.collection('activities').doc(req.username);
    const doc = await activitiesRef.get();
    if (!doc.exists) {
      return res.status(404).json({ message: 'No activities found for user.' });
    }
    let activitiesArr = doc.data().activities || [];
    const initialLength = activitiesArr.length;
    // Remove the activity with the matching id
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

// Use memory storage for multer (for Firebase Storage upload)
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

// In-memory posts fallback (for demo, replace with Firestore for production)
// let communityPosts = [];

// GET /api/community-posts - Get all posts
app.get('/api/community-posts', async (req, res) => {
  try {
    // Fetch posts from Firestore
    const postsSnap = await db.collection('communityPosts').orderBy('createdAt', 'desc').get();
    const posts = postsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json({ posts });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch posts.' });
  }
});

// POST /api/community-posts - Create a new post (with optional image)
app.post('/api/community-posts', upload.single('image'), async (req, res) => {
  try {
    const { content, author } = req.body;
    if (!content || !author) return res.status(400).json({ message: 'Missing content or author.' });
    let imageUrl = null;
    if (req.file) {
      // Upload to Firebase Storage
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
    // Handle activity post fields
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
    // Save to Firestore
    const docRef = await db.collection('communityPosts').add(post);
    res.status(201).json({ post: { id: docRef.id, ...post } });
  } catch (err) {
    res.status(500).json({ message: 'Failed to create post.' });
  }
});

// DELETE /api/community-posts/:id - Delete a post by ID (only by author)
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

// --- Friends API (Firestore-backed) ---
// GET /api/friends/search?query=xxx&username=yyy
app.get('/api/friends/search', async (req, res) => {
  const { query, username } = req.query;
  if (!query) return res.json({ users: [] });
  try {
    // Fetch all users from Firestore
    const usersSnap = await db.collection('users').get();
    const allUsers = usersSnap.docs.map(doc => doc.data().username).filter(Boolean);
    // Exclude self and already-friends
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

// GET /api/friends?username=xxx
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

// POST /api/friends/add
app.post('/api/friends/add', express.json(), async (req, res) => {
  const { username, friend } = req.body;
  if (!username || !friend) return res.status(400).json({ message: 'Missing username or friend.' });
  if (username === friend) return res.status(400).json({ message: 'Cannot add yourself.' });
  try {
    // Check both users exist
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
// --- End Friends API ---

// POST /themes - Create a new theme
db; // ensure db is initialized
app.post('/themes', async (req, res) => {
  try {
    const { name, colors, description, createdBy } = req.body;
    if (!name) {
      return res.status(400).json({ message: 'Theme name is required.' });
    }
    // You can add more validation for colors, etc. as needed
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

// GET /themes - List all themes
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

// Expose Mapbox API key to frontend (read-only)
app.get('/api/mapbox-key', (req, res) => {
  res.json({ key: process.env.MAPBOX_API_KEY || '' });
});

// Start Server
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});


