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

let id = null;

// ===== Helpers =====
async function getJson(url) {
  const res = await fetch(url, { headers: { Authorization: 'Bearer ' + token } });
  if (!res.ok) throw new Error('❌ Request failed');
  return res.json();
}

async function postJson(url, body) {
  const res = await fetch(url, {
    method: 'POST',
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
  data.sort((a, b) => a.name.localeCompare(b.name, 'uk')); // ✅ сортування відділів
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
  const thName = document.createElement('th');
  thName.textContent = "👤 Ім'я";
  headRow.appendChild(thName);

  for (let d = 1; d <= daysInMonth; d++) {
    const th = document.createElement('th');
    th.textContent = d;
    th.classList.add('date-col');
    headRow.appendChild(th);
  }

  const extraHeaders = ["💰 Ставка", "⏱️ x1", "⏱️ x1.5", "⏱️ x2", "🚕 Таксі", "🚫 Пропущені години", "📊 Разом"];
  extraHeaders.forEach(label => {
    const th = document.createElement('th');
    th.textContent = label;
    headRow.appendChild(th);
  });

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

  // ✅ сортуємо користувачів по алфавіту
  data.sort((a, b) => {
    const last = a.lastName.localeCompare(b.lastName, 'uk');
    return last === 0 ? a.firstName.localeCompare(b.firstName, 'uk') : last;
  });

  const daysInMonth = new Date(year, month, 0).getDate();
  createTableHead(daysInMonth);

  crmBody.innerHTML = '';

  data.forEach(user => {
    const tr = document.createElement('tr');

    // Ім'я
    const nameTd = document.createElement('td');
    nameTd.textContent = `${user.firstName} ${user.lastName}`;
    tr.appendChild(nameTd);

    const overtimeMap = {};
    const missingMap = {};

    (user.overtimesDay || []).forEach(o => {
      overtimeMap[o.overTimeDateRegistration] = o;
    });
    (user.missingsDay || []).forEach(m => {
      missingMap[m.date] = m;
    });

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = new Date(year, month - 1, d).toISOString().split('T')[0];
      const cell = document.createElement('td');
      const over = overtimeMap[dateStr];
      const miss = missingMap[dateStr];

      if (over) {
        cell.classList.add('overtime');
        cell.innerHTML = `<small>${over.overtimeHours}год<br>x${over.multiplier}</small>`;
        cell.addEventListener('click', () =>
          openModal('Overtime', `${over.description}<br><b>Години:</b> ${over.overtimeHours}<br><b>Коеф:</b> x${over.multiplier}`)
        );
      } else if (miss) {
        cell.classList.add('missing');
        cell.innerHTML = `<small>${miss.missingHours}год</small>`;
        cell.addEventListener('click', () =>
          openModal('Пропуск', `${miss.reason}<br><b>Пропущено годин:</b> ${miss.missingHours}`)
        );
      }

      tr.appendChild(cell);
    }

    const salaryTd = document.createElement('td');
    salaryTd.textContent = (user.baseSalary ?? 0).toFixed(2);
    salaryTd.classList.add('salary-cell');
    salaryTd.dataset.id = user.userId;
    salaryTd.addEventListener('click', () => {
      id = user.userId;
      newSalary.value = user.baseSalary ?? 0;
      salaryModal.classList.remove('hidden');
    });
    tr.appendChild(salaryTd);

    const x1 = sumByMultiplier(user.overtimesDay, 1);
    const x15 = sumByMultiplier(user.overtimesDay, 1.5);
    const x2 = sumByMultiplier(user.overtimesDay, 2);
    const missing = (user.missingsDay || []).reduce((a, m) => a + (m.missingHours || 0), 0);

    [x1, x15, x2, '—', missing, ''].forEach(val => {
      const td = document.createElement('td');
      td.textContent = val;
      tr.appendChild(td);
    });

    crmBody.appendChild(tr);
  });
}

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

// ===== Збереження ЗП без перерендеру =====
saveSalaryBtn.onclick = async () => {
  if (!id) return;
  const salary = parseFloat(newSalary.value);
  if (isNaN(salary) || salary < 0) return alert('❌ Введіть коректну суму!');

  console.log("🔸 Надсилаю POST на бек...");
  const body = { userId: id, salary: salary };
  const ok = await postJson(`${API_BASE_URL}/users/sal`, body);

  if (ok) {
    alert('✅ Зарплату оновлено!');
    salaryModal.classList.add('hidden');

    // ✅ оновлюємо лише клітинку
    const cell = document.querySelector(`.salary-cell[data-id="${id}"]`);
    if (cell) cell.textContent = salary.toFixed(2);
  } else {
    alert('❌ Помилка при оновленні зарплати!');
  }
};

// ===== SWITCH VIEW =====
viewModeSelect.addEventListener('change', e => {
  if (e.target.value === 'calendar') window.location.href = '/html/admin/admin_viewList.html';
});

const homeBtn = document.getElementById('homeBtn');
if (homeBtn) {
  homeBtn.addEventListener('click', () => {
    window.location.href = '/html/admin/admin_dashboard_ui.html'; // 👈 заміни шлях на свій dashboard
  });
}

// ===== INIT =====
initYearMonth();
loadDepartments();
[departmentSelect, yearSelect, monthSelect].forEach(el =>
  el.addEventListener('change', loadCRMData)
);
