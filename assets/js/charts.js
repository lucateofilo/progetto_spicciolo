function formatEuro(amount) {
  return amount.toLocaleString("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
}

function renderStackedBar(movements) {
  const bar = document.getElementById("stackedBar");
  const legend = document.getElementById("stackedLegend");

  const totalEntrate = movements.filter((m) => m.type === "entrata").reduce((s, m) => s + m.amount, 0);
  const totalUscite = movements.filter((m) => m.type === "uscita").reduce((s, m) => s + m.amount, 0);
  const total = totalEntrate + totalUscite;

  bar.innerHTML = "";
  legend.innerHTML = "";

  if (total === 0) {
    bar.style.background = "var(--surface-2)";
    legend.innerHTML = '<li style="color:var(--text-muted)">Nessun movimento in questo periodo</li>';
    return;
  }

  const pctEntrate = (totalEntrate / total) * 100;
  const pctUscite = (totalUscite / total) * 100;

  if (pctEntrate > 0) {
    const seg = document.createElement("div");
    seg.className = "segment entrata";
    seg.style.width = pctEntrate + "%";
    bar.appendChild(seg);
  }
  if (pctUscite > 0) {
    const seg = document.createElement("div");
    seg.className = "segment uscita";
    seg.style.width = pctUscite + "%";
    bar.appendChild(seg);
  }

  legend.innerHTML = `
    <li><span class="dot entrata"></span>Entrate ${pctEntrate.toFixed(0)}% · ${formatEuro(totalEntrate)}</li>
    <li><span class="dot uscita"></span>Uscite ${pctUscite.toFixed(0)}% · ${formatEuro(totalUscite)}</li>
  `;
}

function renderCategoryTotals(movements, categories, type) {
  const list = document.getElementById("categoryTotals");
  const emptyState = document.getElementById("categoryEmptyState");
  list.innerHTML = "";

  const filtered = movements.filter((m) => m.type === type);
  const totalsByCategory = new Map();
  for (const m of filtered) {
    totalsByCategory.set(m.categoryId, (totalsByCategory.get(m.categoryId) || 0) + m.amount);
  }

  const rows = [...totalsByCategory.entries()]
    .map(([categoryId, amount]) => {
      const category = categories.find((c) => c.id === categoryId);
      return {
        name: category ? category.name : "Categoria eliminata",
        color: category ? category.color : "#898781",
        amount,
      };
    })
    .sort((a, b) => b.amount - a.amount);

  if (rows.length === 0) {
    emptyState.hidden = false;
    return;
  }
  emptyState.hidden = true;

  const max = rows[0].amount;

  for (const row of rows) {
    const li = document.createElement("li");
    const pct = max > 0 ? (row.amount / max) * 100 : 0;
    li.innerHTML = `
      <div class="cat-row-top">
        <span class="cat-name"><span class="dot" style="background:${row.color}"></span>${row.name}</span>
        <span class="cat-amount">${formatEuro(row.amount)}</span>
      </div>
      <div class="cat-bar-track">
        <div class="cat-bar-fill" style="width:${pct}%; background:${row.color}"></div>
      </div>
    `;
    list.appendChild(li);
  }
}

function renderCategoryManager(categories, movements) {
  const list = document.getElementById("categoryManager");
  const emptyState = document.getElementById("categoryManagerEmpty");
  list.innerHTML = "";

  if (categories.length === 0) {
    emptyState.hidden = false;
    return;
  }
  emptyState.hidden = true;

  for (const category of categories) {
    const inUse = movements.some((m) => m.categoryId === category.id);
    const li = document.createElement("li");
    li.innerHTML = `
      <span class="cat-name"><span class="dot" style="background:${category.color}"></span>${category.name}</span>
      <button type="button" class="cat-delete" data-category-id="${category.id}" ${inUse ? "disabled" : ""}
        title="${inUse ? "Non eliminabile: ha movimenti collegati" : "Elimina categoria"}">&#128465;</button>
    `;
    list.appendChild(li);
  }
}
