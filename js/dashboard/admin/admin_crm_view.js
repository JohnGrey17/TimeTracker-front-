const API_BASE_URL = 'http://localhost:8080/api';
const token = localStorage.getItem('token') || sessionStorage.getItem('token');
if (!token) {
  alert('⛔ Ви не авторизовані!');
  window.location.href = '../../html/auth.html';
}

const departmentSelect = document.getElementById('departmentSelect');
const yearSelect = document.getElementById('yearSelect');
const monthSelect = document.getElementById('monthSelect');
const viewModeSelect = document.getElementById('viewModeSelect');
const crmBody = document.getElementById('crmBody');
const modal = document.getElementById('infoModal');
const closeModal = document.getElementById('closeModal');
const modalTitle = document.getElementById('modalTitle');
const modalContent = document.getElementById('modalContent');

// ===== Helpers =====
async function getJson(url) {
  try {
    const res = await fetch(url, {
      headers: { 'Authorization': 'Bearer ' + token }
    });
    if (!res.ok) return [];
    return await res.json();
  } catch (e) {
    console.error(e);
    return [];
  }
}

// ===== INIT YEAR / MONTH =====
function initYearMonth() {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  for (let y = 2022; y <= currentYear + 2; y++) {
    const opt = document.createElement('option');
    opt.value = y;
    opt.textContent = y;
    if (y === currentYear) opt.selected = true;
    yearSelect.appendChild(opt);
  }

  for (let m = 1; m <= 12; m++) {
    const opt = document.createElement('option');
    opt.value = m;
    opt.textContent = new Date(currentYear, m - 1).toLocaleString('uk-UA', { month: 'long' });
    if (m === currentMonth) opt.selected = true;
    monthSelect.appendChild(opt);
  }
}

// ===== LOAD DEPARTMENTS =====
async function loadDepartments() {
  const data = await getJson(`${API_BASE_URL}/department/getAll`);
  departmentSelect.innerHTML = `<option value="" disabled selected>Оберіть відділ</option>`;
  data.forEach(dep => {
    const opt = document.createElement('option');
    opt.value = dep.id;
    opt.textContent = dep.name;
    departmentSelect.appendChild(opt);
  });
}

// ===== LOAD PLACEHOLDER DATA =====
async function loadCRMTable() {
  crmBody.innerHTML = '';
  // поки фіктивні дані
  for (let i = 0; i < 3; i++) {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>Test User ${i+1}</td>
      <td></td><td></td><td></td><td></td><td></td>
      <td>15000</td>
      <td class="overtime-cell">5 год</td>
      <td>200</td>
      <td class="missing-cell">2 год</td>
      <td>15500</td>
    `;
    crmBody.appendChild(tr);
  }

  // приклад відкриття модалки
  document.querySelectorAll('.overtime-cell').forEach(cell => {
    cell.onclick = () => openModal('Overtime', '5 год у вихідний день');
  });
  document.querySelectorAll('.missing-cell').forEach(cell => {
    cell.onclick = () => openModal('Missing Day', 'Відсутність через лікарняний');
  });
}

// ===== MODAL =====
function openModal(title, content) {
  modalTitle.textContent = title;
  modalContent.textContent = content;
  modal.classList.remove('hidden');
}
closeModal.onclick = () => modal.classList.add('hidden');

// ===== SWITCH VIEW =====
viewModeSelect.addEventListener('change', (e) => {
  if (e.target.value === 'calendar') {
    window.location.href = '/html/admin/admin_viewList.html';
  }
});

// ===== INIT =====
initYearMonth();
loadDepartments();
loadCRMTable();
