/* ============================================
   MONTHLY UPDATE
   ============================================ */

let currentViewMonth = getCurrentYearMonth();
let monthlyBreakdownView = 'everyone'; // 'everyone', 'carly', 'partner'

function render_monthly() {
  document.getElementById('monthly-current-month').textContent = getMonthName(currentViewMonth);
  loadMonthData(currentViewMonth);
  renderMonthlyBreakdown();
  renderSpendingBreakdown();
}

function changeMonth(delta) {
  if (delta === -1) currentViewMonth = getPreviousYearMonth(currentViewMonth);
  if (delta === 1) currentViewMonth = getNextYearMonth(currentViewMonth);
  render_monthly();
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
  const cardEl = document.getElementById('monthly-breakdown-card');
  const monthData = appData.months[currentViewMonth];

  if (!monthData || (monthData.income.length === 0 && monthData.fixedExpenses.length === 0 && monthData.creditCards.length === 0)) {
    cardEl.style.display = 'none';
    return;
  }
  cardEl.style.display = 'block';

  const split = splitMonthByOwner(monthData);
  const partnerName = appData.settings.partnerName || 'Matt';

  let html = renderPersonToggle(monthlyBreakdownView, 'switchMonthlyBreakdownView');

  if (monthlyBreakdownView === 'everyone') {
    html += renderSplitEveryone(split, partnerName);
  } else {
    const who = monthlyBreakdownView === 'carly' ? 'carly' : 'matt';
    const name = monthlyBreakdownView === 'carly' ? 'Carly' : partnerName;
    html += renderSplitPerson(split, who, name);
  }

  container.innerHTML = html;
}

// Shared renderers used by monthly, quarterly, yearly
function renderSplitEveryone(split, partnerName) {
  const saved = split.everyone.saved;
  let html = '<div class="revenue-summary-row">';
  html += '<div class="revenue-total-card"><div class="stat-label">Total Income</div><div class="stat-value" style="font-size:1.4rem;">' + formatCurrency(split.everyone.incomeTotal) + '</div></div>';
  html += '<div class="revenue-total-card"><div class="stat-label">Total Expenses</div><div class="stat-value" style="font-size:1.4rem;">' + formatCurrency(split.everyone.expenseTotal) + '</div></div>';
  html += '<div class="revenue-total-card"><div class="stat-label">Saved</div><div class="stat-value" style="font-size:1.4rem; color:' + (saved >= 0 ? 'var(--accent-green)' : 'var(--accent-red)') + ';">' + formatCurrency(saved) + '</div></div>';
  html += '</div>';

  html += '<div class="revenue-table-wrap"><table><thead><tr><th>Income</th><th style="text-align:right;">Amount</th></tr></thead><tbody>';
  html += '<tr><td style="color:var(--accent-pink);">Carly</td><td style="text-align:right; font-family:\'Roboto Mono\',monospace; font-size:0.82rem;">' + formatCurrency(split.carly.incomeTotal) + '</td></tr>';
  html += '<tr><td style="color:var(--accent-blue);">' + partnerName + '</td><td style="text-align:right; font-family:\'Roboto Mono\',monospace; font-size:0.82rem;">' + formatCurrency(split.matt.incomeTotal) + '</td></tr>';
  if (split.shared.incomeTotal > 0) {
    html += '<tr><td style="color:var(--text-muted);">Other</td><td style="text-align:right; font-family:\'Roboto Mono\',monospace; font-size:0.82rem;">' + formatCurrency(split.shared.incomeTotal) + '</td></tr>';
  }
  html += '</tbody></table></div>';

  html += '<div class="revenue-table-wrap"><table><thead><tr><th>Expenses</th><th style="text-align:right;">Amount</th></tr></thead><tbody>';
  if (split.carly.expenseTotal > 0) {
    html += '<tr><td style="color:var(--accent-pink);">Carly</td><td style="text-align:right; font-family:\'Roboto Mono\',monospace; font-size:0.82rem;">' + formatCurrency(split.carly.expenseTotal) + '</td></tr>';
  }
  if (split.matt.expenseTotal > 0) {
    html += '<tr><td style="color:var(--accent-blue);">' + partnerName + '</td><td style="text-align:right; font-family:\'Roboto Mono\',monospace; font-size:0.82rem;">' + formatCurrency(split.matt.expenseTotal) + '</td></tr>';
  }
  if (split.shared.expenseTotal > 0) {
    html += '<tr><td style="color:var(--text-muted);">Shared</td><td style="text-align:right; font-family:\'Roboto Mono\',monospace; font-size:0.82rem;">' + formatCurrency(split.shared.expenseTotal) + '</td></tr>';
  }
  html += '</tbody></table></div>';
  return html;
}

