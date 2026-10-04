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

// Türkçe Karakterleri ve Geçersiz Harfleri Temizleme
function slugifyUsername(str) {
  return str
    .toLowerCase()
    .trim()
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ı/g, 'i')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/[^a-z0-9_.-]/g, '');
}

// --- KAYIT (REGISTER) API ---
app.post('/api/register', async (req, res) => {
  try {
    const { name, username, email, phone, password } = req.body;

    if (!name || !username || !email || !password) {
      return res.status(400).json({ error: "Lütfen tüm zorunlu alanları doldurun!" });
    }

    const cleanUsername = slugifyUsername(username);

    if (!cleanUsername) {
      return res.status(400).json({ error: "Geçerli bir kullanıcı adı girin!" });
    }

    // Firebase'den mevcut kullanıcıları getir
    const usersRes = await fetch(`${FIREBASE_URL}/users.json`);
    const users = (await usersRes.json()) || {};

    const isUsernameTaken = users[cleanUsername] !== undefined;
    const isEmailTaken = Object.values(users).some(u => u && u.email && u.email.toLowerCase() === email.toLowerCase());

    if (isUsernameTaken) {
      return res.status(400).json({ error: "Bu Fetih Sosyal kullanıcı adı zaten alınmış!" });
    }
    if (isEmailTaken) {
      return res.status(400).json({ error: "Bu e-posta adresi zaten kayıtlı!" });
    }

    const newUser = {
      name,
      username: cleanUsername,
      email: email.toLowerCase(),
      phone: phone || '',
      password,
      createdAt: Date.now()
    };

    // Firebase Realtime Database'e yaz
    const saveRes = await fetch(`${FIREBASE_URL}/users/${cleanUsername}.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newUser)
    });

    if (!saveRes.ok) throw new Error("Firebase kayıt hatası");

    res.json({ success: true, message: "Kayıt başarılı! Şimdi giriş yapabilirsiniz." });
  } catch (err) {
    console.error("Kayıt Hatası:", err);
    res.status(500).json({ error: "Sunucu hatası veya veritabanı bağlantı sorunu!" });
  }
});

// --- GİRİŞ (LOGIN) API ---
app.post('/api/login', async (req, res) => {
  try {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
      return res.status(400).json({ error: "Lütfen bilgilerinizi girin!" });
    }

    const cleanIdentifier = slugifyUsername(identifier);

    const usersRes = await fetch(`${FIREBASE_URL}/users.json`);
    const users = await usersRes.json();

    if (!users) {
      return res.status(400).json({ error: "Kayıtlı kullanıcı bulunamadı!" });
    }

    const foundUser = Object.values(users).find(u => 
      u && (
        u.username === cleanIdentifier || 
        (u.email && u.email.toLowerCase() === identifier.trim().toLowerCase()) || 
        (u.phone && u.phone === identifier.trim())
      ) && u.password === password
    );

    if (!foundUser) {
      return res.status(400).json({ error: "Hatalı kullanıcı adı/e-posta veya şifre!" });
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
      console.error('Post Paylaşım Hatası:', err);
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