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
  try {
    const { name, username, email, phone, password } = req.body;

    if (!name || !username || !email || !password) {
      return res.status(400).json({ error: "Lütfen zorunlu alanları doldurun!" });
    }

    const cleanUsername = username.replace(/\s/g, '').toLowerCase();

    // Firebase'den mevcut kullanıcıları çek
    const usersRes = await fetch(`${FIREBASE_URL}/users.json`);
    const usersData = await usersRes.json();
    const users = usersData || {};

    const isUsernameTaken = users[cleanUsername] !== undefined;
    const isEmailTaken = Object.values(users).some(u => u && u.email && u.email.toLowerCase() === email.toLowerCase());
    const isPhoneTaken = phone && Object.values(users).some(u => u && u.phone && u.phone === phone);

    if (isUsernameTaken) {
      return res.status(400).json({ error: "Bu Fetih Sosyal kullanıcı adı zaten alınmış!" });
    }
    if (isEmailTaken) {
      return res.status(400).json({ error: "Bu e-posta adresi zaten kayıtlı!" });
    }
    if (isPhoneTaken) {
      return res.status(400).json({ error: "Bu telefon numarası zaten kayıtlı!" });
    }

    const newUser = {
      name,
      username: cleanUsername,
      email: email.toLowerCase(),
      phone: phone || '',
      password,
      createdAt: Date.now()
    };

    // Firebase Realtime Database'e PUT isteği ile yaz
    const saveRes = await fetch(`${FIREBASE_URL}/users/${cleanUsername}.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newUser)
    });

    if (!saveRes.ok) throw new Error("Firebase kayıt hatası");

    res.json({ success: true, message: "Kayıt başarılı! Şimdi giriş yapabilirsiniz." });
  } catch (err) {
    console.error("Kayıt Hatası:", err);
    res.status(500).json({ error: "Sunucuda bir hata oluştu!" });
  }
});

// --- GİRİŞ (LOGIN) API ---
app.post('/api/login', async (req, res) => {
  try {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
      return res.status(400).json({ error: "Lütfen kullanıcı bilgisi ve şifrenizi girin!" });
    }

    const cleanIdentifier = identifier.trim().toLowerCase();

    const usersRes = await fetch(`${FIREBASE_URL}/users.json`);
    const users = await usersRes.json();

    if (!users) {
      return res.status(400).json({ error: "Kayıtlı kullanıcı bulunamadı!" });
    }

    const foundUser = Object.values(users).find(u => 
      u && (
        u.username === cleanIdentifier || 
        (u.email && u.email.toLowerCase() === cleanIdentifier) || 
        (u.phone && u.phone === cleanIdentifier)
      ) && u.password === password
    );

    if (!foundUser) {
      return res.status(400).json({ error: "Hatalı bilgi veya şifre!" });
    }

    res.json({ success: true, username: foundUser.username, name: foundUser.name });
  } catch (err) {
    console.error("Giriş Hatası:", err);
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
      console.error('Firebase Post Hatası:', err);
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