function renderSplitPerson(split, who, name) {
  const person = split[who];
  const personSaved = person.incomeTotal - person.expenseTotal;

  let html = '<div class="revenue-summary-row">';
  html += '<div class="revenue-total-card"><div class="stat-label">' + name + '\'s Income</div><div class="stat-value" style="font-size:1.4rem;">' + formatCurrency(person.incomeTotal) + '</div></div>';
  html += '<div class="revenue-total-card"><div class="stat-label">' + name + '\'s Expenses</div><div class="stat-value" style="font-size:1.4rem;">' + formatCurrency(person.expenseTotal) + '</div></div>';
  html += '<div class="revenue-total-card"><div class="stat-label">' + name + '\'s Saved</div><div class="stat-value" style="font-size:1.4rem; color:' + (personSaved >= 0 ? 'var(--accent-green)' : 'var(--accent-red)') + ';">' + formatCurrency(personSaved) + '</div></div>';
  html += '</div>';

  if (person.income.length > 0) {
    html += '<div class="revenue-table-wrap"><table><thead><tr><th>Income</th><th style="text-align:right;">Amount</th></tr></thead><tbody>';
    person.income.forEach(function(inc) {
      html += '<tr><td>' + getIncomeLabel(inc.category) + '</td><td style="text-align:right; font-family:\'Roboto Mono\',monospace; font-size:0.82rem;">' + formatCurrency(inc.amount) + '</td></tr>';
    });
    html += '<tr style="font-weight:600;"><td>Total</td><td style="text-align:right; font-family:\'Roboto Mono\',monospace; font-size:0.82rem;">' + formatCurrency(person.incomeTotal) + '</td></tr>';
    html += '</tbody></table></div>';
  }

  if (person.expenses.length > 0) {
    html += '<div class="revenue-table-wrap"><table><thead><tr><th>Expenses</th><th style="text-align:right;">Amount</th></tr></thead><tbody>';
    person.expenses.forEach(function(exp) {
      html += '<tr><td>' + exp.name + '</td><td style="text-align:right; font-family:\'Roboto Mono\',monospace; font-size:0.82rem;">' + formatCurrency(exp.amount) + '</td></tr>';
    });
    html += '<tr style="font-weight:600;"><td>Total</td><td style="text-align:right; font-family:\'Roboto Mono\',monospace; font-size:0.82rem;">' + formatCurrency(person.expenseTotal) + '</td></tr>';
    html += '</tbody></table></div>';
  }

  if (split.shared.incomeTotal > 0 || split.shared.expenseTotal > 0) {
    html += '<div style="margin-top:16px; padding-top:12px; border-top:1px solid var(--border);">';
    html += '<div class="card-label" style="margin-bottom:10px;">Shared / Household</div>';
    if (split.shared.income.length > 0) {
      html += '<div class="revenue-table-wrap"><table><thead><tr><th>Shared Income</th><th style="text-align:right;">Amount</th></tr></thead><tbody>';
      split.shared.income.forEach(function(inc) {
        html += '<tr><td>' + inc.category + (inc.notes ? ' \u2014 ' + inc.notes : '') + '</td><td style="text-align:right; font-family:\'Roboto Mono\',monospace; font-size:0.82rem;">' + formatCurrency(inc.amount) + '</td></tr>';
      });
      html += '</tbody></table></div>';
    }
    if (split.shared.expenses.length > 0) {
      html += '<div class="revenue-table-wrap"><table><thead><tr><th>Shared Expenses</th><th style="text-align:right;">Amount</th></tr></thead><tbody>';
      split.shared.expenses.forEach(function(exp) {
        html += '<tr><td>' + exp.name + '</td><td style="text-align:right; font-family:\'Roboto Mono\',monospace; font-size:0.82rem;">' + formatCurrency(exp.amount) + '</td></tr>';
      });
      html += '</tbody></table></div>';
    }
    html += '</div>';
  }
  return html;
}

