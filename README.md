# 🎧 TechnoCloud

A full-stack music streaming platform built with the MERN stack.

## 🚀 Features

- User Authentication (JWT)
- Role-Based Access Control
  - User
  - Artist
- Music Upload System
- Audio Streaming
- Track Library
- Trending Tracks
- Artist Dashboard
- Protected Routes
- MongoDB Database Integration

---

## 🛠️ Tech Stack

### Frontend
- React.js
- React Router
- Axios

### Backend
- Node.js
- Express.js
- JWT Authentication
- Multer

### Database
- MongoDB Atlas
- Mongoose

---

## 📂 Project Structure

```text
TechnoCloud/
│
├── client/
│   ├── src/
│   ├── public/
│   └── package.json
│
├── server/
│   ├── controllers/
│   ├── models/
│   ├── routes/
│   ├── middleware/
│   ├── uploads/
│   └── server.js
│
└── README.md
```

---

## 🔐 Authentication Flow

1. User registers
2. User logs in
3. JWT token is generated
4. Token is stored in sessionStorage
5. Protected routes verify token
6. Artists can upload tracks
7. Users can stream tracks

---

## 🎵 Current Functionalities

### User
- Register account
- Login
- Browse music library
- Stream tracks

### Artist
- Upload tracks
- Manage tracks
- View uploaded content

---

## 📸 Screenshots

### Dashboard
(Add screenshot here)

### Music Player
(Add screenshot here)

### Upload Track
(Add screenshot here)

---

## ⚙️ Installation

### Clone Repository

```bash
git clone https://github.com/pateldhruvil5467-ctrl/technocloud.git
```

### Backend

```bash
cd server
npm install
npm start
```

### Frontend

```bash
cd client
npm install
npm start
```

---

## 🌟 Future Improvements

- Playlist System
- Likes & Favorites
- Search Functionality
- Artist Profiles
- Audio Waveform Visualization
- Cloud Storage Integration
- Real-time Streaming Analytics

---

## 👨‍💻 Author

Dhruvil Patel

Master's Student in Software Engineering

Built as a full-stack MERN learning project focused on authentication, media management, and role-based access control.
