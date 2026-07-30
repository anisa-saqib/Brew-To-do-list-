/* script.js */
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  BREW · COFFEE TODO – MAIN APP
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  STATE
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
let todos = [];
let currentFilter = 'all';
let editingId = null;
let dragSourceId = null;
let dragTargetId = null;
let currentYear = new Date().getFullYear();
let currentMonth = new Date().getMonth();

// DOM refs
const todoList = document.getElementById('todoList');
const todoInput = document.getElementById('todoInput');
const prioritySelect = document.getElementById('prioritySelect');
const dueDateInput = document.getElementById('dueDateInput');
const addForm = document.getElementById('addForm');
const filterBtns = document.querySelectorAll('#filters button');
const totalCount = document.getElementById('totalCount');
const activeCount = document.getElementById('activeCount');
const completedCount = document.getElementById('completedCount');
const clearCompletedBtn = document.getElementById('clearCompleted');
const themeToggle = document.getElementById('themeToggle');
const toastContainer = document.getElementById('toastContainer');
const calendarGrid = document.getElementById('calendarGrid');
const monthLabel = document.getElementById('monthLabel');
const prevMonthBtn = document.getElementById('prevMonthBtn');
const nextMonthBtn = document.getElementById('nextMonthBtn');
const todayBtn = document.getElementById('todayBtn');
const statsBar = document.getElementById('statsBar');
const motivationText = document.getElementById('motivationText');
const greeting = document.getElementById('greeting');
const celebrationContainer = document.getElementById('celebrationContainer');
const addBtn = document.getElementById('addBtn');

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  UTILITIES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function getGreeting() {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning ☀️';
    if (hour < 17) return 'Good afternoon 🌤️';
    return 'Good evening 🌙';
}

function getMotivation(count) {
    if (count === 0) return '☕ Time to brew some tasks';
    if (count < 3) return '🌱 Starting strong!';
    if (count < 6) return '🔥 You\'re on fire!';
    if (count < 10) return '💪 Crushing it!';
    return '🚀 Legendary productivity!';
}

function celebrateTask() {
    const emojis = ['🎉','✨','☕','🎊','🌟','💪','🔥','🚀','⭐','🌈'];
    const container = celebrationContainer;
    for (let i = 0; i < 12; i++) {
        const el = document.createElement('div');
        el.className = 'celebrating-emoji';
        el.textContent = emojis[Math.floor(Math.random() * emojis.length)];
        el.style.left = (10 + Math.random() * 80) + '%';
        el.style.top = (10 + Math.random() * 80) + '%';
        el.style.animationDelay = (Math.random() * 0.4) + 's';
        el.style.fontSize = (20 + Math.random() * 24) + 'px';
        container.appendChild(el);
        setTimeout(() => el.remove(), 1800);
    }
}

function createRipple(e) {
    const btn = e.currentTarget;
    const rect = btn.getBoundingClientRect();
    const ripple = document.createElement('span');
    ripple.className = 'ripple';
    const size = Math.max(rect.width, rect.height);
    ripple.style.width = ripple.style.height = size + 'px';
    ripple.style.left = (e.clientX - rect.left - size/2) + 'px';
    ripple.style.top = (e.clientY - rect.top - size/2) + 'px';
    btn.appendChild(ripple);
    setTimeout(() => ripple.remove(), 600);
}

function formatDate(dateStr) {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  STORAGE
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function loadTodos() {
    try {
        const raw = localStorage.getItem('flow_todos');
        if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) todos = parsed;
        }
    } catch (_) { todos = []; }
}

function saveTodos() {
    localStorage.setItem('flow_todos', JSON.stringify(todos));
}

function loadTheme() {
    const stored = localStorage.getItem('flow_theme');
    if (stored === 'light') {
        document.documentElement.setAttribute('data-theme', 'light');
        themeToggle.textContent = '🌙';
    } else {
        document.documentElement.setAttribute('data-theme', 'dark');
        themeToggle.textContent = '☀️';
    }
}