// ============================================
// Load existing month data into form
// ============================================

function loadMonthData(yearMonth) {
  const monthData = appData.months[yearMonth];
  const partnerName = appData.settings.partnerName || 'Partner';

  const partnerNameEl = document.getElementById('pulse-partner-name');
  if (partnerNameEl) partnerNameEl.textContent = partnerName;

  document.getElementById('monthly-income-rows').innerHTML = '';
  document.getElementById('monthly-fixed-rows').innerHTML = '';
  document.getElementById('monthly-cc-rows').innerHTML = '';
  document.getElementById('monthly-allocations-rows').innerHTML = '';

  if (monthData) {
    (monthData.income || []).forEach(item => addIncomeRow(item.category, item.amount, item.notes));
    (monthData.fixedExpenses || []).forEach(item => addFixedExpenseRow(item.name, item.amount, item.notes));
    (monthData.creditCards || []).forEach(card => addCreditCardRow(card.name, card.total, card.categories));
    document.getElementById('monthly-surprise-amount').value = monthData.surpriseSpend || '';
    document.getElementById('monthly-surprise-notes').value = monthData.surpriseNotes || '';
    (monthData.savingsAllocations || []).forEach(item => addSavingsAllocationRow(item.account, item.amount));
    loadPulseData(monthData.pulse);
    showMonthlySummary(monthData);
  } else {
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
    comparisonHTML = '<div class="summary-stat"><span class="card-label">vs. Last Month</span><span class="summary-stat-value month-comparison ' + expClass + '">' + (expDiff >= 0 ? '+' : '') + formatCurrency(expDiff) + ' expenses</span></div>';
  }

  bar.style.display = 'flex';
  bar.innerHTML = '<div class="summary-stat"><span class="card-label">Income</span><span class="summary-stat-value">' + formatCurrency(totals.totalIncome) + '</span></div>' +
    '<div class="summary-stat"><span class="card-label">Expenses</span><span class="summary-stat-value">' + formatCurrency(totals.totalExpenses) + '</span></div>' +
    '<div class="summary-stat"><span class="card-label">Saved</span><span class="summary-stat-value" style="color: ' + (totals.totalSaved >= 0 ? 'var(--accent-green)' : 'var(--accent-red)') + '">' + formatCurrency(totals.totalSaved) + '</span></div>' +
    '<div class="summary-stat"><span class="card-label">Rate</span><span class="summary-stat-value">' + formatPercent(totals.savingsRate) + '</span></div>' +
    comparisonHTML;
}

// ============================================
// Income Rows
// ============================================

function addIncomeRow(category, amount, notes) {
  const container = document.getElementById('monthly-income-rows');
  const categories = appData.settings.incomeCategories;

  const row = document.createElement('div');
  row.className = 'monthly-row';
  row.innerHTML = '<select class="form-select category-select" onchange="updateMonthlyTotals()">' +
    '<option value="">Category</option>' +
    categories.map(function(c) { return '<option value="' + c + '"' + (c === category ? ' selected' : '') + '>' + c + '</option>'; }).join('') +
    '</select>' +
    '<div class="amount-input-wrap"><span class="amount-prefix">$</span><input type="number" class="form-input amount-field" value="' + (amount || '') + '" placeholder="0" onchange="updateMonthlyTotals()"></div>' +
    '<input type="text" class="form-input notes-input" value="' + (notes || '') + '" placeholder="Notes">' +
    '<button class="row-delete" onclick="this.parentElement.remove(); updateMonthlyTotals();"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>';
  container.appendChild(row);
}

// ============================================
// Fixed Expense Rows
// ============================================

