const STORAGE_KEY = "spicciolo_data";

function loadData() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return { version: 1, categories: [], movements: [] };
  }
  try {
    const data = JSON.parse(raw);
    if (!Array.isArray(data.categories)) data.categories = [];
    if (!Array.isArray(data.movements)) data.movements = [];
    return data;
  } catch {
    return { version: 1, categories: [], movements: [] };
  }
}

function saveData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

const Store = {
  getCategories() {
    return loadData().categories;
  },

  addCategory(name, color) {
    const data = loadData();
    const category = { id: genId(), name: name.trim(), color };
    data.categories.push(category);
    saveData(data);
    return category;
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

  addMovement({ date, type, amount, categoryId, note }) {
    const data = loadData();
    const movement = {
      id: genId(),
      date,
      type,
      amount: Math.abs(Number(amount)),
      categoryId,
      note: note ? note.trim() : "",
    };
    data.movements.push(movement);
    saveData(data);
    return movement;
  },

  updateMovement(id, changes) {
    const data = loadData();
    const movement = data.movements.find((m) => m.id === id);
    if (!movement) return null;
    Object.assign(movement, changes);
    if (changes.amount !== undefined) {
      movement.amount = Math.abs(Number(changes.amount));
    }
    saveData(data);
    return movement;
  },

  deleteMovement(id) {
    const data = loadData();
    data.movements = data.movements.filter((m) => m.id !== id);
    saveData(data);
  },

  getCategoryById(id) {
    return loadData().categories.find((c) => c.id === id) || null;
  },
};
