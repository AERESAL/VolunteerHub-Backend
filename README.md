# VolunteerHub
- Find local volunteering opporunites, track your volunteer hours, and COMPETE AGANIST FRIENDS!

## Features
- Server to log in to check the volunteer
- Login/Sign-up page
- Volunteer Map
- Create a volunteer activity
- Log activity
- Web App for phones and table
- Automated Email System
- Share across devices
- Leaderboard system to compete against friends and global
- Organizers able to add their events. 
- Email sent to supervisor so they can sign an online form.

## Home Page
Sidebar on the left side to navigate between the following:
- Home 
- Find Opportunites
- My Hours 
- leaderboard
- Print/ Export (Icon on bottom left)
- Settings (Icon on botton left)

# VolunteerHub Backend API

A clean, focused backend API for volunteer management with Firebase integration, JWT authentication, and community features. **Pure backend server - no webapp dependencies.**

## 🚀 Features

- **Pure Backend API**: Clean server-only implementation with no frontend dependencies
- **User Authentication**: JWT-based authentication with signup, login, and session validation
- **Activity Management**: Create, read, update, and delete volunteer activities
- **Digital Signatures**: Email-based signature requests with built-in signature form
- **Community Features**: Posts, friends system, and leaderboards
- **File Uploads**: Image support for community posts via Firebase Storage
- **Theme System**: Customizable themes API for frontend applications
- **Firebase Integration**: Real-time database with Firestore
- **Email Notifications**: Automated signature request emails
- **API Testing Interface**: Built-in testing interface at `/test`

## 📋 Prerequisites

- Node.js (v14 or higher)
- Firebase project with Firestore enabled
- Gmail account for email notifications (optional)
- Mapbox API key (optional, for map features)

## 🔧 Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/AERESAL/Neighborhood-hackclub.git
   cd "VolunteerHub Backend"
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up Firebase:**
   - Create a Firebase project at [Firebase Console](https://console.firebase.google.com/)
   - Enable Firestore Database
   - Download the service account key and save as `serviceAccountKey.json`
   - Or set up environment variables (see Configuration section)

4. **Configure environment variables:**
   Create a `.env` file in the root directory:
   ```env
   # Firebase (alternative to serviceAccountKey.json)
   GOOGLE_APPLICATION_CREDENTIALS_JSON={"type":"service_account",...}
   
   # JWT Configuration
   JWT_SECRET=your_super_secure_jwt_secret_here
   SESSION_SECRET=your_session_secret_here
   
   # Email Configuration (for signature requests)
   EMAIL_USER=your_gmail@gmail.com
   EMAIL_PASS=your_app_password
   
   # API Keys
   MAPBOX_API_KEY=your_mapbox_api_key
   
   # Environment
   NODE_ENV=development
   PORT=3000
   ```

5. **Start the server:**
   ```bash
   # Development with auto-reload
   npm run dev
   
   # Production
   npm start
   ```

## 🧪 API Testing

The backend includes a comprehensive testing interface accessible at:
```
http://localhost:3000/test
```

### Features of the Testing Interface:
- **Visual Interface**: Beautiful, responsive web interface for testing all endpoints
- **Authentication Management**: Login/logout functionality with token storage
- **Comprehensive Coverage**: Tests for all 25+ API endpoints
- **Auto-Fill Forms**: Pre-populated test data for quick testing
- **Real-time Responses**: Live response viewing with syntax highlighting
- **Batch Testing**: Run all tests at once with the "Run All Tests" button

### Quick Start Testing:
1. Start the server: `npm start`
2. Open `http://localhost:3000/test` in your browser
3. Use the Quick Login with default credentials or create a new account
4. Select endpoints from the sidebar to test individual features
5. Use "Run All Tests" for comprehensive API validation

## 📚 API Documentation

### Base URL
```
http://localhost:3000
```

### Authentication Endpoints

#### POST /signup
Register a new user account.

**Request Body:**
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "username": "johndoe",
  "password": "password123",
  "phoneNumber": "123-456-7890",
  "zipCode": "12345"
}
```

#### POST /login
Authenticate user and receive JWT token.

**Request Body:**
```json
{
  "username": "johndoe",
  "password": "password123",
  "rememberMe": false
}
```

**Response:**
```json
{
  "message": "Login successful",
  "userID": "uuid",
  "username": "johndoe",
  "token": "jwt_token_here"
}
```

#### GET /validate-session
Validate JWT token.

**Query Parameters:**
- `token`: JWT token to validate

### User Management

#### GET /users
Get current user information (requires authentication).

#### PUT /users
Update user profile (requires authentication).

### Activity Management

#### GET /activities/:username
Get activities for a specific user (requires authentication).

#### POST /activities
Add a new activity (requires authentication).

**Request Body:**
```json
{
  "name": "Community Garden Cleanup",
  "date": "2025-07-20",
  "start_time": "09:00",
  "end_time": "12:00",
  "location": "Central Community Garden",
  "supervisorName": "Jane Smith",
  "supervisorEmail": "jane@example.com"
}
```

#### DELETE /activities/:id
Delete an activity by ID (requires authentication).

#### POST /send-signature-request
Send signature request email to supervisor (requires authentication).

### Community Features

#### GET /api/community-posts
Get all community posts.

#### POST /api/community-posts
Create a new community post with optional image upload.

#### GET /leaderboard
Get community leaderboard by volunteer hours.

#### GET /api/friends
Get user's friends list.

#### POST /api/friends/add
Add a new friend.

### System Endpoints

#### GET /api/health
Health check endpoint.

#### GET /api/mapbox-key
Get Mapbox API key for frontend mapping.

## 🗄️ Database Structure

### Collections in Firestore:

1. **users**: User account information
2. **userData**: Extended user data and preferences
3. **activities**: User activities organized by username
4. **communityPosts**: Community posts with images
5. **themes**: Custom themes for the application

## 🔐 Authentication

The API uses JWT (JSON Web Tokens) for authentication:

1. **Login**: Receive a JWT token
2. **Authorization**: Include token in `Authorization: Bearer <token>` header
3. **Validation**: Tokens are automatically validated on protected routes

## 📧 Email Integration

Email notifications are sent for signature requests using:
- **Provider**: Gmail SMTP
- **Templates**: HTML email templates in `email_template.html`
- **Features**: Automated signature collection workflow

## 🌐 CORS Configuration

The API is configured to accept requests from:
- `http://localhost:3000` (testing interface)
- `http://localhost:5500` (development)
- `https://neighborhood-liard.vercel.app` (production)
- Custom domains as configured

