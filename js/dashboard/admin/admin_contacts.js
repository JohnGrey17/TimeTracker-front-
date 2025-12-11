// ===== CONFIG =====
const API_BASE_URL = "/api";
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

let allUsers = [];

// ===== Helpers =====
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
    `;
    card.onclick = () => openUserModal(u.id);
    contactsList.appendChild(card);
  });
}

// ===== Open modal =====
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

// ===== Init =====
loadDepartments();
departmentSelect.addEventListener('change', (e) => loadUsersByDepartment(e.target.value));
