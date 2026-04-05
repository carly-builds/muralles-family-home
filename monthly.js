/* ============================================
   MONTHLY UPDATE
   ============================================ */

let currentViewMonth = getCurrentYearMonth();
let monthlyBreakdownView = 'everyone'; // 'everyone', 'carly', 'partner'

function render_monthly() {
  document.getElementById('monthly-current-month').textContent = getMonthName(currentViewMonth);
  loadMonthData(currentViewMonth);
  renderMonthlyBreakdown();
}

function switchMonthlyBreakdownView(view) {
  monthlyBreakdownView = view;
  renderMonthlyBreakdown();
}

// ============================================
// Revenue/Expense Breakdown by Person
// ============================================

function renderMonthlyBreakdown() {
  const container = document.getElementById('monthly-breakdown');
  const card = document.getElementById('monthly-breakdown-card');
  const monthData = appData.months[currentViewMonth];

  if (!monthData || (monthData.income.length === 0 && monthData.fixedExpenses.length === 0 && monthData.creditCards.length === 0)) {
    card.style.display = 'none';
    return;
  }
  card.style.display = 'block';

  const partnerName = appData.settings.partnerName || 'Matt';

  // Categorize income by person
  let carlyIncome = 0, mattIncome = 0, sharedIncome = 0;
  const carlyIncomeItems = [];
  const mattIncomeItems = [];
  const sharedIncomeItems = [];

  (monthData.income || []).forEach(inc => {
    const cat = inc.category || '';
    if (INCOME_STREAMS.carly.keys.includes(cat)) {
      carlyIncome += inc.amount;
      carlyIncomeItems.push(inc);
    } else if (INCOME_STREAMS.matt.keys.includes(cat)) {
      mattIncome += inc.amount;
      mattIncomeItems.push(inc);
    } else {
      sharedIncome += inc.amount;
      sharedIncomeItems.push(inc);
    }
  });

  // Categorize expenses by person
  // Credit cards: Chase Business (Carly) is Carly's, rest are shared/Matt
  let carlyExpenses = 0, mattExpenses = 0, sharedExpenses = 0;
  const carlyExpenseItems = [];
  const mattExpenseItems = [];
  const sharedExpenseItems = [];

  (monthData.creditCards || []).forEach(card => {
    const name = (card.name || '').toLowerCase();
    if (name.includes('carly') || name.includes('business')) {
      carlyExpenses += card.total;
      carlyExpenseItems.push({ name: card.name, amount: card.total });
    } else {
      sharedExpenses += card.total;
      sharedExpenseItems.push({ name: card.name, amount: card.total });
    }
  });

  (monthData.fixedExpenses || []).forEach(exp => {
    // Most fixed expenses come from BofA (Matt's account) so treat as shared
    sharedExpenses += exp.amount;
    sharedExpenseItems.push({ name: exp.name, amount: exp.amount });
  });

  const surprise = parseFloat(monthData.surpriseSpend) || 0;
  if (surprise > 0) {
    sharedExpenses += surprise;
    sharedExpenseItems.push({ name: 'Surprise Spend', amount: surprise });
  }

  const totalIncome = carlyIncome + mattIncome + sharedIncome;
  const totalExpenses = carlyExpenses + mattExpenses + sharedExpenses;

  // Build toggle
  let html = `
    <div class="revenue-toggle-row">
      <div class="revenue-toggles">
        <button class="revenue-toggle ${monthlyBreakdownView === 'everyone' ? 'active' : ''}" onclick="switchMonthlyBreakdownView('everyone')">Everyone</button>
        <button class="revenue-toggle ${monthlyBreakdownView === 'carly' ? 'active' : ''}" onclick="switchMonthlyBreakdownView('carly')">Carly</button>
        <button class="revenue-toggle ${monthlyBreakdownView === 'partner' ? 'active' : ''}" onclick="switchMonthlyBreakdownView('partner')">${partnerName}</button>
      </div>
    </div>
  `;

  if (monthlyBreakdownView === 'everyone') {
    html += renderBreakdownEveryone(partnerName, carlyIncome, mattIncome, sharedIncome, totalIncome, carlyExpenses, mattExpenses, sharedExpenses, totalExpenses);
  } else if (monthlyBreakdownView === 'carly') {
    html += renderBreakdownPerson('Carly', carlyIncomeItems, carlyIncome, carlyExpenseItems, carlyExpenses, sharedIncomeItems, sharedIncome, sharedExpenseItems, sharedExpenses);
  } else {
    html += renderBreakdownPerson(partnerName, mattIncomeItems, mattIncome, mattExpenseItems, mattExpenses, sharedIncomeItems, sharedIncome, sharedExpenseItems, sharedExpenses);
  }

  container.innerHTML = html;
}

