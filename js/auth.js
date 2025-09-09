// frontend/js/auth.js

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

async function registerUser(event) {
  event.preventDefault();

  const email = document.getElementById('regEmail').value;
  const password = document.getElementById('regPassword').value;
  const repeatPassword = document.getElementById('regRepeatPassword').value;

  const response = await fetch('api/auth/registration', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, repeatPassword })
  });

  const data = await response.json();

  if (response.ok) {
    alert("✅ " + data.message);
    showLogin();
  } else {
    alert("❌ " + (data.message || "Помилка реєстрації"));
  }
}

async function loginUser(event) {
  event.preventDefault();

  const email = document.getElementById('loginEmail').value;
  const password = document.getElementById('loginPassword').value;
  const rememberMe = document.getElementById('rememberMe').checked;

  const response = await fetch('api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });

  const data = await response.json();

  if (response.ok) {
    const storage = rememberMe ? localStorage : sessionStorage;
    storage.setItem('token', data.token);
    alert("✅ Успішний вхід");
  } else {
    alert("❌ Невірний логін або пароль");
  }
}
