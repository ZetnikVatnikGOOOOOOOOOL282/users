// Инициализация Firebase
const firebaseConfig = {
    apiKey: "AIzaSyBYgtwO8EafPYDlIbbZMnY7ALGJDB7gIA4",
    authDomain: "пользователи-6049a.firebaseapp.com",
    projectId: "пользователи-6049a",
    storageBucket: "пользователи-6049a.appspot.com",
    messagingSenderId: "936560336693",
    appId: "936560336693"
  };
  
  firebase.initializeApp(firebaseConfig);
  const db = firebase.firestore();
  const auth = firebase.auth();
  
  // Регистрация пользователя
  document.getElementById('register-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
  
    try {
      const userCredential = await auth.createUserWithEmailAndPassword(email, password);
      
      // Сохраняем базовую информацию о пользователе
      await db.collection('users').doc(userCredential.user.uid).set({
        email: email,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      
      window.location.href = 'profile.html';
    } catch (error) {
      console.error('Ошибка регистрации:', error);
      alert(error.message);
    }
  });
  
  // Авторизация пользователя
  document.getElementById('login-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('username').value;
    const password = document.getElementById('password').value;
  
    try {
      await auth.signInWithEmailAndPassword(email, password);
      window.location.href = 'profile.html';
    } catch (error) {
      console.error('Ошибка входа:', error);
      alert(error.message);
    }
  });
  
  // Выход из системы
  document.getElementById('logout-button')?.addEventListener('click', () => {
    auth.signOut().then(() => {
      window.location.href = 'index.html';
    });
  });

  // Включите оффлайн-поддержку
firebase.firestore().enablePersistence()
.catch((err) => {
  console.error('Ошибка оффлайн-режима:', err);
});

// Обработчик изменения состояния соединения
firebase.firestore().enableNetwork()
.then(() => {
  firebase.firestore().onSnapshotsInSync(() => {
    console.log('Синхронизация с сервером восстановлена');
  });
});

// Проверка базового соединения
const testConnection = async () => {
    try {
      await firebase.firestore().doc('test/connection').get();
      console.log('Соединение с Firebase успешно');
    } catch (error) {
      console.error('Критическая ошибка соединения:', error);
      alert('Нет соединения с сервером. Проверьте интернет.');
    }
  };
  
  // Вызовите при загрузке
  testConnection();
  
  // Логика создания портфолио с Firebase
  document.getElementById('create-portfolio-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const user = auth.currentUser;
    if (!user) {
      alert('Для создания портфолио необходимо авторизоваться!');
      return;
    }
  
    const portfolioData = {
      title: document.getElementById('title').value,
      category: document.getElementById('category').value,
      description: document.getElementById('description').value,
      image: document.getElementById('image').value,
      tags: document.getElementById('tags').value.split(',').map(t => t.trim()),
      authorId: user.uid,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };
  
    try {
      await db.collection('portfolios').add(portfolioData);
      window.location.href = 'index.html';
    } catch (error) {
      console.error('Ошибка сохранения:', error);
      alert('Ошибка при сохранении портфолио');
    }
  });
  
  // Загрузка портфолио с Firebase
  async function loadPortfolios() {
    const container = document.getElementById('portfolio-list');
    container.innerHTML = 'Загрузка...';
  
    try {
      const snapshot = await db.collection('portfolios').orderBy('createdAt', 'desc').get();
      container.innerHTML = '';
      
      snapshot.forEach(doc => {
        const portfolio = doc.data();
        container.innerHTML += `
          <article class="portfolio-card">
            ${portfolio.image ? `
              <div class="card-image">
                <img src="${portfolio.image}" alt="${portfolio.title}">
              </div>` : ''}
            <div class="card-content">
              <span class="category ${portfolio.category}">${getCategoryName(portfolio.category)}</span>
              <h3>${portfolio.title}</h3>
              <p>${portfolio.description}</p>
              <div class="card-footer">
                <time>${new Date(portfolio.createdAt?.toDate()).toLocaleDateString()}</time>
              </div>
            </div>
          </article>
        `;
      });
    } catch (error) {
      console.error('Ошибка загрузки:', error);
      container.innerHTML = 'Ошибка загрузки данных';
    }
  }
  
  // Проверка авторизации
  function checkAuth() {
    auth.onAuthStateChanged(user => {
      if (document.getElementById('username-display')) {
        document.getElementById('username-display').textContent = user?.email || 'Гость';
      }
      
      // Скрываем/показываем элементы для авторизованных пользователей
      document.querySelectorAll('.auth-only').forEach(el => {
        el.style.display = user ? 'block' : 'none';
      });
    });
  }
  
  // Инициализация
  document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    
    if (document.getElementById('portfolio-list')) {
      loadPortfolios();
      setupFilters();
    }
  });
  
  // Исправленная функция фильтрации
  function setupFilters() {
    const searchInput = document.getElementById('search-term');
    const categorySelect = document.getElementById('filter-categories');
  
    function filterPortfolios() {
      const searchTerm = searchInput.value.toLowerCase();
      const selectedCategories = Array.from(categorySelect.selectedOptions).map(opt => opt.value);
  
      const cards = document.querySelectorAll('.portfolio-card');
      cards.forEach(card => {
        const title = card.querySelector('h3').textContent.toLowerCase();
        const description = card.querySelector('p').textContent.toLowerCase();
        const cardCategory = card.querySelector('.category').classList[1];
        
        const matchesSearch = title.includes(searchTerm) || description.includes(searchTerm);
        const matchesCategory = selectedCategories.length === 0 || selectedCategories.includes(cardCategory);
        
        card.style.display = (matchesSearch && matchesCategory) ? 'block' : 'none';
      });
    }
  
    searchInput.addEventListener('input', filterPortfolios);
    categorySelect.addEventListener('change', filterPortfolios);
  }
  
  // Функция преобразования категории (остается без изменений)