function renderBreakdownEveryone(partnerName, carlyIncome, mattIncome, sharedIncome, totalIncome, carlyExpenses, mattExpenses, sharedExpenses, totalExpenses) {
  const totalSaved = totalIncome - totalExpenses;
  let html = '<div class="revenue-summary-row">';

  html += `<div class="revenue-total-card">
    <div class="stat-label">Total Income</div>
    <div class="stat-value" style="font-size:1.4rem;">${formatCurrency(totalIncome)}</div>
  </div>`;
  html += `<div class="revenue-total-card">
    <div class="stat-label">Total Expenses</div>
    <div class="stat-value" style="font-size:1.4rem;">${formatCurrency(totalExpenses)}</div>
  </div>`;
  html += `<div class="revenue-total-card">
    <div class="stat-label">Saved</div>
    <div class="stat-value" style="font-size:1.4rem; color: ${totalSaved >= 0 ? 'var(--accent-green)' : 'var(--accent-red)'};">${formatCurrency(totalSaved)}</div>
  </div>`;

  html += '</div>';

  // Income breakdown
  html += '<div class="revenue-table-wrap"><table><thead><tr><th>Income</th><th style="text-align:right;">Amount</th></tr></thead><tbody>';
  html += `<tr><td style="color:var(--accent-pink);">Carly</td><td style="text-align:right; font-family:'Roboto Mono',monospace; font-size:0.82rem;">${formatCurrency(carlyIncome)}</td></tr>`;
  html += `<tr><td style="color:var(--accent-blue);">${partnerName}</td><td style="text-align:right; font-family:'Roboto Mono',monospace; font-size:0.82rem;">${formatCurrency(mattIncome)}</td></tr>`;
  if (sharedIncome > 0) {
    html += `<tr><td style="color:var(--text-muted);">Other</td><td style="text-align:right; font-family:'Roboto Mono',monospace; font-size:0.82rem;">${formatCurrency(sharedIncome)}</td></tr>`;
  }
  html += '</tbody></table></div>';

  // Expense breakdown
  html += '<div class="revenue-table-wrap"><table><thead><tr><th>Expenses</th><th style="text-align:right;">Amount</th></tr></thead><tbody>';
  if (carlyExpenses > 0) {
    html += `<tr><td style="color:var(--accent-pink);">Carly (cards)</td><td style="text-align:right; font-family:'Roboto Mono',monospace; font-size:0.82rem;">${formatCurrency(carlyExpenses)}</td></tr>`;
  }
  html += `<tr><td style="color:var(--text-muted);">Shared</td><td style="text-align:right; font-family:'Roboto Mono',monospace; font-size:0.82rem;">${formatCurrency(sharedExpenses)}</td></tr>`;
  html += '</tbody></table></div>';

  return html;
}

