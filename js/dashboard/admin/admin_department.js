const API_BASE_URL = '/api';

// ===== DOM READY =====
document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    if (!token) {
        alert('⛔ Ви не авторизовані!');
        window.location.href = '../../html/auth.html';
        return;
    }

    // Підставляємо email, якщо зберігаєш його
    const emailElement = document.getElementById('userEmail');
    if (emailElement) {
        const storedEmail = localStorage.getItem('userEmail') || sessionStorage.getItem('userEmail');
        if (storedEmail) {
            emailElement.textContent = storedEmail;
        }
    }

    // Вішаємо слухач на форму створення департаменту
    const newDeptForm = document.getElementById('newDeptForm');
    if (newDeptForm) {
        newDeptForm.addEventListener('submit', createDepartment);
    } else {
        console.warn('⚠️ Не знайдено форму з id="newDeptForm"');
    }

    // Завантажуємо департаменти при завантаженні сторінки
    loadDepartments();
});

// ===== AUTH / LOGOUT =====

function logout() {
    localStorage.removeItem('token');
    sessionStorage.removeItem('token');
    alert('Вийшли успішно!');
    window.location.href = '../../html/auth.html';
}

// ===== ЗАВАНТАЖЕННЯ ДЕПАРТАМЕНТІВ =====

async function loadDepartments() {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');

    try {
        const resp = await fetch(`${API_BASE_URL}/department/getAll`, {
            headers: {
                'Authorization': 'Bearer ' + token
            }
        });

        if (resp.status === 401) {
            alert('⛔ Сесія завершена. Авторизуйтесь знову.');
            window.location.href = '../../html/auth.html';
            return;
        }

        if (!resp.ok) {
            const txt = await resp.text().catch(() => '');
            console.error('❌ Помилка відповіді бекенду:', resp.status, txt);
            alert('❌ Не вдалося завантажити департаменти');
            return;
        }

        const data = await resp.json(); // List<DepartmentResponseDto>
        renderDepartments(data);
    } catch (err) {
        console.error('❌ Error loading departments:', err);
        alert('❌ Сталася помилка при завантаженні департаментів');
    }
}

function renderDepartments(departments) {
    const container = document.getElementById('departmentsList');
    if (!container) {
        console.error('❌ Не знайдено контейнер з id="departmentsList"');
        return;
    }

    container.innerHTML = '';

    if (!departments || departments.length === 0) {
        container.textContent = 'Департаментів поки немає.';
        return;
    }

    departments.forEach(dep => {
        const card = document.createElement('div');
        card.className = 'dept-card';

        // ===== HEADER =====
        const header = document.createElement('div');
        header.className = 'dept-header';

        const mainInfo = document.createElement('div');
        mainInfo.className = 'dept-main-info';

        const nameEl = document.createElement('span');
        nameEl.className = 'dept-name';
        nameEl.textContent = dep.name;

        const codeEl = document.createElement('span');
        codeEl.className = 'dept-code';
        codeEl.textContent = `Код: ${dep.code}`;

        mainInfo.appendChild(nameEl);
        mainInfo.appendChild(codeEl);

        const toggleBtn = document.createElement('button');
        toggleBtn.className = 'dept-toggle';
        toggleBtn.textContent = '▼';

        header.appendChild(mainInfo);
        header.appendChild(toggleBtn);

        // ===== BODY =====
        const body = document.createElement('div');
        body.className = 'dept-body';

        const bodyContent = document.createElement('div');
        bodyContent.className = 'dept-body-content';

        bodyContent.innerHTML = `
            <p><strong>ID:</strong> ${dep.id}</p>
            <label>
                Нова назва:
                <input type="text" value="${dep.name}" class="input-name">
            </label>
            <label>
                Новий код:
                <input type="text" value="${dep.code}" class="input-code">
            </label>
        `;

        const saveBtn = document.createElement('button');
        saveBtn.textContent = '💾 Зберегти зміни';

        const statusMsg = document.createElement('div');
        statusMsg.className = 'status-message';

        saveBtn.addEventListener('click', async (e) => {
            e.stopPropagation(); // щоб клік по кнопці не згортав картку

            const newName = bodyContent.querySelector('.input-name').value.trim();
            const newCode = bodyContent.querySelector('.input-code').value.trim();

            if (!newName || !newCode) {
                alert('Будь ласка, заповніть назву та код.');
                return;
            }

            await updateDepartment(dep.id, newName, newCode, statusMsg);
        });

        bodyContent.appendChild(saveBtn);
        bodyContent.appendChild(statusMsg);
        body.appendChild(bodyContent);

        // ===== TOGGLE OPEN/CLOSE =====
        header.addEventListener('click', () => {
            const isOpen = card.classList.contains('open');
            // Закриваємо інші, якщо хочеш, щоб відкривався тільки один
            document
                .querySelectorAll('.dept-card.open')
                .forEach(c => c.classList.remove('open'));
            if (!isOpen) {
                card.classList.add('open');
            }
        });

        card.appendChild(header);
        card.appendChild(body);
        container.appendChild(card);
    });
}

// ===== СТВОРЕННЯ НОВОГО ДЕПАРТАМЕНТУ =====

async function createDepartment(event) {
    event.preventDefault();

    const token = localStorage.getItem('token') || sessionStorage.getItem('token');

    const nameInput = document.getElementById('newDeptName');
    const codeInput = document.getElementById('newDeptCode');

    if (!nameInput || !codeInput) {
        alert('Не знайдено поля newDeptName / newDeptCode в DOM');
        return;
    }

    const departmentName = nameInput.value.trim();
    const departmentCode = codeInput.value.trim();

    if (!departmentName || !departmentCode) {
        alert('Будь ласка, заповніть назву та код департаменту.');
        return;
    }

    const payload = { departmentName, departmentCode };

    try {
        const resp = await fetch(`${API_BASE_URL}/department/create`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token
            },
            body: JSON.stringify(payload)
        });

        if (resp.status === 401) {
            alert('⛔ Сесія завершена. Авторизуйтесь знову.');
            window.location.href = '../../html/auth.html';
            return;
        }

        const text = await resp.text();

        if (!resp.ok) {
            alert('❌ Не вдалося створити департамент. Відповідь: ' + text);
            return;
        }

        alert('✅ Новий департамент успішно створено!');
        nameInput.value = '';
        codeInput.value = '';
        await loadDepartments();
    } catch (err) {
        console.error('❌ Error creating department:', err);
        alert('❌ Сталася помилка при створенні департаменту');
    }
}

// ===== ОНОВЛЕННЯ ДЕПАРТАМЕНТУ =====

async function updateDepartment(id, newName, newCode, statusElement) {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');

    const payload = {
        departmentId: id,
        newDepartmentName: newName,
        newDepartmentCode: newCode
    };

    try {
        const resp = await fetch(`${API_BASE_URL}/department/update`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token
            },
            body: JSON.stringify(payload)
        });

        if (resp.status === 401) {
            alert('⛔ Сесія завершена. Авторизуйтесь знову.');
            window.location.href = '../../html/auth.html';
            return;
        }

        const text = await resp.text();

        if (!resp.ok) {
            statusElement.textContent = '❌ ' + text;
            statusElement.style.color = 'red';
            return;
        }

        statusElement.textContent = '✅ Зміни збережено';
        statusElement.style.color = 'green';

        // Оновлюємо список, щоб побачити актуальні дані
        await loadDepartments();
    } catch (err) {
        console.error('❌ Error updating department:', err);
        statusElement.textContent = '❌ Помилка при оновленні';
        statusElement.style.color = 'red';
    }
}
