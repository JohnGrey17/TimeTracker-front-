// ===== CONFIG =====
const API_BASE_URL = "http://localhost:8080/api";

const token = localStorage.getItem('token') || sessionStorage.getItem('token');
if (!token) {
  alert('⛔ Ви не авторизовані!');
  window.location.href = '../../html/auth.html';
}

// ===== DOM =====
const departmentSelect = document.getElementById('departmentSelect');
const subDepartmentSelect = document.getElementById('subDepartmentSelect');
const searchInput = document.getElementById('searchInput');
const contactsList = document.getElementById('contactsList');

const userModal = document.getElementById('userModal');
const closeUserModal = document.getElementById('closeUserModal');
const modalUserName = document.getElementById('modalUserName');
const modalUserEmail = document.getElementById('modalUserEmail');
const modalUserPhone = document.getElementById('modalUserPhone');

// CONDITIONS
const conditionsModal = document.getElementById('conditionsModal');
const closeConditionsModal = document.getElementById('closeConditionsModal');
const conditionsSubtitle = document.getElementById('conditionsSubtitle');
const conditionsListWrap = document.getElementById('conditionsListWrap');
const refreshConditionsBtn = document.getElementById('refreshConditionsBtn');

const editingConditionId = document.getElementById('editingConditionId');
const conditionFormTitle = document.getElementById('conditionFormTitle');
const condAmount = document.getElementById('condAmount');
const condPriority = document.getElementById('condPriority');
const condActive = document.getElementById('condActive');
const saveConditionBtn = document.getElementById('saveConditionBtn');
const resetConditionBtn = document.getElementById('resetConditionBtn');

// CHANGE DEPARTMENT
const changeDepartmentModal = document.getElementById('changeDepartmentModal');
const closeChangeDepartmentModal = document.getElementById('closeChangeDepartmentModal');
const changeDepartmentSelect = document.getElementById('changeDepartmentSelect');
const saveChangeDepartmentBtn = document.getElementById('saveChangeDepartmentBtn');

// ===== STATE =====
let allUsers = [];
let currentDepartmentId = null;
let currentSubDepartmentId = null;
let userIdForDepartmentChange = null;
let currentConditionUserId = null;

// ===== HELPERS =====
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
    const res = await fetch(url, {
      headers: { Authorization: "Bearer " + token }
    });
    if (!res.ok) return [];
    return await res.json();
  } catch (e) {
    console.error("Fetch error:", e);
    return [];
  }
}

