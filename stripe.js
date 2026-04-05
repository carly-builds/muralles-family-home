/* ============================================
   STRIPE INTEGRATION

   Pulls income data from Stripe using their API.
   Requires a Stripe API key (restricted, read-only).

   This fetches balance transactions and categorizes
   them by Stripe product/description for Carly's
   income tracking.
   ============================================ */

const STRIPE_STORAGE_KEY = 'fcc-stripe-config';

function getStripeConfig() {
  try {
    return JSON.parse(localStorage.getItem(STRIPE_STORAGE_KEY)) || {};
  } catch { return {}; }
}

function saveStripeConfig(config) {
  localStorage.setItem(STRIPE_STORAGE_KEY, JSON.stringify(config));
}

// ============================================
// Stripe Settings Modal
// ============================================

function showStripeSettings() {
  const config = getStripeConfig();

  showModal('Stripe Integration', `
    <p style="font-size:0.85rem; color:var(--text-muted); margin-bottom:20px;">
      Connect your Stripe account to automatically pull in income data each month.
      You'll need a <strong>restricted API key</strong> with read-only access to Balance and Charges.
    </p>

    <div style="background:var(--accent-butter-light); padding:14px 18px; border-radius:var(--radius-md); margin-bottom:20px; font-size:0.82rem;">
      <strong>How to get your API key:</strong><br>
      1. Go to <strong>Stripe Dashboard > Developers > API Keys</strong><br>
      2. Click "Create restricted key"<br>
      3. Name it "Family Command Center"<br>
      4. Grant <strong>Read</strong> access to: Balance, Charges, Customers, Products<br>
      5. Copy the key (starts with <code>rk_live_</code> or <code>rk_test_</code>)
    </div>

    <div class="form-group">
      <label class="form-label">Stripe Restricted API Key</label>
      <input type="password" class="form-input" id="stripe-api-key"
        value="${config.apiKey || ''}"
        placeholder="rk_live_...">
    </div>

    <div class="form-group">
      <label class="form-label">Income Categories to Track</label>
      <p style="font-size:0.78rem; color:var(--text-muted); margin-bottom:8px;">
        We'll auto-categorize by Stripe product name. Map them to your income categories:
      </p>
      <div id="stripe-category-mappings">
        ${renderStripeMappings(config.mappings || getDefaultStripeMappings())}
      </div>
      <button class="btn btn-ghost btn-sm mt-sm" onclick="addStripeMapping()">+ Add Mapping</button>
    </div>

    ${config.lastSync ? `
      <div style="font-size:0.75rem; color:var(--text-muted); margin-top:12px;">
        Last synced: ${new Date(config.lastSync).toLocaleString()}
      </div>
    ` : ''}
  `, `
    <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
    <button class="btn btn-primary" onclick="saveStripeSettings()">Save & Sync</button>
  `);
}

function getDefaultStripeMappings() {
  return [
    { stripeDesc: 'Reach Out Party', appCategory: 'Stripe (Carly)' },
    { stripeDesc: 'TETHER', appCategory: 'Stripe (Carly)' },
    { stripeDesc: 'Coaching', appCategory: 'Stripe (Carly)' },
    { stripeDesc: 'Workshop', appCategory: 'Stripe (Carly)' },
    { stripeDesc: 'Momentum', appCategory: 'Consulting' }
  ];
}

function renderStripeMappings(mappings) {
  return mappings.map((m, i) => `
    <div class="monthly-row" style="margin-bottom:6px;">
      <input type="text" class="form-input" style="flex:1;" value="${m.stripeDesc}" placeholder="Stripe product/description contains...">
      <span style="color:var(--text-muted); font-size:0.8rem; padding:0 8px;">maps to</span>
      <select class="form-select" style="width:180px;">
        ${(appData.settings.incomeCategories || []).map(c =>
          `<option value="${c}" ${c === m.appCategory ? 'selected' : ''}>${c}</option>`
        ).join('')}
      </select>
      <button class="row-delete" onclick="this.parentElement.remove();">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    </div>
  `).join('');
}

