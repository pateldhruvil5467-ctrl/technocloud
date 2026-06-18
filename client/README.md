# 🎧 TechnoCloud

A full-stack music streaming platform built with the MERN Stack (MongoDB, Express.js, React.js, Node.js).

TechnoCloud allows users to discover and stream music while enabling artists to upload and manage their tracks through a dedicated dashboard.

---

## 🚀 Features

### Authentication & Authorization
- JWT Authentication
- Secure Login & Registration
- Role-Based Access Control
  - User
  - Artist

### Music Features
- Upload Audio Tracks
- Stream Music Online
- Track Library
- Trending Tracks
- Artist Dashboard
- Protected Routes

### Database
- MongoDB Atlas Integration
- Track Storage
- User Management

---

## 🛠 Tech Stack

### Frontend
- React.js
- React Router DOM
- Axios
- CSS3

### Backend
- Node.js
- Express.js
- JWT Authentication
- Multer (File Upload)

### Database
- MongoDB Atlas
- Mongoose

---

## 📂 Project Structure

```text
technocloud/
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
├── Screenshots/
│
└── README.md
```

---

## 📸 Application Screenshots

### Login Page

![Login](Screenshots/Login.png)

### Music Dashboard

![Dashboard](Screenshots/MusicDashboard.png)

### Upload Track

![Upload Track](Screenshots/UploadTrack.png)

### Music Player

![Music Player](Screenshots/MusicPlayer.png)

---

## ⚙️ Installation

### 1. Clone Repository

```bash
git clone https://github.com/pateldhruvil5467-ctrl/technocloud.git
```

### 2. Install Dependencies

Root:

```bash
npm install
```

Frontend:

```bash
cd client
npm install
```

Backend:

```bash
cd server
npm install
```

---

## 🔐 Environment Variables

Create a `.env` file inside the `server` folder:

```env
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_secret_key
PORT=5000
```

---

## ▶️ Running the Project

### Start Backend

```bash
cd server
npm start
```

### Start Frontend

```bash
cd client
npm start
```

Frontend:

```text
http://localhost:3000
```

Backend:

```text
http://localhost:5000
```

---

## 🎯 Future Improvements

- Playlist Creation
- Search Functionality
- Like & Favorite Tracks
- Music Recommendations
- Artist Analytics Dashboard
- User Profiles
- Cloud Audio Storage
- Real-time Notifications

---

## 👨‍💻 Author

**Dhruvil Patel**

- GitHub: https://github.com/pateldhruvil5467-ctrl

---

## ⭐ Support

If you found this project useful, consider giving it a star on GitHub.

⭐ Star the repository to support future development.