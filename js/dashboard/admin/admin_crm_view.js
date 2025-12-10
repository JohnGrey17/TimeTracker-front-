const API_BASE_URL = "http://localhost:8080/api";
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
    yearSelect.appendChild(opt);
  }
  for (let m = 1; m <= 12; m++) {
    const opt = document.createElement('option');
    opt.value = m;
    opt.textContent = new Date(currentYear, m - 1).toLocaleString('uk-UA', { month: 'long' });
    monthSelect.appendChild(opt);
  }
}

// ===== LOAD DEPARTMENTS =====
async function loadDepartments() {
  const data = await getJson(`${API_BASE_URL}/department/getAll`);
  departmentSelect.innerHTML = `<option value="" disabled selected>Оберіть відділ</option>`;
  data.sort((a, b) => a.name.localeCompare(b.name, 'uk'));
  data.forEach(dep => {
    const opt = document.createElement('option');
    opt.value = dep.id;
    opt.textContent = dep.name;
    departmentSelect.appendChild(opt);
  });
}

// ===== CREATE TABLE HEAD =====
function createTableHead(year, month, daysInMonth) {
  crmHead.innerHTML = '';

  const weekDays = ['Нд', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
  const headRow = document.createElement('tr');
  const thName = document.createElement('th');
  thName.textContent = "👤 Ім'я";
  headRow.appendChild(thName);

  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month - 1, d);
    const dayOfWeek = weekDays[date.getDay()];
    const th = document.createElement('th');
    th.innerHTML = `<div class="day-number">${d}</div><div class="day-name">${dayOfWeek}</div>`;
    th.classList.add('date-col');
    if (dayOfWeek === 'Сб' || dayOfWeek === 'Нд') th.classList.add('weekend');
    headRow.appendChild(th);
  }

  const extraHeaders = [
    "💰 Ставка",
    "⏱️ x1",
    "⏱️ x1.5",
    "⏱️ x2",
    "🎁 Бонуси",
    "🚫 Пропущені години",
    "💰 Сума овертаймів",
    "💵 Загальна підрахована сума"
  ];

  extraHeaders.forEach(label => {
    const th = document.createElement('th');
    th.textContent = label;
    headRow.appendChild(th);
  });

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

  data.sort((a, b) => {
    const last = a.lastName.localeCompare(b.lastName, 'uk');
    return last === 0 ? a.firstName.localeCompare(b.firstName, 'uk') : last;
  });

  const daysInMonth = new Date(year, month, 0).getDate();
  createTableHead(year, month, daysInMonth);

  crmBody.innerHTML = '';

  data.forEach(user => {
    const tr = document.createElement('tr');

    // === Name + checkbox ===
    const nameTd = document.createElement('td');
    nameTd.innerHTML = `
      <label>
        <input type="checkbox" class="user-focus">
        ${user.firstName} ${user.lastName}
      </label>
    `;
    tr.appendChild(nameTd);

    // === дні місяця ===
    const overtimeMap = {};
    const missingMap = {};

    (user.overtimesDay || []).forEach(o => {
      overtimeMap[o.overTimeDateRegistration] = o;
    });
    (user.missingsDay || []).forEach(m => {
      missingMap[m.date] = m;
    });

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const cell = document.createElement('td');
      const over = overtimeMap[dateStr];
      const miss = missingMap[dateStr];

      const jsDate = new Date(year, month - 1, d);
      const dayOfWeek = jsDate.getDay(); // 0 = Нд, 6 = Сб
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        cell.classList.add('weekend');
      }

      if (over) {
        cell.classList.add('overtime');
        cell.innerHTML = `<div class="cell-top">${over.overtimeHours} год</div>`;
        cell.addEventListener('click', () =>
          openModal('Overtime', `
            ${over.description}<br>
            <b>Години:</b> ${over.overtimeHours}<br>
            <b>Коеф:</b> x${over.multiplier}<br>
          `)
        );
      } else if (miss) {
        cell.classList.add('missing');
        cell.innerHTML = `<div class="cell-top">${miss.missingHours} год</div>`;
        cell.addEventListener('click', () =>
          openModal('Пропуск', `
            ${miss.reason}<br>
            <b>Пропущено годин:</b> ${miss.missingHours}<br>
          `)
        );
      }

      tr.appendChild(cell);
    }

    // === Salary cell ===
    const salaryTd = document.createElement('td');
    salaryTd.textContent = (user.baseSalary ?? 0).toFixed(2);
    salaryTd.classList.add('salary-cell');
    salaryTd.dataset.id = user.userId;
    salaryTd.addEventListener('click', () => {
      id = user.userId;
      newSalary.value = user.baseSalary ?? 0;
      salaryModal.classList.remove('hidden');
    });

    // === дані по коефіцієнтах ===
    const x1 = sumByMultiplier(user.overtimesDay, 1);
    const x15 = sumByMultiplier(user.overtimesDay, 1.5);
    const x2 = sumByMultiplier(user.overtimesDay, 2);
    const missing = (user.missingsDay || []).reduce((a, m) => a + (m.missingHours || 0), 0);

    const sumX1 = user.overtimeX1 ?? 0;
    const sumX15 = user.overtimeX1_5 ?? 0;
    const sumX2 = user.overtimeX2 ?? 0;
    const sumMissing = user.totalDeductions ?? 0;

    function createDoubleCell(hours, amount, isDeduction = false) {
      const td = document.createElement('td');
      td.innerHTML = `
        <div class="cell-top">${hours || 0} год</div>
        <div class="cell-bottom" style="color:${isDeduction ? '#b71c1c' : '#155724'};">
          ${isDeduction ? '−' : '+'}${amount.toFixed(2)} грн
        </div>
      `;
      return td;
    }

    const x1Td = createDoubleCell(x1, sumX1);
    const x15Td = createDoubleCell(x15, sumX15);
    const x2Td = createDoubleCell(x2, sumX2);
    const missingTd = createDoubleCell(missing, sumMissing, true);

    // === Сума овертаймів (на фронті) ===
    const overtimeTotalAmount = sumX1 + sumX15 + sumX2;
    const overtimeTotalTd = document.createElement('td');
    overtimeTotalTd.textContent = overtimeTotalAmount.toFixed(2);

    // === Загальна підрахована сума (база з бекенду) ===
    const baseTotal = Number(user.totalSum ?? 0);
    const totalTd = document.createElement('td');
    totalTd.textContent = baseTotal.toFixed(2);

    // === КОЛОНКА "Бонуси" (редагуємо через prompt) ===
    const bonusTd = document.createElement('td');
    bonusTd.classList.add('bonus-cell');
    let bonus = 0;
    bonusTd.textContent = bonus.toFixed(2);

    bonusTd.addEventListener('click', () => {
      const current = bonus;
      const inputVal = prompt('Введіть суму бонусів (грн):', current.toFixed(2));
      if (inputVal === null) return; // натиснули Cancel

      const parsed = parseFloat(inputVal.replace(',', '.'));
      if (isNaN(parsed) || parsed < 0) {
        alert('❌ Введіть коректне число!');
        return;
      }

      bonus = parsed;
      bonusTd.textContent = bonus.toFixed(2);
      const finalTotal = baseTotal + bonus;
      totalTd.textContent = finalTotal.toFixed(2);
    });

    // === додаємо комірки у правильному порядку ===
    tr.appendChild(salaryTd);
    tr.appendChild(x1Td);
    tr.appendChild(x15Td);
    tr.appendChild(x2Td);
    tr.appendChild(bonusTd);
    tr.appendChild(missingTd);
    tr.appendChild(overtimeTotalTd);
    tr.appendChild(totalTd);

    crmBody.appendChild(tr);
  });

  // === focus handling ===
  document.querySelectorAll('.user-focus').forEach(chk => {
    chk.addEventListener('change', () => {
      const anyChecked = Array.from(document.querySelectorAll('.user-focus')).some(c => c.checked);
      document.querySelectorAll('#crmBody tr').forEach(row => {
        const rowChecked = row.querySelector('.user-focus')?.checked;
        row.classList.toggle('dimmed', anyChecked && !rowChecked);
      });
    });
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

// ===== Збереження ЗП + reload із фільтрами =====
saveSalaryBtn.onclick = async () => {
  if (!id) return;
  const salary = parseFloat(newSalary.value);
  if (isNaN(salary) || salary < 0) return alert('❌ Введіть коректну суму!');

  const body = { userId: id, salary: salary };
  const ok = await postJson(`${API_BASE_URL}/users/sal`, body);

  if (ok) {
    localStorage.setItem('selectedDepartment', departmentSelect.value);
    localStorage.setItem('selectedYear', yearSelect.value);
    localStorage.setItem('selectedMonth', monthSelect.value);

    alert('✅ Зарплату оновлено!');
    window.location.reload();
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
    window.location.href = '/html/admin/admin_dashboard_ui.html';
  });
}

// ===== INIT =====
initYearMonth();

loadDepartments().then(() => {
  const dep = localStorage.getItem('selectedDepartment');
  const year = localStorage.getItem('selectedYear');
  const month = localStorage.getItem('selectedMonth');

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  yearSelect.value = year || currentYear;
  monthSelect.value = month || currentMonth;

  if (dep) {
    departmentSelect.value = dep;
    loadCRMData();
  }
});

// оновлення при зміні будь-якого фільтру
[departmentSelect, yearSelect, monthSelect].forEach(el =>
  el.addEventListener('change', loadCRMData)
);