function renderBreakdownPerson(name, incomeItems, personalIncome, expenseItems, personalExpenses, sharedIncomeItems, sharedIncome, sharedExpenseItems, sharedExpenses) {
  const totalPersonIncome = personalIncome + sharedIncome;
  const totalPersonExpenses = personalExpenses + sharedExpenses;
  const saved = totalPersonIncome - totalPersonExpenses;

  let html = '<div class="revenue-summary-row">';
  html += `<div class="revenue-total-card">
    <div class="stat-label">${name}'s Income</div>
    <div class="stat-value" style="font-size:1.4rem;">${formatCurrency(personalIncome)}</div>
  </div>`;
  html += `<div class="revenue-total-card">
    <div class="stat-label">${name}'s Expenses</div>
    <div class="stat-value" style="font-size:1.4rem;">${formatCurrency(personalExpenses)}</div>
  </div>`;
  html += '</div>';

  // Income detail
  if (incomeItems.length > 0) {
    html += '<div class="revenue-table-wrap"><table><thead><tr><th>Income</th><th style="text-align:right;">Amount</th></tr></thead><tbody>';
    incomeItems.forEach(inc => {
      const label = INCOME_STREAMS.carly.labels?.[inc.category] || INCOME_STREAMS.matt.labels?.[inc.category] || inc.category;
      html += `<tr><td>${label}</td><td style="text-align:right; font-family:'Roboto Mono',monospace; font-size:0.82rem;">${formatCurrency(inc.amount)}</td></tr>`;
    });
    html += `<tr style="font-weight:600;"><td>Total</td><td style="text-align:right; font-family:'Roboto Mono',monospace; font-size:0.82rem;">${formatCurrency(personalIncome)}</td></tr>`;
    html += '</tbody></table></div>';
  }

  // Expense detail
  if (expenseItems.length > 0) {
    html += '<div class="revenue-table-wrap"><table><thead><tr><th>Expenses</th><th style="text-align:right;">Amount</th></tr></thead><tbody>';
    expenseItems.forEach(exp => {
      html += `<tr><td>${exp.name}</td><td style="text-align:right; font-family:'Roboto Mono',monospace; font-size:0.82rem;">${formatCurrency(exp.amount)}</td></tr>`;
    });
    html += `<tr style="font-weight:600;"><td>Total</td><td style="text-align:right; font-family:'Roboto Mono',monospace; font-size:0.82rem;">${formatCurrency(personalExpenses)}</td></tr>`;
    html += '</tbody></table></div>';
  }

  // Shared section
  if (sharedIncomeItems.length > 0 || sharedExpenseItems.length > 0) {
    html += `<div style="margin-top:16px; padding-top:12px; border-top:1px solid var(--border);">`;
    html += `<div class="card-label" style="margin-bottom:10px;">Shared / Household</div>`;

    if (sharedIncomeItems.length > 0) {
      html += '<div class="revenue-table-wrap"><table><thead><tr><th>Shared Income</th><th style="text-align:right;">Amount</th></tr></thead><tbody>';
      sharedIncomeItems.forEach(inc => {
        html += `<tr><td>${inc.category}${inc.notes ? ' — ' + inc.notes : ''}</td><td style="text-align:right; font-family:'Roboto Mono',monospace; font-size:0.82rem;">${formatCurrency(inc.amount)}</td></tr>`;
      });
      html += '</tbody></table></div>';
    }

    if (sharedExpenseItems.length > 0) {
      html += '<div class="revenue-table-wrap"><table><thead><tr><th>Shared Expenses</th><th style="text-align:right;">Amount</th></tr></thead><tbody>';
      sharedExpenseItems.forEach(exp => {
        html += `<tr><td>${exp.name}</td><td style="text-align:right; font-family:'Roboto Mono',monospace; font-size:0.82rem;">${formatCurrency(exp.amount)}</td></tr>`;
      });
      html += '</tbody></table></div>';
    }

    html += '</div>';
  }

  return html;
}

function changeMonth(delta) {
  if (delta === -1) currentViewMonth = getPreviousYearMonth(currentViewMonth);
  if (delta === 1) currentViewMonth = getNextYearMonth(currentViewMonth);
  render_monthly();
}

// ============================================
// Load existing month data into form
// ============================================

function loadMonthData(yearMonth) {
  const monthData = appData.months[yearMonth];
  const partnerName = appData.settings.partnerName || 'Partner';

  // Set partner name
  const partnerNameEl = document.getElementById('pulse-partner-name');
  if (partnerNameEl) partnerNameEl.textContent = partnerName;

  // Clear all rows
  document.getElementById('monthly-income-rows').innerHTML = '';
  document.getElementById('monthly-fixed-rows').innerHTML = '';
  document.getElementById('monthly-cc-rows').innerHTML = '';
  document.getElementById('monthly-allocations-rows').innerHTML = '';

  if (monthData) {
    // Load income
    (monthData.income || []).forEach(item => addIncomeRow(item.category, item.amount, item.notes));
    // Load fixed expenses
    (monthData.fixedExpenses || []).forEach(item => addFixedExpenseRow(item.name, item.amount, item.notes));
    // Load credit cards
    (monthData.creditCards || []).forEach(card => addCreditCardRow(card.name, card.total, card.categories));
    // Load surprise spend
    document.getElementById('monthly-surprise-amount').value = monthData.surpriseSpend || '';
    document.getElementById('monthly-surprise-notes').value = monthData.surpriseNotes || '';
    // Load savings allocations
    (monthData.savingsAllocations || []).forEach(item => addSavingsAllocationRow(item.account, item.amount));
    // Load pulse
    loadPulseData(monthData.pulse);
    // Show summary bar
    showMonthlySummary(monthData);
  } else {
    // Empty form with default rows
    addIncomeRow();
    addIncomeRow();
    addFixedExpenseRow();
    addFixedExpenseRow();
    addFixedExpenseRow();
    addCreditCardRow();
    document.getElementById('monthly-surprise-amount').value = '';
    document.getElementById('monthly-surprise-notes').value = '';
    loadPulseData(null);
    document.getElementById('monthly-summary-bar').style.display = 'none';
  }

  // Build pulse feeling selectors
  buildFeelingSelector('pulse-carly', monthData?.pulse?.carlyFeeling || 0);
  buildFeelingSelector('pulse-partner', monthData?.pulse?.partnerFeeling || 0);

  updateMonthlyTotals();
}

