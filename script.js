import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
  setPersistence,
  browserSessionPersistence,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// Конфигурация Firebase
const firebaseConfig = {
  apiKey: "AIzaSyDA55gbFIIG6u9Ng-YiQfYSusmCvzD6seM",
  authDomain: "profiles-57901.firebaseapp.com",
  projectId: "profiles-57901",
  storageBucket: "profiles-57901.appspot.com",
  messagingSenderId: "125661177816",
  appId: "1:125661177816:web:3a8c2a3e1d3d8c8d8d8d8d",
};

// Инициализация Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// ======================== Аутентификация ========================
// Регистрация
document.getElementById("register-form")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  try {
    await createUserWithEmailAndPassword(auth, email, password);
    window.location.href = "profile.html";
  } catch (error) {
    showToast(error.message, "error");
  }
});

// Авторизация
document.getElementById("login-form")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = document.getElementById("username").value;
  const password = document.getElementById("password").value;

  try {
    await setPersistence(auth, browserSessionPersistence);
    await signInWithEmailAndPassword(auth, email, password);
    window.location.href = "profile.html";
  } catch (error) {
    showToast(error.message, "error");
  }
});

// Выход
document.getElementById("logout-button")?.addEventListener("click", () => {
  signOut(auth).then(() => (window.location.href = "index.html"));
});

// Проверка авторизации
onAuthStateChanged(auth, (user) => {
  const protectedPages = ["profile.html", "create-portfolio.html"];
  const currentPage = window.location.pathname.split("/").pop();

  // Редиректы
  if (!user && protectedPages.includes(currentPage)) {
    window.location.href = "login.html";
  }
  if (user && currentPage === "login.html") {
    window.location.href = "profile.html";
  }

  // Обновление интерфейса
  const usernameDisplay = document.getElementById("username-display");
  if (usernameDisplay) usernameDisplay.textContent = user?.email || "Гость";
});

// ======================== Портфолио ========================
// Загрузка и фильтрация
let unsubscribePortfolios = null;

function loadPortfolios() {
  const container = document.getElementById('portfolio-list');
  if (!container) return;

  // Очищаем предыдущую подписку
  if (unsubscribePortfolios) unsubscribePortfolios();

  container.innerHTML = 'Загрузка...';
  
  // Создаем запрос с сортировкой
  const q = query(
    collection(db, 'portfolios'), 
    orderBy('createdAt', 'desc')
  );

  // Подписываемся на обновления в реальном времени
  unsubscribePortfolios = onSnapshot(q, (snapshot) => {
    container.innerHTML = '';
    snapshot.forEach(doc => {
      const portfolio = doc.data();
      container.innerHTML += renderPortfolio(doc.data(), doc.id); `
        <article class="portfolio-card">
          ${portfolio.image ? `
            <div class="card-image">
              <img src="${portfolio.image}" alt="${portfolio.title}">
            </div>` : ''}
          <div class="card-content">
            <span class="category ${portfolio.category}">
              ${getCategoryName(portfolio.category)}
            </span>
            <h3>${portfolio.title}</h3>
            <p>${portfolio.description}</p>
            <div class="card-footer">
              <time>${new Date(
                portfolio.createdAt?.toDate()
              ).toLocaleDateString()}</time>
            </div>
          </div>
        </article>
      `;
    });
    
    // Инициализируем фильтры после рендеринга
    setupFilters();
  }, (error) => {
    console.error('Ошибка загрузки:', error);
    container.innerHTML = 'Ошибка загрузки данных';
  });
}

// Рендер карточки
function renderPortfolio(portfolio, docId) {
    return `
      <article class="portfolio-card" data-id="${docId}">
        <a href="portfolio-details.html?id=${docId}" class="card-link">
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
        </a>
      </article>
    `;
  }

// Фильтрация
function setupFilters() {
  const searchInput = document.getElementById("search-term");
  const categorySelect = document.getElementById("filter-categories");

  const filter = () => {
    const searchTerm = searchInput.value.toLowerCase();
    const selectedCategories = Array.from(categorySelect.selectedOptions).map((opt) => opt.value);
    
    document.querySelectorAll(".portfolio-card").forEach((card) => {
      const title = card.querySelector("h3").textContent.toLowerCase();
      const desc = card.querySelector("p").textContent.toLowerCase();
      const category = card.querySelector(".category").classList[1];
      
      const matchesSearch = title.includes(searchTerm) || desc.includes(searchTerm);
      const matchesCategory = selectedCategories.length === 0 || selectedCategories.includes(category);
      
      card.style.display = matchesSearch && matchesCategory ? "block" : "none";
    });
  };

  searchInput.addEventListener("input", filter);
  categorySelect.addEventListener("change", filter);
  filter(); // Первоначальная фильтрация
}

