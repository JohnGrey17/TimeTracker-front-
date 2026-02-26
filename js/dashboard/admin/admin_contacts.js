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

  if (!res.ok) throw new Error("HTTP " + res.status);
}

// ===== LOAD DEPARTMENTS =====
async function loadDepartments() {
  const data = await getJson(`${API_BASE_URL}/department/getAll`);

  departmentSelect.innerHTML = `<option value="">Оберіть департамент</option>`;
  subDepartmentSelect.innerHTML = `<option value="">Усі напрями</option>`;
  subDepartmentSelect.disabled = true;

  const parents = data.filter(d => d.parentId == null);

  parents.forEach(d => {
    const opt = document.createElement("option");
    opt.value = d.id;
    opt.textContent = d.name;
    departmentSelect.appendChild(opt);
  });
}

async function loadSubDepartments(parentId) {
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
  if (!depId) {
    contactsList.innerHTML = "<p>Оберіть департамент</p>";
    return;
  }

  allUsers = await getJson(`${API_BASE_URL}/users/department/${depId}`);
  renderContacts(allUsers);
}

async function reloadCurrentUsers() {
  const id = currentSubDepartmentId || currentDepartmentId;
  await loadUsers(id);
}

// ===== RENDER =====
function renderContacts(users) {
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

    card.querySelector(".delete-btn").onclick = async (e) => {
      e.stopPropagation();
      if (!confirm("Видалити користувача?")) return;
      await requestJson(`${API_BASE_URL}/users/del/${u.id}`, "DELETE");
      await reloadCurrentUsers();
    };

    card.querySelector(".conditions-btn").onclick = (e) => {
      e.stopPropagation();
      openConditionsModal(u.id, u.firstName + " " + u.lastName);
    };

    card.querySelector(".change-dep-btn").onclick = async (e) => {
      e.stopPropagation();
      openChangeDepartmentModal(u.id);
    };

    contactsList.appendChild(card);
  });
}

// ===== USER MODAL =====
async function openUserModal(userId) {
  const user = await getJson(`${API_BASE_URL}/users/user/${userId}`);
  modalUserName.textContent = user.firstName + " " + user.lastName;
  modalUserEmail.textContent = user.email;
  modalUserPhone.textContent = user.phoneNumber;
  userModal.classList.remove("hidden");
}

closeUserModal.onclick = () => userModal.classList.add("hidden");

// ===== CHANGE DEPARTMENT =====
async function openChangeDepartmentModal(userId) {
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

closeChangeDepartmentModal.onclick = () => {
  changeDepartmentModal.classList.add("hidden");
};

// ===== CONDITIONS =====
async function openConditionsModal(userId, name) {
  currentConditionUserId = userId;
  conditionsSubtitle.textContent = `Користувач: ${name}`;
  conditionsModal.classList.remove("hidden");
  await loadConditionsList();
}

closeConditionsModal.onclick = () => {
  conditionsModal.classList.add("hidden");
};

async function loadConditionsList() {
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
    `;

    conditionsListWrap.appendChild(card);
  });
}

// ===== SEARCH =====
searchInput.addEventListener("input", () => {
  const term = searchInput.value.toLowerCase();
  const filtered = allUsers.filter(u =>
    u.firstName.toLowerCase().includes(term) ||
    u.lastName.toLowerCase().includes(term) ||
    u.email.toLowerCase().includes(term)
  );
  renderContacts(filtered);
});

// ===== EVENTS =====
departmentSelect.onchange = async (e) => {
  currentDepartmentId = e.target.value;
  currentSubDepartmentId = null;
  await loadSubDepartments(currentDepartmentId);
  await loadUsers(currentDepartmentId);
};

subDepartmentSelect.onchange = async (e) => {
  currentSubDepartmentId = e.target.value;
  await reloadCurrentUsers();
};

// ===== INIT =====
document.addEventListener("DOMContentLoaded", loadDepartments);