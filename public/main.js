const socket = io();

const sendBtn = document.getElementById('sendBtn');
const usernameInput = document.getElementById('username');
const postContentInput = document.getElementById('postContent');
const postsList = document.getElementById('postsList');

// Sayfa açıldığında eski gönderileri Firebase REST API ile çek
async function loadPosts() {
  try {
    const res = await fetch('https://fetih-social-f6505-default-rtdb.firebaseio.com/posts.json');
    const data = await res.json();
    if (data) {
      postsList.innerHTML = '';
      Object.keys(data).reverse().forEach(key => {
        addPostToUI(data[key]);
      });
    }
  } catch (err) {
    console.error("Gönderiler yüklenemedi:", err);
  }
}

// Ekran üzerine gönderi kartı ekleme işlevi
function addPostToUI(post) {
  const div = document.createElement('div');
  div.className = 'post-card';
  div.innerHTML = `
    <strong>@${post.username}</strong>
    <p>${post.content}</p>
    <small>${new Date(post.timestamp).toLocaleTimeString()}</small>
  `;
  postsList.prepend(div);
}

// Paylaş butonuna basıldığında
sendBtn.addEventListener('click', () => {
  const username = usernameInput.value.trim() || 'Anonim';
  const content = postContentInput.value.trim();

  if (!content) return alert('Lütfen bir şeyler yazın!');

  const postData = {
    username,
    content,
    timestamp: Date.now()
  };

  // Sunucuya Socket ile fırlat
  socket.emit('new_post', postData);
  postContentInput.value = '';
});

// Sunucudan yeni gönderi ulaştığında anında ekrana bas
socket.on('receive_post', (post) => {
  addPostToUI(post);
});

// Sayfa yüklendiğinde eski gönderileri getir
loadPosts();