// ============================================
// Summary bar for existing data
// ============================================

function showMonthlySummary(monthData) {
  const bar = document.getElementById('monthly-summary-bar');
  const totals = calculateMonthTotals(monthData);
  const prevMonth = getPreviousYearMonth(currentViewMonth);
  const prevData = appData.months[prevMonth];

  let comparisonHTML = '';
  if (prevData) {
    const prevTotals = calculateMonthTotals(prevData);
    const expDiff = totals.totalExpenses - prevTotals.totalExpenses;
    const expClass = expDiff <= 0 ? 'positive' : 'negative';
    comparisonHTML = `
      <div class="summary-stat">
        <span class="card-label">vs. Last Month</span>
        <span class="summary-stat-value month-comparison ${expClass}">
          ${expDiff >= 0 ? '+' : ''}${formatCurrency(expDiff)} expenses
        </span>
      </div>
    `;
  }

  bar.style.display = 'flex';
  bar.innerHTML = `
    <div class="summary-stat">
      <span class="card-label">Income</span>
      <span class="summary-stat-value">${formatCurrency(totals.totalIncome)}</span>
    </div>
    <div class="summary-stat">
      <span class="card-label">Expenses</span>
      <span class="summary-stat-value">${formatCurrency(totals.totalExpenses)}</span>
    </div>
    <div class="summary-stat">
      <span class="card-label">Saved</span>
      <span class="summary-stat-value" style="color: ${totals.totalSaved >= 0 ? 'var(--accent-green)' : 'var(--accent-red)'}">
        ${formatCurrency(totals.totalSaved)}
      </span>
    </div>
    <div class="summary-stat">
      <span class="card-label">Rate</span>
      <span class="summary-stat-value">${formatPercent(totals.savingsRate)}</span>
    </div>
    ${comparisonHTML}
  `;
}

// ============================================
// Income Rows
// ============================================

function addIncomeRow(category, amount, notes) {
  const container = document.getElementById('monthly-income-rows');
  const categories = appData.settings.incomeCategories;

  const row = document.createElement('div');
  row.className = 'monthly-row';
  row.innerHTML = `
    <select class="form-select category-select" onchange="updateMonthlyTotals()">
      <option value="">Category</option>
      ${categories.map(c => `<option value="${c}" ${c === category ? 'selected' : ''}>${c}</option>`).join('')}
    </select>
    <div class="amount-input-wrap">
      <span class="amount-prefix">$</span>
      <input type="number" class="form-input amount-field" value="${amount || ''}" placeholder="0" onchange="updateMonthlyTotals()">
    </div>
    <input type="text" class="form-input notes-input" value="${notes || ''}" placeholder="Notes">
    <button class="row-delete" onclick="this.parentElement.remove(); updateMonthlyTotals();">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
    </button>
  `;
  container.appendChild(row);
}

// ============================================
// Fixed Expense Rows
// ============================================

function addFixedExpenseRow(name, amount, notes) {
  const container = document.getElementById('monthly-fixed-rows');

  const row = document.createElement('div');
  row.className = 'monthly-row';
  row.innerHTML = `
    <input type="text" class="form-input name-input" value="${name || ''}" placeholder="Expense name (e.g., Rent, Electric)">
    <div class="amount-input-wrap">
      <span class="amount-prefix">$</span>
      <input type="number" class="form-input amount-field" value="${amount || ''}" placeholder="0" onchange="updateMonthlyTotals()">
    </div>
    <input type="text" class="form-input notes-input" value="${notes || ''}" placeholder="Notes">
    <button class="row-delete" onclick="this.parentElement.remove(); updateMonthlyTotals();">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
    </button>
  `;
  container.appendChild(row);
}

// ============================================
// Credit Card Rows
// ============================================

