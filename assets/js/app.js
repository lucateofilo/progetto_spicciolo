const MONTHS_IT = ["Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno", "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"];
const MONTHS_IT_SHORT = ["Gen", "Feb", "Mar", "Apr", "Mag", "Giu", "Lug", "Ago", "Set", "Ott", "Nov", "Dic"];

let periodType = "month";
let periodAnchor = startOfDay(new Date());
let editingMovementId = null;
let editingCategoryId = null;
let editingRecurringId = null;
let formType = "uscita";
let recurringFormType = "uscita";
let statsToggleType = "uscita";
let searchQuery = "";

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
  return date.toLocaleDateString("en-CA");
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

function getTrendLabel(type, anchor) {
  if (type === "day" || type === "week") {
    return anchor.toLocaleDateString("it-IT", { day: "numeric", month: "short" });
  }
  if (type === "month") {
    return MONTHS_IT_SHORT[anchor.getMonth()];
  }
  return `${anchor.getFullYear()}`;
}

function shiftedAnchor(type, anchor, direction) {
  const d = new Date(anchor);
  if (type === "day") d.setDate(d.getDate() + direction);
  else if (type === "week") d.setDate(d.getDate() + 7 * direction);
  else if (type === "month") d.setMonth(d.getMonth() + direction);
  else d.setFullYear(d.getFullYear() + direction);
  return startOfDay(d);
}

function shiftPeriod(direction) {
  periodAnchor = shiftedAnchor(periodType, periodAnchor, direction);
  renderAll();
}

function getMovementsInRange(start, end) {
  return Store.getMovements().filter((m) => {
    const d = new Date(m.date + "T12:00:00");
    return d >= start && d <= end;
  });
}

function getFilteredMovements() {
  const { start, end } = getPeriodBounds(periodType, periodAnchor);
  return getMovementsInRange(start, end);
}

function computeTotals(movements) {
  const entrate = movements.filter((m) => m.type === "entrata").reduce((s, m) => s + m.amount, 0);
  const uscite = movements.filter((m) => m.type === "uscita").reduce((s, m) => s + m.amount, 0);
  return { entrate, uscite, saldo: entrate - uscite };
}

function getPastPeriods(type, anchor, n) {
  const periods = [];
  let cursor = anchor;
  for (let i = 0; i < n; i++) {
    const { start, end } = getPeriodBounds(type, cursor);
    periods.unshift({ start, end, label: getTrendLabel(type, cursor) });
    cursor = shiftedAnchor(type, cursor, -1);
  }
  return periods;
}

function renderAll() {
  document.getElementById("periodLabel").textContent = getPeriodLabel(periodType, periodAnchor);

  const movements = getFilteredMovements();
  const categories = Store.getCategories();

  renderTotals(movements);
  renderAverage(movements);
  renderMovementsList(movements, categories);
  renderStackedBar(movements);
  renderCategoryTotals(movements, categories, statsToggleType, periodType);
  renderCategoryManager(categories, Store.getMovements());
  renderRecurringList(Store.getRecurring(), categories);

  const trendPeriods = getPastPeriods(periodType, periodAnchor, 6).map((p) => ({
    label: p.label,
    net: computeTotals(getMovementsInRange(p.start, p.end)).saldo,
  }));
  renderTrend(trendPeriods);

  const prevAnchor = shiftedAnchor(periodType, periodAnchor, -1);
  const { start: prevStart, end: prevEnd } = getPeriodBounds(periodType, prevAnchor);
  const previousTotals = computeTotals(getMovementsInRange(prevStart, prevEnd));
  renderPeriodComparison(computeTotals(movements), previousTotals);
}

function handleDeleteCategory(categoryId) {
  const result = Store.deleteCategory(categoryId);
  if (!result.ok) return;
  renderAll();
}

function handleMoveCategory(categoryId, direction) {
  Store.moveCategory(categoryId, direction);
  renderAll();
}

