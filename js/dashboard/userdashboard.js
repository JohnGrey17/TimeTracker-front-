const API_BASE_URL = 'http://localhost:8080/api';

const token = localStorage.getItem('token') || sessionStorage.getItem('token');
if (!token) {
    alert('⛔ Ви не авторизовані!');
    window.location.href = '../../html/auth.html';
}

// 🔁 toggle
function toggleSection(id) {
    const el = document.getElementById(id);
    el.classList.toggle('show');
}

function setToday(inputId) {
    document.getElementById(inputId).valueAsDate = new Date();
}

function logout() {
    localStorage.removeItem('token');
    sessionStorage.removeItem('token');
    alert('Вийшли успішно!');
    window.location.href = '../../html/auth.html';
}

function submitOvertime() {
    const payload = {
        overTimeDateRegistration: document.getElementById('overtimeDate').value,
        description: document.getElementById('overtimeDesc').value,
        overtime_hours: parseFloat(document.getElementById('overtimeHours').value)
    };

    fetch(`${API_BASE_URL}/over-time/add`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + token
        },
        body: JSON.stringify(payload)
    }).then(resp => {
        if (resp.status === 401) {
            alert('⛔ Сесія завершена. Авторизуйтесь знову.');
            window.location.href = '../../html/auth.html';
            return;
        }
        if (!resp.ok) {
            alert('❌ Не вдалося надіслати запит');
            return;
        }
        alert('✅ OverTime надіслано!');
    }).catch(err => {
        console.error("❌ Error submitting overtime:", err);
        alert('❌ Помилка при надсиланні!');
    });
}

function submitMissing() {
    const payload = {
        reason: document.getElementById('missingReason').value,
        date: document.getElementById('missingDate').value,
        missingHours: parseFloat(document.getElementById('missingHours').value)
    };

    fetch(`${API_BASE_URL}/missing-hours/add`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + token
        },
        body: JSON.stringify(payload)
    }).then(resp => {
        if (resp.status === 401) {
            alert('⛔ Сесія завершена. Авторизуйтесь знову.');
            window.location.href = '../../html/auth.html';
            return;
        }
        if (!resp.ok) {
            alert('❌ Не вдалося надіслати запит');
            return;
        }
        alert('✅ Missing day надіслано!');
    }).catch(err => {
        console.error("❌ Error submitting missing day:", err);
        alert('❌ Помилка при надсиланні!');
    });
}
