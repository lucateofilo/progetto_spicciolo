const MONTHS_IT = ["Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno", "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"];
const MONTHS_IT_SHORT = ["Gen", "Feb", "Mar", "Apr", "Mag", "Giu", "Lug", "Ago", "Set", "Ott", "Nov", "Dic"];

let periodType = "month";
let periodAnchor = startOfDay(new Date());
let customRangeStart = startOfDay(new Date(Date.now() - 29 * 86400000));
let customRangeEnd = endOfDay(new Date());
let editingMovementId = null;
let editingCategoryId = null;
let editingRecurringId = null;
let formType = "uscita";
let recurringFormType = "uscita";
let statsToggleType = "uscita";
let searchQuery = "";
let filterCategoryId = "";
let pendingReceiptFile = null;
let removeReceiptFlag = false;
let editingMovementHasPhoto = false;

const RECEIPT_BADGE_SVG = '<span class="receipt-badge" aria-label="Scontrino allegato"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path></svg></span>';

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
  if (type === "custom") {
    return { start: customRangeStart, end: customRangeEnd };
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
  if (type === "custom") {
    const fmt = (d) => d.toLocaleDateString("it-IT", { day: "numeric", month: "short", year: "numeric" });
    return `${fmt(customRangeStart)} – ${fmt(customRangeEnd)}`;
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
  renderBudgetWarnings(movements, categories);
  renderCategoryFilterOptions(categories);
  renderMovementsList(movements, categories);
  renderStackedBar(movements);
  renderCategoryTotals(movements, categories, statsToggleType, periodType);
  renderCategoryManager(categories, Store.getMovements());
  renderRecurringList(Store.getRecurring(), categories);

  const trendCard = document.getElementById("trendCard");
  const comparisonCard = document.getElementById("comparisonCard");
  if (periodType === "custom") {
    // Neither concept has a natural meaning for an arbitrary date range (no "previous" range,
    // no fixed-length periods to look back over), so both cards just stay hidden.
    trendCard.hidden = true;
    comparisonCard.hidden = true;
  } else {
    trendCard.hidden = false;
    comparisonCard.hidden = false;

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
  } else if (periodType === "custom") {
    const { start, end } = getPeriodBounds(periodType, periodAnchor);
    divisor = Math.max(1, Math.round((end - start) / 86400000) + 1);
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
  const filtered = movements.filter((m) => {
    if (filterCategoryId && m.categoryId !== filterCategoryId) return false;
    if (!query) return true;
    const category = categories.find((c) => c.id === m.categoryId);
    const haystack = `${m.note || ""} ${category ? category.name : ""} ${(m.tags || []).join(" ")}`.toLowerCase();
    return haystack.includes(query);
  });

  const sorted = [...filtered].sort((a, b) => (a.date < b.date ? 1 : -1));

  if (sorted.length === 0) {
    emptyState.innerHTML = query || filterCategoryId
      ? "Nessun movimento trovato."
      : "Nessun movimento in questo periodo.<br>Tocca + per aggiungerne uno.";
    emptyState.hidden = false;
    return;
  }
  emptyState.hidden = true;

  for (const m of sorted) {
    const category = categories.find((c) => c.id === m.categoryId);
    const li = document.createElement("li");
    li.className = "movement-item" + (m.incomplete ? " incomplete" : "");
    li.dataset.id = m.id;
    const dateLabel = new Date(m.date + "T12:00:00").toLocaleDateString("it-IT", { day: "numeric", month: "short" });
    li.innerHTML = `
      <span class="cat-dot" style="background:${category ? category.color : "#898781"}"></span>
      <div class="info">
        <div class="cat-name">${m.incomplete ? "Da completare" : (category ? category.name : "Categoria eliminata")}${m.hasPhoto ? RECEIPT_BADGE_SVG : ""}</div>
        ${m.note ? `<div class="note">${m.note}</div>` : ""}
        ${m.tags && m.tags.length > 0 ? `<div class="tag-chips">${m.tags.map((t) => `<span class="tag-chip" data-tag="${t}">#${t}</span>`).join("")}</div>` : ""}
      </div>
      <div class="meta">
        <span class="amount ${m.incomplete ? "" : m.type}">${m.incomplete ? "—" : (m.type === "entrata" ? "+" : "-") + formatEuro(m.amount)}</span>
        <span class="date">${dateLabel}</span>
      </div>
    `;
    li.addEventListener("click", (e) => {
      const chip = e.target.closest(".tag-chip");
      if (chip) {
        e.stopPropagation();
        searchQuery = chip.dataset.tag;
        document.getElementById("searchMovements").value = searchQuery;
        renderMovementsList(getFilteredMovements(), Store.getCategories());
        return;
      }
      openModal("edit", m);
    });
    list.appendChild(li);
  }
}

function renderCategoryFilterOptions(categories) {
  const select = document.getElementById("filterCategory");
  const current = select.value;
  select.innerHTML = '<option value="">Tutte le categorie</option>';
  for (const c of categories) {
    const opt = document.createElement("option");
    opt.value = c.id;
    opt.textContent = c.name;
    select.appendChild(opt);
  }
  select.value = categories.some((c) => c.id === current) ? current : "";
  filterCategoryId = select.value;
}

function getBudgetWarnings(movements, categories) {
  if (periodType !== "month") return [];
  const spent = new Map();
  for (const m of movements) {
    if (m.type !== "uscita" || m.incomplete) continue;
    spent.set(m.categoryId, (spent.get(m.categoryId) || 0) + m.amount);
  }
  return categories
    .filter((c) => c.budget && (spent.get(c.id) || 0) / c.budget >= 0.8)
    .map((c) => ({ name: c.name, pct: Math.round(((spent.get(c.id) || 0) / c.budget) * 100) }));
}

function renderBudgetWarnings(movements, categories) {
  const el = document.getElementById("budgetWarnings");
  const warnings = getBudgetWarnings(movements, categories);
  if (warnings.length === 0) {
    el.hidden = true;
    return;
  }
  el.hidden = false;
  el.innerHTML = warnings
    .map((w) => `<span class="budget-warning-chip ${w.pct >= 100 ? "over" : ""}">${w.name} ${w.pct}%</span>`)
    .join("");
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

function populateTagSuggestions() {
  const datalist = document.getElementById("tagSuggestions");
  datalist.innerHTML = Store.getAllTags().map((t) => `<option value="${t}"></option>`).join("");
}

function parseTagsInput(value) {
  return value.split(",").map((t) => t.trim()).filter(Boolean);
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

function showReceiptPreview(url) {
  document.getElementById("receiptPreviewImg").src = url;
  document.getElementById("receiptPreview").hidden = false;
}

function hideReceiptPreview() {
  document.getElementById("receiptPreview").hidden = true;
  document.getElementById("receiptPreviewImg").src = "";
}

function openModal(mode, movement) {
  const modal = document.getElementById("movementModal");
  const form = document.getElementById("movementForm");
  form.reset();
  document.getElementById("deleteMovement").hidden = mode !== "edit";
  document.getElementById("duplicateMovement").hidden = mode !== "edit";

  pendingReceiptFile = null;
  removeReceiptFlag = false;
  hideReceiptPreview();
  populateTagSuggestions();

  if (mode === "edit") {
    editingMovementId = movement.id;
    editingMovementHasPhoto = movement.hasPhoto;
    document.getElementById("modalTitle").textContent = "Modifica movimento";
    document.getElementById("movementId").value = movement.id;
    document.getElementById("amount").value = movement.amount;
    document.getElementById("date").value = movement.date;
    document.getElementById("note").value = movement.note || "";
    document.getElementById("movementTags").value = (movement.tags || []).join(", ");
    setFormType(movement.type);
    populateCategorySelect(movement.categoryId);
    if (movement.hasPhoto) {
      Photos.get(movement.id).then((blob) => {
        if (blob) showReceiptPreview(URL.createObjectURL(blob));
      });
    }
  } else {
    editingMovementId = null;
    editingMovementHasPhoto = false;
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

async function handleFormSubmit(e) {
  e.preventDefault();
  const amount = document.getElementById("amount").value;
  const date = document.getElementById("date").value;
  const note = document.getElementById("note").value;
  const tags = parseTagsInput(document.getElementById("movementTags").value);
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

  const hasPhoto = pendingReceiptFile ? true : removeReceiptFlag ? false : editingMovementHasPhoto;

  let movement;
  if (editingMovementId) {
    movement = Store.updateMovement(editingMovementId, { date, type: formType, amount, categoryId, note, incomplete: false, hasPhoto, tags });
  } else {
    movement = Store.addMovement({ date, type: formType, amount, categoryId, note, incomplete: false, hasPhoto, tags });
  }

  if (pendingReceiptFile) {
    try {
      await Photos.save(movement.id, pendingReceiptFile);
    } catch {
      Store.updateMovement(movement.id, { hasPhoto: false });
      alert("Movimento salvato, ma il salvataggio della foto è fallito.");
    }
  } else if (removeReceiptFlag) {
    Photos.delete(movement.id).catch(() => {});
  }

  closeModal();
  renderAll();
}

function handleDeleteMovement() {
  if (!editingMovementId) return;
  Photos.delete(editingMovementId).catch(() => {});
  Store.deleteMovement(editingMovementId);
  closeModal();
  renderAll();
}

function handleDuplicateMovement() {
  if (!editingMovementId) return;
  const original = Store.getMovements().find((m) => m.id === editingMovementId);
  if (!original) return;
  Store.addMovement({
    date: toISODate(new Date()),
    type: original.type,
    amount: original.amount,
    categoryId: original.categoryId,
    note: original.note,
    tags: original.tags,
  });
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
  const rows = [["Data", "Tipo", "Categoria", "Importo", "Nota", "Tag"]];

  const sorted = [...Store.getMovements()].filter((m) => !m.incomplete).sort((a, b) => (a.date < b.date ? -1 : 1));
  for (const m of sorted) {
    const category = categories.find((c) => c.id === m.categoryId);
    rows.push([
      m.date,
      m.type === "entrata" ? "Entrata" : "Uscita",
      category ? category.name : "Categoria eliminata",
      m.amount.toFixed(2),
      m.note || "",
      (m.tags || []).join("; "),
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

function exportBackup() {
  const data = Store.exportAll();
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `spicciolo-backup-${toISODate(new Date())}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function importBackup(file) {
  const reader = new FileReader();
  reader.onload = () => {
    let data;
    try {
      data = JSON.parse(reader.result);
    } catch {
      alert("File di backup non valido.");
      return;
    }
    if (!confirm("Sostituire tutti i dati attuali con quelli del backup? L'operazione non è reversibile.")) return;
    if (!Store.importAll(data)) {
      alert("File di backup non valido.");
      return;
    }
    renderAll();
    alert("Backup ripristinato.");
  };
  reader.readAsText(file);
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

    const isCustom = periodType === "custom";
    document.getElementById("periodNav").hidden = isCustom;
    document.getElementById("periodCustomRange").hidden = !isCustom;
    if (isCustom) {
      document.getElementById("customRangeStartInput").value = toISODate(customRangeStart);
      document.getElementById("customRangeEndInput").value = toISODate(customRangeEnd);
    }
    renderAll();
  });
  document.getElementById("periodPrev").addEventListener("click", () => shiftPeriod(-1));
  document.getElementById("periodNext").addEventListener("click", () => shiftPeriod(1));

  document.getElementById("customRangeStartInput").addEventListener("change", (e) => {
    if (!e.target.value) return;
    customRangeStart = startOfDay(new Date(e.target.value + "T12:00:00"));
    if (customRangeStart > customRangeEnd) {
      customRangeEnd = endOfDay(customRangeStart);
      document.getElementById("customRangeEndInput").value = toISODate(customRangeEnd);
    }
    renderAll();
  });
  document.getElementById("customRangeEndInput").addEventListener("change", (e) => {
    if (!e.target.value) return;
    customRangeEnd = endOfDay(new Date(e.target.value + "T12:00:00"));
    if (customRangeEnd < customRangeStart) {
      customRangeStart = startOfDay(customRangeEnd);
      document.getElementById("customRangeStartInput").value = toISODate(customRangeStart);
    }
    renderAll();
  });

  document.querySelectorAll(".nav-btn").forEach((btn) => {
    btn.addEventListener("click", () => switchView(btn.dataset.view));
  });

  document.getElementById("searchMovements").addEventListener("input", (e) => {
    searchQuery = e.target.value;
    renderMovementsList(getFilteredMovements(), Store.getCategories());
  });

  document.getElementById("filterCategory").addEventListener("change", (e) => {
    filterCategoryId = e.target.value;
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
  document.getElementById("duplicateMovement").addEventListener("click", handleDuplicateMovement);

  document.getElementById("receiptInput").addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;
    pendingReceiptFile = file;
    removeReceiptFlag = false;
    showReceiptPreview(URL.createObjectURL(file));
  });

  document.getElementById("removeReceiptBtn").addEventListener("click", () => {
    pendingReceiptFile = null;
    removeReceiptFlag = true;
    hideReceiptPreview();
  });

  document.getElementById("quickReceiptInput").addEventListener("change", async (e) => {
    const file = e.target.files[0];
    e.target.value = "";
    if (!file) return;
    const movement = Store.addMovement({
      date: toISODate(new Date()),
      type: "uscita",
      amount: 0,
      categoryId: null,
      note: "",
      incomplete: true,
      hasPhoto: true,
    });
    try {
      await Photos.save(movement.id, file);
    } catch {
      Store.updateMovement(movement.id, { hasPhoto: false });
    }
    renderAll();
  });

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
  document.getElementById("exportBackupBtn").addEventListener("click", exportBackup);
  document.getElementById("importBackupInput").addEventListener("change", (e) => {
    const file = e.target.files[0];
    e.target.value = "";
    if (file) importBackup(file);
  });

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