## 📁 Project Structure

```
VolunteerHub Backend/
├── server.js                 # Main backend API server
├── package.json              # Dependencies and scripts
├── serviceAccountKey.json    # Firebase credentials (gitignored)
├── email_template.html       # Email template for signatures
├── test/
│   └── index.html           # API testing interface
├── vercel.json              # Deployment configuration
├── .env.example             # Environment variables template
└── README.md               # This documentation
```

## 🚀 Deployment

### Environment Variables for Production:
```env
NODE_ENV=production
PORT=3000
GOOGLE_APPLICATION_CREDENTIALS_JSON={"type":"service_account",...}
JWT_SECRET=production_jwt_secret
SESSION_SECRET=production_session_secret
EMAIL_USER=production_email@gmail.com
EMAIL_PASS=production_app_password
```

### Deployment Platforms:
- **Vercel**: Use `vercel.json` configuration
- **Heroku**: Set environment variables in dashboard
- **Railway**: Direct deployment from GitHub
- **Self-hosted**: Use PM2 or similar process manager

## 🔧 Development

### Available Scripts:
```bash
npm start          # Start production server
npm run dev        # Start with nodemon (auto-reload)
npm test          # Open testing interface
```

### Adding New Endpoints:
1. Add route handler in `server.js`
2. Add authentication middleware if needed
3. Add test case in `test/index.html`
4. Update this README documentation

## 🐛 Troubleshooting

### Common Issues:

1. **Firebase Connection Error**:
   - Verify `serviceAccountKey.json` exists and is valid
   - Check environment variables if using JSON credentials

2. **Email Not Sending**:
   - Verify Gmail app password is correct
   - Check EMAIL_USER and EMAIL_PASS environment variables

3. **JWT Token Invalid**:
   - Ensure JWT_SECRET is consistent across restarts
   - Check token expiration (default: 7 days)

4. **CORS Errors**:
   - Add your domain to the CORS configuration in `server.js`

### Debug Mode:
Set `NODE_ENV=development` for detailed error logs.

## 📝 License

This project is licensed under the ISC License.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## 📞 Support

For issues and questions:
- GitHub Issues: [Create an issue](https://github.com/AERESAL/Neighborhood-hackclub/issues)
- Testing Interface: `http://localhost:3000/test` for endpoint testing

---

**VolunteerHub Backend API** - Empowering communities through technology 🌟

![nhbadge](https://img.shields.io/badge/made%20for%20neighborhood-bf8f73?style=for-the-badge&logo=hackclub&logoColor=ffffff)

