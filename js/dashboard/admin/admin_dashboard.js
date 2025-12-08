const API_BASE_URL = 'http://localhost:8080/api';

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
