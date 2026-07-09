const MONTHS_IT = ["Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno", "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"];

let periodType = "month";
let periodAnchor = startOfDay(new Date());
let editingMovementId = null;
let formType = "uscita";
let statsToggleType = "uscita";

function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDay(date) {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

function startOfWeek(date) {
  const d = startOfDay(date);
  const diff = (d.getDay() + 6) % 7; // Monday = 0
  d.setDate(d.getDate() - diff);
  return d;
}

function toISODate(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function getPeriodBounds(type, anchor) {
  if (type === "day") {
    return { start: startOfDay(anchor), end: endOfDay(anchor) };
  }
  if (type === "week") {
    const start = startOfWeek(anchor);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    return { start, end: endOfDay(end) };
  }
  if (type === "month") {
    const start = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
    const end = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0);
    return { start, end: endOfDay(end) };
  }
  // year
  const start = new Date(anchor.getFullYear(), 0, 1);
  const end = new Date(anchor.getFullYear(), 11, 31);
  return { start, end: endOfDay(end) };
}

function getPeriodLabel(type, anchor) {
  if (type === "day") {
    return anchor.toLocaleDateString("it-IT", { day: "numeric", month: "short", year: "numeric" });
  }
  if (type === "week") {
    const { start, end } = getPeriodBounds(type, anchor);
    const fmt = (d) => d.toLocaleDateString("it-IT", { day: "numeric", month: "short" });
    return `${fmt(start)} – ${fmt(end)} ${end.getFullYear()}`;
  }
  if (type === "month") {
    return `${MONTHS_IT[anchor.getMonth()]} ${anchor.getFullYear()}`;
  }
  return `${anchor.getFullYear()}`;
}

function shiftPeriod(direction) {
  const d = new Date(periodAnchor);
  if (periodType === "day") d.setDate(d.getDate() + direction);
  else if (periodType === "week") d.setDate(d.getDate() + 7 * direction);
  else if (periodType === "month") d.setMonth(d.getMonth() + direction);
  else d.setFullYear(d.getFullYear() + direction);
  periodAnchor = startOfDay(d);
  renderAll();
}

function getFilteredMovements() {
  const { start, end } = getPeriodBounds(periodType, periodAnchor);
  return Store.getMovements().filter((m) => {
    const d = new Date(m.date + "T12:00:00");
    return d >= start && d <= end;
  });
}

function renderAll() {
  document.getElementById("periodLabel").textContent = getPeriodLabel(periodType, periodAnchor);

  const movements = getFilteredMovements();
  const categories = Store.getCategories();

  renderTotals(movements);
  renderMovementsList(movements, categories);
  renderStackedBar(movements);
  renderCategoryTotals(movements, categories, statsToggleType);
  renderCategoryManager(categories, Store.getMovements());
}

function handleDeleteCategory(categoryId) {
  const result = Store.deleteCategory(categoryId);
  if (!result.ok) return;
  renderAll();
}

function renderTotals(movements) {
  const totalEntrate = movements.filter((m) => m.type === "entrata").reduce((s, m) => s + m.amount, 0);
  const totalUscite = movements.filter((m) => m.type === "uscita").reduce((s, m) => s + m.amount, 0);
  document.getElementById("totalEntrate").textContent = formatEuro(totalEntrate);
  document.getElementById("totalUscite").textContent = formatEuro(totalUscite);
  document.getElementById("totalSaldo").textContent = formatEuro(totalEntrate - totalUscite);
}

function renderMovementsList(movements, categories) {
  const list = document.getElementById("movementsList");
  const emptyState = document.getElementById("emptyState");
  list.innerHTML = "";

  const sorted = [...movements].sort((a, b) => (a.date < b.date ? 1 : -1));

  if (sorted.length === 0) {
    emptyState.hidden = false;
    return;
  }
  emptyState.hidden = true;

  for (const m of sorted) {
    const category = categories.find((c) => c.id === m.categoryId);
    const li = document.createElement("li");
    li.className = "movement-item";
    li.dataset.id = m.id;
    const dateLabel = new Date(m.date + "T12:00:00").toLocaleDateString("it-IT", { day: "numeric", month: "short" });
    li.innerHTML = `
      <span class="cat-dot" style="background:${category ? category.color : "#898781"}"></span>
      <div class="info">
        <div class="cat-name">${category ? category.name : "Categoria eliminata"}</div>
        ${m.note ? `<div class="note">${m.note}</div>` : ""}
      </div>
      <div class="meta">
        <span class="amount ${m.type}">${m.type === "entrata" ? "+" : "-"}${formatEuro(m.amount)}</span>
        <span class="date">${dateLabel}</span>
      </div>
    `;
    li.addEventListener("click", () => openModal("edit", m));
    list.appendChild(li);
  }
}

function populateCategorySelect(selectedId) {
  const select = document.getElementById("categorySelect");
  const categories = Store.getCategories();
  select.innerHTML = "";
  for (const c of categories) {
    const opt = document.createElement("option");
    opt.value = c.id;
    opt.textContent = c.name;
    select.appendChild(opt);
  }
  const newOpt = document.createElement("option");
  newOpt.value = "__new__";
  newOpt.textContent = "+ Nuova categoria";
  select.appendChild(newOpt);

  select.value = selectedId && categories.some((c) => c.id === selectedId) ? selectedId : categories[0] ? categories[0].id : "__new__";
  toggleNewCategoryFields();
}

function toggleNewCategoryFields() {
  const select = document.getElementById("categorySelect");
  document.getElementById("newCategoryFields").hidden = select.value !== "__new__";
}

function setFormType(type) {
  formType = type;
  document.querySelectorAll(".type-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.type === type);
  });
}

