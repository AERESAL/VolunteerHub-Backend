# VolunteerHub-Backend

A comprehensive backend API for the VolunteerHub volunteer management platform. This Node.js/Express server provides authentication, activity tracking, digital signatures, community features, and more.

## Features

- 🔐 **User Authentication** - JWT-based auth with bcrypt password hashing
- 📋 **Activity Management** - Create, track, and manage volunteer activities
- ✍️ **Digital Signatures** - Email-based signature requests for activity verification
- 👥 **Community Posts** - Social features with image uploads
- 🏆 **Leaderboard** - Track volunteer hours and rankings
- 👫 **Friends System** - Connect with other volunteers
- 🎨 **Themes** - Customizable UI themes
- 🗺️ **Maps Integration** - Mapbox API support
- 📧 **Email Notifications** - Automated email system for signatures
- ☁️ **Firebase Integration** - Firestore database and Firebase Storage

## Tech Stack

- **Runtime:** Node.js
- **Framework:** Express.js
- **Database:** Firebase Firestore
- **Authentication:** JWT + bcryptjs
- **File Storage:** Firebase Storage
- **Email:** Nodemailer
- **File Uploads:** Multer

## Prerequisites & Installation

### Step 1: Install Node.js

**Option A: Download from Official Website**
1. Go to [nodejs.org](https://nodejs.org/)
2. Download the LTS version (recommended)
3. Run the installer and follow the setup wizard
4. Verify installation:
   ```bash
   node --version
   npm --version
   ```

**Option B: Using Package Managers**

*Windows (using Chocolatey):*
```bash
choco install nodejs
```

*macOS (using Homebrew):*
```bash
brew install node
```

*Linux (Ubuntu/Debian):*
```bash
curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### Step 2: Firebase Setup ✅ COMPLETED

**Good news!** Firebase is already configured for this project:
- ✅ Firebase project: `volunteerhub-9ae56`
- ✅ Service account key: `serviceAccountKey.json` (included)
- ✅ Firestore Database enabled
- ✅ Firebase Storage enabled

**Important:** The `serviceAccountKey.json` file contains sensitive credentials. Keep it secure and never share it publicly.

### Step 3: Project Setup

1. **Clone or Download the Project**
   ```bash
   # If using Git
   git clone <repository-url>
   cd VolunteerHub-Backend

   # Or download and extract the project files
   ```

2. **Install Project Dependencies**
   ```bash
   npm install
   ```
   This will install all the packages listed in `package.json`.

3. **Environment Variables ✅ CONFIGURED**
   
   Your `.env` file is already set up with:
   - ✅ Email configuration (volunteerhubautomated@gmail.com)
   - ✅ Mapbox API key for maps functionality
   - ✅ Development environment settings

   **Note:** The JWT and session secrets are using default values. For production deployment, consider updating them to more secure random strings.

### Step 4: Start the Server

```bash
# Development mode (auto-restarts on file changes)
npm run dev

# Production mode
npm start
```

You should see:
```
✅ Server running on http://localhost:3000
```

### Step 5: Test the Installation

Open your browser and go to `http://localhost:3000` - you should see your application running.

## Quick Start Checklist

- [ ] Node.js installed (v16+)
- [ ] Project dependencies installed (`npm install`)
- [x] Firebase project configured
- [x] Service account key in place
- [x] Environment variables configured
- [ ] Server starts without errors

## Ready-to-Use Features

Since your environment is pre-configured, these features are ready to use:

🔐 **Authentication System**
- User registration and login
- JWT token authentication
- Password hashing with bcrypt

📧 **Email Notifications**
- Automated signature request emails
- Gmail integration configured

🗺️ **Maps Integration**
- Mapbox API ready for location features

☁️ **Firebase Integration**
- Firestore database for data storage
- Firebase Storage for file uploads

## Troubleshooting

**"node is not recognized as an internal or external command"**
- Node.js is not installed or not in your PATH
- Restart your terminal after installing Node.js
- Try reinstalling Node.js

**"Cannot find module 'express'"**
- Run `npm install` to install dependencies

**Firebase connection issues**
- Ensure your internet connection is stable
- The `serviceAccountKey.json` should not be modified

**Port already in use**
- Change the PORT in your `.env` file to 3001 or another available port
- Or stop other applications using port 3000

## API Documentation

### Authentication

#### POST `/signup`
Register a new user account.
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "username": "johndoe",
  "password": "securepassword",
  "phoneNumber": "1234567890",
  "zipCode": "12345"
}
```

#### POST `/login`
Authenticate user and receive JWT token.
```json
{
  "username": "johndoe",
  "password": "securepassword",
  "rememberMe": true
}
```

#### GET `/validate-session?token=<jwt_token>`
Validate JWT token and get user info.

### Activities

#### POST `/activities` (Protected)
Create a new volunteer activity.
```json
{
  "name": "Beach Cleanup",
  "date": "2024-01-15",
  "start_time": "09:00",
  "end_time": "12:00",
  "location": "Santa Monica Beach",
  "supervisorName": "Jane Smith",
  "supervisorEmail": "jane@organization.org"
}
```

#### GET `/activities/:username` (Protected)
Get all activities for a specific user.

#### DELETE `/activities/:id` (Protected)
Delete an activity by ID.

### Digital Signatures

#### POST `/send-signature-request` (Protected)
Send email signature request to supervisor.

#### GET `/activity-by-token/:token`
Get activity details by signature token (for signature form).

#### POST `/sign-activity/:token`
Submit digital signature for activity verification.

### Community

#### GET `/api/community-posts`
Get all community posts.

#### POST `/api/community-posts`
Create a new community post (supports image upload).

#### DELETE `/api/community-posts/:id`
Delete a community post.

### User Management

#### GET `/users` (Protected)
Get current user profile information.

#### PUT `/users` (Protected)
Update user profile.

### Friends

#### GET `/api/friends/search?query=username&username=currentUser`
Search for users to add as friends.

#### GET `/api/friends?username=currentUser`
Get user's friends list.

#### POST `/api/friends/add`
Add a friend.

### Leaderboard

#### GET `/leaderboard`
Get volunteer hours leaderboard.

### Themes

#### GET `/themes`
Get available themes.

#### POST `/themes`
Create a new theme.

## Database Collections

### Firestore Collections

- **users**: User account information
- **userData**: Extended user data and preferences
- **activities**: User volunteer activities
- **communityPosts**: Community social posts
- **themes**: UI themes

## File Structure

```
VolunteerHub-Backend/
├── server.js              # Main application file
├── package.json           # Dependencies and scripts
├── .env.example          # Environment variables template
├── .gitignore            # Git ignore rules
├── email_template.html   # Email template for signatures
├── serviceAccountKey.json # Firebase service account (not in repo)
├── public/               # Static files directory
└── README.md            # This file
```

## Security Features

- JWT token authentication
- Password hashing with bcrypt
- CORS configuration
- Input validation
- Protected routes middleware
- Secure session handling

## Deployment

### Vercel Deployment

1. Install Vercel CLI: `npm i -g vercel`
2. Login: `vercel login`
3. Deploy: `vercel`
4. Set environment variables in Vercel dashboard
5. Add Firebase service account as `GOOGLE_APPLICATION_CREDENTIALS_JSON` environment variable

### Environment Variables for Production

Set these in your hosting platform:
- `JWT_SECRET`
- `SESSION_SECRET`
- `EMAIL_USER`
- `EMAIL_PASS`
- `MAPBOX_API_KEY`
- `GOOGLE_APPLICATION_CREDENTIALS_JSON` (Firebase service account as JSON string)
- `NODE_ENV=production`

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## Support

For questions or issues, please create an issue in the repository or contact the development team.

## License

MIT License - see LICENSE file for details.