function addFixedExpenseRow(name, amount, notes) {
  const container = document.getElementById('monthly-fixed-rows');

  const row = document.createElement('div');
  row.className = 'monthly-row';
  row.innerHTML = '<input type="text" class="form-input name-input" value="' + (name || '') + '" placeholder="Expense name (e.g., Rent, Electric)">' +
    '<div class="amount-input-wrap"><span class="amount-prefix">$</span><input type="number" class="form-input amount-field" value="' + (amount || '') + '" placeholder="0" onchange="updateMonthlyTotals()"></div>' +
    '<input type="text" class="form-input notes-input" value="' + (notes || '') + '" placeholder="Notes">' +
    '<button class="row-delete" onclick="this.parentElement.remove(); updateMonthlyTotals();"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>';
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
  block.innerHTML = '<div class="cc-card-header">' +
    '<input type="text" class="form-input name-input" value="' + (name || '') + '" placeholder="Card name (e.g., Chase Sapphire)">' +
    '<div class="currency-input" style="width:140px;"><input type="number" class="form-input cc-total-input" value="' + (total || '') + '" placeholder="0" onchange="updateMonthlyTotals()"></div>' +
    '<button class="row-delete" onclick="this.closest(\'.cc-card-block\').remove(); updateMonthlyTotals();"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>' +
    '</div>' +
    '<div class="cc-categories" data-cc-id="' + id + '"></div>' +
    '<button class="cc-add-category" onclick="addCCCategory(\'' + id + '\')">+ break down by category (optional)</button>';
  container.appendChild(block);

  if (categories && categories.length > 0) {
    categories.forEach(function(cat) { addCCCategory(id, cat.category, cat.amount); });
  }
}

function addCCCategory(blockId, category, amount) {
  const container = document.querySelector('[data-cc-id="' + blockId + '"]');
  if (!container) return;
  const spendCategories = appData.settings.spendCategories;

  const row = document.createElement('div');
  row.className = 'cc-category-row';
  row.innerHTML = '<select class="form-select" style="width:160px;">' +
    '<option value="">Category</option>' +
    spendCategories.map(function(c) { return '<option value="' + c + '"' + (c === category ? ' selected' : '') + '>' + c + '</option>'; }).join('') +
    '</select>' +
    '<div class="currency-input" style="width:140px;"><input type="number" class="form-input" value="' + (amount || '') + '" placeholder="0"></div>' +
    '<button class="row-delete" onclick="this.parentElement.remove();"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>';
  container.appendChild(row);
}

// ============================================
// Savings Allocation Rows
// ============================================

function addSavingsAllocationRow(account, amount) {
  const container = document.getElementById('monthly-allocations-rows');

  const row = document.createElement('div');
  row.className = 'monthly-row';
  row.innerHTML = '<input type="text" class="form-input name-input" value="' + (account || '') + '" placeholder="Account or goal (e.g., Emergency Fund, 401k)">' +
    '<div class="amount-input-wrap"><span class="amount-prefix">$</span><input type="number" class="form-input amount-field" value="' + (amount || '') + '" placeholder="0"></div>' +
    '<button class="row-delete" onclick="this.parentElement.remove();"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>';
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
    dot.className = 'feeling-dot ' + (i <= selectedValue ? 'selected' : '');
    dot.textContent = i;
    dot.onclick = (function(val) { return function() { selectFeeling(containerId, val); }; })(i);
    container.appendChild(dot);
  }
}

