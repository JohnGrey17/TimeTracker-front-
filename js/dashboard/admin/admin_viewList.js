// ===== CONFIG =====
const API_BASE_URL = 'http://3.66.197.165:8080/api';
const token = localStorage.getItem('token') || sessionStorage.getItem('token');
if (!token) {
  alert('⛔ Ви не авторизовані!');
  window.location.href = '../../html/auth.html';
}

// Глобальна мапа подій по датах
// { "2025-12-08": { type: 'OVERTIME'|'MISSING', id, hours, desc, mult } }
let eventsByDate = {};

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
const deleteEntryBtn = document.getElementById('deleteEntryBtn');

const departmentSelect = document.getElementById('departmentSelect');
const userSelect       = document.getElementById('userSelect');
const myDataCheckbox   = document.getElementById('myDataCheckbox');
const summaryEl        = document.getElementById('summary');
const viewModeSelect   = document.getElementById('viewModeSelect');

let selectedDate = null;
let currentUserId = null;

// ===== Helpers =====
function isoDate(y, m, d) {
  const dt = new Date(y, m - 1, d);
  dt.setMinutes(dt.getMinutes() - dt.getTimezoneOffset());
  return dt.toISOString().split('T')[0];
}

function isWeekend(dateStr) {
  const d = new Date(dateStr);
  const day = d.getDay(); // 0 - Нд, 6 - Сб
  return day === 0 || day === 6;
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
  eventsByDate = {};

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
    const item = {
      type: 'OVERTIME',
      desc: o.description,
      hours: o.overtimeHours,
      mult: o.multiplier,
      id: o.id
    };
    map[key] = item;
    eventsByDate[key] = item;

    if (o.multiplier == 1) overtimeX1 += o.overtimeHours;
    else if (o.multiplier == 1.5) overtimeX15 += o.overtimeHours;
    else if (o.multiplier == 2) overtimeX2 += o.overtimeHours;
  });

  missingData.forEach(m => {
    const key = m.date;
    const item = {
      type: 'MISSING',
      desc: m.reason,
      hours: m.missingHours,
      id: m.id
    };
    map[key] = item;
    eventsByDate[key] = item;
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
      if (item.type === 'OVERTIME') {
        cell.classList.add('overtime');
      } else if (item.type === 'MISSING') {
        cell.classList.add('missing');
      }

      const badge = document.createElement('div');
      badge.className = 'badge';
      badge.textContent = `${item.hours} год`;
      cell.appendChild(badge);

      if (item.type === 'OVERTIME' && item.mult) {
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
      const existing = eventsByDate[dateStr];
      const btn = document.createElement('div');

      if (existing) {
        btn.className = 'edit-btn';
        btn.textContent = '✏️';
        btn.title = 'Редагувати / змінити подію';
      } else {
        btn.className = 'add-btn';
        btn.textContent = '+';
        btn.title = 'Додати подію';
      }

      btn.onclick = (e) => {
        e.stopPropagation();
        openAddModal(dateStr);
      };
      cell.appendChild(btn);
    }

    calendarEl.appendChild(cell);
  }

  summaryEl.innerHTML = `
    <ul>
      <li>🕓 Overtime ×1: ${overtimeX1} год</li>
      <li>🕓 Overtime ×1.5: ${overtimeX15} год</li>
      <li>🕓 Overtime ×2: ${overtimeX2} год</li>
      <li>😴 Missing: ${missingSum} год</li>
    </ul>
  `;
}

// ===== MODAL ADD / EDIT =====
function openAddModal(dateStr) {
  selectedDate = dateStr;
  addModalDate.textContent = `📅 ${dateStr}`;
  const existing = eventsByDate[dateStr];

  if (existing) {
    if (existing.type === 'OVERTIME') {
      entryType.value = 'overtime';
    } else {
      entryType.value = 'missing';
    }
    entryReason.value = existing.desc || '';
    entryHours.value  = existing.hours ?? '';
    deleteEntryBtn.style.display = 'inline-block';
  } else {
    entryType.value = 'overtime';
    entryReason.value = '';
    entryHours.value  = '';
    deleteEntryBtn.style.display = 'none';
  }

  addModal.classList.remove('hidden');
}

closeAddModal.onclick = () => addModal.classList.add('hidden');
closeModal?.addEventListener('click', () => modal.classList.add('hidden'));

// ===== HTTP HELPERS =====
async function createOvertime(dateStr, hours, reason) {
  const payload = {
    overTimeDateRegistration: dateStr,
    description: reason || 'Overtime',
    overtime_hours: hours
  };

  const res = await fetch(`${API_BASE_URL}/over-time/add`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + token
    },
    body: JSON.stringify(payload)
  });

  if (res.status === 401) {
    alert('⛔ Сесія завершена. Авторизуйтесь знову.');
    window.location.href = '../../html/auth.html';
    return false;
  }

  if (!res.ok) {
    const text = await res.text();
    alert('❌ Не вдалося зберегти overtime: ' + text);
    return false;
  }
  return true;
}

async function updateOvertime(id, dateStr, hours, reason) {
  const payload = {
    id: id,
    description: reason || 'Overtime',
    overtime_hours: hours
  };

  const res = await fetch(`${API_BASE_URL}/over-time/update`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + token
    },
    body: JSON.stringify(payload)
  });

  if (res.status === 401) {
    alert('⛔ Сесія завершена. Авторизуйтесь знову.');
    window.location.href = '../../html/auth.html';
    return false;
  }

  if (!res.ok) {
    const text = await res.text();
    alert('❌ Не вдалося оновити overtime: ' + text);
    return false;
  }
  return true;
}

