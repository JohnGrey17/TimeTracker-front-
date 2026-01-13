// ===== CONFIG =====
const API_BASE_URL = "http://localhost:8080/api";

const token = localStorage.getItem('token') || sessionStorage.getItem('token');
if (!token) {
  alert('⛔ Ви не авторизовані!');
  window.location.href = '../../html/auth.html';
}

// ===== DOM =====
const departmentSelect = document.getElementById('departmentSelect');
const searchInput      = document.getElementById('searchInput');
const contactsList     = document.getElementById('contactsList');

const userModal        = document.getElementById('userModal');
const closeUserModal   = document.getElementById('closeUserModal');
const modalUserName    = document.getElementById('modalUserName');
const modalUserEmail   = document.getElementById('modalUserEmail');
const modalUserPhone   = document.getElementById('modalUserPhone');

// ✅ Conditions modal
const conditionsModal        = document.getElementById('conditionsModal');
const closeConditionsModal   = document.getElementById('closeConditionsModal');
const conditionsSubtitle     = document.getElementById('conditionsSubtitle');
const conditionsListWrap     = document.getElementById('conditionsListWrap');
const refreshConditionsBtn   = document.getElementById('refreshConditionsBtn');

const editingConditionId     = document.getElementById('editingConditionId');
const conditionFormTitle     = document.getElementById('conditionFormTitle');
const condAmount             = document.getElementById('condAmount');
const condPriority           = document.getElementById('condPriority');
const condActive             = document.getElementById('condActive');
const saveConditionBtn       = document.getElementById('saveConditionBtn');
const resetConditionBtn      = document.getElementById('resetConditionBtn');

let allUsers = [];

// для умов
let currentConditionUserId = null;
let currentConditionUserName = "";

// ===== Helpers =====
async function safeReadError(res) {
  try {
    const contentType = res.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      const j = await res.json();
      return j.message || j.error || j.detail || JSON.stringify(j);
    }
    return await res.text();
  } catch (_) {
    return "";
  }
}

async function getJson(url) {
  try {
    const res = await fetch(url, { headers: { 'Authorization': 'Bearer ' + token } });
    if (!res.ok) return [];
    return await res.json();
  } catch (e) {
    console.error("❌ Fetch failed:", e);
    return [];
  }
}

async function requestJson(url, method, body) {
  const res = await fetch(url, {
    method,
    headers: {
      'Authorization': 'Bearer ' + token,
      ...(body ? { 'Content-Type': 'application/json' } : {})
    },
    ...(body ? { body: JSON.stringify(body) } : {})
  });

  if (!res.ok) {
    const msg = await safeReadError(res);
    throw new Error(msg || `HTTP ${res.status}`);
  }

  const ct = res.headers.get("content-type") || "";
  if (ct.includes("application/json")) return res.json();
  return null;
}

// ✅ DELETE user
async function deleteUserById(userId, btnEl) {
  const ok = confirm("Ви точно хочете видалити цього користувача?");
  if (!ok) return;

  try {
    if (btnEl) btnEl.disabled = true;

    const res = await fetch(`${API_BASE_URL}/users/del/${userId}`, {
      method: "DELETE",
      headers: { 'Authorization': 'Bearer ' + token }
    });

    if (!res.ok) {
      const text = await safeReadError(res);
      alert("❌ Не вдалося видалити користувача: " + (text || res.status));
      if (btnEl) btnEl.disabled = false;
      return;
    }

    alert("✅ Користувач видалений");

    allUsers = allUsers.filter(u => u.id !== userId);

    const term = (searchInput.value || "").toLowerCase();
    const filtered = term
      ? allUsers.filter(u =>
          u.firstName.toLowerCase().includes(term) ||
          u.lastName.toLowerCase().includes(term) ||
          u.email.toLowerCase().includes(term)
        )
      : allUsers;

    renderContacts(filtered);
    userModal.classList.add('hidden');

  } catch (e) {
    console.error("❌ Delete user error:", e);
    alert("❌ Помилка видалення користувача");
    if (btnEl) btnEl.disabled = false;
  }
}

// ===== Load departments =====
async function loadDepartments() {
  const data = await getJson(`${API_BASE_URL}/department/getAll`);
  data.forEach(d => {
    const opt = document.createElement('option');
    opt.value = d.id;
    opt.textContent = d.name;
    departmentSelect.appendChild(opt);
  });
}

// ===== Load users by department =====
async function loadUsersByDepartment(depId) {
  if (!depId) return;
  allUsers = await getJson(`${API_BASE_URL}/users/department/${depId}`);
  renderContacts(allUsers);
}

// ===== Render contacts =====
function renderContacts(users) {
  contactsList.innerHTML = '';
  if (!users.length) {
    contactsList.innerHTML = '<p>Немає користувачів</p>';
    return;
  }

  users.forEach(u => {
    const card = document.createElement('div');
    card.className = 'contact-card';

    card.innerHTML = `
      <div class="header">${u.firstName} ${u.lastName}</div>
      <div class="contact-actions">
        <button class="conditions-btn" title="Фіксована ставка овертайму">⚙️</button>
        <button class="delete-btn" title="Видалити користувача">🗑️</button>
      </div>
    `;

    // клік по картці відкриває модалку юзера
    card.onclick = () => openUserModal(u.id);

    // delete
    const deleteBtn = card.querySelector('.delete-btn');
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      deleteUserById(u.id, deleteBtn);
    });

    // conditions
    const condBtn = card.querySelector('.conditions-btn');
    condBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      openConditionsModal(u.id, `${u.firstName} ${u.lastName}`);
    });

    contactsList.appendChild(card);
  });
}

