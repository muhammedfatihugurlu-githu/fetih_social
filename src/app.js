const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const FIREBASE_URL = "https://fetih-social-f6505-default-rtdb.firebaseio.com";

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../public')));

// --- KAYIT (REGISTER) API ---
app.post('/api/register', async (req, res) => {
  const { name, username, email, phone, password } = req.body;
  
  try {
    // Kullanıcı adı alınmış mı kontrol et
    const checkUser = await fetch(`${FIREBASE_URL}/users/${username}.json`);
    const existingUser = await checkUser.json();
    
    if (existingUser) {
      return res.status(400).json({ error: "Bu Fetih Sosyal kullanıcı adı zaten alınmış!" });
    }

    // Yeni kullanıcıyı kaydet (Şifreler eğitim amaçlı düz metin tutuluyor, ileride şifreleriz)
    const newUser = { name, username, email, phone, password, createdAt: Date.now() };
    await fetch(`${FIREBASE_URL}/users/${username}.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newUser)
    });

    res.json({ success: true, message: "Kayıt başarılı!" });
  } catch (err) {
    res.status(500).json({ error: "Sunucu hatası!" });
  }
});

// --- GİRİŞ (LOGIN) API ---
app.post('/api/login', async (req, res) => {
  const { identifier, password } = req.body;
  
  try {
    // Tüm kullanıcıları çek
    const usersRes = await fetch(`${FIREBASE_URL}/users.json`);
    const users = await usersRes.json();

    if (!users) return res.status(400).json({ error: "Kayıtlı kullanıcı bulunamadı." });

    // E-posta, Telefon veya Kullanıcı Adı ile eşleşen kullanıcıyı bul
    const foundUser = Object.values(users).find(u => 
      (u.username === identifier || u.email === identifier || u.phone === identifier) && 
      u.password === password
    );

    if (!foundUser) {
      return res.status(400).json({ error: "Hatalı bilgi veya şifre!" });
    }

    res.json({ success: true, username: foundUser.username });
  } catch (err) {
    res.status(500).json({ error: "Sunucu hatası!" });
  }
});

// --- SOCKET.IO ---
io.on('connection', (socket) => {
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

app.get('/{*splat}', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Sunucu ${PORT} portunda aktif!`);
});