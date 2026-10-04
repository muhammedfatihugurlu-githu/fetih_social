const socket = io();

// Ekran Değiştirme Fonksiyonu
window.toggleAuth = function(type) {
  const loginSection = document.getElementById('login-section');
  const registerSection = document.getElementById('register-section');
  
  if (type === 'register') {
    loginSection.style.display = 'none';
    registerSection.style.display = 'block';
  } else {
    registerSection.style.display = 'none';
    loginSection.style.display = 'block';
  }
};

document.addEventListener('DOMContentLoaded', () => {
  const authContainer = document.getElementById('auth-container');
  const feedContainer = document.getElementById('feed-container');

  // --- KAYIT OL BUTONU ---
  const registerBtn = document.getElementById('register-btn');
  if (registerBtn) {
    registerBtn.addEventListener('click', async () => {
      const name = document.getElementById('reg-name').value.trim();
      const username = document.getElementById('reg-username').value.trim();
      const email = document.getElementById('reg-email').value.trim();
      const phone = document.getElementById('reg-phone').value.trim();
      const password = document.getElementById('reg-password').value;

      if (!name || !username || !email || !password) {
        return alert("Lütfen isim, kullanıcı adı, e-posta ve şifre alanlarını doldurun!");
      }

      registerBtn.innerText = "Kaydediliyor...";
      registerBtn.disabled = true;

      try {
        const res = await fetch('/api/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, username, email, phone, password })
        });

        const data = await res.json();
        if (data.success) {
          alert(data.message);
          window.toggleAuth('login');
        } else {
          alert(data.error);
        }
      } catch (err) {
        alert("Bağlantı hatası oluştu!");
      } finally {
        registerBtn.innerText = "Kayıt Ol";
        registerBtn.disabled = false;
      }
    });
  }

  // --- GİRİŞ YAP BUTONU ---
  const loginBtn = document.getElementById('login-btn');
  if (loginBtn) {
    loginBtn.addEventListener('click', async () => {
      const identifier = document.getElementById('login-identifier').value.trim();
      const password = document.getElementById('login-password').value;

      if (!identifier || !password) {
        return alert("Lütfen bilgilerinizi girin!");
      }

      loginBtn.innerText = "Giriş Yapılıyor...";
      loginBtn.disabled = true;

      try {
        const res = await fetch('/api/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ identifier, password })
        });

        const data = await res.json();
        if (data.success) {
          localStorage.setItem('fetih_username', data.username);
          showFeed();
        } else {
          alert(data.error);
        }
      } catch (err) {
        alert("Bağlantı hatası oluştu!");
      } finally {
        loginBtn.innerText = "Giriş Yap";
        loginBtn.disabled = false;
      }
    });
  }

  // --- ÇIKIŞ BUTONU ---
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      localStorage.removeItem('fetih_username');
      authContainer.style.display = 'block';
      feedContainer.style.display = 'none';
    });
  }

  // Oturum Kontrolü
  function showFeed() {
    authContainer.style.display = 'none';
    feedContainer.style.display = 'block';
    loadPosts();
  }

  // Gönderileri Firebase'den Çekme
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
    const postsList = document.getElementById('postsList');
    if (!postsList) return;

    const div = document.createElement('div');
    div.className = 'post-card';
    div.innerHTML = `
      <div class="post-header">
        <div class="user-avatar">${post.username ? post.username[0].toUpperCase() : 'U'}</div>
        <strong>@${post.username}</strong>
      </div>
      <p>${post.content}</p>
      <span class="post-time">${new Date(post.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
    `;
    postsList.prepend(div);
  }

  // Gönderi Paylaşma
  const sendBtn = document.getElementById('sendBtn');
  if (sendBtn) {
    sendBtn.addEventListener('click', () => {
      const content = document.getElementById('postContent').value.trim();
      if (!content) return;

      const postData = {
        username: localStorage.getItem('fetih_username') || 'Anonim',
        content,
        timestamp: Date.now()
      };

      socket.emit('new_post', postData);
      document.getElementById('postContent').value = '';
    });
  }

  socket.on('receive_post', (post) => {
    addPostToUI(post);
  });

  // Başlangıç Kontrolü
  if (localStorage.getItem('fetih_username')) {
    showFeed();
  } else {
    authContainer.style.display = 'block';
    feedContainer.style.display = 'none';
  }
});