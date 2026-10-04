const socket = io();

// Ekran Kontrolleri
const authContainer = document.getElementById('auth-container');
const feedContainer = document.getElementById('feed-container');
const loginSection = document.getElementById('login-section');
const registerSection = document.getElementById('register-section');

// Kayıt-Giriş Arası Geçiş
window.toggleAuth = (type) => {
  if (type === 'register') {
    loginSection.style.display = 'none';
    registerSection.style.display = 'block';
  } else {
    registerSection.style.display = 'none';
    loginSection.style.display = 'block';
  }
};

// Kayıt İşlemi
document.getElementById('register-btn').addEventListener('click', async () => {
  const name = document.getElementById('reg-name').value;
  const username = document.getElementById('reg-username').value;
  const email = document.getElementById('reg-email').value;
  const phone = document.getElementById('reg-phone').value;
  const password = document.getElementById('reg-password').value;

  if (!name || !username || !email || !password) return alert("Lütfen zorunlu alanları doldurun!");

  const res = await fetch('/api/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, username, email, phone, password })
  });
  
  const data = await res.json();
  if (data.success) {
    alert("Kayıt başarılı! Şimdi giriş yapabilirsiniz.");
    toggleAuth('login');
  } else {
    alert(data.error);
  }
});

// Giriş İşlemi
document.getElementById('login-btn').addEventListener('click', async () => {
  const identifier = document.getElementById('login-identifier').value.trim();
  const password = document.getElementById('login-password').value;

  if (!identifier || !password) return alert("Bilgileri girin!");

  const res = await fetch('/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier, password })
  });
  
  const data = await res.json();
  if (data.success) {
    // Başarılı girişte kullanıcıyı tarayıcıya kaydet ve akışı aç
    localStorage.setItem('fetih_username', data.username);
    showFeed();
  } else {
    alert(data.error);
  }
});

// Çıkış İşlemi
document.getElementById('logout-btn').addEventListener('click', () => {
  localStorage.removeItem('fetih_username');
  authContainer.style.display = 'block';
  feedContainer.style.display = 'none';
});

// Oturum Kontrolü ve Akışı Gösterme
function showFeed() {
  authContainer.style.display = 'none';
  feedContainer.style.display = 'block';
  loadPosts();
}

// Sayfa yüklendiğinde eski gönderileri getir
async function loadPosts() {
  try {
    const postsList = document.getElementById('postsList');
    const res = await fetch('https://fetih-social-f6505-default-rtdb.firebaseio.com/posts.json');
    const data = await res.json();
    postsList.innerHTML = '';
    
    if (data) {
      Object.keys(data).reverse().forEach(key => {
        addPostToUI(data[key]);
      });
    }
  } catch (err) {
    console.error("Gönderiler yüklenemedi:", err);
  }
}

function addPostToUI(post) {
  const div = document.createElement('div');
  div.className = 'post-card';
  div.innerHTML = `
    <strong>@${post.username}</strong>
    <p>${post.content}</p>
    <small>${new Date(post.timestamp).toLocaleTimeString()}</small>
  `;
  document.getElementById('postsList').prepend(div);
}

// Gönderi Paylaşma
document.getElementById('sendBtn').addEventListener('click', () => {
  const content = document.getElementById('postContent').value.trim();
  if (!content) return;

  const postData = {
    username: localStorage.getItem('fetih_username'),
    content,
    timestamp: Date.now()
  };

  socket.emit('new_post', postData);
  document.getElementById('postContent').value = '';
});

// Yeni post Socket'ten geldiğinde ekrana ekle
socket.on('receive_post', (post) => {
  addPostToUI(post);
});

// Sistem Başlangıcı: Giriş yapılmış mı kontrol et
if (localStorage.getItem('fetih_username')) {
  showFeed();
} else {
  authContainer.style.display = 'block';
  feedContainer.style.display = 'none';
}