function saveTheme(theme) {
    localStorage.setItem('flow_theme', theme);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  TOAST
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function showToast(message, type = 'info') {
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    const icon = type === 'error' ? '✕' : type === 'success' ? '✓' : '•';
    el.innerHTML = `<span>${icon}</span> ${message}`;
    toastContainer.appendChild(el);
    setTimeout(() => {
        el.classList.add('out');
        setTimeout(() => el.remove(), 350);
    }, 3000);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  RENDER CALENDAR – FIXED TIMEZONE
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function renderCalendar() {
    const firstDay = new Date(currentYear, currentMonth, 1).getDay();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const daysInPrev = new Date(currentYear, currentMonth, 0).getDate();

    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;

    const weekDays = ['Su','Mo','Tu','We','Th','Fr','Sa'];

    let html = '';
    const totalCells = Math.ceil((firstDay + daysInMonth) / 7) * 7;
    for (let i = 0; i < totalCells; i++) {
        let day, isOtherMonth = false;
        if (i < firstDay) {
            day = daysInPrev - firstDay + i + 1;
            isOtherMonth = true;
        } else if (i >= firstDay + daysInMonth) {
            day = i - (firstDay + daysInMonth) + 1;
            isOtherMonth = true;
        } else {
            day = i - firstDay + 1;
        }

        // Build date string manually (local time)
        const dateStr = `${currentYear}-${String(currentMonth+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
        const dow = weekDays[new Date(currentYear, currentMonth, day).getDay()];
        const isToday = (dateStr === todayStr);

        const tasksDue = todos.filter(t => t.dueDate === dateStr);
        let tasksHtml = '';
        if (tasksDue.length > 0) {
            const maxShow = 3;
            const shown = tasksDue.slice(0, maxShow);
            shown.forEach(task => {
                tasksHtml += `<div class="sticky-note" title="${escapeHtml(task.title)}">${escapeHtml(task.title)}</div>`;
            });
            if (tasksDue.length > maxShow) {
                tasksHtml += `<div class="sticky-note more">+${tasksDue.length - maxShow}</div>`;
            }
        }

        const classNames = `day-cell${isOtherMonth ? ' empty' : ''}${isToday ? ' today' : ''}`;
        html += `<div class="${classNames}" data-date="${dateStr}">
            <div class="date-num">
                <span>${day}</span>
                <span class="dow">${dow}</span>
            </div>
            <div class="task-container">${tasksHtml}</div>
        </div>`;
    }
    calendarGrid.innerHTML = html;

    const monthNames = ['January','February','March','April','May','June',
        'July','August','September','October','November','December'];
    monthLabel.textContent = `${monthNames[currentMonth]} ${currentYear}`;

    // Click on day -> show tasks
    document.querySelectorAll('.day-cell').forEach(cell => {
        cell.addEventListener('click', () => {
            const date = cell.dataset.date;
            if (date) {
                const filtered = todos.filter(t => t.dueDate === date);
                if (filtered.length > 0) {
                    showToast(`📅 ${filtered.length} task(s) due on ${date}`, 'info');
                } else {
                    showToast('No tasks due on this day', 'info');
                }
            }
        });
    });
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  RENDER TODO LIST
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function renderTodoList() {
    const filtered = getFilteredTodos();
    const isEditing = editingId !== null;

    if (filtered.length === 0) {
        const msg = currentFilter === 'all' ? 'Your cup is empty. Time to brew some tasks!' :
            currentFilter === 'active' ? 'All caught up! 🎉' : 'No completed tasks yet.';
        todoList.innerHTML = `
            <div class="empty-state">
                <span class="emoji">☕</span>
                <h3>${currentFilter === 'all' ? 'Ready to brew?' : ''}</h3>
                <p>${msg}</p>
            </div>
        `;
    } else {
        todoList.innerHTML = filtered.map((todo, index) => {
            const isEditingThis = isEditing && editingId === todo.id;
            const checked = todo.completed ? 'checked' : '';
            const titleClass = todo.completed ? 'title done' : 'title';
            const dueClass = getDueClass(todo.dueDate);
            const popDelay = index * 0.05;

            return `
                <li class="todo-item pop" draggable="true" data-id="${todo.id}" style="animation-delay: ${popDelay}s">
                    <span class="drag-handle">⠿</span>
                    <div class="checkbox ${checked}" data-id="${todo.id}"></div>
                    <div class="content">
                        ${isEditingThis ? `
                            <div class="edit-inline">
                                <input type="text" id="editInput" value="${escapeHtml(todo.title)}" />
                                <button class="save-btn" data-id="${todo.id}">Save</button>
                                <button class="cancel-btn" data-id="${todo.id}">Cancel</button>
                            </div>
                        ` : `
                            <div class="${titleClass}">${escapeHtml(todo.title)}</div>
                            <div class="meta">
                                <span class="badge ${todo.priority}">${todo.priority}</span>
                                ${todo.dueDate ? `<span class="due ${dueClass}">📅 ${formatDate(todo.dueDate)}</span>` : ''}
                            </div>
                        `}
                    </div>
                    <div class="item-actions">
                        ${!isEditingThis ? `<button class="edit-btn" data-id="${todo.id}" title="Edit">✎</button>` : ''}
                        <button class="postpone-btn" data-id="${todo.id}" title="☕ Snooze +1 day">⏩</button>
                        <button class="delete-btn" data-id="${todo.id}" title="Delete">✕</button>
                    </div>
                </li>
            `;
        }).join('');
    }
    updateStats();
    attachListEventListeners();
}

function getFilteredTodos() {
    if (currentFilter === 'all') return todos;
    if (currentFilter === 'active') return todos.filter(t => !t.completed);
    if (currentFilter === 'completed') return todos.filter(t => t.completed);
    return todos;
}

function getDueClass(dueDate) {
    if (!dueDate) return '';
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
    if (dueDate < todayStr) return 'overdue';
    return '';
}

function updateStats() {
    const total = todos.length;
    const active = todos.filter(t => !t.completed).length;
    const completed = todos.filter(t => t.completed).length;
    totalCount.textContent = total;
    activeCount.textContent = active;
    completedCount.textContent = completed;

    const progress = total > 0 ? (completed / total) * 100 : 0;
    statsBar.style.setProperty('--progress', progress + '%');
    if (total > 0) statsBar.classList.add('has-tasks');
    else statsBar.classList.remove('has-tasks');

    motivationText.textContent = getMotivation(active);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  EVENT LISTENERS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function attachListEventListeners() {
    document.querySelectorAll('.checkbox').forEach(el => {
        el.removeEventListener('click', handleCheckbox);
        el.addEventListener('click', handleCheckbox);
    });
    document.querySelectorAll('.delete-btn').forEach(el => {
        el.removeEventListener('click', handleDelete);
        el.addEventListener('click', handleDelete);
    });
    document.querySelectorAll('.edit-btn').forEach(el => {
        el.removeEventListener('click', handleEdit);
        el.addEventListener('click', handleEdit);
    });
    document.querySelectorAll('.postpone-btn').forEach(el => {
        el.removeEventListener('click', handlePostpone);
        el.addEventListener('click', handlePostpone);
    });
    document.querySelectorAll('.save-btn').forEach(el => {
        el.removeEventListener('click', handleSave);
        el.addEventListener('click', handleSave);
    });
    document.querySelectorAll('.cancel-btn').forEach(el => {
        el.removeEventListener('click', handleCancel);
        el.addEventListener('click', handleCancel);
    });
    const editInput = document.getElementById('editInput');
    if (editInput) {
        editInput.removeEventListener('keydown', handleEditKeydown);
        editInput.addEventListener('keydown', handleEditKeydown);
        setTimeout(() => editInput.focus(), 20);
    }
    document.querySelectorAll('.todo-item[draggable="true"]').forEach(el => {
        el.removeEventListener('dragstart', handleDragStart);
        el.removeEventListener('dragend', handleDragEnd);
        el.removeEventListener('dragover', handleDragOver);
        el.removeEventListener('dragenter', handleDragEnter);
        el.removeEventListener('dragleave', handleDragLeave);
        el.removeEventListener('drop', handleDrop);
        el.addEventListener('dragstart', handleDragStart);
        el.addEventListener('dragend', handleDragEnd);
        el.addEventListener('dragover', handleDragOver);
        el.addEventListener('dragenter', handleDragEnter);
        el.addEventListener('dragleave', handleDragLeave);
        el.addEventListener('drop', handleDrop);
    });
}

// ─── Handlers ───
function handleCheckbox(e) {
    const id = Number(e.currentTarget.dataset.id);
    const todo = todos.find(t => t.id === id);
    if (!todo) return;
    todo.completed = !todo.completed;
    saveTodos();
    renderAll();
    if (todo.completed) {
        celebrateTask();
        showToast('🎉 Task completed!', 'success');
    } else {
        showToast('Reopened', 'info');
    }
}

function handleDelete(e) {
    const id = Number(e.currentTarget.dataset.id);
    if (!confirm('Delete this task?')) return;
    todos = todos.filter(t => t.id !== id);
    if (editingId === id) editingId = null;
    saveTodos();
    renderAll();
    showToast('Task deleted', 'error');
}

function handleEdit(e) {
    const id = Number(e.currentTarget.dataset.id);
    editingId = id;
    renderAll();
}

function handleSave(e) {
    const id = Number(e.currentTarget.dataset.id);
    const input = document.getElementById('editInput');
    if (!input) return;
    const newTitle = input.value.trim();
    if (!newTitle) {
        showToast('Title cannot be empty', 'error');
        return;
    }
    const todo = todos.find(t => t.id === id);
    if (todo) {
        todo.title = newTitle;
        saveTodos();
    }
    editingId = null;
    renderAll();
    showToast('Task updated', 'success');
}

function handleCancel(e) {
    editingId = null;
    renderAll();
}

function handleEditKeydown(e) {
    if (e.key === 'Enter') {
        const saveBtn = document.querySelector('.save-btn');
        if (saveBtn) saveBtn.click();
    } else if (e.key === 'Escape') {
        const cancelBtn = document.querySelector('.cancel-btn');
        if (cancelBtn) cancelBtn.click();
    }
}

function handlePostpone(e) {
    const id = Number(e.currentTarget.dataset.id);
    const todo = todos.find(t => t.id === id);
    if (!todo) return;
    if (!todo.dueDate) {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        todo.dueDate = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth()+1).padStart(2,'0')}-${String(tomorrow.getDate()).padStart(2,'0')}`;
    } else {
        const date = new Date(todo.dueDate + 'T00:00:00');
        date.setDate(date.getDate() + 1);
        todo.dueDate = `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
    }
    saveTodos();
    renderAll();
    showToast(`☕ Snoozed to ${formatDate(todo.dueDate)}`, 'success');
}

// ─── Drag & Drop ───
function handleDragStart(e) {
    const id = Number(e.currentTarget.dataset.id);
    dragSourceId = id;
    e.currentTarget.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(id));
}

function handleDragEnd(e) {
    e.currentTarget.classList.remove('dragging');
    document.querySelectorAll('.todo-item.drag-over').forEach(el => el.classList.remove('drag-over'));
    dragSourceId = null;
    dragTargetId = null;
}

function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
}

function handleDragEnter(e) {
    e.preventDefault();
    const target = e.currentTarget;
    const targetId = Number(target.dataset.id);
    if (dragSourceId !== targetId) {
        target.classList.add('drag-over');
        dragTargetId = targetId;
    }
}

function handleDragLeave(e) {
    const target = e.currentTarget;
    target.classList.remove('drag-over');
    if (dragTargetId === Number(target.dataset.id)) dragTargetId = null;
}

function handleDrop(e) {
    e.preventDefault();
    const target = e.currentTarget;
    target.classList.remove('drag-over');
    const sourceId = Number(e.dataTransfer.getData('text/plain'));
    const targetId = Number(target.dataset.id);
    if (sourceId === targetId) return;
    const sourceIndex = todos.findIndex(t => t.id === sourceId);
    const targetIndex = todos.findIndex(t => t.id === targetId);
    if (sourceIndex === -1 || targetIndex === -1) return;
    const [removed] = todos.splice(sourceIndex, 1);
    todos.splice(targetIndex, 0, removed);
    saveTodos();
    renderAll();
    showToast('Task reordered', 'info');
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  ADD TODO
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
addForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const title = todoInput.value.trim();
    if (!title) {
        showToast('Please enter a task', 'error');
        return;
    }
    const priority = prioritySelect.value;
    const dueDate = dueDateInput.value || null;
    const newTodo = {
        id: Date.now(),
        title,
        priority,
        dueDate,
        completed: false,
        createdAt: new Date().toISOString(),
    };
    todos.unshift(newTodo);
    saveTodos();
    todoInput.value = '';
    dueDateInput.value = '';
    prioritySelect.value = 'medium';
    renderAll();
    showToast('☕ Task brewed!', 'success');
    todoInput.focus();
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  FILTERS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        filterBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentFilter = btn.dataset.filter;
        renderAll();
    });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  CLEAR COMPLETED
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
clearCompletedBtn.addEventListener('click', () => {
    const completed = todos.filter(t => t.completed);
    if (completed.length === 0) {
        showToast('No completed tasks', 'info');
        return;
    }
    if (!confirm(`Delete ${completed.length} completed task(s)?`)) return;
    todos = todos.filter(t => !t.completed);
    saveTodos();
    renderAll();
    showToast(`Cleared ${completed.length} task(s)`, 'success');
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  THEME
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
themeToggle.addEventListener('click', () => {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    if (isDark) {
        document.documentElement.setAttribute('data-theme', 'light');
        themeToggle.textContent = '🌙';
        saveTheme('light');
    } else {
        document.documentElement.setAttribute('data-theme', 'dark');
        themeToggle.textContent = '☀️';
        saveTheme('dark');
    }
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  CALENDAR NAV
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function goToMonth(year, month) {
    currentYear = year;
    currentMonth = month;
    renderAll();
}

prevMonthBtn.addEventListener('click', () => {
    let m = currentMonth - 1;
    let y = currentYear;
    if (m < 0) { m = 11; y -= 1; }
    goToMonth(y, m);
});

nextMonthBtn.addEventListener('click', () => {
    let m = currentMonth + 1;
    let y = currentYear;
    if (m > 11) { m = 0; y += 1; }
    goToMonth(y, m);
});

todayBtn.addEventListener('click', () => {
    const today = new Date();
    goToMonth(today.getFullYear(), today.getMonth());
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  RENDER ALL
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function renderAll() {
    renderCalendar();
    renderTodoList();
    greeting.textContent = getGreeting();
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  KEYBOARD SHORTCUTS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        todoInput.focus();
        todoInput.select();
    }
    if (e.key === 'Escape' && editingId !== null) {
        editingId = null;
        renderAll();
    }
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  RIPPLE EFFECT
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
addBtn.addEventListener('click', createRipple);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  INIT
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
loadTheme();
loadTodos();
const tomorrow = new Date();
tomorrow.setDate(tomorrow.getDate() + 1);
dueDateInput.value = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth()+1).padStart(2,'0')}-${String(tomorrow.getDate()).padStart(2,'0')}`;
renderAll();
todoInput.focus();
console.log('☕ Brew ready!');