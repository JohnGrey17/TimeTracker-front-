// ===== viewList.js =====
const API_BASE_URL = 'http://localhost:8080/api';

const token = localStorage.getItem('token') || sessionStorage.getItem('token');
if (!token) {
  alert('⛔ Ви не авторизовані!');
  window.location.href = '../../html/auth.html';
}

// DOM
const calendarEl = document.getElementById('calendar');
const monthSelect = document.getElementById('monthSelect');
const yearSelect  = document.getElementById('yearSelect');
const modal       = document.getElementById('modal');
const modalDate   = document.getElementById('modalDate');
const modalInfo   = document.getElementById('modalInfo');
const closeModal  = document.getElementById('closeModal');

// DOM для модалки "додати"
const addModal = document.getElementById('addModal');
const closeAddModal = document.getElementById('closeAddModal');
const addModalDate = document.getElementById('addModalDate');
const entryType = document.getElementById('entryType');
const entryReason = document.getElementById('entryReason');
const entryHours = document.getElementById('entryHours');
const saveEntryBtn = document.getElementById('saveEntryBtn');

let selectedDate = null;

// Поточні значення
const now          = new Date();
const currentYear  = now.getFullYear();
const currentMonth = now.getMonth() + 1;

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
    if (!res.ok) {
      console.warn(`⚠️ ${res.status} ${res.statusText}: ${url}`);
      return [];
    }
    return await res.json();
  } catch (e) {
    console.error(`❌ Fetch failed: ${url}`, e);
    return [];
  }
}

// ===== Ініціалізація селектів =====
function initYears() {
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
  for (let m = 1; m <= 12; m++) {
    const opt = document.createElement('option');
    opt.value = m;
    opt.textContent = new Date(currentYear, m - 1)
      .toLocaleString('uk-UA', { month: 'long' });
    if (m === currentMonth) opt.selected = true;
    monthSelect.appendChild(opt);
  }
}

// ===== Малювання календаря =====
async function loadCalendar(year, month) {
  calendarEl.innerHTML = '';

  const daysInMonth = new Date(year, month, 0).getDate();
  const firstDay    = new Date(year, month - 1, 1).getDay();
  const offset      = (firstDay === 0 ? 6 : firstDay - 1);

  const overtimeUrl = `${API_BASE_URL}/over-time/getBy/month?year=${year}&month=${month}`;
  const missingUrl  = `${API_BASE_URL}/missing-hours/getBy/month?year=${year}&month=${month}`;

  const [overtimeData, missingData] = await Promise.all([
    getJson(overtimeUrl),
    getJson(missingUrl)
  ]);

  const map = Object.create(null);

  overtimeData.forEach(o => {
    const key = o.overTimeDateRegistration;
    map[key] = {
      type: 'overtime',
      desc: o.description,
      hours: o.overtimeHours
    };
  });

  missingData.forEach(m => {
    const key = m.date;
    map[key] = {
      type: 'missing',
      desc: m.reason,
      hours: m.missingHours
    };
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

      cell.onclick = () => {
        modalDate.textContent = dateStr;
        modalInfo.textContent = `${item.desc} (${item.hours} год)`;
        modal.classList.remove('hidden');
      };
    }

    // Кнопка "+"
    const addBtn = document.createElement('div');
    addBtn.className = 'add-btn';
    addBtn.textContent = '+';
    addBtn.onclick = (e) => {
      e.stopPropagation();
      openAddModal(dateStr);
    };
    cell.appendChild(addBtn);

    calendarEl.appendChild(cell);
  }
}

// ===== Модалка додавання =====
function openAddModal(dateStr) {
  selectedDate = dateStr;
  addModalDate.textContent = `📅 ${dateStr}`;
  entryReason.value = '';
  entryHours.value = '';
  entryType.value = 'overtime';
  addModal.classList.remove('hidden');
}

closeAddModal.onclick = () => addModal.classList.add('hidden');

saveEntryBtn.onclick = async () => {
  const type = entryType.value;
  const hours = parseFloat(entryHours.value);
  const reason = entryReason.value;

  if (!hours || hours <= 0) {
    alert('❌ Вкажіть кількість годин!');
    return;
  }

  if (type === 'overtime') {
    const payload = {
      overTimeDateRegistration: selectedDate,
      description: reason || "Overtime",
      overtime_hours: hours
    };
    await fetch(`${API_BASE_URL}/over-time/add`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token
      },
      body: JSON.stringify(payload)
    });
    alert('✅ Overtime збережено!');
  } else {
    const payload = {
      reason: reason || "Відсутність",
      date: selectedDate,
      missingHours: hours
    };
    await fetch(`${API_BASE_URL}/missing-hours/add`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token
      },
      body: JSON.stringify(payload)
    });
    alert('✅ Missing Day збережено!');
  }

  addModal.classList.add('hidden');
  loadCalendar(parseInt(yearSelect.value), parseInt(monthSelect.value));
};

// ===== Події =====
initYears();
initMonths();
loadCalendar(currentYear, currentMonth);

monthSelect.addEventListener('change', () => {
  loadCalendar(parseInt(yearSelect.value, 10), parseInt(monthSelect.value, 10));
});

yearSelect.addEventListener('change', () => {
  loadCalendar(parseInt(yearSelect.value, 10), parseInt(monthSelect.value, 10));
});

closeModal?.addEventListener('click', () => modal.classList.add('hidden'));