function handleToggleRecurring(recurringId) {
  const recurring = Store.getRecurring().find((r) => r.id === recurringId);
  if (!recurring) return;
  Store.updateRecurring(recurringId, { active: !recurring.active });
  renderAll();
}

function renderTotals(movements) {
  const { entrate, uscite, saldo } = computeTotals(movements);
  document.getElementById("totalEntrate").textContent = formatEuro(entrate);
  document.getElementById("totalUscite").textContent = formatEuro(uscite);
  document.getElementById("totalSaldo").textContent = formatEuro(saldo);
}

function renderAverage(movements) {
  const el = document.getElementById("periodAverage");
  if (periodType === "day") {
    el.hidden = true;
    return;
  }

  const uscite = movements.filter((m) => m.type === "uscita").reduce((s, m) => s + m.amount, 0);
  let divisor = 1;
  let unit = "giorno";

  if (periodType === "week") {
    divisor = 7;
  } else if (periodType === "month") {
    const { start, end } = getPeriodBounds(periodType, periodAnchor);
    divisor = Math.round((end - start) / 86400000) + 1;
  } else {
    divisor = 12;
    unit = "mese";
  }

  el.hidden = false;
  el.textContent = `Media uscite: ${formatEuro(uscite / divisor)}/${unit}`;
}

