# VolunteerHub Backend API - Quick Reference

## 🚀 Quick Start

1. **Install & Run:**
   ```bash
   npm install
   npm start
   ```

2. **Testing Interface:**
   - Open: `http://localhost:3000/test`
   - Quick Login: Use default credentials or signup
   - Test all endpoints with visual interface

3. **API Base URL:**
   ```
   http://localhost:3000
   ```

## 🔐 Authentication

Most endpoints require JWT authentication. Include token in header:
```
Authorization: Bearer <your_jwt_token>
```

## 📊 API Endpoints Overview

| Method | Endpoint | Auth Required | Description |
|--------|----------|---------------|-------------|
| `GET` | `/api/health` | ❌ | Health check |
| `POST` | `/signup` | ❌ | Register new user |
| `POST` | `/login` | ❌ | User login |
| `GET` | `/validate-session` | ❌ | Validate JWT token |
| `POST` | `/logout` | ❌ | User logout |
| `GET` | `/users` | ✅ | Get current user info |
| `PUT` | `/users` | ✅ | Update user profile |
| `GET` | `/activities/:username` | ✅ | Get user activities |
| `POST` | `/activities` | ✅ | Add new activity |
| `DELETE` | `/activities/:id` | ✅ | Delete activity |
| `POST` | `/send-signature-request` | ✅ | Email signature request |
| `GET` | `/leaderboard` | ❌ | Community leaderboard |
| `GET` | `/api/community-posts` | ❌ | Get community posts |
| `POST` | `/api/community-posts` | ❌ | Create post (with image) |
| `DELETE` | `/api/community-posts/:id` | ❌ | Delete post |
| `GET` | `/api/friends` | ❌ | Get user friends |
| `GET` | `/api/friends/search` | ❌ | Search for friends |
| `POST` | `/api/friends/add` | ❌ | Add friend |
| `GET` | `/themes` | ❌ | Get all themes |
| `POST` | `/themes` | ❌ | Create new theme |
| `GET` | `/api/mapbox-key` | ❌ | Get Mapbox API key |

## 🧪 Testing Examples

### 1. User Registration
```bash
curl -X POST http://localhost:3000/signup \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "John",
    "lastName": "Doe", 
    "email": "john@example.com",
    "username": "johndoe",
    "password": "password123"
  }'
```

### 2. User Login
```bash
curl -X POST http://localhost:3000/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "johndoe",
    "password": "password123"
  }'
```

### 3. Add Activity (with auth)
```bash
curl -X POST http://localhost:3000/activities \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "name": "Community Cleanup",
    "date": "2025-07-20",
    "start_time": "09:00",
    "end_time": "12:00",
    "location": "Central Park",
    "supervisorName": "Jane Smith",
    "supervisorEmail": "jane@example.com"
  }'
```

### 4. Get Leaderboard
```bash
curl http://localhost:3000/leaderboard
```

## 🗂️ Response Format

All responses follow this structure:
```json
{
  "status": 200,
  "statusText": "OK",
  "timestamp": "2025-07-20T10:30:00.000Z",
  "data": {
    // Response data here
  }
}
```

## 🔧 Configuration

### Required Environment Variables:
```env
JWT_SECRET=your_jwt_secret
GOOGLE_APPLICATION_CREDENTIALS_JSON={"type":"service_account",...}
```

### Optional Environment Variables:
```env
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password
MAPBOX_API_KEY=your_mapbox_key
PORT=3000
NODE_ENV=development
```

## 🗄️ Database Collections

### Firestore Collections:
- `users` - User account data
- `userData` - Extended user profiles
- `activities` - User activities (grouped by username)
- `communityPosts` - Community posts with images
- `themes` - Custom themes

## ⚡ Development

### Hot Reload:
```bash
npm run dev  # Uses nodemon for auto-restart
```

### Testing:
```bash
npm test  # Opens testing interface
```

## 🐛 Common Issues

1. **"Firebase connection error"**
   - Check `serviceAccountKey.json` exists
   - Verify Firebase project settings

2. **"JWT token invalid"**
   - Ensure `JWT_SECRET` is set
   - Check token hasn't expired (7 days default)

3. **"Email not sending"**
   - Verify Gmail app password
   - Check `EMAIL_USER` and `EMAIL_PASS`

## 🔗 Useful Links

- **Testing Interface**: `http://localhost:3000/test`
- **API Health**: `http://localhost:3000/api/health`
- **Firebase Console**: https://console.firebase.google.com/
- **Repository**: https://github.com/AERESAL/Neighborhood-hackclub

---

*For complete documentation, see the main README.md file.*
