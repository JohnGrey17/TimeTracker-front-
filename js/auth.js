// 🔐 auth.js (оновлений)
const API_BASE_URL = 'http://localhost:8080/api';

window.addEventListener('DOMContentLoaded', () => {
  const token = localStorage.getItem('token') || sessionStorage.getItem('token');
  if (token) {
    alert('🔐 Ви вже увійшли');
  }
});

function showLogin() {
  document.getElementById('menu').style.display = 'none';
  document.getElementById('registerForm').style.display = 'none';
  document.getElementById('loginForm').style.display = 'block';
}

function showRegister() {
  document.getElementById('menu').style.display = 'none';
  document.getElementById('loginForm').style.display = 'none';
  document.getElementById('registerForm').style.display = 'block';
}

function highlightIfEmpty(element) {
  if (!element.value.trim()) {
    element.classList.add('error');
    return true;
  } else {
    element.classList.remove('error');
    return false;
  }
}

async function registerUser(event) {
  event.preventDefault();

  const fields = [
    'regEmail', 'regPassword', 'regRepeatPassword', 'regFirstName', 'regLastName', 'regPhoneNumber'
  ];

  let hasEmpty = false;
  fields.forEach(id => {
    const input = document.getElementById(id);
    if (highlightIfEmpty(input)) hasEmpty = true;
  });

  const departmentSelect = document.getElementById('regDepartmentName');
  if (!departmentSelect.value) {
    departmentSelect.classList.add('error');
    hasEmpty = true;
  } else {
    departmentSelect.classList.remove('error');
  }

  if (hasEmpty) return;

  const email = document.getElementById('regEmail').value.trim();
  const password = document.getElementById('regPassword').value.trim();
  const repeatPassword = document.getElementById('regRepeatPassword').value.trim();
  const firstName = document.getElementById('regFirstName').value.trim();
  const lastName = document.getElementById('regLastName').value.trim();
  const phoneNumber = document.getElementById('regPhoneNumber').value.trim();
  const departmentName = departmentSelect.value;

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
      showLogin();
    } else {
      alert("❌ " + (data.message || "Помилка реєстрації"));
    }
  } catch (error) {
    alert("❌ Помилка під час реєстрації: " + error.message);
  }
}

async function loginUser(event) {
  event.preventDefault();

  const emailEl = document.getElementById('loginEmail');
  const passEl = document.getElementById('loginPassword');

  const hasError = [highlightIfEmpty(emailEl), highlightIfEmpty(passEl)].some(Boolean);
  if (hasError) return;

  const email = emailEl.value.trim();
  const password = passEl.value.trim();
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
      storage.setItem('token', data.token);
      window.location.href = '../html/user/user_dashboard_ui.html';
    } else {
      alert("❌ Невірний логін або пароль");
    }
  } catch (error) {
    alert("❌ Помилка під час логіну: " + error.message);
  }
}