function addCreditCardRow(name, total, categories) {
  const container = document.getElementById('monthly-cc-rows');
  const spendCategories = appData.settings.spendCategories;
  const id = 'cc-' + generateId();

  const block = document.createElement('div');
  block.className = 'cc-card-block';
  block.id = id;
  block.innerHTML = `
    <div class="cc-card-header">
      <input type="text" class="form-input name-input" value="${name || ''}" placeholder="Card name (e.g., Chase Sapphire)">
      <div class="currency-input" style="width:140px;">
        <input type="number" class="form-input cc-total-input" value="${total || ''}" placeholder="0" onchange="updateMonthlyTotals()">
      </div>
      <button class="row-delete" onclick="this.closest('.cc-card-block').remove(); updateMonthlyTotals();">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    </div>
    <div class="cc-categories" data-cc-id="${id}"></div>
    <button class="cc-add-category" onclick="addCCCategory('${id}')">+ break down by category (optional)</button>
  `;
  container.appendChild(block);

  // Load existing categories
  if (categories && categories.length > 0) {
    categories.forEach(cat => addCCCategory(id, cat.category, cat.amount));
  }
}

function addCCCategory(blockId, category, amount) {
  const container = document.querySelector(`[data-cc-id="${blockId}"]`);
  if (!container) return;
  const spendCategories = appData.settings.spendCategories;

  const row = document.createElement('div');
  row.className = 'cc-category-row';
  row.innerHTML = `
    <select class="form-select" style="width:160px;">
      <option value="">Category</option>
      ${spendCategories.map(c => `<option value="${c}" ${c === category ? 'selected' : ''}>${c}</option>`).join('')}
    </select>
    <div class="currency-input" style="width:140px;">
      <input type="number" class="form-input" value="${amount || ''}" placeholder="0">
    </div>
    <button class="row-delete" onclick="this.parentElement.remove();">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
    </button>
  `;
  container.appendChild(row);
}

// ============================================
// Savings Allocation Rows
// ============================================

function addSavingsAllocationRow(account, amount) {
  const container = document.getElementById('monthly-allocations-rows');

  const row = document.createElement('div');
  row.className = 'monthly-row';
  row.innerHTML = `
    <input type="text" class="form-input name-input" value="${account || ''}" placeholder="Account or goal (e.g., Emergency Fund, 401k)">
    <div class="amount-input-wrap">
      <span class="amount-prefix">$</span>
      <input type="number" class="form-input amount-field" value="${amount || ''}" placeholder="0">
    </div>
    <button class="row-delete" onclick="this.parentElement.remove();">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
    </button>
  `;
  container.appendChild(row);
}

// ============================================
// Feeling Selector
// ============================================

function buildFeelingSelector(containerId, selectedValue) {
  const container = document.getElementById(containerId);
  container.innerHTML = '';
  for (let i = 1; i <= 5; i++) {
    const dot = document.createElement('button');
    dot.className = `feeling-dot ${i <= selectedValue ? 'selected' : ''}`;
    dot.textContent = i;
    dot.onclick = () => selectFeeling(containerId, i);
    container.appendChild(dot);
  }
}

function selectFeeling(containerId, value) {
  const container = document.getElementById(containerId);
  container.querySelectorAll('.feeling-dot').forEach((dot, idx) => {
    dot.classList.toggle('selected', idx < value);
  });
  container.dataset.value = value;
}

function getFeelingValue(containerId) {
  return parseInt(document.getElementById(containerId)?.dataset?.value) || 0;
}

// ============================================
// Load Pulse Data
// ============================================

function loadPulseData(pulse) {
  if (pulse) {
    document.getElementById('pulse-went-well').value = pulse.wentWell || '';
    document.getElementById('pulse-to-adjust').value = pulse.toAdjust || '';
    document.getElementById('pulse-notes').value = pulse.notes || '';
  } else {
    document.getElementById('pulse-went-well').value = '';
    document.getElementById('pulse-to-adjust').value = '';
    document.getElementById('pulse-notes').value = '';
  }
}

// ============================================
// Update Totals (live calculation)
// ============================================