function getCategoryName(category) {
    const categories = {
      web: 'Веб-разработка',
      design: 'Дизайн',
      marketing: 'Маркетинг'
    };
    return categories[category] || category;
  }
  
  // Предпросмотр изображения (незначительные правки)
  document.getElementById('image')?.addEventListener('input', function(e) {
    const preview = document.getElementById('image-preview');
    if (!preview) return;
    
    preview.innerHTML = this.value ? 
      `<img src="${this.value}" alt="Предпросмотр" class="preview-image">` : 
      '<div class="preview-placeholder">Изображение появится здесь</div>';
  });
  
  // Система уведомлений (добавить в код)
  function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
  
    setTimeout(() => toast.remove(), 3000);
  }
  
  // Логика черновиков (адаптирована для Firebase)
  document.getElementById('save-draft')?.addEventListener('click', async () => {
    const user = auth.currentUser;
    if (!user) {
      alert('Для сохранения черновика необходимо авторизоваться!');
      return;
    }
  
    const draft = {
      title: document.getElementById('title').value,
      category: document.getElementById('category').value,
      description: document.getElementById('description').value,
      image: document.getElementById('image').value,
      tags: document.getElementById('tags').value.split(',').map(t => t.trim()),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
  
    try {
      await db.collection('drafts').doc(user.uid).set(draft);
      showToast('Черновик успешно сохранен!', 'success');
    } catch (error) {
      console.error('Ошибка сохранения черновика:', error);
      showToast('Ошибка при сохранении черновика', 'error');
    }
  });
  
  // Загрузка черновика (адаптирована для Firebase)
  async function loadDraft() {
    const user = auth.currentUser;
    if (!user) return;
  
    try {
      const doc = await db.collection('drafts').doc(user.uid).get();
      if (doc.exists) {
        const draft = doc.data();
        document.getElementById('title').value = draft.title;
        document.getElementById('category').value = draft.category;
        document.getElementById('description').value = draft.description;
        document.getElementById('image').value = draft.image;
        document.getElementById('tags').value = draft.tags?.join(', ') || '';
      }
    } catch (error) {
      console.error('Ошибка загрузки черновика:', error);
    }
  }