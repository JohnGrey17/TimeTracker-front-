// ===== CONFIG =====
const API_BASE_URL = "http://localhost:8080/api";

// ===== LOGIN =====
async function loginUser(event) {
  event.preventDefault();

  const email = document.getElementById("loginEmail").value;
  const password = document.getElementById("loginPassword").value;

  try {
    const res = await fetch(`${API_BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      const errText = await res.text();
      alert("❌ Помилка входу: " + errText);
      return;
    }

    const data = await res.json();
    localStorage.setItem("token", data.token);
    localStorage.setItem("roles", JSON.stringify(data.roles));

    alert("✅ Успішний вхід!");


const roles = data.roles; 

if (roles.includes("ADMIN")) {
  window.location.href = "../html/admin/admin_dashboard_ui.html";
} else {
  window.location.href = "../html/user/user_dashboard_ui.html";
}
  } catch (e) {
    console.error("❌ Login error:", e);
    alert("Не вдалося увійти");
  }
}

// ===== REGISTER =====
async function registerUser(event) {
  event.preventDefault();

  const dto = {
    firstName: document.getElementById("regFirstName").value,
    lastName: document.getElementById("regLastName").value,
    email: document.getElementById("regEmail").value,
    phoneNumber: document.getElementById("regPhoneNumber").value,
    password: document.getElementById("regPassword").value,
    repeatPassword: document.getElementById("regRepeatPassword").value,
    departmentId: document.getElementById("regDepartment").value,
  };

  try {
    const res = await fetch(`${API_BASE_URL}/auth/registration`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dto),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("❌ Register error:", errText);
      alert("❌ Помилка реєстрації: " + errText);
      return;
    }

    alert("✅ Реєстрація успішна! Тепер увійдіть.");
    showLogin();
  } catch (e) {
    console.error("❌ Register error:", e);
    alert("Не вдалося зареєструватися");
  }
}

// ===== LOAD DEPARTMENTS =====
async function loadDepartments() {
  try {
    const res = await fetch(`${API_BASE_URL}/department/getAll`);
    if (!res.ok) throw new Error("Помилка завантаження департаментів");

    const data = await res.json();
    const select = document.getElementById("regDepartment");

    data.forEach((d) => {
      const opt = document.createElement("option");
      opt.value = d.id; // у request піде id
      opt.textContent = d.name; // користувач бачить назву
      select.appendChild(opt);
    });
  } catch (e) {
    console.error("❌ Department load error:", e);
  }
}

// ===== SWITCH FORMS =====
function showRegister() {
  document.getElementById("loginForm").style.display = "none";
  document.getElementById("registerForm").style.display = "block";
  loadDepartments();
}

function showLogin() {
  document.getElementById("registerForm").style.display = "none";
  document.getElementById("loginForm").style.display = "block";
}
