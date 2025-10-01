// ===== CONFIG =====
const API_BASE_URL = 'http://localhost:8080/api';
const token = localStorage.getItem('token') || sessionStorage.getItem('token');
if (!token) {
  alert('⛔ Ви не авторизовані!');
  window.location.href = '../../html/auth.html';
}

// ===== DOM =====
const calendarEl   = document.getElementById('calendar');
const monthSelect  = document.getElementById('monthSelect');
const yearSelect   = document.getElementById('yearSelect');
const modal        = document.getElementById('modal');
const modalDate    = document.getElementById('modalDate');
const modalInfo    = document.getElementById('modalInfo');
const closeModal   = document.getElementById('closeModal');

const addModal     = document.getElementById('addModal');
const closeAddModal= document.getElementById('closeAddModal');
const addModalDate = document.getElementById('addModalDate');
const entryType    = document.getElementById('entryType');
const entryReason  = document.getElementById('entryReason');
const entryHours   = document.getElementById('entryHours');
const saveEntryBtn = document.getElementById('saveEntryBtn');

const departmentSelect = document.getElementById('departmentSelect');
const userSelect       = document.getElementById('userSelect');
const myDataCheckbox   = document.getElementById('myDataCheckbox');
const summaryEl        = document.getElementById('summary');

let selectedDate = null;
let currentUserId = null;

// ===== Helpers =====
function isoDate(y, m, d) {
  const dt = new Date(y, m - 1, d);
  dt.setMinutes(dt.getMinutes() - dt.getTimezoneOffset());
  return dt.toISOString().split('T')[0];
}

async function getJson(url) {
  try {
    const res = await fetch(url, {
      headers: { 'Authorization': 'Bearer ' + token }
    });
    if (!res.ok) return [];
    return await res.json();
  } catch (e) {
    console.error(`❌ Fetch failed: ${url}`, e);
    return [];
  }
}

// ===== INIT YEAR / MONTH =====
function initYears() {
  const now = new Date();
  const currentYear = now.getFullYear();
  const startYear = 2020;
  const endYear   = currentYear + 2;
  for (let y = startYear; y <= endYear; y++) {
    const opt = document.createElement('option');
    opt.value = y;
    opt.textContent = y;
    if (y === currentYear) opt.selected = true;
    yearSelect.appendChild(opt);
  }
}

function initMonths() {
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const year = now.getFullYear();
  for (let m = 1; m <= 12; m++) {
    const opt = document.createElement('option');
    opt.value = m;
    opt.textContent = new Date(year, m - 1).toLocaleString('uk-UA', { month: 'long' });
    if (m === currentMonth) opt.selected = true;
    monthSelect.appendChild(opt);
  }
}

// ===== LOAD DEPARTMENTS =====
async function loadDepartments() {
  const data = await getJson(`${API_BASE_URL}/department/getAll`);
  departmentSelect.innerHTML = `<option value="" disabled selected>Оберіть департамент</option>`;
  data.forEach(d => {
    const opt = document.createElement('option');
    opt.value = d.id;
    opt.textContent = d.name;
    departmentSelect.appendChild(opt);
  });
}

// ===== LOAD USERS =====
async function loadUsers(departmentId) {
  const data = await getJson(`${API_BASE_URL}/users/department/${departmentId}`);
  userSelect.innerHTML = `<option value="" disabled selected>Оберіть користувача</option>`;
  data.forEach(u => {
    const opt = document.createElement('option');
    opt.value = u.id;
    opt.textContent = `${u.firstName} ${u.lastName}`;
    userSelect.appendChild(opt);
  });
}