function addStripeMapping() {
  const container = document.getElementById('stripe-category-mappings');
  const row = document.createElement('div');
  row.className = 'monthly-row';
  row.style.marginBottom = '6px';
  row.innerHTML = `
    <input type="text" class="form-input" style="flex:1;" placeholder="Stripe product/description contains...">
    <span style="color:var(--text-muted); font-size:0.8rem; padding:0 8px;">maps to</span>
    <select class="form-select" style="width:180px;">
      ${(appData.settings.incomeCategories || []).map(c => `<option value="${c}">${c}</option>`).join('')}
    </select>
    <button class="row-delete" onclick="this.parentElement.remove();">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
    </button>
  `;
  container.appendChild(row);
}

function saveStripeSettings() {
  const apiKey = document.getElementById('stripe-api-key').value.trim();
  const mappingRows = document.querySelectorAll('#stripe-category-mappings .monthly-row');
  const mappings = [];

  mappingRows.forEach(row => {
    const desc = row.querySelector('input').value.trim();
    const cat = row.querySelector('select').value;
    if (desc) mappings.push({ stripeDesc: desc, appCategory: cat });
  });

  const config = { apiKey, mappings };
  saveStripeConfig(config);

  if (apiKey) {
    closeModal();
    syncStripeData(config);
  } else {
    closeModal();
    showToast('Settings saved (no API key set)');
  }
}

// ============================================
// Stripe API Sync
// ============================================

