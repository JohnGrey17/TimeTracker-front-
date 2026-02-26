
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

// ===== бонусна модалка =====
const bonusModal = document.getElementById('bonusModal');
const closeBonusModal = document.getElementById('closeBonusModal');
const bonusModalTitle = document.getElementById('bonusModalTitle');
const bonusTableBody = document.querySelector('#bonusTable tbody');
const bonusDateInput = document.getElementById('bonusDate');
const bonusReasonInput = document.getElementById('bonusReason');
const bonusSumInput = document.getElementById('bonusSum');
const saveBonusBtn = document.getElementById('saveBonusBtn');
const resetBonusFormBtn = document.getElementById('resetBonusFormBtn');

let id = null;

// для роботи з бонусами
let currentBonusUserId = null;
let currentBonusYear = null;
let currentBonusMonth = null;
let editingBonusId = null;

// ===== NEW: Period switch =====
const periodSwitch = document.getElementById('periodSwitch');
const periodButtons = periodSwitch ? periodSwitch.querySelectorAll('.period-btn') : [];
const PERIOD_STORAGE_KEY = 'crmPeriodMode';

// first | second | payroll | overall
let crmPeriodMode = localStorage.getItem(PERIOD_STORAGE_KEY) || 'overall';

function setActivePeriodButton() {
  periodButtons.forEach(btn => btn.classList.toggle('active', btn.dataset.period === crmPeriodMode));
}

function togglePeriodSwitchVisibility() {
  if (!periodSwitch) return;
  periodSwitch.style.display = (viewModeSelect.value === 'crm') ? 'flex' : 'none';
}

// ===== Helpers =====
async function getJson(url) {
  const res = await fetch(url, { headers: { Authorization: 'Bearer ' + token } });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(t || `HTTP ${res.status}`);
  }
  return res.json();
}

// ✅ FIX: показуємо текст помилки з беку
async function postJson(url, body) {
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + token,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(t || `HTTP ${res.status}`);
  }
  return true;
}

// ===== INIT YEAR / MONTH =====
function initYearMonth() {
  const now = new Date();
  const currentYear = now.getFullYear();
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

  // сортуємо
  data.sort((a, b) => a.name.localeCompare(b.name, 'uk'));

  // 🔴 відділяємо parent і children
  const parents = data.filter(d => !d.parentId);
  const children = data.filter(d => d.parentId);

  parents.forEach(parent => {
    // додаємо parent
    const parentOption = document.createElement('option');
    parentOption.value = parent.id;
    parentOption.textContent = parent.name;
    parentOption.style.fontWeight = "bold";
    departmentSelect.appendChild(parentOption);

    // додаємо його дітей
    children
      .filter(child => child.parentId === parent.id)
      .forEach(child => {
        const childOption = document.createElement('option');
        childOption.value = child.id;
        childOption.textContent = `   --- ${child.name}`;
        departmentSelect.appendChild(childOption);
      });
  });
}

// ===== Period helpers =====
function daysInMonth(year, month) {
  return new Date(year, month, 0).getDate();
}

function getDayFromDateStr(dateStr) {
  const parts = String(dateStr).split('-');
  return parseInt(parts[2], 10);
}
function inRangeByDay(dateStr, startDay, endDay) {
  const d = getDayFromDateStr(dateStr);
  return d >= startDay && d <= endDay;
}

function getModeMeta(year, month) {
  const dim = daysInMonth(year, month);

  if (crmPeriodMode === 'first') {
    return {
      startDay: 1, endDay: 15,
      showCalendar: true,
      headers: ["💰 Половина Ставки", "🚫 Пропущені години", "💵 Сумма до сплати"],
    };
  }

  if (crmPeriodMode === 'second') {
    return {
      startDay: 16, endDay: dim,
      showCalendar: true,
      headers: ["💰 Половина Ставки", "🚫 Пропущені години", "💵 Сумма до сплати"],
    };
  }

  if (crmPeriodMode === 'payroll') {
    return {
      startDay: 1, endDay: dim,
      showCalendar: false,
      headers: ["💰 Ставка", "⏱️ x1", "⏱️ x1.5", "⏱️ x2", "🎁 Бонуси", "💰 Сума овертаймів"],
    };
  }

  return {
    startDay: 1, endDay: dim,
    showCalendar: true,
    headers: ["💰 Ставка", "⏱️ x1", "⏱️ x1.5", "⏱️ x2", "🎁 Бонуси", "🚫 Пропущені години", "💰 Сума овертаймів", "💵 Загальна підрахована сума за місяць"],
  };
}

