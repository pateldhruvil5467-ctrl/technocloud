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
<img width="1836" height="955" alt="MusicDashboard" src="https://github.com/user-attachments/assets/10ef1300-13e7-4854-9e6a-4001c5696808" />


### Music Player
<img width="1830" height="953" alt="MusicPlayer" src="https://github.com/user-attachments/assets/88018e85-692a-42d5-a027-cd6b3b4e2860" />


### Upload Track
<img width="1830" height="954" alt="UploadTrack" src="https://github.com/user-attachments/assets/d365b03c-3cec-4e5a-90db-c4538da45ccd" />


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
