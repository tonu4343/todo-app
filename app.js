const STORAGE_KEY = "my-todo-app-tasks";
const THEME_KEY = "my-todo-app-theme";

const form = document.querySelector("#task-form");
const taskInput = document.querySelector("#task-input");
const prioritySelect = document.querySelector("#priority-select");
const categorySelect = document.querySelector("#category-select");
const dueDateInput = document.querySelector("#due-date-input");
const submitButton = document.querySelector(".primary-button");
const searchInput = document.querySelector("#search-input");
const themeToggle = document.querySelector("#theme-toggle");
const startButton = document.querySelector("#start-button");
const clearCompletedButton = document.querySelector("#clear-completed");
const taskList = document.querySelector("#task-list");
const emptyMessage = document.querySelector("#empty-message");
const appTitle = document.querySelector("#app-title");
const remainingCount = document.querySelector("#remaining-count");
const todayCount = document.querySelector("#today-count");
const upcomingCount = document.querySelector("#upcoming-count");
const completedCount = document.querySelector("#completed-count");
const filterButtons = document.querySelectorAll(".filter-button");
const template = document.querySelector("#task-template");

let tasks = loadTasks();
let currentFilter = "today";
let editingTaskId = null;

applySavedTheme();
renderTasks();

if (window.location.hash === "#task-input") {
  history.replaceState(null, "", window.location.pathname);
  window.scrollTo({ top: 0, left: 0 });
}

startButton.addEventListener("click", () => {
  taskInput.scrollIntoView({ behavior: "smooth", block: "center" });
  taskInput.focus({ preventScroll: true });
});

form.addEventListener("submit", (event) => {
  event.preventDefault();

  const title = taskInput.value.trim();

  if (!title) {
    return;
  }

  if (editingTaskId) {
    tasks = tasks.map((task) => {
      if (task.id !== editingTaskId) {
        return task;
      }

      return {
        ...task,
        title,
        priority: prioritySelect.value,
        category: categorySelect.value,
        dueDate: dueDateInput.value || getTodayValue()
      };
    });
  } else {
    tasks.unshift({
      id: crypto.randomUUID(),
      title,
      priority: prioritySelect.value,
      category: categorySelect.value,
      dueDate: dueDateInput.value || getTodayValue(),
      completed: false,
      createdAt: Date.now()
    });
  }

  resetForm();
  saveTasks();
  renderTasks();
  taskInput.focus();
});

filterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    currentFilter = button.dataset.filter;

    filterButtons.forEach((item) => {
      item.classList.toggle("active", item === button);
    });

    renderTasks();
  });
});

searchInput.addEventListener("input", renderTasks);

themeToggle.addEventListener("click", () => {
  const isDark = document.body.classList.toggle("dark-mode");
  localStorage.setItem(THEME_KEY, isDark ? "dark" : "light");
  themeToggle.textContent = isDark ? "\u65e5" : "\u6708";
});

clearCompletedButton.addEventListener("click", () => {
  tasks = tasks.filter((task) => !task.completed);
  resetForm();
  saveTasks();
  renderTasks();
});

function renderTasks() {
  taskList.innerHTML = "";

  const query = searchInput.value.trim().toLowerCase();
  const visibleTasks = tasks.filter((task) => {
    const matchesSearch = task.title.toLowerCase().includes(query);
    const matchesFilter = matchesCurrentView(task);

    return matchesSearch && matchesFilter;
  }).sort(sortTasksForView);

  visibleTasks.forEach((task) => {
    const item = template.content.firstElementChild.cloneNode(true);
    const checkbox = item.querySelector("input");
    const title = item.querySelector(".task-title");
    const priority = item.querySelector(".priority-pill");
    const category = item.querySelector(".category-pill");
    const dueDate = item.querySelector(".due-date");
    const editButton = item.querySelector(".edit-button");
    const deleteButton = item.querySelector(".icon-button");

    checkbox.checked = task.completed;
    title.textContent = task.title;
    priority.textContent = getPriorityLabel(task.priority);
    priority.classList.add(task.priority);
    category.textContent = getCategoryLabel(task.category);
    category.classList.add(task.category || "work");
    dueDate.textContent = formatDueDate(task.dueDate);
    dueDate.hidden = !task.dueDate;
    item.classList.toggle("completed", task.completed);
    item.classList.toggle("due-soon", isDueSoon(task.dueDate) && !task.completed);

    checkbox.addEventListener("change", () => {
      task.completed = checkbox.checked;
      saveTasks();
      renderTasks();
    });

    editButton.addEventListener("click", () => {
      editingTaskId = task.id;
      taskInput.value = task.title;
      prioritySelect.value = task.priority || "normal";
      categorySelect.value = task.category || "work";
      dueDateInput.value = task.dueDate || "";
      submitButton.textContent = "OK";
      submitButton.setAttribute("aria-label", "\u30bf\u30b9\u30af\u3092\u4fdd\u5b58");
      taskInput.focus();
    });

    deleteButton.addEventListener("click", () => {
      tasks = tasks.filter((itemTask) => itemTask.id !== task.id);

      if (editingTaskId === task.id) {
        resetForm();
      }

      saveTasks();
      renderTasks();
    });

    taskList.append(item);
  });

  updateCounts();
  updateViewHeading();
  updateEmptyMessage(visibleTasks.length);
  clearCompletedButton.disabled = tasks.every((task) => !task.completed);
}