function openModal(mode, movement) {
  const modal = document.getElementById("movementModal");
  const form = document.getElementById("movementForm");
  form.reset();
  document.getElementById("deleteMovement").hidden = mode !== "edit";

  if (mode === "edit") {
    editingMovementId = movement.id;
    document.getElementById("modalTitle").textContent = "Modifica movimento";
    document.getElementById("movementId").value = movement.id;
    document.getElementById("amount").value = movement.amount;
    document.getElementById("date").value = movement.date;
    document.getElementById("note").value = movement.note || "";
    setFormType(movement.type);
    populateCategorySelect(movement.categoryId);
  } else {
    editingMovementId = null;
    document.getElementById("modalTitle").textContent = "Nuovo movimento";
    document.getElementById("date").value = toISODate(new Date());
    setFormType("uscita");
    populateCategorySelect(null);
  }

  modal.hidden = false;
}

function closeModal() {
  document.getElementById("movementModal").hidden = true;
}

function handleFormSubmit(e) {
  e.preventDefault();
  const amount = document.getElementById("amount").value;
  const date = document.getElementById("date").value;
  const note = document.getElementById("note").value;
  let categoryId = document.getElementById("categorySelect").value;

  if (categoryId === "__new__") {
    const name = document.getElementById("newCategoryName").value.trim();
    const color = document.getElementById("newCategoryColor").value;
    if (!name) {
      document.getElementById("newCategoryName").focus();
      return;
    }
    categoryId = Store.addCategory(name, color).id;
  }

  if (editingMovementId) {
    Store.updateMovement(editingMovementId, { date, type: formType, amount, categoryId, note });
  } else {
    Store.addMovement({ date, type: formType, amount, categoryId, note });
  }

  closeModal();
  renderAll();
}

function handleDeleteMovement() {
  if (!editingMovementId) return;
  Store.deleteMovement(editingMovementId);
  closeModal();
  renderAll();
}

function switchView(view) {
  document.querySelectorAll(".view").forEach((v) => v.classList.remove("active"));
  document.getElementById(`view-${view}`).classList.add("active");
  document.querySelectorAll(".nav-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.view === view);
  });
}

function registerServiceWorker() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  }
}

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("periodType").addEventListener("change", (e) => {
    periodType = e.target.value;
    periodAnchor = startOfDay(new Date());
    renderAll();
  });
  document.getElementById("periodPrev").addEventListener("click", () => shiftPeriod(-1));
  document.getElementById("periodNext").addEventListener("click", () => shiftPeriod(1));

  document.querySelectorAll(".nav-btn").forEach((btn) => {
    btn.addEventListener("click", () => switchView(btn.dataset.view));
  });

  document.getElementById("fab").addEventListener("click", () => openModal("add"));
  document.getElementById("closeModal").addEventListener("click", closeModal);
  document.getElementById("movementModal").addEventListener("click", (e) => {
    if (e.target.id === "movementModal") closeModal();
  });

  document.querySelectorAll(".type-btn").forEach((btn) => {
    btn.addEventListener("click", () => setFormType(btn.dataset.type));
  });

  document.getElementById("categorySelect").addEventListener("change", toggleNewCategoryFields);
  document.getElementById("movementForm").addEventListener("submit", handleFormSubmit);
  document.getElementById("deleteMovement").addEventListener("click", handleDeleteMovement);

  document.getElementById("categoryManager").addEventListener("click", (e) => {
    const btn = e.target.closest(".cat-delete");
    if (btn && !btn.disabled) handleDeleteCategory(btn.dataset.categoryId);
  });

  document.querySelectorAll(".toggle-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      statsToggleType = btn.dataset.type;
      document.querySelectorAll(".toggle-btn").forEach((b) => b.classList.toggle("active", b === btn));
      renderAll();
    });
  });

  registerServiceWorker();
  renderAll();
});