function selectFeeling(containerId, value) {
  const container = document.getElementById(containerId);
  container.querySelectorAll('.feeling-dot').forEach(function(dot, idx) {
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
  let totalIncome = 0;
  document.querySelectorAll('#monthly-income-rows .monthly-row').forEach(function(row) {
    totalIncome += parseFloat(row.querySelector('.amount-field')?.value) || 0;
  });
  document.getElementById('monthly-income-total').textContent = formatCurrency(totalIncome);

  let totalFixed = 0;
  document.querySelectorAll('#monthly-fixed-rows .monthly-row').forEach(function(row) {
    totalFixed += parseFloat(row.querySelector('.amount-field')?.value) || 0;
  });
  document.getElementById('monthly-fixed-total').textContent = formatCurrency(totalFixed);

  let totalCC = 0;
  document.querySelectorAll('.cc-total-input').forEach(function(input) {
    totalCC += parseFloat(input.value) || 0;
  });
  document.getElementById('monthly-cc-total').textContent = formatCurrency(totalCC);

  const surprise = parseFloat(document.getElementById('monthly-surprise-amount').value) || 0;
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

  document.querySelectorAll('#monthly-income-rows .monthly-row').forEach(function(row) {
    const category = row.querySelector('.category-select')?.value || '';
    const amount = parseFloat(row.querySelector('.amount-field')?.value) || 0;
    const notes = row.querySelector('.notes-input')?.value || '';
    if (amount > 0 || category) monthData.income.push({ category: category, amount: amount, notes: notes });
  });

  document.querySelectorAll('#monthly-fixed-rows .monthly-row').forEach(function(row) {
    const name = row.querySelector('.name-input')?.value || '';
    const amount = parseFloat(row.querySelector('.amount-field')?.value) || 0;
    const notes = row.querySelector('.notes-input')?.value || '';
    if (amount > 0 || name) monthData.fixedExpenses.push({ name: name, amount: amount, notes: notes });
  });

  document.querySelectorAll('.cc-card-block').forEach(function(block) {
    const name = block.querySelector('.name-input')?.value || '';
    const total = parseFloat(block.querySelector('.cc-total-input')?.value) || 0;
    const categories = [];
    block.querySelectorAll('.cc-category-row').forEach(function(catRow) {
      const cat = catRow.querySelector('.form-select')?.value || '';
      const amt = parseFloat(catRow.querySelector('.currency-input input')?.value) || 0;
      if (cat || amt > 0) categories.push({ category: cat, amount: amt });
    });
    if (total > 0 || name) monthData.creditCards.push({ name: name, total: total, categories: categories });
  });

  monthData.surpriseSpend = parseFloat(document.getElementById('monthly-surprise-amount').value) || 0;
  monthData.surpriseNotes = document.getElementById('monthly-surprise-notes').value || '';

  document.querySelectorAll('#monthly-allocations-rows .monthly-row').forEach(function(row) {
    const account = row.querySelector('.name-input')?.value || '';
    const amount = parseFloat(row.querySelector('.amount-field')?.value) || 0;
    if (account || amount > 0) monthData.savingsAllocations.push({ account: account, amount: amount });
  });

  monthData.pulse = {
    carlyFeeling: getFeelingValue('pulse-carly'),
    partnerFeeling: getFeelingValue('pulse-partner'),
    wentWell: document.getElementById('pulse-went-well').value,
    toAdjust: document.getElementById('pulse-to-adjust').value,
    notes: document.getElementById('pulse-notes').value
  };

  monthData.totals = calculateMonthTotals(monthData);
  appData.months[currentViewMonth] = monthData;
  saveData(appData);

  showMonthlySummary(monthData);
  renderMonthlyBreakdown();
  renderSpendingBreakdown();
  showToast(getMonthName(currentViewMonth) + ' saved!');
}

// ============================================
// Clear Form
// ============================================

function clearMonthlyForm() {
  showConfirm('Clear all data for this month? This cannot be undone.', function() {
    delete appData.months[currentViewMonth];
    saveData(appData);
    loadMonthData(currentViewMonth);
    showToast('Month cleared', 'success');
  });
}

// ============================================
// Spending Breakdown (Paid vs Charged)
// ============================================

function renderSpendingBreakdown() {
  var card = document.getElementById('monthly-spending-card');
  var summary = document.getElementById('monthly-spending-summary');
  var monthData = appData.months[currentViewMonth];

  if (!monthData || ((monthData.creditCards || []).length === 0 && (monthData.cardPayments || []).length === 0)) {
    card.style.display = 'none';
    return;
  }
  card.style.display = 'block';

  var payments = monthData.cardPayments || [];
  var statements = monthData.creditCards || [];
  var hasPayments = payments.length > 0;

  var totalPaid = payments.reduce(function(s, p) { return s + (p.amount || 0); }, 0);
  var totalCharged = statements.reduce(function(s, c) { return s + (c.total || 0); }, 0);
  var diff = totalPaid - totalCharged;

  var html = '';

  if (hasPayments) {
    // Summary: paid vs charged
    html += '<div style="display:flex; gap:16px; flex-wrap:wrap; margin-bottom:16px;">';
    html += '<div class="revenue-total-card" style="flex:1; min-width:140px;"><div class="stat-label">Paid from Banks</div><div class="stat-value" style="font-size:1.3rem;">' + formatCurrency(totalPaid) + '</div><div class="card-label" style="margin-top:4px;">Cash out the door</div></div>';
    html += '<div class="revenue-total-card" style="flex:1; min-width:140px;"><div class="stat-label">Charged on Cards</div><div class="stat-value" style="font-size:1.3rem;">' + formatCurrency(totalCharged) + '</div><div class="card-label" style="margin-top:4px;">Statement totals</div></div>';
    html += '<div class="revenue-total-card" style="flex:1; min-width:140px;"><div class="stat-label">Difference</div><div class="stat-value" style="font-size:1.3rem; color:' + (diff > 0 ? 'var(--accent-green)' : diff < 0 ? 'var(--accent-red)' : 'var(--text-muted)') + ';">' + (diff >= 0 ? '+' : '') + formatCurrency(diff) + '</div><div class="card-label" style="margin-top:4px;">' + (diff > 0 ? 'Paying down balance' : diff < 0 ? 'Balance growing' : 'Even') + '</div></div>';
    html += '</div>';

    // Per-card comparison
    var allCards = {};
    payments.forEach(function(p) { allCards[p.name] = allCards[p.name] || {}; allCards[p.name].paid = (allCards[p.name].paid || 0) + p.amount; });
    statements.forEach(function(c) { allCards[c.name] = allCards[c.name] || {}; allCards[c.name].charged = (allCards[c.name].charged || 0) + c.total; });

    html += '<div class="revenue-table-wrap"><table><thead><tr><th>Card</th><th style="text-align:right;">Paid</th><th style="text-align:right;">Charged</th><th style="text-align:right;">Diff</th></tr></thead><tbody>';
    Object.keys(allCards).sort().forEach(function(name) {
      var c = allCards[name];
      var p = c.paid || 0;
      var ch = c.charged || 0;
      var d = p - ch;
      html += '<tr><td>' + name + '</td>';
      html += '<td style="text-align:right; font-family:\'Roboto Mono\',monospace; font-size:0.82rem;">' + formatCurrency(p) + '</td>';
      html += '<td style="text-align:right; font-family:\'Roboto Mono\',monospace; font-size:0.82rem;">' + formatCurrency(ch) + '</td>';
      html += '<td style="text-align:right; font-family:\'Roboto Mono\',monospace; font-size:0.82rem; color:' + (d > 0 ? 'var(--accent-green)' : d < 0 ? 'var(--accent-red)' : 'var(--text-muted)') + ';">' + (d >= 0 ? '+' : '') + formatCurrency(d) + '</td>';
      html += '</tr>';
    });
    html += '</tbody></table></div>';
  } else {
    html += '<p style="font-size:0.82rem; color:var(--text-muted);">No bank payment data for this month. Showing statement totals only.</p>';
  }

  summary.innerHTML = html;
}

function toggleSpendingBreakdown() {
  var el = document.getElementById('monthly-spending-detail');
  var btn = document.getElementById('spending-toggle-btn');
  var monthData = appData.months[currentViewMonth];

  if (el.style.display === 'none') {
    el.style.display = 'block';
    btn.textContent = 'Hide Details';

    // Render category breakdown from card statements
    var statements = (monthData && monthData.creditCards) || [];
    var html = '<div style="margin-top:16px; padding-top:16px; border-top:1px solid var(--border);">';
    html += '<div class="card-label" style="margin-bottom:12px;">What was charged (by category)</div>';

    statements.forEach(function(card) {
      var cats = card.categories || [];
      if (cats.length === 0) return;

      html += '<div style="margin-bottom:16px;">';
      html += '<div style="font-size:0.85rem; font-weight:500; margin-bottom:8px;">' + card.name + ' <span style="color:var(--text-muted); font-family:\'Roboto Mono\',monospace; font-size:0.78rem;">' + formatCurrency(card.total) + '</span></div>';

      cats.sort(function(a, b) { return b.amount - a.amount; }).forEach(function(cat) {
        var pct = card.total > 0 ? (cat.amount / card.total * 100) : 0;
        html += '<div style="display:flex; justify-content:space-between; align-items:center; padding:4px 0 4px 12px; font-size:0.82rem;">';
        html += '<span style="color:var(--text-body);">' + (cat.category || 'Uncategorized') + '</span>';
        html += '<span style="font-family:\'Roboto Mono\',monospace; font-size:0.78rem; color:var(--text-muted);">' + formatCurrency(cat.amount) + ' <span style="color:var(--text-light);">(' + pct.toFixed(0) + '%)</span></span>';
        html += '</div>';
      });
      html += '</div>';
    });

    html += '</div>';
    el.innerHTML = html;
  } else {
    el.style.display = 'none';
    btn.textContent = 'Show Details';
  }
}