// Создание портфолио
document.getElementById('create-portfolio-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Получаем текущего пользователя
    const user = auth.currentUser;
    if (!user) {
      showToast('Требуется авторизация!', 'error');
      return;
    }
  
    // 1. Исправление ReferenceError - объявляем portfolioData перед использованием
    const portfolioData = {
      title: document.getElementById('title').value,
      category: document.getElementById('category').value,
      description: document.getElementById('description').value,
      image: document.getElementById('image').value,
      tags: document.getElementById('tags').value.split(',').map(t => t.trim()),
      experience: parseInt(document.getElementById('experience').value),
      projects: document.getElementById('projects').value.split(',').map(p => p.trim()),
      contacts: {
        phone: document.getElementById('phone').value,
        email: document.getElementById('contact-email').value
      },
      skills: document.getElementById('skills').value.split(',').map(s => s.trim()),
      authorId: user.uid,
      createdAt: serverTimestamp()
    };

    const phonePattern = /^\+?[0-9()\s-]{7,}$/;
    if (portfolioData.contacts.phone && !phonePattern.test(portfolioData.contacts.phone)) {
      showToast('Неверный формат телефона. Пример: +7 (999) 123-45-67', 'error');
      return;
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (portfolioData.contacts.email && !emailPattern.test(portfolioData.contacts.email)) {
        showToast('Неверный формат email', 'error');
        return;
        }

    try {
        await addDoc(collection(db, 'portfolios'), portfolioData);
        showToast('Портфолио создано!', 'success');
        setTimeout(() => window.location.href = 'index.html', 1500);
      } catch (error) {
        showToast(`Ошибка: ${error.message}`, 'error');
      }
    });

// ======================== Вспомогательные функции ========================
function getCategoryName(category) {
  const categories = {
    web: "Веб-разработка",
    design: "Дизайн",
    marketing: "Маркетинг",
  };
  return categories[category] || category;
}

function showToast(message, type = "info") {
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

// ======================== Инициализация ========================
document.addEventListener("DOMContentLoaded", () => {
  loadPortfolios();
  setupNetworkListener();
});

// Мониторинг сети
function setupNetworkListener() {
  const statusElement = document.createElement("div");
  statusElement.id = "network-status";
  document.body.appendChild(statusElement);

  const q = query(collection(db, "portfolios"));
  onSnapshot(q, { includeMetadataChanges: true }, (snapshot) => {
    statusElement.textContent = snapshot.metadata.fromCache ? "Оффлайн" : "Онлайн";
    statusElement.className = snapshot.metadata.fromCache ? "offline" : "online";
  });
}

// Загрузка данных портфолио
async function loadPortfolioDetails() {
    const urlParams = new URLSearchParams(window.location.search);
    const portfolioId = urlParams.get('id');
    const container = document.getElementById('portfolio-details');
  
    if (!portfolioId || !container) return;
  
    try {
      const docRef = doc(db, "portfolios", portfolioId);
      const docSnap = await getDoc(docRef);
  
      if (docSnap.exists()) {
        const portfolio = docSnap.data();
        container.innerHTML = `
          <div class="portfolio-full">
            ${portfolio.image ? `
              <div class="full-image">
                <img src="${portfolio.image}" alt="${portfolio.title}">
              </div>` : ''}
            <div class="full-content">
              <h1>${portfolio.title}</h1>
              <div class="meta">
                <span class="category">${getCategoryName(portfolio.category)}</span>
                <time>${new Date(portfolio.createdAt?.toDate()).toLocaleDateString()}</time>
              </div>
              <p>${portfolio.description}</p>
              ${portfolio.tags?.length ? `
                <div class="tags">
                  ${portfolio.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
                </div>` : ''}
                </div>
                <div class="details-section">
                <h2>Профессиональная информация</h2>
                ${portfolio.experience ? `<p>Стаж: ${portfolio.experience} лет</p>` : ''}
                ${portfolio.skills?.length ? `
                    <div class="skills">
                    <h3>Навыки:</h3>
                    ${portfolio.skills.map(skill => `<span class="skill-badge">${skill}</span>`).join('')}
                    </div>` : ''}
                </div>

                <div class="details-section">
                <h2>Контакты</h2>
                ${portfolio.contacts?.phone ? `<p>Телефон: ${portfolio.contacts.phone}</p>` : ''}
                ${portfolio.contacts?.email ? `<p>Email: <a href="mailto:${portfolio.contacts.email}">${portfolio.contacts.email}</a></p>` : ''}
                </div>

                ${portfolio.projects?.length ? `
                <div class="details-section">
                <h2>Примеры проектов</h2>
                <ul class="projects-list">
                    ${portfolio.projects.map(project => `<li>${project}</li>`).join('')}
                </ul>
                </div>` : ''}
            </div>
            `;
      } else {
        container.innerHTML = 'Проект не найден';
      }
    } catch (error) {
      console.error('Ошибка загрузки:', error);
      container.innerHTML = 'Ошибка загрузки данных';
    }
  }
  
  // Добавьте в конец файла:
  if (window.location.pathname.includes('portfolio-details.html')) {
    loadPortfolioDetails();
  }
  

// Проверка соединения
const testConnection = async () => {
  try {
    const docRef = doc(db, "status/connection");
    await getDoc(docRef);
  } catch (error) {
    console.log("Оффлайн режим");
  }
};
testConnection();