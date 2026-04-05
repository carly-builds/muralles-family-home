/* ============================================
   MONTHLY UPDATE
   ============================================ */

let currentViewMonth = getCurrentYearMonth();

function render_monthly() {
  document.getElementById('monthly-current-month').textContent = getMonthName(currentViewMonth);
  loadMonthData(currentViewMonth);
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