// ===== LOAD CALENDAR =====
async function loadCalendar(year, month, userId) {
  calendarEl.innerHTML = '';
  summaryEl.innerHTML = '';

  const daysInMonth = new Date(year, month, 0).getDate();
  const firstDay    = new Date(year, month - 1, 1).getDay();
  const offset      = (firstDay === 0 ? 6 : firstDay - 1);

  let overtimeUrl, missingUrl;
  if (myDataCheckbox.checked) {
    overtimeUrl = `${API_BASE_URL}/over-time/getBy/month?year=${year}&month=${month}`;
    missingUrl  = `${API_BASE_URL}/missing-hours/getBy/month?year=${year}&month=${month}`;
  } else if (userId) {
    overtimeUrl = `${API_BASE_URL}/over-time/getBy?year=${year}&month=${month}&userId=${userId}`;
    missingUrl  = `${API_BASE_URL}/missing-hours/getBy?year=${year}&month=${month}&userId=${userId}`;
  } else {
    return;
  }

  const [overtimeData, missingData] = await Promise.all([
    getJson(overtimeUrl),
    getJson(missingUrl)
  ]);

  const map = Object.create(null);

  let overtimeX1 = 0, overtimeX15 = 0, overtimeX2 = 0, missingSum = 0;

  overtimeData.forEach(o => {
    const key = o.overTimeDateRegistration;
    map[key] = { type: 'overtime', desc: o.description, hours: o.overtimeHours, mult: o.multiplier };

    if (o.multiplier == 1) overtimeX1 += o.overtimeHours;
    else if (o.multiplier == 1.5) overtimeX15 += o.overtimeHours;
    else if (o.multiplier == 2) overtimeX2 += o.overtimeHours;
  });

  missingData.forEach(m => {
    const key = m.date;
    map[key] = { type: 'missing', desc: m.reason, hours: m.missingHours };
    missingSum += m.missingHours;
  });

  for (let i = 0; i < offset; i++) {
    const emptyCell = document.createElement('div');
    emptyCell.className = 'day empty';
    calendarEl.appendChild(emptyCell);
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = isoDate(year, month, d);
    const cell = document.createElement('div');
    cell.className = 'day';
    cell.textContent = d;

    const item = map[dateStr];
    if (item) {
      cell.classList.add(item.type);

      const badge = document.createElement('div');
      badge.className = 'badge';
      badge.textContent = `${item.hours} год`;
      cell.appendChild(badge);

      if (item.type === 'overtime') {
        const mult = document.createElement('div');
        mult.className = 'multiplier';
        mult.textContent = `x${item.mult}`;
        cell.appendChild(mult);
      }

      cell.onclick = () => {
        modalDate.textContent = dateStr;
        modalInfo.textContent = `${item.desc} (${item.hours} год${item.mult ? ` x${item.mult}` : ''})`;
        modal.classList.remove('hidden');
      };
    }

    if (myDataCheckbox.checked) {
      const addBtn = document.createElement('div');
      addBtn.className = 'add-btn';
      addBtn.textContent = '+';
      addBtn.onclick = (e) => {
        e.stopPropagation();
        openAddModal(dateStr);
      };
      cell.appendChild(addBtn);
    }

    calendarEl.appendChild(cell);
  }

  // summary (у вигляді списку)
  summaryEl.innerHTML = `
    <ul>
      <li>🕓 Overtime ×1: ${overtimeX1} год</li>
      <li>🕓 Overtime ×1.5: ${overtimeX15} год</li>
      <li>🕓 Overtime ×2: ${overtimeX2} год</li>
      <li>😴 Missing: ${missingSum} год</li>
    </ul>
  `;
}

// ===== ADD MODAL =====
function openAddModal(dateStr) {
  selectedDate = dateStr;
  addModalDate.textContent = `📅 ${dateStr}`;
  entryReason.value = '';
  entryHours.value = '';
  entryType.value = 'overtime';
  addModal.classList.remove('hidden');
}

closeAddModal.onclick = () => addModal.classList.add('hidden');

// SAVE ENTRY
saveEntryBtn.onclick = async () => {
  const type = entryType.value;
  const hours = parseFloat(entryHours.value);
  const reason = entryReason.value;

  if (!hours || hours <= 0) {
    alert('❌ Вкажіть кількість годин!');
    return;
  }

  if (type === 'overtime') {
    const payload = { overTimeDateRegistration: selectedDate, description: reason || "Overtime", overtime_hours: hours, multiplier: 1 };
    await fetch(`${API_BASE_URL}/over-time/add`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify(payload)
    });
  } else {
    const payload = { reason: reason || "Відсутність", date: selectedDate, missingHours: hours };
    await fetch(`${API_BASE_URL}/missing-hours/add`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify(payload)
    });
  }

  alert('✅ Запис збережено!');
  addModal.classList.add('hidden');
  loadCalendar(parseInt(yearSelect.value), parseInt(monthSelect.value), currentUserId);
};

// ===== INIT =====
initYears();
initMonths();
loadDepartments();

monthSelect.addEventListener('change', () => loadCalendar(parseInt(yearSelect.value), parseInt(monthSelect.value), currentUserId));
yearSelect.addEventListener('change', () => loadCalendar(parseInt(yearSelect.value), parseInt(monthSelect.value), currentUserId));

departmentSelect.addEventListener('change', (e) => loadUsers(e.target.value));
userSelect.addEventListener('change', (e) => {
  currentUserId = e.target.value;
  loadCalendar(parseInt(yearSelect.value), parseInt(monthSelect.value), currentUserId);
});
myDataCheckbox.addEventListener('change', () => {
  if (myDataCheckbox.checked) {
    departmentSelect.disabled = true;
    userSelect.disabled = true;
    currentUserId = null;
  } else {
    departmentSelect.disabled = false;
    userSelect.disabled = false;
  }
  loadCalendar(parseInt(yearSelect.value), parseInt(monthSelect.value), currentUserId);
});

closeModal?.addEventListener('click', () => modal.classList.add('hidden'));
