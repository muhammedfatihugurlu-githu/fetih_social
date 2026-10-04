const socket = io();

function initApp() {
  const authContainer = document.getElementById('auth-container');
  const feedContainer = document.getElementById('feed-container');
  const loginSection = document.getElementById('login-section');
  const registerSection = document.getElementById('register-section');

  const gotoRegister = document.getElementById('goto-register');
  const gotoLogin = document.getElementById('goto-login');

  // Sayfa Değiştirme
  if (gotoRegister) {
    gotoRegister.onclick = () => {
      loginSection.style.display = 'none';
      registerSection.style.display = 'block';
    };
  }

  if (gotoLogin) {
    gotoLogin.onclick = () => {
      registerSection.style.display = 'none';
      loginSection.style.display = 'block';
    };
  }

  // KAYIT OL
  const registerBtn = document.getElementById('register-btn');
  if (registerBtn) {
    registerBtn.onclick = async () => {
      const name = document.getElementById('reg-name').value.trim();
      const username = document.getElementById('reg-username').value.trim();
      const email = document.getElementById('reg-email').value.trim();
      const phone = document.getElementById('reg-phone').value.trim();
      const password = document.getElementById('reg-password').value;

      if (!name || !username || !email || !password) {
        return alert("Lütfen Ad Soyad, Kullanıcı Adı, E-posta ve Şifre alanlarını doldurun!");
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
          alert("Kayıt başarılı! Şimdi giriş yapabilirsiniz.");
          registerSection.style.display = 'none';
          loginSection.style.display = 'block';
        } else {
          alert(data.error || "Kayıt olunamadı!");
        }
      } catch (err) {
        console.error(err);
        alert("Sunucuya bağlanırken bir hata oluştu!");
      } finally {
        registerBtn.innerText = "Kayıt Ol";
        registerBtn.disabled = false;
      }
    };
  }

  // GİRİŞ YAP
  const loginBtn = document.getElementById('login-btn');
  if (loginBtn) {
    loginBtn.onclick = async () => {
      const identifier = document.getElementById('login-identifier').value.trim();
      const password = document.getElementById('login-password').value;

      if (!identifier || !password) {
        return alert("Lütfen e-posta/kullanıcı adı ve şifrenizi girin!");
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
          alert(data.error || "Giriş başarısız!");
        }
      } catch (err) {
        console.error(err);
        alert("Giriş yapılırken bir hata oluştu!");
      } finally {
        loginBtn.innerText = "Giriş Yap";
        loginBtn.disabled = false;
      }
    };
  }

  // ÇIKIŞ
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.onclick = () => {
      localStorage.removeItem('fetih_username');
      authContainer.style.display = 'block';
      feedContainer.style.display = 'none';
    };
  }

  // EKRAN GÖSTERİMİ
  function showFeed() {
    authContainer.style.display = 'none';
    feedContainer.style.display = 'block';
    loadPosts();
  }

  async function loadPosts() {
    try {
      const postsList = document.getElementById('postsList');
      const res = await fetch('https://fetih-social-f6505-default-rtdb.firebaseio.com/posts.json');
      const data = await res.json();
      if (postsList) {
        postsList.innerHTML = '';
        if (data) {
          Object.keys(data).reverse().forEach(key => {
            addPostToUI(data[key]);
          });
        }
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

  // POST PAYLAŞMA
  const sendBtn = document.getElementById('sendBtn');
  if (sendBtn) {
    sendBtn.onclick = () => {
      const content = document.getElementById('postContent').value.trim();
      if (!content) return;

      const postData = {
        username: localStorage.getItem('fetih_username') || 'Anonim',
        content,
        timestamp: Date.now()
      };

      socket.emit('new_post', postData);
      document.getElementById('postContent').value = '';
    };
  }

  socket.on('receive_post', (post) => {
    addPostToUI(post);
  });

  // BAŞLANGIÇ DURUMU
  if (localStorage.getItem('fetih_username')) {
    showFeed();
  } else {
    authContainer.style.display = 'block';
    feedContainer.style.display = 'none';
  }
}

// Uygulamayı başlat
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}