/* ============================================
   ACCOUNTS & ASSETS
   ============================================ */

function render_accounts() {
  renderAccountsSummary();
  renderAccountType('checking');
  renderAccountType('savings');
  renderAccountType('investment');
  renderAccountType('property');
  renderAccountType('vehicles');
  renderAccountType('other');
  renderDebts();
}

// ============================================
// Summary Stats
// ============================================

function renderAccountsSummary() {
  const nw = calculateNetWorth(appData);
  document.getElementById('acct-total-assets').textContent = formatCurrency(nw.assets);
  document.getElementById('acct-total-debts').textContent = formatCurrency(nw.liabilities);
  document.getElementById('acct-net-worth').textContent = formatCurrency(nw.netWorth);
  document.getElementById('acct-net-worth').style.color =
    nw.netWorth >= 0 ? 'var(--text-heading)' : 'var(--accent-red)';
}

// ============================================
// Render Account Type
// ============================================

function renderAccountType(type) {
  const container = document.getElementById(`acct-${type}`);
  const items = appData.accounts[type] || [];

  if (items.length === 0) {
    container.innerHTML = `<div class="empty-state" style="padding:20px;"><p style="font-size:0.85rem; color:var(--text-light);">None added yet.</p></div>`;
    return;
  }

  const valueField = ['property', 'vehicles', 'other'].includes(type) ? 'value' : 'balance';

  container.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>Name</th>
          ${type === 'savings' ? '<th>Purpose</th>' : ''}
          ${type === 'investment' ? '<th>Type</th>' : ''}
          ${type === 'property' ? '<th>Mortgage</th>' : ''}
          <th>Owner</th>
          <th style="text-align:right;">${valueField === 'value' ? 'Value' : 'Balance'}</th>
          <th style="width:60px;"></th>
        </tr>
      </thead>
      <tbody>
        ${items.map(item => `
          <tr>
            <td>${item.name}</td>
            ${type === 'savings' ? `<td><span class="badge badge-sage">${item.purpose || 'General'}</span></td>` : ''}
            ${type === 'investment' ? `<td>${item.type || 'General'}</td>` : ''}
            ${type === 'property' ? `<td>${item.mortgage ? formatCurrency(item.mortgage) : 'Paid off'}</td>` : ''}
            <td>${item.owner || 'Joint'}</td>
            <td style="text-align:right; font-family:'Roboto Mono',monospace; font-size:0.88rem;">${formatCurrency(item[valueField])}</td>
            <td style="text-align:right;">
              <button class="btn btn-ghost btn-sm" onclick="showEditAccount('${type}', '${item.id}')">Edit</button>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

// ============================================
// Add / Edit Account Modal
// ============================================

function showAddAccount(type) {
  const typeLabels = {
    checking: 'Checking Account',
    savings: 'Savings Account',
    investment: 'Investment Account',
    property: 'Property',
    vehicles: 'Vehicle',
    other: 'Other Asset'
  };

  const isValueType = ['property', 'vehicles', 'other'].includes(type);
  const valueLabel = isValueType ? 'Estimated Value' : 'Current Balance';

  let extraFields = '';
  if (type === 'savings') {
    extraFields = `
      <div class="form-group">
        <label class="form-label">Purpose / Label</label>
        <input type="text" class="form-input" id="acct-purpose" placeholder="e.g., Emergency Fund, Travel, House">
      </div>
    `;
  } else if (type === 'investment') {
    extraFields = `
      <div class="form-group">
        <label class="form-label">Account Type</label>
        <select class="form-select" id="acct-type">
          <option value="401k">401(k)</option>
          <option value="IRA">IRA</option>
          <option value="Roth IRA">Roth IRA</option>
          <option value="Brokerage">Brokerage</option>
          <option value="529">529 Plan</option>
          <option value="Other">Other</option>
        </select>
      </div>
    `;
  } else if (type === 'property') {
    extraFields = `
      <div class="form-group">
        <label class="form-label">Remaining Mortgage</label>
        <div class="currency-input">
          <input type="number" class="form-input" id="acct-mortgage" placeholder="0">
        </div>
      </div>
    `;
  }

  const partnerName = appData.settings.partnerName || 'Partner';

  showModal(`Add ${typeLabels[type]}`, `
    <div class="form-group">
      <label class="form-label">Name</label>
      <input type="text" class="form-input" id="acct-name" placeholder="e.g., Chase Checking, Fidelity 401k">
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">${valueLabel}</label>
        <div class="currency-input">
          <input type="number" class="form-input" id="acct-balance" placeholder="0">
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Owner</label>
        <select class="form-select" id="acct-owner">
          <option value="Joint">Joint</option>
          <option value="Carly">Carly</option>
          <option value="${partnerName}">${partnerName}</option>
        </select>
      </div>
    </div>
    ${extraFields}
  `, `
    <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
    <button class="btn btn-primary" onclick="saveAccount('${type}')">Add</button>
  `);
  document.getElementById('acct-name').focus();
}

function saveAccount(type, editId) {
  const name = document.getElementById('acct-name').value.trim();
  const balance = parseFloat(document.getElementById('acct-balance').value) || 0;
  const owner = document.getElementById('acct-owner').value;

  if (!name) { showToast('Give it a name', 'error'); return; }

  const isValueType = ['property', 'vehicles', 'other'].includes(type);
  const item = {
    id: editId || generateId(),
    name,
    owner,
    [isValueType ? 'value' : 'balance']: balance
  };

  // Extra fields
  if (type === 'savings') item.purpose = document.getElementById('acct-purpose')?.value || '';
  if (type === 'investment') item.type = document.getElementById('acct-type')?.value || '';
  if (type === 'property') item.mortgage = parseFloat(document.getElementById('acct-mortgage')?.value) || 0;

  if (editId) {
    const idx = appData.accounts[type].findIndex(a => a.id === editId);
    if (idx >= 0) appData.accounts[type][idx] = item;
  } else {
    appData.accounts[type].push(item);
  }

  saveData(appData);
  closeModal();
  render_accounts();
  showToast(editId ? 'Updated!' : 'Account added!');
}

function showEditAccount(type, id) {
  const item = (appData.accounts[type] || []).find(a => a.id === id);
  if (!item) return;

  showAddAccount(type);

  const isValueType = ['property', 'vehicles', 'other'].includes(type);
  document.getElementById('acct-name').value = item.name;
  document.getElementById('acct-balance').value = item[isValueType ? 'value' : 'balance'];
  document.getElementById('acct-owner').value = item.owner || 'Joint';

  if (type === 'savings' && document.getElementById('acct-purpose'))
    document.getElementById('acct-purpose').value = item.purpose || '';
  if (type === 'investment' && document.getElementById('acct-type'))
    document.getElementById('acct-type').value = item.type || '';
  if (type === 'property' && document.getElementById('acct-mortgage'))
    document.getElementById('acct-mortgage').value = item.mortgage || '';

  document.querySelector('.modal-header h3').textContent = `Edit ${item.name}`;
  document.querySelector('.modal-actions').innerHTML = `
    <button class="btn btn-danger" onclick="deleteAccount('${type}', '${id}')">Delete</button>
    <div style="flex:1;"></div>
    <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
    <button class="btn btn-primary" onclick="saveAccount('${type}', '${id}')">Save</button>
  `;
}

function deleteAccount(type, id) {
  appData.accounts[type] = (appData.accounts[type] || []).filter(a => a.id !== id);
  saveData(appData);
  closeModal();
  render_accounts();
  showToast('Removed');
}

// ============================================
// Debts
// ============================================

function renderDebts() {
  const container = document.getElementById('acct-debts');
  const debts = appData.debts || [];

  if (debts.length === 0) {
    container.innerHTML = `<div class="empty-state" style="padding:20px;"><p style="font-size:0.85rem; color:var(--text-light);">No debts tracked. (Nice if true!)</p></div>`;
    return;
  }

  container.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>Name</th>
          <th>Type</th>
          <th style="text-align:right;">Balance</th>
          <th style="text-align:right;">Original</th>
          <th style="text-align:right;">Rate</th>
          <th style="text-align:right;">Min Payment</th>
          <th>Progress</th>
          <th style="width:60px;"></th>
        </tr>
      </thead>
      <tbody>
        ${debts.map(d => {
          const pct = d.originalBalance > 0 ? ((1 - d.balance / d.originalBalance) * 100) : 0;
          return `
            <tr>
              <td>${d.name}</td>
              <td><span class="badge badge-pink">${d.type || 'Other'}</span></td>
              <td style="text-align:right; font-family:'Roboto Mono',monospace;">${formatCurrency(d.balance)}</td>
              <td style="text-align:right; font-family:'Roboto Mono',monospace; color:var(--text-muted);">${formatCurrency(d.originalBalance)}</td>
              <td style="text-align:right; font-family:'Roboto Mono',monospace;">${d.rate ? d.rate + '%' : '--'}</td>
              <td style="text-align:right; font-family:'Roboto Mono',monospace;">${d.minPayment ? formatCurrency(d.minPayment) : '--'}</td>
              <td style="width:100px;">
                <div class="progress-bar" style="height:6px;">
                  <div class="progress-fill pink" style="width:${pct}%"></div>
                </div>
                <span style="font-size:0.6rem; color:var(--text-muted);">${pct.toFixed(0)}% paid</span>
              </td>
              <td><button class="btn btn-ghost btn-sm" onclick="showEditDebt('${d.id}')">Edit</button></td>
            </tr>
          `;
        }).join('')}
      </tbody>
    </table>
  `;
}

function showAddDebt() {
  showModal('Add Debt', `
    <div class="form-group">
      <label class="form-label">Name</label>
      <input type="text" class="form-input" id="debt-name" placeholder="e.g., Chase Sapphire Balance, Student Loan">
    </div>
    <div class="form-group">
      <label class="form-label">Type</label>
      <select class="form-select" id="debt-type">
        <option value="Credit Card">Credit Card</option>
        <option value="Student Loan">Student Loan</option>
        <option value="Car Loan">Car Loan</option>
        <option value="Personal Loan">Personal Loan</option>
        <option value="Medical">Medical</option>
        <option value="Other">Other</option>
      </select>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Current Balance</label>
        <div class="currency-input">
          <input type="number" class="form-input" id="debt-balance" placeholder="0">
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Original Amount</label>
        <div class="currency-input">
          <input type="number" class="form-input" id="debt-original" placeholder="0">
        </div>
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Interest Rate (%)</label>
        <input type="number" class="form-input" id="debt-rate" placeholder="5.9" step="0.1">
      </div>
      <div class="form-group">
        <label class="form-label">Minimum Payment</label>
        <div class="currency-input">
          <input type="number" class="form-input" id="debt-min" placeholder="0">
        </div>
      </div>
    </div>
  `, `
    <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
    <button class="btn btn-primary" onclick="saveDebt()">Add</button>
  `);
  document.getElementById('debt-name').focus();
}

function saveDebt(editId) {
  const name = document.getElementById('debt-name').value.trim();
  const type = document.getElementById('debt-type').value;
  const balance = parseFloat(document.getElementById('debt-balance').value) || 0;
  const originalBalance = parseFloat(document.getElementById('debt-original').value) || balance;
  const rate = parseFloat(document.getElementById('debt-rate').value) || 0;
  const minPayment = parseFloat(document.getElementById('debt-min').value) || 0;

  if (!name) { showToast('Give it a name', 'error'); return; }

  const item = { id: editId || generateId(), name, type, balance, originalBalance, rate, minPayment };

  if (editId) {
    const idx = appData.debts.findIndex(d => d.id === editId);
    if (idx >= 0) appData.debts[idx] = item;
  } else {
    appData.debts.push(item);
  }

  saveData(appData);
  closeModal();
  render_accounts();
  showToast(editId ? 'Updated!' : 'Debt added');
}

function showEditDebt(id) {
  const debt = (appData.debts || []).find(d => d.id === id);
  if (!debt) return;

  showAddDebt();
  document.getElementById('debt-name').value = debt.name;
  document.getElementById('debt-type').value = debt.type || 'Other';
  document.getElementById('debt-balance').value = debt.balance;
  document.getElementById('debt-original').value = debt.originalBalance;
  document.getElementById('debt-rate').value = debt.rate || '';
  document.getElementById('debt-min').value = debt.minPayment || '';

  document.querySelector('.modal-header h3').textContent = `Edit ${debt.name}`;
  document.querySelector('.modal-actions').innerHTML = `
    <button class="btn btn-danger" onclick="deleteDebt('${id}')">Delete</button>
    <div style="flex:1;"></div>
    <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
    <button class="btn btn-primary" onclick="saveDebt('${id}')">Save</button>
  `;
}

function deleteDebt(id) {
  appData.debts = (appData.debts || []).filter(d => d.id !== id);
  saveData(appData);
  closeModal();
  render_accounts();
  showToast('Removed');
}