function updateMonthlyTotals() {
  // Income
  let totalIncome = 0;
  document.querySelectorAll('#monthly-income-rows .monthly-row').forEach(row => {
    const val = parseFloat(row.querySelector('.amount-field')?.value) || 0;
    totalIncome += val;
  });
  document.getElementById('monthly-income-total').textContent = formatCurrency(totalIncome);

  // Fixed expenses
  let totalFixed = 0;
  document.querySelectorAll('#monthly-fixed-rows .monthly-row').forEach(row => {
    const val = parseFloat(row.querySelector('.amount-field')?.value) || 0;
    totalFixed += val;
  });
  document.getElementById('monthly-fixed-total').textContent = formatCurrency(totalFixed);

  // Credit cards
  let totalCC = 0;
  document.querySelectorAll('.cc-total-input').forEach(input => {
    totalCC += parseFloat(input.value) || 0;
  });
  document.getElementById('monthly-cc-total').textContent = formatCurrency(totalCC);

  // Surprise
  const surprise = parseFloat(document.getElementById('monthly-surprise-amount').value) || 0;

  // The math
  const totalExpenses = totalFixed + totalCC + surprise;
  const totalSaved = totalIncome - totalExpenses;
  const savingsRate = totalIncome > 0 ? (totalSaved / totalIncome) * 100 : 0;

  document.getElementById('math-income').textContent = formatCurrency(totalIncome);
  document.getElementById('math-expenses').textContent = formatCurrency(totalExpenses);
  document.getElementById('math-savings').textContent = formatCurrency(totalSaved);
  document.getElementById('math-savings').style.color = totalSaved >= 0 ? 'var(--accent-green)' : 'var(--accent-red)';
  document.getElementById('math-rate').textContent = formatPercent(savingsRate);
}

// ============================================
// Save Monthly Update
// ============================================

function saveMonthlyUpdate() {
  const monthData = getMonthTemplate(currentViewMonth);

  // Collect income
  document.querySelectorAll('#monthly-income-rows .monthly-row').forEach(row => {
    const category = row.querySelector('.category-select')?.value || '';
    const amount = parseFloat(row.querySelector('.amount-field')?.value) || 0;
    const notes = row.querySelector('.notes-input')?.value || '';
    if (amount > 0 || category) {
      monthData.income.push({ category, amount, notes });
    }
  });

  // Collect fixed expenses
  document.querySelectorAll('#monthly-fixed-rows .monthly-row').forEach(row => {
    const name = row.querySelector('.name-input')?.value || '';
    const amount = parseFloat(row.querySelector('.amount-field')?.value) || 0;
    const notes = row.querySelector('.notes-input')?.value || '';
    if (amount > 0 || name) {
      monthData.fixedExpenses.push({ name, amount, notes });
    }
  });

  // Collect credit cards
  document.querySelectorAll('.cc-card-block').forEach(block => {
    const name = block.querySelector('.name-input')?.value || '';
    const total = parseFloat(block.querySelector('.cc-total-input')?.value) || 0;
    const categories = [];
    block.querySelectorAll('.cc-category-row').forEach(catRow => {
      const cat = catRow.querySelector('.form-select')?.value || '';
      const amt = parseFloat(catRow.querySelector('.currency-input input')?.value) || 0;
      if (cat || amt > 0) categories.push({ category: cat, amount: amt });
    });
    if (total > 0 || name) {
      monthData.creditCards.push({ name, total, categories });
    }
  });

  // Surprise spend
  monthData.surpriseSpend = parseFloat(document.getElementById('monthly-surprise-amount').value) || 0;
  monthData.surpriseNotes = document.getElementById('monthly-surprise-notes').value || '';

  // Savings allocations
  document.querySelectorAll('#monthly-allocations-rows .monthly-row').forEach(row => {
    const account = row.querySelector('.name-input')?.value || '';
    const amount = parseFloat(row.querySelector('.amount-field')?.value) || 0;
    if (account || amount > 0) {
      monthData.savingsAllocations.push({ account, amount });
    }
  });

  // Pulse check
  monthData.pulse = {
    carlyFeeling: getFeelingValue('pulse-carly'),
    partnerFeeling: getFeelingValue('pulse-partner'),
    wentWell: document.getElementById('pulse-went-well').value,
    toAdjust: document.getElementById('pulse-to-adjust').value,
    notes: document.getElementById('pulse-notes').value
  };

  // Calculate totals
  monthData.totals = calculateMonthTotals(monthData);

  // Save
  appData.months[currentViewMonth] = monthData;
  saveData(appData);

  showMonthlySummary(monthData);
  renderMonthlyBreakdown();
  showToast(`${getMonthName(currentViewMonth)} saved!`);
}

// ============================================
// Clear Form
// ============================================

function clearMonthlyForm() {
  showConfirm('Clear all data for this month? This cannot be undone.', () => {
    delete appData.months[currentViewMonth];
    saveData(appData);
    loadMonthData(currentViewMonth);
    showToast('Month cleared', 'success');
  });
}