async function deleteOvertime(id) {
  const res = await fetch(`${API_BASE_URL}/over-time/delete/${id}`, {
    method: 'DELETE',
    headers: {
      'Authorization': 'Bearer ' + token
    }
  });

  if (res.status === 401) {
    alert('⛔ Сесія завершена. Авторизуйтесь знову.');
    window.location.href = '../../html/auth.html';
    return false;
  }

  if (!res.ok) {
    const text = await res.text();
    alert('❌ Не вдалося видалити overtime: ' + text);
    return false;
  }
  return true;
}

async function createMissing(dateStr, hours, reason) {
  const payload = {
    reason: reason || 'Відсутність',
    date: dateStr,
    missingHours: hours
  };

  const res = await fetch(`${API_BASE_URL}/missing-hours/add`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + token
    },
    body: JSON.stringify(payload)
  });

  if (res.status === 401) {
    alert('⛔ Сесія завершена. Авторизуйтесь знову.');
    window.location.href = '../../html/auth.html';
    return false;
  }

  if (!res.ok) {
    const text = await res.text();
    alert('❌ Не вдалося зберегти missing day: ' + text);
    return false;
  }
  return true;
}

async function updateMissing(id, hours, reason) {
  const payload = {
    id: id,
    reason: reason || 'Відсутність',
    missingHours: hours
  };

  const res = await fetch(`${API_BASE_URL}/missing-hours/update`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + token
    },
    body: JSON.stringify(payload)
  });

  if (res.status === 401) {
    alert('⛔ Сесія завершена. Авторизуйтесь знову.');
    window.location.href = '../../html/auth.html';
    return false;
  }

  if (!res.ok) {
    const text = await res.text();
    alert('❌ Не вдалося оновити missing day: ' + text);
    return false;
  }
  return true;
}

async function deleteMissing(id) {
  const res = await fetch(`${API_BASE_URL}/missing-hours/delete/${id}`, {
    method: 'DELETE',
    headers: {
      'Authorization': 'Bearer ' + token
    }
  });

  if (res.status === 401) {
    alert('⛔ Сесія завершена. Авторизуйтесь знову.');
    window.location.href = '../../html/auth.html';
    return false;
  }

  if (!res.ok) {
    const text = await res.text();
    alert('❌ Не вдалося видалити missing day: ' + text);
    return false;
  }
  return true;
}

// ===== SAVE ENTRY =====
saveEntryBtn.onclick = async () => {
  if (!selectedDate) {
    alert('❌ Дата не вибрана');
    return;
  }

  const type   = entryType.value;
  const hours  = parseFloat(entryHours.value);
  const reason = entryReason.value.trim();
  const weekend = isWeekend(selectedDate);
  const existing = eventsByDate[selectedDate] || null;

  if (!hours || hours <= 0) {
    alert('❌ Вкажіть коректну кількість годин!');
    return;
  }

  if (type === 'overtime') {
    const max = weekend ? 8 : 5;
    if (hours > max) {
      alert(`🛑 На цю дату можна не більше ${max} год овертайму.`);
      return;
    }
  }

  if (type === 'missing' && weekend) {
    alert('🛑 Missing day не можна додавати / змінювати у вихідні.');
    return;
  }

  let ok = false;

  if (!existing) {
    if (type === 'overtime') {
      ok = await createOvertime(selectedDate, hours, reason);
    } else {
      ok = await createMissing(selectedDate, hours, reason);
    }
  } else {
    if (existing.type === 'OVERTIME') {
      if (type === 'overtime') {
        ok = await updateOvertime(existing.id, selectedDate, hours, reason);
      } else {
        const delOk = await deleteOvertime(existing.id);
        if (delOk) ok = await createMissing(selectedDate, hours, reason);
      }
    } else if (existing.type === 'MISSING') {
      if (type === 'missing') {
        ok = await updateMissing(existing.id, hours, reason);
      } else {
        const delOk = await deleteMissing(existing.id);
        if (delOk) ok = await createOvertime(selectedDate, hours, reason);
      }
    }
  }

  if (ok) {
    alert('✅ Запис збережено!');
    addModal.classList.add('hidden');
    await loadCalendar(parseInt(yearSelect.value), parseInt(monthSelect.value), currentUserId);
  }
};

// ===== DELETE ENTRY (🗑) =====
deleteEntryBtn.onclick = async () => {
  if (!selectedDate) return;
  const existing = eventsByDate[selectedDate];
  if (!existing) {
    alert('❌ Немає запису для видалення.');
    return;
  }

  if (!confirm('❗ Точно видалити запис на цю дату?')) return;

  let ok = false;
  if (existing.type === 'OVERTIME') {
    ok = await deleteOvertime(existing.id);
  } else if (existing.type === 'MISSING') {
    ok = await deleteMissing(existing.id);
  }

  if (ok) {
    alert('🗑 Запис видалено.');
    addModal.classList.add('hidden');
    await loadCalendar(parseInt(yearSelect.value), parseInt(monthSelect.value), currentUserId);
  }
};

// ===== INIT =====
initYears();
initMonths();
loadDepartments();

monthSelect.addEventListener('change', () =>
  loadCalendar(parseInt(yearSelect.value), parseInt(monthSelect.value), currentUserId)
);
yearSelect.addEventListener('change', () =>
  loadCalendar(parseInt(yearSelect.value), parseInt(monthSelect.value), currentUserId)
);

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

viewModeSelect.addEventListener('change', (e) => {
  const mode = e.target.value;
  if (mode === 'crm') {
    window.location.href = '/html/admin/admin_crm_view.html';
  } else if (mode === 'calendar') {
    window.location.href = '/html/admin/admin_viewList.html';
  }
});
