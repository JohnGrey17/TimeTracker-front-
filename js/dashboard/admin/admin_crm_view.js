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
const crmHead = document.getElementById('crmHead');
const crmBody = document.getElementById('crmBody');
const modal = document.getElementById('infoModal');
const closeModal = document.getElementById('closeModal');
const modalTitle = document.getElementById('modalTitle');
const modalContent = document.getElementById('modalContent');
const salaryModal = document.getElementById('salaryModal');
const closeSalaryModal = document.getElementById('closeSalaryModal');
const newSalary = document.getElementById('newSalary');
const saveSalaryBtn = document.getElementById('saveSalaryBtn');

let selectedUserId = null;
let salaryCells = []; // кеш для швидкого оновлення UI

// ===== Helpers =====
async function getJson(url) {
  const res = await fetch(url, { headers: { Authorization: 'Bearer ' + token } });
  if (!res.ok) throw new Error('Request failed');
  return res.json();
}

async function patchJson(url, body) {
  const res = await fetch(url, {
    method: 'PATCH',
    headers: {
      Authorization: 'Bearer ' + token,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  return res.ok;
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

// ===== CREATE TABLE HEAD =====
function createTableHead(daysInMonth) {
  const headRow = document.createElement('tr');
  headRow.innerHTML = `<th>👤 Ім'я</th>`;
  for (let d = 1; d <= daysInMonth; d++) {
    headRow.innerHTML += `<th class="date-col">${d}</th>`;
  }
  headRow.innerHTML += `
    <th>💰 Ставка</th>
    <th>⏱️ x1</th>
    <th>⏱️ x1.5</th>
    <th>⏱️ x2</th>
    <th>🚕 Таксі</th>
    <th>🚫 Пропущені години</th>
    <th>📊 Разом</th>
  `;
  crmHead.innerHTML = '';
  crmHead.appendChild(headRow);
}

// ===== LOAD CRM DATA =====
async function loadCRMData() {
  const depId = departmentSelect.value;
  const year = parseInt(yearSelect.value);
  const month = parseInt(monthSelect.value);
  if (!depId || !year || !month) return;

  crmBody.innerHTML = '⏳ Завантаження...';
  const data = await getJson(`${API_BASE_URL}/crm/department?departmentId=${depId}&year=${year}&month=${month}`);
  const daysInMonth = new Date(year, month, 0).getDate();
  createTableHead(daysInMonth);

  crmBody.innerHTML = '';
  salaryCells = [];

  data.forEach(user => {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${user.firstName} ${user.lastName}</td>`;
    const map = {};

    (user.overtimesDay || []).forEach(o => {
      map[o.overTimeDateRegistration] = { type: 'overtime', desc: o.description, mult: o.multiplier, hours: o.overtimeHours };
    });
    (user.missingsDay || []).forEach(m => {
      map[m.date] = { type: 'missing', desc: m.reason, hours: m.missingHours };
    });

    // створюємо комірки по днях
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = new Date(year, month - 1, d).toISOString().split('T')[0];
      const cell = document.createElement('td');
      const val = map[dateStr];
      if (val) {
        cell.classList.add(val.type);
        cell.title = val.desc;

        if (val.type === 'overtime') {
          cell.innerHTML = `<small>${val.hours}год<br>x${val.mult}</small>`;
        } else {
          cell.innerHTML = `<small>${val.hours}год</small>`;
        }

        // тепер клік працює
        cell.addEventListener('click', () =>
          openModal(
            val.type === 'overtime' ? 'Overtime' : 'Missing',
            `${val.desc}<br><b>Години:</b> ${val.hours}${val.mult ? `<br><b>Коеф:</b> x${val.mult}` : ''}`
          )
        );
      }
      tr.appendChild(cell);
    }

    // блок бази + підсумки
    const base = parseFloat(user.baseSalary || 0);
    const x1 = sumByMultiplier(user.overtimesDay, 1);
    const x15 = sumByMultiplier(user.overtimesDay, 1.5);
    const x2 = sumByMultiplier(user.overtimesDay, 2);
    const missing = parseFloat(user.totalMissingHours || 0);

    const result = base + x1 * 100 + x15 * 150 + x2 * 200 - missing * 100;

    const salaryTd = document.createElement('td');
    salaryTd.className = 'salary-cell';
    salaryTd.dataset.id = user.userId;
    salaryTd.textContent = base.toFixed(2);
    salaryCells.push(salaryTd);

    tr.appendChild(salaryTd);
    tr.innerHTML += `
      <td>${x1}</td>
      <td>${x15}</td>
      <td>${x2}</td>
      <td>—</td>
      <td>${missing}</td>
      <td><b>${result.toFixed(2)}</b></td>
    `;

    crmBody.appendChild(tr);
  });

  // відкриття модалки редагування ЗП
  salaryCells.forEach(cell => {
    cell.onclick = () => {
      selectedUserId = cell.dataset.id;
      newSalary.value = cell.textContent.trim();
      salaryModal.classList.remove('hidden');
    };
  });
}

// ===== UTIL =====
function sumByMultiplier(list, mult) {
  return list ? list.filter(o => o.multiplier == mult).reduce((acc, o) => acc + o.overtimeHours, 0) : 0;
}

// ===== MODALS =====
function openModal(title, content) {
  modalTitle.textContent = title;
  modalContent.innerHTML = content;
  modal.classList.remove('hidden');
}
closeModal.onclick = () => modal.classList.add('hidden');
closeSalaryModal.onclick = () => salaryModal.classList.add('hidden');

saveSalaryBtn.onclick = async () => {
  if (!selectedUserId) return;
  const newVal = parseFloat(newSalary.value);
  if (isNaN(newVal) || newVal < 0) return alert('❌ Введіть коректну суму!');

  const ok = await patchJson(`${API_BASE_URL}/users/sal/${selectedUserId}`, { baseSalary: newVal });
  if (ok) {
    alert('✅ Зарплату оновлено!');
    salaryModal.classList.add('hidden');
    // оновлюємо значення без перезавантаження всього
    const cell = salaryCells.find(c => c.dataset.id == selectedUserId);
    if (cell) cell.textContent = newVal.toFixed(2);
  } else alert('❌ Помилка при оновленні зарплати!');
};

// ===== SWITCH VIEW =====
viewModeSelect.addEventListener('change', (e) => {
  if (e.target.value === 'calendar') window.location.href = '/html/admin/admin_viewList.html';
});

// ===== INIT =====
initYearMonth();
loadDepartments();

[departmentSelect, yearSelect, monthSelect].forEach(el =>
  el.addEventListener('change', loadCRMData)
);
