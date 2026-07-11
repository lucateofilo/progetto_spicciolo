const STORAGE_KEY = "spicciolo_data";

function loadData() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return { categories: [], movements: [], recurring: [] };
  }
  try {
    const data = JSON.parse(raw);
    if (!Array.isArray(data.categories)) data.categories = [];
    if (!Array.isArray(data.movements)) data.movements = [];
    if (!Array.isArray(data.recurring)) data.recurring = [];
    for (const c of data.categories) {
      if (c.budget === undefined) c.budget = null;
    }
    for (const m of data.movements) {
      if (m.recurringId === undefined) m.recurringId = null;
      if (m.incomplete === undefined) m.incomplete = false;
      if (m.hasPhoto === undefined) m.hasPhoto = false;
      if (!Array.isArray(m.tags)) m.tags = [];
    }
    return data;
  } catch {
    return { categories: [], movements: [], recurring: [] };
  }
}

function saveData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function genId() {
  return crypto.randomUUID();
}

function updateEntity(list, id, changes) {
  const item = list.find((x) => x.id === id);
  if (!item) return null;
  Object.assign(item, changes);
  return item;
}

function normalizeTags(tags) {
  if (!Array.isArray(tags)) return [];
  const seen = new Set();
  const result = [];
  for (const raw of tags) {
    const tag = String(raw).trim().toLowerCase();
    if (tag && !seen.has(tag)) {
      seen.add(tag);
      result.push(tag);
    }
  }
  return result;
}

function ymKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function daysInMonth(year, monthIndex) {
  return new Date(year, monthIndex + 1, 0).getDate();
}

function addMonthsToKey(key, n) {
  const [y, m] = key.split("-").map(Number);
  const d = new Date(y, m - 1 + n, 1);
  return ymKey(d);
}

const Store = {
  getCategories() {
    return loadData().categories;
  },

  addCategory(name, color, budget = null) {
    const data = loadData();
    const category = { id: genId(), name: name.trim(), color, budget: budget === null || budget === "" ? null : Math.abs(Number(budget)) };
    data.categories.push(category);
    saveData(data);
    return category;
  },

  updateCategory(id, changes) {
    const data = loadData();
    const category = updateEntity(data.categories, id, changes);
    if (!category) return null;
    if (changes.budget !== undefined) {
      category.budget = changes.budget === null || changes.budget === "" ? null : Math.abs(Number(changes.budget));
    }
    saveData(data);
    return category;
  },

  moveCategory(id, direction) {
    const data = loadData();
    const idx = data.categories.findIndex((c) => c.id === id);
    if (idx === -1) return;
    const newIdx = idx + direction;
    if (newIdx < 0 || newIdx >= data.categories.length) return;
    [data.categories[idx], data.categories[newIdx]] = [data.categories[newIdx], data.categories[idx]];
    saveData(data);
  },

  deleteCategory(id) {
    const data = loadData();
    const inUse = data.movements.some((m) => m.categoryId === id);
    if (inUse) {
      return { ok: false, reason: "in_use" };
    }
    data.categories = data.categories.filter((c) => c.id !== id);
    saveData(data);
    return { ok: true };
  },

  getMovements() {
    return loadData().movements;
  },

  addMovement({ date, type, amount, categoryId, note, recurringId = null, incomplete = false, hasPhoto = false, tags = [] }) {
    const data = loadData();
    const movement = {
      id: genId(),
      date,
      type,
      amount: Math.abs(Number(amount)),
      categoryId,
      note: note ? note.trim() : "",
      recurringId,
      incomplete,
      hasPhoto,
      tags: normalizeTags(tags),
    };
    data.movements.push(movement);
    saveData(data);
    return movement;
  },

  updateMovement(id, changes) {
    const data = loadData();
    const movement = updateEntity(data.movements, id, changes);
    if (!movement) return null;
    if (changes.amount !== undefined) {
      movement.amount = Math.abs(Number(changes.amount));
    }
    if (changes.tags !== undefined) {
      movement.tags = normalizeTags(changes.tags);
    }
    saveData(data);
    return movement;
  },

  getAllTags() {
    const tags = new Set();
    for (const m of loadData().movements) {
      for (const t of m.tags || []) tags.add(t);
    }
    return [...tags].sort();
  },

  deleteMovement(id) {
    const data = loadData();
    data.movements = data.movements.filter((m) => m.id !== id);
    saveData(data);
  },

  getCategoryById(id) {
    return loadData().categories.find((c) => c.id === id) || null;
  },

  getRecurring() {
    return loadData().recurring;
  },

  addRecurring({ type, amount, categoryId, note, dayOfMonth }) {
    const data = loadData();
    const recurring = {
      id: genId(),
      type,
      amount: Math.abs(Number(amount)),
      categoryId,
      note: note ? note.trim() : "",
      dayOfMonth: Math.min(31, Math.max(1, Number(dayOfMonth))),
      active: true,
      lastGenerated: null,
    };
    data.recurring.push(recurring);
    saveData(data);
    return recurring;
  },

  updateRecurring(id, changes) {
    const data = loadData();
    const recurring = updateEntity(data.recurring, id, changes);
    if (!recurring) return null;
    if (changes.amount !== undefined) recurring.amount = Math.abs(Number(changes.amount));
    if (changes.dayOfMonth !== undefined) recurring.dayOfMonth = Math.min(31, Math.max(1, Number(changes.dayOfMonth)));
    saveData(data);
    return recurring;
  },

  deleteRecurring(id) {
    const data = loadData();
    data.recurring = data.recurring.filter((r) => r.id !== id);
    saveData(data);
  },

  generateDueRecurring() {
    const data = loadData();
    const today = new Date();
    const currentKey = ymKey(today);
    let changed = false;

    for (const r of data.recurring) {
      if (!r.active) continue;
      let cursorKey = r.lastGenerated ? addMonthsToKey(r.lastGenerated, 1) : currentKey;

      while (cursorKey <= currentKey) {
        const isCurrentMonth = cursorKey === currentKey;
        if (isCurrentMonth && today.getDate() < r.dayOfMonth) break;

        const [y, m] = cursorKey.split("-").map(Number);
        const day = Math.min(r.dayOfMonth, daysInMonth(y, m - 1));
        const date = `${y}-${String(m).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

        data.movements.push({
          id: genId(),
          date,
          type: r.type,
          amount: r.amount,
          categoryId: r.categoryId,
          note: r.note,
          recurringId: r.id,
        });
        r.lastGenerated = cursorKey;
        changed = true;
        cursorKey = addMonthsToKey(cursorKey, 1);
      }
    }

    if (changed) saveData(data);
    return changed;
  },

  exportAll() {
    return loadData();
  },

  importAll(data) {
    if (!data || typeof data !== "object") return false;
    saveData({
      categories: Array.isArray(data.categories) ? data.categories : [],
      movements: Array.isArray(data.movements) ? data.movements : [],
      recurring: Array.isArray(data.recurring) ? data.recurring : [],
    });
    return true;
  },
};
