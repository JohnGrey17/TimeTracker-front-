const API_BASE_URL = 'http://3.66.197.165:8080/api'; // поки не використовується, але можна лишити

const token = localStorage.getItem('token') || sessionStorage.getItem('token');
if (!token) {
    alert('⛔ Ви не авторизовані!');
    window.location.href = '../../html/auth.html';
}

function logout() {
    localStorage.removeItem('token');
    sessionStorage.removeItem('token');
    alert('Вийшли успішно!');
    window.location.href = '../../html/auth.html';
}
// Розблокувати поле при натисканні на ✏️
function enableEdit(inputId) {
    const input = document.getElementById(inputId);
    if (!input) return;
    input.disabled = false;
    input.focus();
    input.select();
}

// Поки що просто блочимо submit, щоб не було помилок
function updateUserCard(event) {
    event.preventDefault();
    alert('🔧 Оновлення даних профілю ще не підключене до бекенду.');
}

function updatePassword(event) {
    event.preventDefault();
    alert('🔧 Зміна паролю ще не підключена до бекенду.');
}

function updateEmail(event) {
    event.preventDefault();
    alert('🔧 Зміна email ще не підключена до бекенду.');
}

function updateDepartment(event) {
    event.preventDefault();
    alert('🔧 Зміна департаменту ще не підключена до бекенду.');
}