function renderMovementsList(movements, categories) {
  const list = document.getElementById("movementsList");
  const emptyState = document.getElementById("emptyState");
  list.innerHTML = "";

  const query = searchQuery.trim().toLowerCase();
  const filtered = query
    ? movements.filter((m) => {
        const category = categories.find((c) => c.id === m.categoryId);
        const haystack = `${m.note || ""} ${category ? category.name : ""}`.toLowerCase();
        return haystack.includes(query);
      })
    : movements;

  const sorted = [...filtered].sort((a, b) => (a.date < b.date ? 1 : -1));

  if (sorted.length === 0) {
    emptyState.innerHTML = query
      ? "Nessun movimento trovato."
      : "Nessun movimento in questo periodo.<br>Tocca + per aggiungerne uno.";
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

function fillCategorySelect(select, selectedId, includeNewOption) {
  const categories = Store.getCategories();
  select.innerHTML = "";
  for (const c of categories) {
    const opt = document.createElement("option");
    opt.value = c.id;
    opt.textContent = c.name;
    select.appendChild(opt);
  }
  if (includeNewOption) {
    const newOpt = document.createElement("option");
    newOpt.value = "__new__";
    newOpt.textContent = "+ Nuova categoria";
    select.appendChild(newOpt);
  }
  select.value = selectedId && categories.some((c) => c.id === selectedId)
    ? selectedId
    : categories[0] ? categories[0].id : includeNewOption ? "__new__" : "";
}

function populateCategorySelect(selectedId) {
  fillCategorySelect(document.getElementById("categorySelect"), selectedId, true);
  toggleNewCategoryFields();
}

function populateRecurringCategorySelect(selectedId) {
  fillCategorySelect(document.getElementById("recurringCategorySelect"), selectedId, false);
}

function toggleNewCategoryFields() {
  const select = document.getElementById("categorySelect");
  document.getElementById("newCategoryFields").hidden = select.value !== "__new__";
}

function setTypeSwitch(container, type) {
  container.querySelectorAll(".type-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.type === type);
  });
}

function setFormType(type) {
  formType = type;
  setTypeSwitch(document.getElementById("movementForm"), type);
}

function setRecurringFormType(type) {
  recurringFormType = type;
  setTypeSwitch(document.getElementById("recurringForm"), type);
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

function openCategoryModal(mode, category) {
  const modal = document.getElementById("categoryModal");
  const form = document.getElementById("categoryForm");
  form.reset();
  document.getElementById("deleteCategoryBtn").hidden = mode !== "edit";

  if (mode === "edit") {
    editingCategoryId = category.id;
    document.getElementById("categoryModalTitle").textContent = "Modifica categoria";
    document.getElementById("categoryId").value = category.id;
    document.getElementById("categoryName").value = category.name;
    document.getElementById("categoryColor").value = category.color;
    document.getElementById("categoryBudget").value = category.budget != null ? category.budget : "";
  } else {
    editingCategoryId = null;
    document.getElementById("categoryModalTitle").textContent = "Nuova categoria";
    document.getElementById("categoryColor").value = "#3b82f6";
  }

  modal.hidden = false;
}

function closeCategoryModal() {
  document.getElementById("categoryModal").hidden = true;
}

function handleCategoryFormSubmit(e) {
  e.preventDefault();
  const name = document.getElementById("categoryName").value.trim();
  const color = document.getElementById("categoryColor").value;
  const budgetRaw = document.getElementById("categoryBudget").value;
  const budget = budgetRaw === "" ? null : Number(budgetRaw);
  if (!name) return;

  if (editingCategoryId) {
    Store.updateCategory(editingCategoryId, { name, color, budget });
  } else {
    Store.addCategory(name, color, budget);
  }

  closeCategoryModal();
  renderAll();
}

function handleDeleteCategoryModal() {
  if (!editingCategoryId) return;
  const result = Store.deleteCategory(editingCategoryId);
  if (!result.ok) return;
  closeCategoryModal();
  renderAll();
}

function openRecurringModal(mode, recurring) {
  const modal = document.getElementById("recurringModal");
  const form = document.getElementById("recurringForm");
  form.reset();
  document.getElementById("deleteRecurringBtn").hidden = mode !== "edit";

  if (mode === "edit") {
    editingRecurringId = recurring.id;
    document.getElementById("recurringModalTitle").textContent = "Modifica ricorrente";
    document.getElementById("recurringId").value = recurring.id;
    document.getElementById("recurringAmount").value = recurring.amount;
    document.getElementById("recurringDay").value = recurring.dayOfMonth;
    document.getElementById("recurringNote").value = recurring.note || "";
    document.getElementById("recurringActive").checked = recurring.active;
    setRecurringFormType(recurring.type);
    populateRecurringCategorySelect(recurring.categoryId);
  } else {
    editingRecurringId = null;
    document.getElementById("recurringModalTitle").textContent = "Nuovo ricorrente";
    document.getElementById("recurringActive").checked = true;
    setRecurringFormType("uscita");
    populateRecurringCategorySelect(null);
  }

  modal.hidden = false;
}

function closeRecurringModal() {
  document.getElementById("recurringModal").hidden = true;
}

function handleRecurringFormSubmit(e) {
  e.preventDefault();
  const amount = document.getElementById("recurringAmount").value;
  const categoryId = document.getElementById("recurringCategorySelect").value;
  const dayOfMonth = document.getElementById("recurringDay").value;
  const note = document.getElementById("recurringNote").value;
  const active = document.getElementById("recurringActive").checked;

  if (!categoryId) return;

  if (editingRecurringId) {
    Store.updateRecurring(editingRecurringId, { type: recurringFormType, amount, categoryId, dayOfMonth, note, active });
  } else {
    const created = Store.addRecurring({ type: recurringFormType, amount, categoryId, dayOfMonth, note });
    if (!active) Store.updateRecurring(created.id, { active: false });
  }

  closeRecurringModal();
  renderAll();
}

function handleDeleteRecurringModal() {
  if (!editingRecurringId) return;
  Store.deleteRecurring(editingRecurringId);
  closeRecurringModal();
  renderAll();
}

function csvEscape(value) {
  const str = String(value);
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function exportMovementsCSV() {
  const categories = Store.getCategories();
  const rows = [["Data", "Tipo", "Categoria", "Importo", "Nota"]];

  const sorted = [...Store.getMovements()].sort((a, b) => (a.date < b.date ? -1 : 1));
  for (const m of sorted) {
    const category = categories.find((c) => c.id === m.categoryId);
    rows.push([
      m.date,
      m.type === "entrata" ? "Entrata" : "Uscita",
      category ? category.name : "Categoria eliminata",
      m.amount.toFixed(2),
      m.note || "",
    ]);
  }

  const csv = rows.map((row) => row.map(csvEscape).join(",")).join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `spicciolo-movimenti-${toISODate(new Date())}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
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

  document.getElementById("searchMovements").addEventListener("input", (e) => {
    searchQuery = e.target.value;
    renderMovementsList(getFilteredMovements(), Store.getCategories());
  });

  document.getElementById("fab").addEventListener("click", () => openModal("add"));
  document.getElementById("closeModal").addEventListener("click", closeModal);
  document.getElementById("movementModal").addEventListener("click", (e) => {
    if (e.target.id === "movementModal") closeModal();
  });

  document.getElementById("movementForm").addEventListener("click", (e) => {
    const btn = e.target.closest(".type-btn");
    if (btn) setFormType(btn.dataset.type);
  });

  document.getElementById("categorySelect").addEventListener("change", toggleNewCategoryFields);
  document.getElementById("movementForm").addEventListener("submit", handleFormSubmit);
  document.getElementById("deleteMovement").addEventListener("click", handleDeleteMovement);

  document.getElementById("addCategoryBtn").addEventListener("click", () => openCategoryModal("add"));
  document.getElementById("closeCategoryModal").addEventListener("click", closeCategoryModal);
  document.getElementById("categoryModal").addEventListener("click", (e) => {
    if (e.target.id === "categoryModal") closeCategoryModal();
  });
  document.getElementById("categoryForm").addEventListener("submit", handleCategoryFormSubmit);
  document.getElementById("deleteCategoryBtn").addEventListener("click", handleDeleteCategoryModal);

  document.getElementById("addRecurringBtn").addEventListener("click", () => openRecurringModal("add"));
  document.getElementById("closeRecurringModal").addEventListener("click", closeRecurringModal);
  document.getElementById("recurringModal").addEventListener("click", (e) => {
    if (e.target.id === "recurringModal") closeRecurringModal();
  });
  document.getElementById("recurringForm").addEventListener("click", (e) => {
    const btn = e.target.closest(".type-btn");
    if (btn) setRecurringFormType(btn.dataset.type);
  });
  document.getElementById("recurringForm").addEventListener("submit", handleRecurringFormSubmit);
  document.getElementById("deleteRecurringBtn").addEventListener("click", handleDeleteRecurringModal);

  document.getElementById("exportCsvBtn").addEventListener("click", exportMovementsCSV);

  document.getElementById("categoryManager").addEventListener("click", (e) => {
    const moveBtn = e.target.closest(".cat-move");
    if (moveBtn) {
      handleMoveCategory(moveBtn.dataset.categoryId, Number(moveBtn.dataset.direction));
      return;
    }
    const editBtn = e.target.closest(".cat-edit");
    if (editBtn) {
      const category = Store.getCategories().find((c) => c.id === editBtn.dataset.categoryId);
      if (category) openCategoryModal("edit", category);
      return;
    }
    const deleteBtn = e.target.closest(".cat-delete");
    if (deleteBtn && !deleteBtn.disabled) handleDeleteCategory(deleteBtn.dataset.categoryId);
  });

  document.getElementById("recurringList").addEventListener("click", (e) => {
    const toggleBtn = e.target.closest(".recurring-toggle");
    if (toggleBtn) {
      handleToggleRecurring(toggleBtn.dataset.recurringId);
      return;
    }
    const editBtn = e.target.closest(".recurring-edit");
    if (editBtn) {
      const recurring = Store.getRecurring().find((r) => r.id === editBtn.dataset.recurringId);
      if (recurring) openRecurringModal("edit", recurring);
    }
  });

  document.querySelectorAll(".toggle-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      statsToggleType = btn.dataset.type;
      document.querySelectorAll(".toggle-btn").forEach((b) => b.classList.toggle("active", b === btn));
      renderAll();
    });
  });

  registerServiceWorker();
  Store.generateDueRecurring();
  renderAll();
});