async function requestJson(url, method, body) {
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: "Bearer " + token,
      ...(body ? { "Content-Type": "application/json" } : {})
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

// ===== LOAD DEPARTMENTS =====
async function loadDepartments() {
  const data = await getJson(`${API_BASE_URL}/department/getAll`);

  if (!departmentSelect) return;

  departmentSelect.innerHTML = `<option value="">Оберіть департамент</option>`;

  if (subDepartmentSelect) {
    subDepartmentSelect.innerHTML = `<option value="">Усі напрями</option>`;
    subDepartmentSelect.disabled = true;
  }

  const parents = data.filter(d => d.parentId == null);

  parents.forEach(d => {
    const opt = document.createElement("option");
    opt.value = d.id;
    opt.textContent = d.name;
    departmentSelect.appendChild(opt);
  });
}

async function loadSubDepartments(parentId) {
  if (!subDepartmentSelect) return;

  subDepartmentSelect.innerHTML = `<option value="">Усі напрями</option>`;
  subDepartmentSelect.disabled = true;

  if (!parentId) return;

  const children = await getJson(`${API_BASE_URL}/department/${parentId}/children`);
  if (!children.length) return;

  children.forEach(c => {
    const opt = document.createElement("option");
    opt.value = c.subDepartment_id;
    opt.textContent = c.subDepartmentName;
    subDepartmentSelect.appendChild(opt);
  });

  subDepartmentSelect.disabled = false;
}

// ===== LOAD USERS =====
async function loadUsers(depId) {
  if (!depId || !contactsList) return;

  allUsers = await getJson(`${API_BASE_URL}/users/department/${depId}`);
  renderContacts(allUsers);
}

async function reloadCurrentUsers() {
  const id = currentSubDepartmentId || currentDepartmentId;
  if (id) await loadUsers(id);
}

// ===== RENDER =====
function renderContacts(users) {
  if (!contactsList) return;

  contactsList.innerHTML = "";

  if (!users.length) {
    contactsList.innerHTML = "<p>Немає користувачів</p>";
    return;
  }

  users.forEach(u => {
    const card = document.createElement("div");
    card.className = "contact-card";

    card.innerHTML = `
      <div class="header">${u.firstName} ${u.lastName}</div>
      <div class="contact-actions">
        <button class="change-dep-btn">🏢</button>
        <button class="conditions-btn">⚙️</button>
        <button class="delete-btn">🗑️</button>
      </div>
    `;

    card.onclick = () => openUserModal(u.id);

    card.querySelector(".delete-btn")?.addEventListener("click", async (e) => {
      e.stopPropagation();
      if (!confirm("Видалити користувача?")) return;
      await requestJson(`${API_BASE_URL}/users/del/${u.id}`, "DELETE");
      await reloadCurrentUsers();
    });

    card.querySelector(".conditions-btn")?.addEventListener("click", (e) => {
      e.stopPropagation();
      openConditionsModal(u.id, u.firstName + " " + u.lastName);
    });

    card.querySelector(".change-dep-btn")?.addEventListener("click", (e) => {
      e.stopPropagation();
      openChangeDepartmentModal(u.id);
    });

    contactsList.appendChild(card);
  });
}

// ===== USER MODAL =====
async function openUserModal(userId) {
  if (!userModal) return;
  const user = await getJson(`${API_BASE_URL}/users/user/${userId}`);
  modalUserName.textContent = user.firstName + " " + user.lastName;
  modalUserEmail.textContent = user.email;
  modalUserPhone.textContent = user.phoneNumber;
  userModal.classList.remove("hidden");
}

if (closeUserModal) {
  closeUserModal.onclick = () => userModal.classList.add("hidden");
}

// ===== CHANGE DEPARTMENT =====
async function openChangeDepartmentModal(userId) {
  if (!changeDepartmentModal) return;

  userIdForDepartmentChange = userId;
  const data = await getJson(`${API_BASE_URL}/department/getAll`);

  changeDepartmentSelect.innerHTML = `<option value="">Оберіть департамент</option>`;

  data.forEach(d => {
    const opt = document.createElement("option");
    opt.value = d.id;
    opt.textContent = d.parentId ? "— " + d.name : d.name;
    changeDepartmentSelect.appendChild(opt);
  });

  changeDepartmentModal.classList.remove("hidden");
}

if (saveChangeDepartmentBtn) {
  saveChangeDepartmentBtn.onclick = async () => {
    const newDepId = changeDepartmentSelect.value;
    if (!newDepId) return alert("Оберіть департамент");

    await requestJson(
      `${API_BASE_URL}/users/user/${userIdForDepartmentChange}/department/${newDepId}`,
      "PUT"
    );

    changeDepartmentModal.classList.add("hidden");
    await reloadCurrentUsers();
  };
}

if (closeChangeDepartmentModal) {
  closeChangeDepartmentModal.onclick = () => {
    changeDepartmentModal.classList.add("hidden");
  };
}

// ==============================
// FULL CONDITIONS CRUD
// ==============================

function resetConditionForm() {
  if (!editingConditionId) return;
  editingConditionId.value = "";
  conditionFormTitle.textContent = "➕ Додати фіксовану ставку";
  condAmount.value = "";
  condPriority.value = "0";
  condActive.checked = true;
}

async function openConditionsModal(userId, userName) {
  if (!conditionsModal) return;

  currentConditionUserId = userId;
  conditionsSubtitle.textContent = `Користувач: ${userName}`;
  resetConditionForm();
  conditionsModal.classList.remove("hidden");
  await loadConditionsList();
}

if (closeConditionsModal) {
  closeConditionsModal.onclick = () => {
    conditionsModal.classList.add("hidden");
    resetConditionForm();
  };
}

if (refreshConditionsBtn) {
  refreshConditionsBtn.onclick = async () => {
    await loadConditionsList();
  };
}

async function loadConditionsList() {
  if (!currentConditionUserId || !conditionsListWrap) return;

  conditionsListWrap.innerHTML = "⏳ Завантаження...";

  const items = await getJson(
    `${API_BASE_URL}/user-conditions?userId=${currentConditionUserId}`
  );

  if (!items.length) {
    conditionsListWrap.innerHTML = "Немає умов";
    return;
  }

  conditionsListWrap.innerHTML = "";

  items.forEach(c => {
    const card = document.createElement("div");
    card.className = "condition-card";

    card.innerHTML = `
      <div>
        Ставка: ${Number(c.amount).toFixed(2)} грн |
        priority: ${c.priority} |
        ${c.active ? "active" : "inactive"}
      </div>
      <div>
        <button class="edit-cond-btn">✏</button>
        <button class="del-cond-btn">🗑</button>
      </div>
    `;

    card.querySelector(".edit-cond-btn")?.addEventListener("click", () => {
      editingConditionId.value = c.id;
      condAmount.value = c.amount;
      condPriority.value = c.priority;
      condActive.checked = c.active;
    });

    card.querySelector(".del-cond-btn")?.addEventListener("click", async () => {
      if (!confirm("Видалити умову?")) return;
      await requestJson(
        `${API_BASE_URL}/user-conditions/${c.id}?userId=${currentConditionUserId}`,
        "DELETE"
      );
      await loadConditionsList();
    });

    conditionsListWrap.appendChild(card);
  });
}

function buildConditionPayload() {
  const amount = parseFloat(condAmount.value);
  if (isNaN(amount) || amount <= 0)
    throw new Error("Ставка має бути > 0");

  const priority = parseInt(condPriority.value || "0", 10);

  return {
    type: "FIXED_PER_OVERTIME",
    amount,
    priority,
    active: !!condActive.checked
  };
}

if (saveConditionBtn) {
  saveConditionBtn.onclick = async () => {
    if (!currentConditionUserId) return;

    const payload = buildConditionPayload();
    const condId = editingConditionId.value;

    if (!condId) {
      await requestJson(
        `${API_BASE_URL}/user-conditions?userId=${currentConditionUserId}`,
        "POST",
        payload
      );
    } else {
      await requestJson(
        `${API_BASE_URL}/user-conditions/${condId}?userId=${currentConditionUserId}`,
        "PUT",
        payload
      );
    }

    resetConditionForm();
    await loadConditionsList();
  };
}

// ===== SEARCH =====
if (searchInput) {
  searchInput.addEventListener("input", () => {
    const term = searchInput.value.toLowerCase();
    const filtered = allUsers.filter(u =>
      u.firstName.toLowerCase().includes(term) ||
      u.lastName.toLowerCase().includes(term) ||
      u.email.toLowerCase().includes(term)
    );
    renderContacts(filtered);
  });
}

// ===== EVENTS =====
if (departmentSelect) {
  departmentSelect.onchange = async (e) => {
    currentDepartmentId = e.target.value;
    currentSubDepartmentId = null;
    await loadSubDepartments(currentDepartmentId);
    await loadUsers(currentDepartmentId);
  };
}

if (subDepartmentSelect) {
  subDepartmentSelect.onchange = async (e) => {
    currentSubDepartmentId = e.target.value;
    await reloadCurrentUsers();
  };
}

// ===== INIT =====
document.addEventListener("DOMContentLoaded", loadDepartments);