function updateCounts() {
  const today = tasks.filter((task) => matchesToday(task)).length;
  const upcoming = tasks.filter((task) => matchesUpcoming(task)).length;
  const completed = tasks.filter((task) => task.completed).length;
  const remaining = currentFilter === "completed"
    ? completed
    : tasks.filter((task) => !task.completed).length;

  remainingCount.textContent = remaining;
  todayCount.textContent = today;
  upcomingCount.textContent = upcoming;
  completedCount.textContent = completed;
}

function updateViewHeading() {
  const titles = {
    today: "\u4eca\u65e5\u306e\u30bf\u30b9\u30af",
    upcoming: "\u4e88\u5b9a\u306e\u30bf\u30b9\u30af",
    completed: "\u5b8c\u4e86\u3057\u305f\u30bf\u30b9\u30af"
  };

  appTitle.textContent = titles[currentFilter] || titles.today;
}

function updateEmptyMessage(visibleCount) {
  const messages = {
    today: "\u4eca\u65e5\u306e\u30bf\u30b9\u30af\u306f\u307e\u3060\u3042\u308a\u307e\u305b\u3093\u3002\u4e0a\u304b\u3089\u8ffd\u52a0\u3057\u307e\u3057\u3087\u3046\u3002",
    upcoming: "\u4e88\u5b9a\u3055\u308c\u305f\u30bf\u30b9\u30af\u306f\u307e\u3060\u3042\u308a\u307e\u305b\u3093\u3002\u7de0\u5207\u65e5\u3092\u5165\u308c\u3066\u8ffd\u52a0\u3057\u307e\u3057\u3087\u3046\u3002",
    completed: "\u5b8c\u4e86\u3057\u305f\u30bf\u30b9\u30af\u306f\u307e\u3060\u3042\u308a\u307e\u305b\u3093\u3002"
  };

  emptyMessage.textContent = messages[currentFilter] || messages.today;
  emptyMessage.hidden = visibleCount > 0;
}

function matchesCurrentView(task) {
  if (currentFilter === "completed") {
    return task.completed;
  }

  if (currentFilter === "upcoming") {
    return matchesUpcoming(task);
  }

  return matchesToday(task);
}

function matchesToday(task) {
  return !task.completed && task.dueDate === getTodayValue();
}

function matchesUpcoming(task) {
  if (task.completed || !task.dueDate) {
    return false;
  }

  return task.dueDate > getTodayValue();
}

function sortTasksForView(firstTask, secondTask) {
  if (currentFilter === "upcoming") {
    return firstTask.dueDate.localeCompare(secondTask.dueDate);
  }

  return (secondTask.createdAt || 0) - (firstTask.createdAt || 0);
}

function getTodayValue() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function resetForm() {
  editingTaskId = null;
  taskInput.value = "";
  prioritySelect.value = "normal";
  categorySelect.value = "work";
  dueDateInput.value = "";
  submitButton.textContent = "+";
  submitButton.setAttribute("aria-label", "\u30bf\u30b9\u30af\u3092\u8ffd\u52a0");
}

function loadTasks() {
  const savedTasks = localStorage.getItem(STORAGE_KEY);

  if (!savedTasks) {
    return [];
  }

  try {
    return JSON.parse(savedTasks).map((task) => ({
      ...task,
      dueDate: task.dueDate || getTodayValue()
    }));
  } catch {
    return [];
  }
}

function saveTasks() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

function applySavedTheme() {
  const savedTheme = localStorage.getItem(THEME_KEY);

  if (savedTheme === "dark") {
    document.body.classList.add("dark-mode");
    themeToggle.textContent = "\u65e5";
  }
}

function formatDueDate(dateValue) {
  if (!dateValue) {
    return "";
  }

  const date = new Date(`${dateValue}T00:00:00`);

  return date.toLocaleDateString("ja-JP", {
    month: "short",
    day: "numeric"
  });
}

function isDueSoon(dateValue) {
  if (!dateValue) {
    return false;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const dueDate = new Date(`${dateValue}T00:00:00`);
  const diffDays = Math.ceil((dueDate - today) / 86400000);

  return diffDays >= 0 && diffDays <= 1;
}

function getPriorityLabel(priority) {
  const labels = {
    normal: "\u901a\u5e38",
    high: "\u9ad8",
    low: "\u4f4e"
  };

  return labels[priority] || labels.normal;
}

function getCategoryLabel(category) {
  const labels = {
    work: "\u4ed5\u4e8b",
    study: "\u52c9\u5f37",
    personal: "\u500b\u4eba"
  };

  return labels[category] || labels.work;
}
