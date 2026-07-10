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

function renderCategoryDonut(rows) {
  const donut = document.getElementById("categoryDonut");
  const totalLabel = document.getElementById("categoryDonutTotal");
  const total = rows.reduce((s, r) => s + r.amount, 0);

  if (rows.length === 0 || total === 0) {
    donut.hidden = true;
    return;
  }
  donut.hidden = false;

  let acc = 0;
  const stops = rows.map((row) => {
    const start = (acc / total) * 100;
    acc += row.amount;
    const end = (acc / total) * 100;
    return `${row.color} ${start}% ${end}%`;
  });

  donut.style.background = `conic-gradient(${stops.join(", ")})`;
  totalLabel.textContent = formatEuro(total);
}

function renderCategoryTotals(movements, categories, type, periodType) {
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
        budget: category ? category.budget : null,
        amount,
      };
    })
    .sort((a, b) => b.amount - a.amount);

  renderCategoryDonut(rows);

  if (rows.length === 0) {
    emptyState.hidden = false;
    return;
  }
  emptyState.hidden = true;

  const max = rows[0].amount;

  for (const row of rows) {
    const li = document.createElement("li");
    const pct = max > 0 ? (row.amount / max) * 100 : 0;

    let budgetHtml = "";
    if (periodType === "month" && row.budget) {
      const budgetPct = (row.amount / row.budget) * 100;
      let barClass = "";
      if (type === "uscita") {
        if (budgetPct > 100) barClass = "over";
        else if (budgetPct >= 80) barClass = "warning";
      } else if (budgetPct >= 100) {
        barClass = "reached";
      }
      budgetHtml = `
        <div class="budget-row">
          <span class="budget-label">Budget ${formatEuro(row.budget)}</span>
          <span class="budget-pct">${budgetPct.toFixed(0)}%</span>
        </div>
        <div class="budget-bar-track">
          <div class="budget-bar-fill ${barClass}" style="width:${Math.min(budgetPct, 100)}%"></div>
        </div>
      `;
    }

    li.innerHTML = `
      <div class="cat-row-top">
        <span class="cat-name"><span class="dot" style="background:${row.color}"></span>${row.name}</span>
        <span class="cat-amount">${formatEuro(row.amount)}</span>
      </div>
      <div class="cat-bar-track">
        <div class="cat-bar-fill" style="width:${pct}%; background:${row.color}"></div>
      </div>
      ${budgetHtml}
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

  categories.forEach((category, idx) => {
    const inUse = movements.some((m) => m.categoryId === category.id);
    const li = document.createElement("li");
    li.innerHTML = `
      <span class="cat-name">
        <span class="dot" style="background:${category.color}"></span>
        ${category.name}
        ${category.budget ? `<span class="budget-badge">${formatEuro(category.budget)}/mese</span>` : ""}
      </span>
      <div class="cat-manager-actions">
        <button type="button" class="cat-move" data-category-id="${category.id}" data-direction="-1" ${idx === 0 ? "disabled" : ""} title="Sposta su" aria-label="Sposta su">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="12" y1="19" x2="12" y2="5"></line><polyline points="5 12 12 5 19 12"></polyline></svg>
        </button>
        <button type="button" class="cat-move" data-category-id="${category.id}" data-direction="1" ${idx === categories.length - 1 ? "disabled" : ""} title="Sposta giù" aria-label="Sposta giù">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"></line><polyline points="19 12 12 19 5 12"></polyline></svg>
        </button>
        <button type="button" class="cat-edit" data-category-id="${category.id}" title="Modifica categoria" aria-label="Modifica categoria">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z"></path></svg>
        </button>
        <button type="button" class="cat-delete" data-category-id="${category.id}" ${inUse ? "disabled" : ""}
          title="${inUse ? "Non eliminabile: ha movimenti collegati" : "Elimina categoria"}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path><path d="M10 11v6"></path><path d="M14 11v6"></path><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"></path></svg></button>
      </div>
    `;
    list.appendChild(li);
  });
}

function renderRecurringList(recurring, categories) {
  const list = document.getElementById("recurringList");
  const emptyState = document.getElementById("recurringEmpty");
  list.innerHTML = "";

  if (recurring.length === 0) {
    emptyState.hidden = false;
    return;
  }
  emptyState.hidden = true;

  for (const r of recurring) {
    const category = categories.find((c) => c.id === r.categoryId);
    const li = document.createElement("li");
    li.className = "movement-item recurring-item" + (r.active ? "" : " paused");
    li.innerHTML = `
      <span class="cat-dot" style="background:${category ? category.color : "#898781"}"></span>
      <div class="info">
        <div class="cat-name">${category ? category.name : "Categoria eliminata"}${r.note ? ` · ${r.note}` : ""}</div>
        <div class="note">Il giorno ${r.dayOfMonth} di ogni mese${r.active ? "" : " · in pausa"}</div>
      </div>
      <div class="meta">
        <span class="amount ${r.type}">${r.type === "entrata" ? "+" : "-"}${formatEuro(r.amount)}</span>
      </div>
      <div class="cat-manager-actions">
        <button type="button" class="recurring-toggle" data-recurring-id="${r.id}" title="${r.active ? "Metti in pausa" : "Riattiva"}" aria-label="${r.active ? "Metti in pausa" : "Riattiva"}">
          ${r.active
            ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>'
            : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>'}
        </button>
        <button type="button" class="recurring-edit" data-recurring-id="${r.id}" title="Modifica ricorrente" aria-label="Modifica ricorrente">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z"></path></svg>
        </button>
      </div>
    `;
    list.appendChild(li);
  }
}

function renderTrend(periods) {
  const container = document.getElementById("trendChart");
  container.innerHTML = "";

  const maxAbs = Math.max(1, ...periods.map((p) => Math.abs(p.net)));

  for (const p of periods) {
    const col = document.createElement("div");
    col.className = "trend-col";
    const heightPct = (Math.abs(p.net) / maxAbs) * 100;
    col.innerHTML = `
      <div class="trend-bar-track">
        <div class="trend-bar ${p.net >= 0 ? "positive" : "negative"}" style="height:${heightPct}%" title="${formatEuro(p.net)}"></div>
      </div>
      <span class="trend-label">${p.label}</span>
    `;
    container.appendChild(col);
  }
}

function renderPeriodComparison(current, previous) {
  const container = document.getElementById("periodComparison");
  container.innerHTML = "";

  const rows = [
    { label: "Entrate", curr: current.entrate, prev: previous.entrate, positiveIsGood: true },
    { label: "Uscite", curr: current.uscite, prev: previous.uscite, positiveIsGood: false },
    { label: "Saldo", curr: current.saldo, prev: previous.saldo, positiveIsGood: true },
  ];

  for (const row of rows) {
    let deltaHtml = '<span class="comparison-delta neutral">–</span>';
    if (row.prev !== 0) {
      const deltaPct = ((row.curr - row.prev) / Math.abs(row.prev)) * 100;
      const improved = row.positiveIsGood ? deltaPct >= 0 : deltaPct <= 0;
      const arrow = deltaPct >= 0 ? "&#9650;" : "&#9660;";
      deltaHtml = `<span class="comparison-delta ${improved ? "good" : "bad"}">${arrow} ${Math.abs(deltaPct).toFixed(0)}%</span>`;
    } else if (row.curr !== 0) {
      deltaHtml = `<span class="comparison-delta ${row.positiveIsGood ? "good" : "bad"}">Nuovo</span>`;
    }

    const div = document.createElement("div");
    div.className = "comparison-row";
    div.innerHTML = `
      <span class="comparison-label">${row.label}</span>
      <span class="comparison-value">${formatEuro(row.curr)}</span>
      ${deltaHtml}
    `;
    container.appendChild(div);
  }
}