// ===== Open user modal =====
async function openUserModal(userId) {
  const user = await getJson(`${API_BASE_URL}/users/user/${userId}`);
  if (!user) return;

  modalUserName.textContent = `${user.firstName} ${user.lastName}`;
  modalUserEmail.textContent = user.email;
  modalUserPhone.textContent = user.phoneNumber;

  userModal.classList.remove('hidden');
}
closeUserModal.onclick = () => userModal.classList.add('hidden');

// ===== Search =====
searchInput.addEventListener('input', () => {
  const term = searchInput.value.toLowerCase();
  const filtered = allUsers.filter(u =>
    u.firstName.toLowerCase().includes(term) ||
    u.lastName.toLowerCase().includes(term) ||
    u.email.toLowerCase().includes(term)
  );
  renderContacts(filtered);
});

// ==============================
// ✅ USER CONDITIONS CRUD (SIMPLE)
// ==============================

function resetConditionForm() {
  editingConditionId.value = "";
  conditionFormTitle.textContent = "➕ Додати фіксовану ставку";
  condAmount.value = "";
  condPriority.value = "0";
  condActive.checked = true;
}

async function openConditionsModal(userId, userName) {
  currentConditionUserId = userId;
  currentConditionUserName = userName;

  conditionsSubtitle.textContent = `Користувач: ${userName} (userId: ${userId})`;
  resetConditionForm();

  conditionsModal.classList.remove('hidden');
  await loadConditionsList();
}

closeConditionsModal.onclick = () => {
  conditionsModal.classList.add('hidden');
  resetConditionForm();
};

refreshConditionsBtn.onclick = async () => {
  await loadConditionsList();
};

async function loadConditionsList() {
  if (!currentConditionUserId) return;

  conditionsListWrap.innerHTML = `<div class="muted">⏳ Завантаження...</div>`;

  try {
    const items = await getJson(`${API_BASE_URL}/user-conditions?userId=${currentConditionUserId}`);

    if (!items || items.length === 0) {
      conditionsListWrap.innerHTML = `<div class="muted">Немає умов для цього користувача</div>`;
      return;
    }

    conditionsListWrap.innerHTML = "";

    items.forEach(c => {
      const card = document.createElement("div");
      card.className = "condition-card";

      const amount = Number(c.amount ?? 0).toFixed(2);
      const pr = c.priority ?? 0;
      const active = !!c.active;

      card.innerHTML = `
        <div class="condition-row">
          <span class="pill green">FIXED_PER_HOUR</span>
          <span class="pill">id: ${c.id}</span>
          <span class="pill blue">ставка: ${amount} грн/год</span>
          <span class="pill">priority: ${pr}</span>
          <span class="pill ${active ? 'green' : 'red'}">${active ? 'active' : 'inactive'}</span>
        </div>
        <div class="condition-actions">
          <button class="mini-btn edit-cond-btn" data-id="${c.id}">✏ Редагувати</button>
          <button class="danger-btn del-cond-btn" data-id="${c.id}">🗑 Видалити</button>
        </div>
      `;

      // edit
      card.querySelector(".edit-cond-btn").addEventListener("click", () => {
        editingConditionId.value = c.id;
        conditionFormTitle.textContent = `✏ Редагувати (id: ${c.id})`;
        condAmount.value = (c.amount == null ? "" : c.amount);
        condPriority.value = (c.priority == null ? 0 : c.priority);
        condActive.checked = !!c.active;
      });

      // delete
      card.querySelector(".del-cond-btn").addEventListener("click", async () => {
        const ok = confirm(`Видалити умову id=${c.id}?`);
        if (!ok) return;
        try {
          await requestJson(`${API_BASE_URL}/user-conditions/${c.id}?userId=${currentConditionUserId}`, "DELETE");
          await loadConditionsList();
        } catch (e) {
          alert("❌ Не вдалося видалити: " + e.message);
        }
      });

      conditionsListWrap.appendChild(card);
    });

  } catch (e) {
    console.error(e);
    conditionsListWrap.innerHTML = `<div class="muted">❌ Помилка завантаження: ${e.message}</div>`;
  }
}

function buildConditionPayload() {
  const amountRaw = (condAmount.value || "").trim();
  const priorityRaw = (condPriority.value || "").trim();

  const amount = parseFloat(amountRaw);
  if (isNaN(amount) || amount <= 0) throw new Error("Ставка (грн/год) має бути > 0");

  const priority = priorityRaw === "" ? 0 : parseInt(priorityRaw, 10);
  if (isNaN(priority)) throw new Error("Priority має бути числом");

  return {
    type: "FIXED_PER_HOUR",
    amount,
    priority,
    active: !!condActive.checked
  };
}

saveConditionBtn.onclick = async () => {
  if (!currentConditionUserId) return;

  try {
    const payload = buildConditionPayload();
    const condId = (editingConditionId.value || "").trim();

    if (!condId) {
      await requestJson(`${API_BASE_URL}/user-conditions?userId=${currentConditionUserId}`, "POST", payload);
      alert("✅ Умову створено");
    } else {
      await requestJson(`${API_BASE_URL}/user-conditions/${condId}?userId=${currentConditionUserId}`, "PUT", payload);
      alert("✅ Умову оновлено");
    }

    resetConditionForm();
    await loadConditionsList();

  } catch (e) {
    alert("❌ " + e.message);
  }
};

resetConditionBtn.onclick = () => resetConditionForm();

// ===== Init =====
loadDepartments();
departmentSelect.addEventListener('change', (e) => loadUsersByDepartment(e.target.value));
