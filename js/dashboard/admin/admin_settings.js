const API_BASE_URL = 'http://3.66.197.165:8080/api';
const token = localStorage.getItem('token');

if (!token) {
    alert('⛔ Ви не авторизовані!');
    window.location.href = '../../html/auth.html';
}

// ✅ РОЗБЛОКУВАННЯ ПОЛЯ
function enableEdit(fieldId) {
    const input = document.getElementById(fieldId);
    input.disabled = false;
    input.focus();
}

// ✅ LOGOUT
function logout() {
    localStorage.removeItem('token');
    alert('Вийшли успішно!');
    window.location.href = '../../html/auth.html';
}

// ✅ ЗАВАНТАЖЕННЯ ДАНИХ КОРИСТУВАЧА
async function loadUserInfo() {
    try {
        const resp = await fetch(`${API_BASE_URL}/user/getOwn`, {
            headers: { 'Authorization': 'Bearer ' + token }
        });

        const data = await resp.json();

        document.getElementById('firstName').value = data.firstName || '';
        document.getElementById('lastName').value = data.lastName || '';
        document.getElementById('phoneNumber').value = data.phoneNumber || '';
        document.getElementById('userEmail').textContent = data.email;

    } catch (err) {
        console.error(err);
        alert('❌ Не вдалося завантажити дані користувача');
    }
}

// ✅ ОНОВЛЕННЯ ДАНИХ
async function updateUserCard(event) {
    event.preventDefault();

    const dto = {
        firstName: document.getElementById('firstName').value.trim(),
        lastName: document.getElementById('lastName').value.trim(),
        phoneNumber: document.getElementById('phoneNumber').value.trim()
    };

    try {
        const resp = await fetch(`${API_BASE_URL}/user/update-card`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token
            },
            body: JSON.stringify(dto)
        });

        const msg = await resp.text();

        if (!resp.ok) {
            alert('❌ ' + msg);
            return;
        }

        alert('✅ ' + msg);

        // 🔒 знову блокуємо поля після збереження
        document.getElementById('firstName').disabled = true;
        document.getElementById('lastName').disabled = true;
        document.getElementById('phoneNumber').disabled = true;

    } catch (err) {
        console.error(err);
        alert('❌ Помилка при оновленні профілю');
    }
}

// ✅ ЗМІНА ПАРОЛЮ
async function updatePassword(event) {
    event.preventDefault();

    const dto = {
        currentPassword: document.getElementById('currentPassword').value,
        newPassword: document.getElementById('newPassword').value,
        repeatPassword: document.getElementById('repeatPassword').value
    };

    if (dto.newPassword !== dto.repeatPassword) {
        alert('❌ Паролі не співпадають');
        return;
    }

    try {
        const resp = await fetch(`${API_BASE_URL}/user/update-pass`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token
            },
            body: JSON.stringify(dto)
        });

        const msg = await resp.text();

        if (!resp.ok) {
            alert('❌ ' + msg);
            return;
        }

        alert('✅ ' + msg);
        document.getElementById('passwordForm').reset();

    } catch (err) {
        console.error(err);
        alert('❌ Помилка при зміні паролю');
    }
}

// ✅ АВТОЗАВАНТАЖЕННЯ
document.addEventListener('DOMContentLoaded', loadUserInfo);
