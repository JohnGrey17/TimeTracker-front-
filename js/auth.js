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
    console.log("Login response:", data);

    if (data.token) {
      localStorage.setItem("token", data.token);
    }

    // захист від дивних форматів ролей
    const rawRoles = data.roles || data.authorities || [];
    const rolesArray = Array.isArray(rawRoles) ? rawRoles : [String(rawRoles)];
    const normalizedRoles = rolesArray.map(r =>
      r.startsWith("ROLE_") ? r.substring(5) : r
    );

    localStorage.setItem("roles", JSON.stringify(normalizedRoles));

    alert("✅ Успішний вхід!");

    const isAdmin = normalizedRoles.includes("ADMIN");
    if (isAdmin) {
      // шлях з кореня додатку
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
    if (!res.ok) {
      throw new Error("Помилка завантаження департаментів");
    }

    const data = await res.json();
    const select = document.getElementById("regDepartment");

    // очищаємо список, залишивши перший placeholder
    while (select.options.length > 1) {
      select.remove(1);
    }

    data.forEach((d) => {
      const opt = document.createElement("option");
      opt.value = d.id;      // у request піде id
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

/* =========================================================
   ✅ FORGOT PASSWORD MODAL (ADDED)
========================================================= */

let forgotCountdownInterval = null;
const FORGOT_COOLDOWN_SECONDS = 60;
const FORGOT_COOLDOWN_KEY = "forgotCooldownUntilMs";

function openForgotPasswordModal() {
  clearForgotError();

  const modal = document.getElementById("forgotModal");
  modal.style.display = "flex";

  // підставимо email з login поля, якщо є
  const loginEmail = document.getElementById("loginEmail")?.value || "";
  const forgotEmail = document.getElementById("forgotEmail");
  if (forgotEmail && loginEmail) forgotEmail.value = loginEmail;

  // стартовий крок
  showForgotStepEmail();

  // якщо вже є кулдаун — відновлюємо таймер
  applyCooldownUI();
}

function closeForgotPasswordModal() {
  const modal = document.getElementById("forgotModal");
  modal.style.display = "none";
  clearForgotError();
}

function showForgotStepEmail() {
  document.getElementById("forgotStepEmail").style.display = "block";
  document.getElementById("forgotStepConfirm").style.display = "none";
}

function showForgotStepConfirm() {
  document.getElementById("forgotStepEmail").style.display = "none";
  document.getElementById("forgotStepConfirm").style.display = "block";
}

function showForgotError(msg) {
  const el = document.getElementById("forgotError");
  el.textContent = msg;
  el.style.display = "block";
}

function clearForgotError() {
  const el = document.getElementById("forgotError");
  el.textContent = "";
  el.style.display = "none";
}

function normalizeEmail(email) {
  return (email || "").trim().toLowerCase();
}

function getCooldownUntilMs() {
  const v = localStorage.getItem(FORGOT_COOLDOWN_KEY);
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function setCooldown(seconds) {
  const until = Date.now() + seconds * 1000;
  localStorage.setItem(FORGOT_COOLDOWN_KEY, String(until));
  applyCooldownUI();
}

function applyCooldownUI() {
  const btnSend = document.getElementById("btnSendCode");
  const timerBlock = document.getElementById("sendCodeTimer");
  const countdownEl = document.getElementById("sendCodeCountdown");

  const btnResend = document.getElementById("btnResendCode");
  const resendTimerText = document.getElementById("resendTimerText");
  const resendCountdownEl = document.getElementById("resendCountdown");

  const until = getCooldownUntilMs();
  const remaining = Math.max(0, Math.ceil((until - Date.now()) / 1000));

  // очистити попередній інтервал
  if (forgotCountdownInterval) {
    clearInterval(forgotCountdownInterval);
    forgotCountdownInterval = null;
  }

  if (remaining > 0) {
    // disable
    if (btnSend) btnSend.disabled = true;
    if (btnResend) btnResend.disabled = true;

    // show timers
    if (timerBlock) timerBlock.style.display = "block";
    if (resendTimerText) resendTimerText.style.display = "inline";

    if (countdownEl) countdownEl.textContent = String(remaining);
    if (resendCountdownEl) resendCountdownEl.textContent = String(remaining);

    forgotCountdownInterval = setInterval(() => {
      const until2 = getCooldownUntilMs();
      const rem2 = Math.max(0, Math.ceil((until2 - Date.now()) / 1000));

      if (countdownEl) countdownEl.textContent = String(rem2);
      if (resendCountdownEl) resendCountdownEl.textContent = String(rem2);

      if (rem2 <= 0) {
        clearInterval(forgotCountdownInterval);
        forgotCountdownInterval = null;

        if (btnSend) btnSend.disabled = false;
        if (btnResend) btnResend.disabled = false;

        if (timerBlock) timerBlock.style.display = "none";
        if (resendTimerText) resendTimerText.style.display = "none";
      }
    }, 1000);
  } else {
    // enable
    if (btnSend) btnSend.disabled = false;
    if (btnResend) btnResend.disabled = false;

    if (timerBlock) timerBlock.style.display = "none";
    if (resendTimerText) resendTimerText.style.display = "none";
  }
}

async function requestResetCode() {
  clearForgotError();

  const emailInput = document.getElementById("forgotEmail");
  const email = normalizeEmail(emailInput?.value);

  if (!email) {
    showForgotError("Введіть email.");
    return;
  }

  // cooldown check
  const until = getCooldownUntilMs();
  if (until > Date.now()) {
    applyCooldownUI();
    return;
  }

  try {
    const res = await fetch(`${API_BASE_URL}/forgot/request`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    if (!res.ok) {
      // бек може віддавати text/json
      const text = await safeReadError(res);
      showForgotError(text || "Не вдалося надіслати код. Спробуйте пізніше.");
      return;
    }

    // успіх -> крок 2
    showForgotStepConfirm();

    // ставимо кулдаун 60 секунд на повторну відправку
    setCooldown(FORGOT_COOLDOWN_SECONDS);

  } catch (e) {
    console.error("❌ forgot request error:", e);
    showForgotError("Помилка з'єднання з сервером.");
  }
}

async function confirmResetPassword() {
  clearForgotError();

  const email = normalizeEmail(document.getElementById("forgotEmail")?.value);
  const code = (document.getElementById("forgotCode")?.value || "").trim();
  const newPassword = document.getElementById("forgotNewPassword")?.value || "";
  const confirmPassword = document.getElementById("forgotConfirmPassword")?.value || "";

  if (!email) {
    showForgotError("Введіть email.");
    showForgotStepEmail();
    return;
  }

  if (!code) {
    showForgotError("Введіть код.");
    return;
  }

  if (!newPassword || !confirmPassword) {
    showForgotError("Введіть новий пароль та підтвердження.");
    return;
  }

  if (newPassword !== confirmPassword) {
    showForgotError("Паролі не співпадають.");
    return;
  }

  try {
    const res = await fetch(`${API_BASE_URL}/forgot/confirm`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        code,
        newPassword,
        confirmPassword
      }),
    });

    if (!res.ok) {
      const text = await safeReadError(res);
      showForgotError(text || "Не вдалося змінити пароль. Перевірте код.");
      return;
    }

    alert("✅ Пароль змінено! Тепер увійдіть з новим паролем.");
    closeForgotPasswordModal();

    // підставимо email в логін форму
    const loginEmail = document.getElementById("loginEmail");
    if (loginEmail) loginEmail.value = email;

  } catch (e) {
    console.error("❌ forgot confirm error:", e);
    showForgotError("Помилка з'єднання з сервером.");
  }
}

async function safeReadError(res) {
  // пробуємо прочитати json -> message, інакше text
  try {
    const contentType = res.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      const j = await res.json();
      // можливі варіанти полів
      return j.message || j.error || j.detail || JSON.stringify(j);
    }
    return await res.text();
  } catch (_) {
    return "";
  }
}

// Закриття модалки по кліку на фон
document.addEventListener("click", (e) => {
  const overlay = document.getElementById("forgotModal");
  if (!overlay || overlay.style.display === "none") return;

  if (e.target === overlay) {
    closeForgotPasswordModal();
  }
});

// Закриття по ESC
document.addEventListener("keydown", (e) => {
  const overlay = document.getElementById("forgotModal");
  if (!overlay || overlay.style.display === "none") return;

  if (e.key === "Escape") {
    closeForgotPasswordModal();
  }
});
