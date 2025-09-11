// 🌐 Базова адреса API
const API_BASE_URL = 'http://localhost:8080/api';

// ✅ Перевіряємо токен при завантаженні сторінки
window.addEventListener('DOMContentLoaded', () => {
  const token = localStorage.getItem('token') || sessionStorage.getItem('token');
  if (token) {
    alert('🔐 Ви вже увійшли');
    // 👉 За потреби перенаправляй:
    // window.location.href = '/dashboard.html';
  }
});

// 🔁 Показати форму логіну
function showLogin() {
  document.getElementById('menu').style.display = 'none';
  document.getElementById('registerForm').style.display = 'none';
  document.getElementById('loginForm').style.display = 'block';
}

// 🔁 Показати форму реєстрації
function showRegister() {
  document.getElementById('menu').style.display = 'none';
  document.getElementById('loginForm').style.display = 'none';
  document.getElementById('registerForm').style.display = 'block';
}

// 📝 Відправка даних реєстрації
async function registerUser(event) {
  event.preventDefault();

  const email = document.getElementById('regEmail').value.trim();
  const password = document.getElementById('regPassword').value.trim();
  const repeatPassword = document.getElementById('regRepeatPassword').value.trim();
  const firstName = document.getElementById('regFirstName').value.trim();
  const lastName = document.getElementById('regLastName').value.trim();
  const phoneNumber = document.getElementById('regPhoneNumber').value.trim();
  const departmentName = document.getElementById('regDepartmentName').value;

  if (password !== repeatPassword) {
    alert('❌ Паролі не співпадають');
    return;
  }

  const payload = {
    email,
    password,
    repeatPassword,
    firstName,
    lastName,
    phoneNumber,
    departmentName
  };

  try {
    const response = await fetch(`${API_BASE_URL}/auth/registration`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (response.ok) {
      alert("✅ " + data.message);
      showLogin(); // переходимо до логіну
    } else {
      alert("❌ " + (data.message || "Помилка реєстрації"));
    }
  } catch (error) {
    alert("❌ Помилка під час реєстрації: " + error.message);
  }
}

// 🔐 Логін користувача
async function loginUser(event) {
  event.preventDefault();

  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value.trim();
  const rememberMe = document.getElementById('rememberMe').checked;

  try {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const data = await response.json();

   if (response.ok) {
     const storage = rememberMe ? localStorage : sessionStorage;
     storage.setItem('token', data.token); // 🔐 Зберігаємо токен

     window.location.href = '../html/user/user_dashboard_ui.html'; // 👈 Перехід до кабінету
   }
    else {
      alert("❌ Невірний логін або пароль");
    }
  } catch (error) {
    alert("❌ Помилка під час логіну: " + error.message);
  }
}
