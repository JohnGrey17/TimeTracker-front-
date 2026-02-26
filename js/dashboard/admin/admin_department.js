const API_BASE_URL = "/api";

function getColorFromId(id) {
    const colors = [
        '#FF9800',
        '#4CAF50',
        '#2196F3',
        '#9C27B0',
        '#F44336',
        '#009688',
        '#3F51B5',
        '#795548',
        '#607D8B',
        '#E91E63'
    ];
    return colors[id % colors.length];
}


// ================= INIT =================
document.addEventListener('DOMContentLoaded', () => {

    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    if (!token) {
        window.location.href = '../../html/auth.html';
        return;
    }

    document.getElementById('newDeptForm')
        ?.addEventListener('submit', createDepartment);

    loadDepartments();
});

// ================= LOAD =================
async function loadDepartments() {

    const token = localStorage.getItem('token') || sessionStorage.getItem('token');

    const resp = await fetch(`${API_BASE_URL}/department/getAll`, {
        headers: { 'Authorization': 'Bearer ' + token }
    });

    if (!resp.ok) {
        alert("Помилка завантаження департаментів");
        return;
    }

    const data = await resp.json();

    // 🔥 сортування по id
    data.sort((a, b) => a.id - b.id);

    renderDepartments(data);
}

// ================= RENDER TREE =================
function renderDepartments(departments) {

    const container = document.getElementById('departmentsList');
    container.innerHTML = '';

    const map = {};

    departments.forEach(dep => {
        map[dep.id] = { ...dep, children: [] };
    });

    const roots = [];

    departments.forEach(dep => {
        if (dep.parentId !== null && dep.parentId !== undefined) {
            map[dep.parentId]?.children.push(map[dep.id]);
        } else {
            roots.push(map[dep.id]);
        }
    });

    roots.forEach(root => {
        container.appendChild(createParentCard(root));
    });
}

// ================= PARENT CARD =================
function createParentCard(dep) {

    const card = document.createElement('div');
    card.className = 'dept-card parent-dept';
    card.style.borderLeft = `6px solid ${getColorFromId(dep.id)}`;

    const header = document.createElement('div');
    header.className = 'dept-header';

    header.innerHTML = `
        <div class="dept-main-info">
            <span class="dept-name">${dep.name}</span>
            <span class="dept-code">Код: ${dep.code}</span>
        </div>
        <div class="dept-actions">
            <button class="gear-btn">⚙</button>
            <button class="dept-toggle">▼</button>
        </div>
    `;

    const body = document.createElement('div');
    body.className = 'dept-body';

    // ===== CHILDREN =====
    if (dep.children.length > 0) {

        const childrenContainer = document.createElement('div');
        childrenContainer.className = 'sub-dept-container';

        dep.children.forEach(child => {

            const row = document.createElement('div');
            row.className = 'sub-dept-row';

            row.innerHTML = `
                <span>${child.name} (код: ${child.code})</span>
                <button class="gear-btn">⚙</button>
            `;

            const childGear = row.querySelector('.gear-btn');

            childGear.onclick = (e) => {
                e.stopPropagation();

                const action = prompt(
                    "1 - Редагувати\n" +
                    "2 - Видалити"
                );

                if (action === '1') {
                    showUpdateForm(child, body);
                }
                if (action === '2') {
                    deleteDepartment(child.id);
                }
            };

            childrenContainer.appendChild(row);
        });

        body.appendChild(childrenContainer);
    }

    // ===== GEAR FOR PARENT =====
    const gearBtn = header.querySelector('.gear-btn');

    gearBtn.onclick = (e) => {
        e.stopPropagation();

        const action = prompt(
            "1 - Додати напрямок\n" +
            "2 - Редагувати\n" +
            "3 - Видалити"
        );

        if (action === '1') {
            createSubDepartment(dep.id);
        }
        if (action === '2') {
            showUpdateForm(dep, body);
        }
        if (action === '3') {
            deleteDepartment(dep.id);
        }
    };

    header.addEventListener('click', () => {
        card.classList.toggle('open');
    });

    card.appendChild(header);
    card.appendChild(body);

    return card;
}

// ================= UPDATE FORM =================
function createUpdateForm(dep) {

    const container = document.createElement('div');
    container.className = 'dept-body-content';

    container.innerHTML = `
        <label>
            Нова назва:
            <input type="text" value="${dep.name}" class="input-name">
        </label>
        <label>
            Новий код:
            <input type="text" value="${dep.code}" class="input-code">
        </label>
        <button class="save-btn">💾 Зберегти</button>
        <div class="status-message"></div>
    `;

    const saveBtn = container.querySelector('.save-btn');
    const statusMsg = container.querySelector('.status-message');

    saveBtn.onclick = async (e) => {
        e.stopPropagation();

        const newName = container.querySelector('.input-name').value.trim();
        const newCode = container.querySelector('.input-code').value.trim();

        await updateDepartment(dep.id, newName, newCode, statusMsg);
    };

    return container;
}

// ================= CREATE ROOT =================
async function createDepartment(event) {

    event.preventDefault();

    const token = localStorage.getItem('token') || sessionStorage.getItem('token');

    const departmentName = document.getElementById('newDeptName').value.trim();
    const departmentCode = document.getElementById('newDeptCode').value.trim();

    if (!departmentName || !departmentCode) {
        alert("Заповніть поля");
        return;
    }

    await fetch(`${API_BASE_URL}/department/create`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + token
        },
        body: JSON.stringify({ departmentName, departmentCode })
    });

    loadDepartments();
}

// ================= CREATE SUB =================
async function createSubDepartment(parentId) {

    const token = localStorage.getItem('token') || sessionStorage.getItem('token');

    const name = prompt("Назва:");
    if (!name) return;

    const code = prompt("Код:");
    if (!code) return;

    const resp = await fetch(`${API_BASE_URL}/department/${parentId}/children`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + token
        },
        body: JSON.stringify({
            name: name,
            code: code
        })
    });

    if (!resp.ok) {
        alert(await resp.text());
        return;
    }

    loadDepartments();
}

// ================= UPDATE =================
async function updateDepartment(id, newName, newCode, statusElement) {

    const token = localStorage.getItem('token') || sessionStorage.getItem('token');

    const resp = await fetch(`${API_BASE_URL}/department/update`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + token
        },
        body: JSON.stringify({
            departmentId: id,
            newDepartmentName: newName,
            newDepartmentCode: newCode
        })
    });

    if (!resp.ok) {
        statusElement.textContent = "❌ Помилка";
        statusElement.style.color = "red";
        return;
    }

    statusElement.textContent = "✅ Збережено";
    statusElement.style.color = "green";

    loadDepartments();
}

// ================= DELETE =================
async function deleteDepartment(id) {

    const token = localStorage.getItem('token') || sessionStorage.getItem('token');

    if (!confirm("Видалити?")) return;

    await fetch(`${API_BASE_URL}/department/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': 'Bearer ' + token }
    });

    loadDepartments();
}

// ================= SHOW UPDATE FORM =================
function showUpdateForm(dep, bodyContainer) {

    bodyContainer.innerHTML = '';

    const form = createUpdateForm(dep);
    bodyContainer.appendChild(form);
}
