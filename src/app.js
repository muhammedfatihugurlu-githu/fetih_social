const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Firebase Realtime Database URL
const FIREBASE_URL = "https://fetih-social-f6505-default-rtdb.firebaseio.com";

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../public')));

// Socket.IO
io.on('connection', (socket) => {
  console.log('Kullanıcı bağlandı:', socket.id);

  socket.on('new_post', async (postData) => {
    try {
      const response = await fetch(`${FIREBASE_URL}/posts.json`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(postData)
      });
      const data = await response.json();
      io.emit('receive_post', { id: data.name, ...postData });
    } catch (err) {
      console.error('Firebase Hatası:', err);
    }
  });
});

// Express v5 Uyumlu SPA Catch-all Rotası
app.get('/{*splat}', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Sunucu ${PORT} portunda aktif!`);
});