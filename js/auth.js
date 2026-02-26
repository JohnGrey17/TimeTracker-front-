// ===== CONFIG =====
const API_BASE_URL = "/api";

// ================= INIT =================
document.addEventListener("DOMContentLoaded", () => {
  loadDepartments();
});

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

    if (data.token) {
      localStorage.setItem("token", data.token);
    }

    const rawRoles = data.roles || data.authorities || [];
    const rolesArray = Array.isArray(rawRoles) ? rawRoles : [String(rawRoles)];
    const normalizedRoles = rolesArray.map(r =>
      r.startsWith("ROLE_") ? r.substring(5) : r
    );

    localStorage.setItem("roles", JSON.stringify(normalizedRoles));

    const isAdmin = normalizedRoles.includes("ADMIN");

    if (isAdmin) {
      window.location.href = "/html/admin/admin_dashboard_ui.html";
    } else {
      window.location.href = "/html/user/user_dashboard_ui.html";
    }

  } catch (e) {
    console.error("❌ Login error:", e);
    alert("Не вдалося увійти");
  }
}

// ===== REGISTER =====
async function registerUser(event) {
  event.preventDefault();

  const subDepartmentId = document.getElementById("regSubDepartment").value;

  if (!subDepartmentId) {
    alert("Оберіть напрям");
    return;
  }

  const dto = {
    firstName: document.getElementById("regFirstName").value,
    lastName: document.getElementById("regLastName").value,
    email: document.getElementById("regEmail").value,
    phoneNumber: document.getElementById("regPhoneNumber").value,
    password: document.getElementById("regPassword").value,
    repeatPassword: document.getElementById("regRepeatPassword").value,
    subDepartmentId: Number(subDepartmentId)
  };

  try {
    const res = await fetch(`${API_BASE_URL}/auth/registration`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dto),
    });

    if (!res.ok) {
      const errText = await res.text();
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

    const parentSelect = document.getElementById("regDepartment");
    const subSelect = document.getElementById("regSubDepartment");

    if (!parentSelect || !subSelect) return;

    // 🔥 ВАЖЛИВО: прибираємо старий handler
    parentSelect.onchange = null;

    parentSelect.innerHTML = '<option value="" disabled selected>Оберіть департамент</option>';
    subSelect.innerHTML = '<option value="" disabled selected>Оберіть напрям</option>';
    subSelect.disabled = true;

    const parents = data.filter(d => d.parentId === null);

    parents.forEach(dep => {
      const opt = document.createElement("option");
      opt.value = dep.id;
      opt.textContent = dep.name;
      parentSelect.appendChild(opt);
    });

    // 🔥 Використовуємо onchange замість addEventListener
    parentSelect.onchange = async function () {
      const parentId = this.value;

      subSelect.innerHTML = '<option value="" disabled selected>Оберіть напрям</option>';
      subSelect.disabled = true;

      if (!parentId) return;

      try {
        const resChildren = await fetch(`${API_BASE_URL}/department/${parentId}/children`);
        if (!resChildren.ok) return;

        const children = await resChildren.json();

        children.forEach(child => {
          const opt = document.createElement("option");
          opt.value = child.subDepartment_id;
          opt.textContent = child.subDepartmentName;
          subSelect.appendChild(opt);
        });

        subSelect.disabled = false;

      } catch (e) {
        console.error("❌ Children load error:", e);
      }
    };

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
