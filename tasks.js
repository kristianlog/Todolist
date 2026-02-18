// ===== GREENKEEPER - Task Management =====

let tasksData = [];

// --- Load Tasks ---
async function loadTasks() {
  try {
    tasksData = await localDB.getAll('tasks');
  } catch (e) {
    console.warn('Failed to load tasks:', e);
    tasksData = [];
  }
  renderTasks();
}

// --- Render Tasks ---
function renderTasks() {
  var taskList = document.getElementById('taskList');
  var completedList = document.getElementById('completedList');
  var completedSection = document.getElementById('completedSection');

  taskList.innerHTML = '';
  completedList.innerHTML = '';

  var activeTasks = tasksData.filter(function(t) { return !t.completed; });
  var completedTasks = tasksData.filter(function(t) { return t.completed; });

  if (activeTasks.length === 0 && completedTasks.length === 0) {
    taskList.innerHTML =
      '<div class="empty-state">' +
        '<div class="empty-state-icon">📋</div>' +
        '<div class="empty-state-text">' + t('noTasks') + '</div>' +
      '</div>';
  }

  activeTasks.forEach(function(task) {
    taskList.appendChild(createTaskElement(task));
  });

  if (completedTasks.length > 0) {
    completedSection.style.display = 'block';
    completedTasks.forEach(function(task) {
      completedList.appendChild(createTaskElement(task));
    });
  } else {
    completedSection.style.display = 'none';
  }
}

function createTaskElement(task) {
  var el = document.createElement('div');
  el.className = 'task-item' + (task.completed ? ' completed' : '');

  // Checkbox
  var checkbox = document.createElement('div');
  checkbox.className = 'task-checkbox' + (task.completed ? ' checked' : '');
  checkbox.addEventListener('click', function(e) {
    e.stopPropagation();
    toggleTaskComplete(task.id);
  });
  el.appendChild(checkbox);

  // Text
  var text = document.createElement('span');
  text.className = 'task-text';
  text.textContent = task.text;
  el.appendChild(text);

  // Image thumbnail (if present)
  if (task.imageUrl) {
    var thumb = document.createElement('img');
    thumb.className = 'task-image-thumb';
    thumb.src = task.imageUrl;
    thumb.alt = 'photo';
    thumb.addEventListener('click', function(e) {
      e.stopPropagation();
      openImageModal(task.imageUrl);
    });
    el.appendChild(thumb);
  }

  // Actions
  var actions = document.createElement('div');
  actions.className = 'task-actions';

  var editBtn = document.createElement('button');
  editBtn.textContent = '✏️';
  editBtn.title = t('edit');
  editBtn.addEventListener('click', function(e) {
    e.stopPropagation();
    editTask(task.id);
  });
  actions.appendChild(editBtn);

  var deleteBtn = document.createElement('button');
  deleteBtn.textContent = '🗑️';
  deleteBtn.title = t('delete');
  deleteBtn.addEventListener('click', function(e) {
    e.stopPropagation();
    deleteTask(task.id);
  });
  actions.appendChild(deleteBtn);

  el.appendChild(actions);

  return el;
}

// --- Add Task ---
async function addTask() {
  var input = document.getElementById('taskInput');
  var text = input.value.trim();
  if (!text) return;

  var task = {
    text: text,
    completed: false,
    imageUrl: '',
    createdAt: Date.now()
  };

  try {
    var saved = await localDB.add('tasks', task);
    tasksData.unshift(saved);
    renderTasks();
    input.value = '';
  } catch (e) {
    console.error('Add task failed:', e);
    showToast('Error adding task');
  }
}

// --- Toggle Complete ---
async function toggleTaskComplete(id) {
  var task = tasksData.find(function(t) { return t.id === id; });
  if (!task) return;

  task.completed = !task.completed;

  try {
    await localDB.update('tasks', id, { completed: task.completed });
  } catch (e) {
    console.warn('Update failed:', e);
  }

  renderTasks();
}

// --- Edit Task ---
function editTask(id) {
  var task = tasksData.find(function(t) { return t.id === id; });
  if (!task) return;

  var newText = prompt(t('edit'), task.text);
  if (newText === null || newText.trim() === '') return;

  task.text = newText.trim();

  localDB.update('tasks', id, { text: task.text }).catch(function(e) {
    console.warn('Edit failed:', e);
  });

  renderTasks();
}

// --- Delete Task ---
async function deleteTask(id) {
  if (!confirm(t('deleteConfirm'))) return;

  try {
    await localDB.remove('tasks', id);
    tasksData = tasksData.filter(function(t) { return t.id !== id; });
    renderTasks();
  } catch (e) {
    console.error('Delete failed:', e);
  }
}