// ===== CREATE TABLE HEAD =====
function createTableHead(year, month, startDay, endDay, showCalendar, extraHeaders) {
  crmHead.innerHTML = '';

  const weekDays = ['Нд', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
  const headRow = document.createElement('tr');

  const thName = document.createElement('th');
  thName.textContent = "👤 Ім'я";
  headRow.appendChild(thName);

  if (showCalendar) {
    for (let d = startDay; d <= endDay; d++) {
      const date = new Date(year, month - 1, d);
      const dayOfWeek = weekDays[date.getDay()];
      const th = document.createElement('th');
      th.innerHTML = `<div class="day-number">${d}</div><div class="day-name">${dayOfWeek}</div>`;
      th.classList.add('date-col');
      if (dayOfWeek === 'Сб' || dayOfWeek === 'Нд') th.classList.add('weekend');
      headRow.appendChild(th);
    }
  }

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

  const meta = getModeMeta(year, month);
  createTableHead(year, month, meta.startDay, meta.endDay, meta.showCalendar, meta.headers);

  crmBody.innerHTML = '';

  data.forEach(user => {
    const tr = document.createElement('tr');

    const nameTd = document.createElement('td');
    nameTd.innerHTML = `
      <label>
        <input type="checkbox" class="user-focus">
        ${user.firstName} ${user.lastName}
      </label>
    `;
    tr.appendChild(nameTd);

    const overtimeMap = {};
    const missingMap = {};

    (user.overtimesDay || []).forEach(o => { overtimeMap[o.overTimeDateRegistration] = o; });
    (user.missingsDay || []).forEach(m => { missingMap[m.date] = m; });

    if (meta.showCalendar) {
      const weekDays = ['Нд', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
      for (let d = meta.startDay; d <= meta.endDay; d++) {
        const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const cell = document.createElement('td');

        const over = overtimeMap[dateStr];
        const miss = missingMap[dateStr];

        const jsDate = new Date(year, month - 1, d);
        const dow = jsDate.getDay();
        if (dow === 0 || dow === 6) cell.classList.add('weekend');

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
    }

    function createDoubleCell(hours, amount, isDeduction = false) {
      const td = document.createElement('td');
      td.innerHTML = `
        <div class="cell-top">${hours || 0} год</div>
        <div class="cell-bottom" style="color:${isDeduction ? '#b71c1c' : '#155724'};">
          ${isDeduction ? '−' : '+'}${Number(amount || 0).toFixed(2)} грн
        </div>
      `;
      return td;
    }

    const baseSalary = Number(user.baseSalary ?? 0);

    const salaryTd = document.createElement('td');
    salaryTd.classList.add('salary-cell');
    salaryTd.dataset.id = user.userId;
    salaryTd.addEventListener('click', () => {
      id = user.userId;
      newSalary.value = user.baseSalary ?? 0;
      salaryModal.classList.remove('hidden');
    });

    // first/second
    if (crmPeriodMode === 'first' || crmPeriodMode === 'second') {
      // залишив як у тебе (без змін по бонусах)
      const basePart = baseSalary / 2;

      const missingsInPeriod = (user.missingsDay || []).filter(m =>
        inRangeByDay(m.date, meta.startDay, meta.endDay)
      );
      const missingHours = missingsInPeriod.reduce((a, m) => a + (m.missingHours || 0), 0);

      // твоя стара логіка тут була — залишаю як є (бо це не про бонуси)
      const hourRate = (() => {
        const dim = daysInMonth(year, month);
        let workDays = 0;
        for (let d = 1; d <= dim; d++) {
          const jsDate = new Date(year, month - 1, d);
          const dow = jsDate.getDay();
          if (dow !== 0 && dow !== 6) workDays++;
        }
        const totalHours = workDays * 8;
        return totalHours ? (baseSalary / totalHours) : 0;
      })();

      const sumMissing = missingHours * hourRate;

      salaryTd.textContent = basePart.toFixed(2);

      const missingTd = createDoubleCell(missingHours, sumMissing, true);
      const totalTd = document.createElement('td');
      totalTd.textContent = (basePart - sumMissing).toFixed(2);

      tr.appendChild(salaryTd);
      tr.appendChild(missingTd);
      tr.appendChild(totalTd);

      crmBody.appendChild(tr);
      return;
    }

    // payroll (суми з беку)
    if (crmPeriodMode === 'payroll') {
      const overtimes = (user.overtimesDay || []);

      const x1Hours = sumByMultiplier(overtimes, 1);
      const x15Hours = sumByMultiplier(overtimes, 1.5);
      const x2Hours = sumByMultiplier(overtimes, 2);

      const sumX1  = Number(user.overtimeX1 ?? 0);
      const sumX15 = Number(user.overtimeX1_5 ?? 0);
      const sumX2  = Number(user.overtimeX2 ?? 0);

      const overtimeTotalAmount = sumX1 + sumX15 + sumX2;
      const bonusValue = Number(user.bonusTotalSum ?? 0);

      salaryTd.textContent = baseSalary.toFixed(2);

      const x1Td  = createDoubleCell(x1Hours, sumX1);
      const x15Td = createDoubleCell(x15Hours, sumX15);
      const x2Td  = createDoubleCell(x2Hours, sumX2);

      const bonusTd = document.createElement('td');
      bonusTd.classList.add('bonus-cell');
      bonusTd.textContent = bonusValue.toFixed(2);
      bonusTd.addEventListener('click', () => openBonusModal(user.userId, year, month));

      const overtimeTotalTd = document.createElement('td');
      overtimeTotalTd.textContent = overtimeTotalAmount.toFixed(2);

      tr.appendChild(salaryTd);
      tr.appendChild(x1Td);
      tr.appendChild(x15Td);
      tr.appendChild(x2Td);
      tr.appendChild(bonusTd);
      tr.appendChild(overtimeTotalTd);

      crmBody.appendChild(tr);
      return;
    }

    // overall
    {
      const x1Hours = sumByMultiplier(user.overtimesDay, 1);
      const x15Hours = sumByMultiplier(user.overtimesDay, 1.5);
      const x2Hours = sumByMultiplier(user.overtimesDay, 2);
      const missingHours = (user.missingsDay || []).reduce((a, m) => a + (m.missingHours || 0), 0);

      const sumX1 = Number(user.overtimeX1 ?? 0);
      const sumX15 = Number(user.overtimeX1_5 ?? 0);
      const sumX2 = Number(user.overtimeX2 ?? 0);
      const sumMissing = Number(user.totalDeductions ?? 0);

      salaryTd.textContent = baseSalary.toFixed(2);

      const x1Td = createDoubleCell(x1Hours, sumX1);
      const x15Td = createDoubleCell(x15Hours, sumX15);
      const x2Td = createDoubleCell(x2Hours, sumX2);

      const bonusTd = document.createElement('td');
      bonusTd.classList.add('bonus-cell');
      const bonusValue = Number(user.bonusTotalSum ?? 0);
      bonusTd.textContent = bonusValue.toFixed(2);
      bonusTd.addEventListener('click', () => openBonusModal(user.userId, year, month));

      const missingTd = createDoubleCell(missingHours, sumMissing, true);

      const overtimeTotalAmount = sumX1 + sumX15 + sumX2;
      const overtimeTotalTd = document.createElement('td');
      overtimeTotalTd.textContent = overtimeTotalAmount.toFixed(2);

      const totalTd = document.createElement('td');
      const baseTotal = Number(user.totalSum ?? 0);
      totalTd.textContent = baseTotal.toFixed(2);

      tr.appendChild(salaryTd);
      tr.appendChild(x1Td);
      tr.appendChild(x15Td);
      tr.appendChild(x2Td);
      tr.appendChild(bonusTd);
      tr.appendChild(missingTd);
      tr.appendChild(overtimeTotalTd);
      tr.appendChild(totalTd);

      crmBody.appendChild(tr);
    }
  });

  // focus handling
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
  return list ? list.filter(o => o.multiplier == mult).reduce((acc, o) => acc + (o.overtimeHours || 0), 0) : 0;
}

// ===== MODALS =====
function openModal(title, content) {
  modalTitle.textContent = title;
  modalContent.innerHTML = content;
  modal.classList.remove('hidden');
}
closeModal.onclick = () => modal.classList.add('hidden');
closeSalaryModal.onclick = () => salaryModal.classList.add('hidden');

// ===== Збереження ЗП + reload =====
saveSalaryBtn.onclick = async () => {
  if (!id) return;
  const salary = parseFloat(newSalary.value);
  if (isNaN(salary) || salary < 0) return alert('❌ Введіть коректну суму!');

  const body = { userId: id, salary: salary };

  try {
    await postJson(`${API_BASE_URL}/users/sal`, body);

    localStorage.setItem('selectedDepartment', departmentSelect.value);
    localStorage.setItem('selectedYear', yearSelect.value);
    localStorage.setItem('selectedMonth', monthSelect.value);

    alert('✅ Зарплату оновлено!');
    window.location.reload();
  } catch (e) {
    alert('❌ Помилка при оновленні зарплати: ' + e.message);
  }
};

// ===== ЛОГІКА БОНУСІВ =====
function resetBonusForm() {
  bonusDateInput.value = '';
  bonusReasonInput.value = '';
  bonusSumInput.value = '';
  editingBonusId = null;
}

async function openBonusModal(userId, year, month) {
  currentBonusUserId = userId;
  currentBonusYear = year;
  currentBonusMonth = month;
  editingBonusId = null;

  bonusModalTitle.textContent = `Бонуси за ${month}.${year} (userId: ${userId})`;
  resetBonusForm();

  bonusModal.classList.remove('hidden');

  try {
    const bonuses = await getJson(
      `${API_BASE_URL}/bonus/getBy/month?userId=${userId}&year=${year}&month=${month}`
    );
    renderBonusList(bonuses);
  } catch (e) {
    console.error(e);
    bonusTableBody.innerHTML = `<tr><td colspan="4">❌ Помилка: ${e.message}</td></tr>`;
  }
}

function renderBonusList(bonuses) {
  bonusTableBody.innerHTML = '';

  if (!bonuses || bonuses.length === 0) {
    bonusTableBody.innerHTML = `<tr><td colspan="4">Бонусів за цей місяць немає</td></tr>`;
    return;
  }

  bonuses.forEach(b => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${b.date}</td>
      <td>${b.reason}</td>
      <td>${Number(b.sum ?? 0).toFixed(2)}</td>
      <td>
        <button class="bonus-edit-btn" data-id="${b.id}">✏</button>
        <button class="bonus-delete-btn" data-id="${b.id}">🗑</button>
      </td>
    `;
    bonusTableBody.appendChild(tr);
  });

  document.querySelectorAll('.bonus-edit-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const bonusId = btn.dataset.id;
      const bonus = bonuses.find(b => String(b.id) === String(bonusId));
      if (!bonus) return;

      editingBonusId = bonus.id;
      bonusDateInput.value = bonus.date;
      bonusReasonInput.value = bonus.reason;
      bonusSumInput.value = bonus.sum;
    });
  });

  document.querySelectorAll('.bonus-delete-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const bonusId = btn.dataset.id;
      if (!confirm('Видалити цей бонус?')) return;

      try {
        const resp = await fetch(
          `${API_BASE_URL}/bonus/delete?userId=${currentBonusUserId}&bonusId=${bonusId}`,
          { method: 'DELETE', headers: { Authorization: 'Bearer ' + token } }
        );

        if (resp.status === 204 || resp.ok) {
          await reloadBonusesAndCrm();
        } else {
          const t = await resp.text().catch(() => "");
          alert('❌ Помилка при видаленні бонусу: ' + (t || resp.status));
        }
      } catch (e) {
        console.error(e);
        alert('❌ Помилка при видаленні бонусу: ' + e.message);
      }
    });
  });
}

async function reloadBonusesAndCrm() {
  try {
    const bonuses = await getJson(
      `${API_BASE_URL}/bonus/getBy/month?userId=${currentBonusUserId}&year=${currentBonusYear}&month=${currentBonusMonth}`
    );
    renderBonusList(bonuses);
  } catch (e) {
    console.error(e);
  }
  await loadCRMData();
}

saveBonusBtn.onclick = async () => {
  if (!currentBonusUserId || !currentBonusYear || !currentBonusMonth) {
    return alert('❌ Немає поточного користувача або періоду');
  }

  const date = bonusDateInput.value;
  const reason = bonusReasonInput.value.trim();
  const sumVal = parseFloat(bonusSumInput.value);

  if (!date) return alert('❌ Оберіть дату');
  if (!reason) return alert('❌ Вкажіть причину');
  if (isNaN(sumVal) || sumVal <= 0) return alert('❌ Сума має бути більшою за 0');

  try {
    if (editingBonusId == null) {
      // create
      const body = { date: date, reason: reason, sum: sumVal };
      await postJson(`${API_BASE_URL}/bonus/add?userId=${currentBonusUserId}`, body);
    } else {
      // ✅ FIX: update теж шле {date, reason, sum}
      const body = { date: date, reason: reason, sum: sumVal };
      await postJson(
        `${API_BASE_URL}/bonus/update?userId=${currentBonusUserId}&bonusId=${editingBonusId}`,
        body
      );
    }

    resetBonusForm();
    await reloadBonusesAndCrm();
  } catch (e) {
    console.error(e);
    alert('❌ Сталася помилка: ' + e.message);
  }
};

resetBonusFormBtn.onclick = () => resetBonusForm();
closeBonusModal.onclick = () => {
  bonusModal.classList.add('hidden');
  resetBonusForm();
};

// ===== SWITCH VIEW =====
viewModeSelect.addEventListener('change', e => {
  togglePeriodSwitchVisibility();
  if (e.target.value === 'calendar') window.location.href = '/html/admin/admin_viewList.html';
});

const homeBtn = document.getElementById('homeBtn');
if (homeBtn) {
  homeBtn.addEventListener('click', () => {
    window.location.href = '/html/admin/admin_dashboard_ui.html';
  });
}

// ===== Period buttons =====
if (periodButtons.length) {
  setActivePeriodButton();
  togglePeriodSwitchVisibility();

  periodButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      crmPeriodMode = btn.dataset.period;
      localStorage.setItem(PERIOD_STORAGE_KEY, crmPeriodMode);
      setActivePeriodButton();
      loadCRMData();
    });
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

[departmentSelect, yearSelect, monthSelect].forEach(el =>
  el.addEventListener('change', loadCRMData)
);
