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

// ✅ ДОДАНО: DELETE user
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

    // прибираємо з локального списку і перемальовуємо
    allUsers = allUsers.filter(u => u.id !== userId);

    // якщо в пошуку щось введено — тримаємо фільтр
    const term = (searchInput.value || "").toLowerCase();
    const filtered = term
      ? allUsers.filter(u =>
          u.firstName.toLowerCase().includes(term) ||
          u.lastName.toLowerCase().includes(term) ||
          u.email.toLowerCase().includes(term)
        )
      : allUsers;

    renderContacts(filtered);

    // якщо була відкрита модалка цього юзера — закриваємо
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

    // ✅ ДОДАНО: actions + delete button
    card.innerHTML = `
      <div class="header">${u.firstName} ${u.lastName}</div>
      <div class="contact-actions">
        <button class="delete-btn" title="Видалити користувача">🗑️</button>
      </div>
    `;

    // клік по картці відкриває модалку
    card.onclick = () => openUserModal(u.id);

    // клік по смітнику — видаляє і НЕ відкриває модалку
    const deleteBtn = card.querySelector('.delete-btn');
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      deleteUserById(u.id, deleteBtn);
    });

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