async function syncStripeData(config) {
  if (!config.apiKey) {
    showToast('No Stripe API key configured', 'error');
    return;
  }

  showToast('Syncing with Stripe...');

  try {
    // Fetch balance transactions for the last 3 months
    const now = new Date();
    const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1);
    const startTimestamp = Math.floor(threeMonthsAgo.getTime() / 1000);

    let allTransactions = [];
    let hasMore = true;
    let startingAfter = null;

    while (hasMore) {
      let url = `https://api.stripe.com/v1/balance_transactions?limit=100&created[gte]=${startTimestamp}&type=charge`;
      if (startingAfter) url += `&starting_after=${startingAfter}`;

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${config.apiKey}`,
        }
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error?.message || 'Stripe API error');
      }

      const data = await response.json();
      allTransactions = allTransactions.concat(data.data);
      hasMore = data.has_more;
      if (data.data.length > 0) {
        startingAfter = data.data[data.data.length - 1].id;
      }
    }

    // Group by month and categorize
    const monthlyIncome = {};

    for (const txn of allTransactions) {
      const date = new Date(txn.created * 1000);
      const ym = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

      // Net amount (after Stripe fees) in dollars
      const amount = txn.net / 100;
      const description = txn.description || '';

      // Find matching category from mappings
      let category = 'Stripe (Carly)'; // default
      for (const mapping of config.mappings || []) {
        if (description.toLowerCase().includes(mapping.stripeDesc.toLowerCase())) {
          category = mapping.appCategory;
          break;
        }
      }

      if (!monthlyIncome[ym]) monthlyIncome[ym] = {};
      if (!monthlyIncome[ym][category]) monthlyIncome[ym][category] = 0;
      monthlyIncome[ym][category] += amount;
    }

    // Merge into app data
    let monthsUpdated = 0;
    for (const [ym, categories] of Object.entries(monthlyIncome)) {
      if (!appData.months[ym]) {
        appData.months[ym] = getMonthTemplate(ym);
      }

      const monthData = appData.months[ym];

      // Remove existing Stripe income entries
      monthData.income = monthData.income.filter(i =>
        !i.notes?.includes('[Stripe]') &&
        !i.category?.includes('Stripe')
      );

      // Add new Stripe income
      for (const [cat, amount] of Object.entries(categories)) {
        monthData.income.push({
          category: cat,
          amount: Math.round(amount * 100) / 100,
          notes: '[Stripe] Auto-synced'
        });
      }

      // Recalculate totals
      monthData.totals = calculateMonthTotals(monthData);
      monthsUpdated++;
    }

    // Save config with last sync timestamp
    config.lastSync = new Date().toISOString();
    saveStripeConfig(config);
    saveData(appData);

    showToast(`Stripe synced! ${allTransactions.length} transactions across ${monthsUpdated} months.`);

    // Re-render current view
    const currentSection = document.querySelector('.section.active')?.id;
    if (currentSection && typeof window[`render_${currentSection}`] === 'function') {
      window[`render_${currentSection}`]();
    }

  } catch (error) {
    console.error('Stripe sync error:', error);
    showToast(`Stripe error: ${error.message}`, 'error');

    // Show a more helpful modal if it's a CORS issue
    if (error.message.includes('Failed to fetch') || error.message.includes('CORS')) {
      showModal('Stripe Connection Issue', `
        <p style="margin-bottom:16px;">
          Direct browser-to-Stripe connections are blocked by CORS for security.
          You have two options:
        </p>
        <div style="background:var(--bg-warm-gray); padding:16px; border-radius:var(--radius-md); margin-bottom:12px;">
          <strong>Option A: Use the Stripe CLI (recommended)</strong><br>
          <p style="font-size:0.82rem; margin-top:6px;">
            Run the sync script from your terminal. We'll generate a script for you.
          </p>
        </div>
        <div style="background:var(--bg-warm-gray); padding:16px; border-radius:var(--radius-md);">
          <strong>Option B: Manual CSV import</strong><br>
          <p style="font-size:0.82rem; margin-top:6px;">
            Export payments from Stripe Dashboard > Payments > Export, then import here.
          </p>
        </div>
      `, `
        <button class="btn btn-secondary" onclick="closeModal()">Close</button>
        <button class="btn btn-primary" onclick="generateStripeSyncScript()">Generate Sync Script</button>
      `);
    }
  }
}

// ============================================
// Stripe CSV Import (fallback)
// ============================================

function showStripeCSVImport() {
  showModal('Import Stripe Data', `
    <p style="font-size:0.85rem; color:var(--text-muted); margin-bottom:16px;">
      Export your payments from Stripe Dashboard > Payments > Export (CSV), then upload here.
    </p>
    <div class="form-group">
      <label class="form-label">Stripe Payments CSV</label>
      <input type="file" class="form-input" id="stripe-csv-file" accept=".csv" style="padding:8px;">
    </div>
  `, `
    <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
    <button class="btn btn-primary" onclick="importStripeCSV()">Import</button>
  `);
}

async function importStripeCSV() {
  const fileInput = document.getElementById('stripe-csv-file');
  const file = fileInput?.files[0];
  if (!file) { showToast('Select a file', 'error'); return; }

  const text = await file.text();
  const lines = text.split('\n');
  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));

  const dateIdx = headers.findIndex(h => h.toLowerCase().includes('created'));
  const amountIdx = headers.findIndex(h => h.toLowerCase() === 'amount');
  const netIdx = headers.findIndex(h => h.toLowerCase() === 'net');
  const descIdx = headers.findIndex(h => h.toLowerCase().includes('description'));
  const statusIdx = headers.findIndex(h => h.toLowerCase() === 'status');

  if (dateIdx < 0 || (amountIdx < 0 && netIdx < 0)) {
    showToast('Could not parse CSV. Make sure it is a Stripe payments export.', 'error');
    return;
  }

  const config = getStripeConfig();
  const monthlyIncome = {};
  let count = 0;

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i]);
    if (!cols || cols.length < Math.max(dateIdx, amountIdx, netIdx) + 1) continue;

    const status = statusIdx >= 0 ? cols[statusIdx].replace(/"/g, '') : 'paid';
    if (status !== 'paid' && status !== 'Paid') continue;

    const dateStr = cols[dateIdx].replace(/"/g, '');
    const amount = parseFloat((cols[netIdx >= 0 ? netIdx : amountIdx] || '0').replace(/"/g, ''));
    const desc = (cols[descIdx] || '').replace(/"/g, '');

    if (amount <= 0) continue;

    const date = new Date(dateStr);
    if (isNaN(date.getTime())) continue;

    const ym = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

    let category = 'Stripe (Carly)';
    for (const mapping of config.mappings || []) {
      if (desc.toLowerCase().includes(mapping.stripeDesc.toLowerCase())) {
        category = mapping.appCategory;
        break;
      }
    }

    if (!monthlyIncome[ym]) monthlyIncome[ym] = {};
    if (!monthlyIncome[ym][category]) monthlyIncome[ym][category] = 0;
    monthlyIncome[ym][category] += amount;
    count++;
  }

  // Merge into app data
  for (const [ym, categories] of Object.entries(monthlyIncome)) {
    if (!appData.months[ym]) {
      appData.months[ym] = getMonthTemplate(ym);
    }

    const monthData = appData.months[ym];
    monthData.income = monthData.income.filter(i => !i.notes?.includes('[Stripe]'));

    for (const [cat, amount] of Object.entries(categories)) {
      monthData.income.push({
        category: cat,
        amount: Math.round(amount * 100) / 100,
        notes: '[Stripe] Imported from CSV'
      });
    }

    monthData.totals = calculateMonthTotals(monthData);
  }

  saveData(appData);
  closeModal();
  showToast(`Imported ${count} Stripe payments across ${Object.keys(monthlyIncome).length} months!`);

  const currentSection = document.querySelector('.section.active')?.id;
  if (currentSection && typeof window[`render_${currentSection}`] === 'function') {
    window[`render_${currentSection}`]();
  }
}

// Simple CSV line parser that handles quoted fields
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

// ============================================
// Generate a Node.js sync script for CLI use
// ============================================

function generateStripeSyncScript() {
  const config = getStripeConfig();

  const script = `#!/usr/bin/env node
/**
 * Stripe Sync Script for Family Command Center
 *
 * Usage:
 *   node stripe-sync.js
 *
 * Prerequisites:
 *   npm install stripe
 *
 * This fetches your Stripe balance transactions and outputs
 * a JSON file you can import into the app.
 */

const Stripe = require('stripe');
const fs = require('fs');

const stripe = Stripe('${config.apiKey || 'YOUR_STRIPE_RESTRICTED_KEY_HERE'}');

const MAPPINGS = ${JSON.stringify(config.mappings || getDefaultStripeMappings(), null, 2)};

async function sync() {
  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

  let allTxns = [];
  let hasMore = true;
  let startingAfter = null;

  while (hasMore) {
    const params = {
      limit: 100,
      created: { gte: Math.floor(threeMonthsAgo.getTime() / 1000) },
      type: 'charge'
    };
    if (startingAfter) params.starting_after = startingAfter;

    const result = await stripe.balanceTransactions.list(params);
    allTxns = allTxns.concat(result.data);
    hasMore = result.has_more;
    if (result.data.length > 0) startingAfter = result.data[result.data.length - 1].id;
  }

  console.log('Fetched ' + allTxns.length + ' transactions');

  // Group by month
  const monthly = {};
  for (const txn of allTxns) {
    const date = new Date(txn.created * 1000);
    const ym = date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0');
    const amount = txn.net / 100;
    const desc = txn.description || '';

    let category = 'Stripe (Carly)';
    for (const m of MAPPINGS) {
      if (desc.toLowerCase().includes(m.stripeDesc.toLowerCase())) {
        category = m.appCategory;
        break;
      }
    }

    if (!monthly[ym]) monthly[ym] = {};
    if (!monthly[ym][category]) monthly[ym][category] = 0;
    monthly[ym][category] += amount;
  }

  // Output
  const output = { stripeIncome: monthly, syncedAt: new Date().toISOString() };
  fs.writeFileSync('stripe-income.json', JSON.stringify(output, null, 2));
  console.log('Saved to stripe-income.json');
  console.log('Import this file in the app: Settings > Import Stripe Data');
}

sync().catch(console.error);
`;

  // Download the script
  const blob = new Blob([script], { type: 'application/javascript' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'stripe-sync.js';
  a.click();
  URL.revokeObjectURL(url);

  closeModal();
  showToast('Sync script downloaded! Run it with: node stripe-sync.js');
}
