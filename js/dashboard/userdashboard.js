const API_BASE_URL = 'http://localhost:8080/api';

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
    console.log("Overtime payload:", payload);
    fetch(`${API_BASE_URL}/over-time/add`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + localStorage.getItem('token')
        },
        body: JSON.stringify(payload)
    }).then(resp => {
        console.log("Response:", resp);
        alert('Overtime submitted!');
    }).catch(err => {
        console.error("❌ Error submitting overtime:", err);
        alert('Помилка при надсиланні!');
    });
}

function submitMissing() {
    const payload = {
        reason: document.getElementById('missingReason').value,
        date: document.getElementById('missingDate').value,
        missingHours: parseFloat(document.getElementById('missingHours').value)
    };
    console.log("Missing payload:", payload);
    fetch(`${API_BASE_URL}/missing-hours/add`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + localStorage.getItem('token')
        },
        body: JSON.stringify(payload)
    }).then(resp => {
        console.log("Response:", resp);
        alert('Missing day submitted!');
    }).catch(err => {
        console.error("❌ Error submitting missing day:", err);
        alert('Помилка при надсиланні!');
    });
}
