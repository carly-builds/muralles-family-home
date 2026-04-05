/* ============================================
   DATA LAYER
   All data management, storage, and retrieval
   ============================================ */

const STORAGE_KEY = 'family-command-center';

// Default data structure
function getDefaultData() {
  return {
    // Monthly financial entries keyed by "YYYY-MM"
    months: {},

    // Accounts and assets
    accounts: {
      checking: [],    // { id, name, owner, balance }
      savings: [],     // { id, name, owner, balance, purpose }
      investment: [],  // { id, name, owner, balance, type }
      property: [],    // { id, name, value, mortgage }
      vehicles: [],    // { id, name, value }
      other: []        // { id, name, value }
    },

    // Debts
    debts: [],  // { id, name, type, balance, originalBalance, rate, minPayment }

    // Goals
    goals: {
      financial: [],  // { id, name, targetAmount, currentAmount, monthlyContribution, deadline, color, notes }
      family: [],     // { id, name, quarter, year, status, notes }
      personal: {
        carly: [],    // { id, name, quarter, year, status, notes }
        partner: []   // { id, name, quarter, year, status, notes }
      }
    },

    // Quarterly reviews keyed by "YYYY-QN"
    quarterlyReviews: {},

    // Yearly reviews keyed by "YYYY"
    yearlyReviews: {},

    // Settings
    settings: {
      partnerName: '',
      currency: 'USD',
      incomeCategories: ['Salary (Carly)', 'Salary (Partner)', 'Side Projects', 'Consulting', 'Dividends', 'Other'],
      spendCategories: ['Housing', 'Groceries', 'Dining Out', 'Transportation', 'Childcare', 'Subscriptions', 'Shopping', 'Travel', 'Health', 'Business Expenses', 'Entertainment', 'Gifts', 'Other'],
      quarterIntention: '',
      createdAt: new Date().toISOString()
    }
  };
}

// Get a monthly entry template
function getMonthTemplate(yearMonth) {
  return {
    yearMonth: yearMonth,
    income: [],        // { category, amount, notes }
    fixedExpenses: [],  // { name, amount, notes }
    creditCards: [],    // { name, total, categories: [{ category, amount }] }
    surpriseSpend: 0,
    surpriseNotes: '',
    savingsAllocations: [],  // { account, amount }

    // Pulse check
    pulse: {
      carlyFeeling: 0,    // 1-5
      partnerFeeling: 0,  // 1-5
      wentWell: '',
      toAdjust: '',
      notes: ''
    },

    // Computed (recalculated on save)
    totals: {
      totalIncome: 0,
      totalExpenses: 0,
      totalSaved: 0,
      savingsRate: 0
    }
  };
}

// Load data from localStorage
function loadData() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Merge with defaults to handle schema evolution
      return deepMerge(getDefaultData(), parsed);
    }
  } catch (e) {
    console.error('Error loading data:', e);
  }
  return getDefaultData();
}

// Save data to localStorage
function saveData(data) {
  try {
    data.lastUpdated = new Date().toISOString();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    // Cloud sync (fire-and-forget)
    if (typeof syncToCloud === 'function') {
      syncToCloud(data).catch(err => console.warn('Cloud sync:', err));
    }
    return true;
  } catch (e) {
    console.error('Error saving data:', e);
    return false;
  }
}

// Export data as JSON file download
function exportData() {
  const data = loadData();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `family-command-center-${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

// Import data from JSON file
function importData(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const imported = JSON.parse(e.target.result);
      // Basic validation
      if (imported.settings && imported.months !== undefined) {
        saveData(imported);
        location.reload();
      } else {
        alert('Invalid data file. Please use a file exported from Family Command Center.');
      }
    } catch (err) {
      alert('Could not read file. Make sure it is a valid JSON file.');
    }
  };
  reader.readAsText(file);
  event.target.value = '';
}

// Utility: deep merge objects
function deepMerge(target, source) {
  const output = { ...target };
  for (const key in source) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      output[key] = deepMerge(target[key] || {}, source[key]);
    } else {
      output[key] = source[key];
    }
  }
  return output;
}

// Utility: generate a simple unique ID
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

// Utility: format currency
function formatCurrency(amount) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount || 0);
}

// Utility: format currency with cents
function formatCurrencyExact(amount) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount || 0);
}

// Utility: format percentage
function formatPercent(value) {
  return (value || 0).toFixed(1) + '%';
}

// Utility: get month name
function getMonthName(yearMonth) {
  const [year, month] = yearMonth.split('-');
  const date = new Date(year, parseInt(month) - 1);
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

// Utility: get current year-month
function getCurrentYearMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

// Utility: get previous year-month
function getPreviousYearMonth(yearMonth) {
  const [year, month] = yearMonth.split('-').map(Number);
  if (month === 1) return `${year - 1}-12`;
  return `${year}-${String(month - 1).padStart(2, '0')}`;
}

// Utility: get next year-month
function getNextYearMonth(yearMonth) {
  const [year, month] = yearMonth.split('-').map(Number);
  if (month === 12) return `${year + 1}-01`;
  return `${year}-${String(month + 1).padStart(2, '0')}`;
}

// Calculate totals for a monthly entry
function calculateMonthTotals(monthData) {
  const totalIncome = (monthData.income || []).reduce((sum, i) => sum + (parseFloat(i.amount) || 0), 0);

  const fixedTotal = (monthData.fixedExpenses || []).reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
  const cardTotal = (monthData.creditCards || []).reduce((sum, c) => sum + (parseFloat(c.total) || 0), 0);
  const surprise = parseFloat(monthData.surpriseSpend) || 0;
  const totalExpenses = fixedTotal + cardTotal + surprise;

  const totalSaved = totalIncome - totalExpenses;
  const savingsRate = totalIncome > 0 ? (totalSaved / totalIncome) * 100 : 0;

  return { totalIncome, totalExpenses, totalSaved, savingsRate };
}

// Calculate net worth from accounts and debts
function calculateNetWorth(data) {
  let assets = 0;
  let liabilities = 0;

  // Sum all account balances
  for (const type of ['checking', 'savings', 'investment']) {
    assets += (data.accounts[type] || []).reduce((sum, a) => sum + (parseFloat(a.balance) || 0), 0);
  }
  assets += (data.accounts.property || []).reduce((sum, a) => sum + (parseFloat(a.value) || 0), 0);
  assets += (data.accounts.vehicles || []).reduce((sum, a) => sum + (parseFloat(a.value) || 0), 0);
  assets += (data.accounts.other || []).reduce((sum, a) => sum + (parseFloat(a.value) || 0), 0);

  // Sum all debts
  liabilities += (data.debts || []).reduce((sum, d) => sum + (parseFloat(d.balance) || 0), 0);
  // Mortgage from property
  liabilities += (data.accounts.property || []).reduce((sum, a) => sum + (parseFloat(a.mortgage) || 0), 0);

  return { assets, liabilities, netWorth: assets - liabilities };
}

// Get average monthly spend (last N months)
function getAverageMonthlySpend(data, n = 3) {
  const months = Object.keys(data.months).sort().reverse().slice(0, n);
  if (months.length === 0) return 0;

  const total = months.reduce((sum, m) => {
    const monthData = data.months[m];
    const totals = calculateMonthTotals(monthData);
    return sum + totals.totalExpenses;
  }, 0);

  return total / months.length;
}

// Calculate emergency fund runway (months)
function getEmergencyRunway(data) {
  const avgSpend = getAverageMonthlySpend(data);
  if (avgSpend <= 0) return null;

  const emergencyFunds = (data.accounts.savings || [])
    .filter(a => a.purpose && a.purpose.toLowerCase().includes('emergency'))
    .reduce((sum, a) => sum + (parseFloat(a.balance) || 0), 0);

  // If no labeled emergency fund, use all savings
  const totalSavings = emergencyFunds > 0 ? emergencyFunds :
    (data.accounts.savings || []).reduce((sum, a) => sum + (parseFloat(a.balance) || 0), 0);

  return totalSavings / avgSpend;
}

// Calculate goal projections
function projectGoalCompletion(goal) {
  const remaining = (goal.targetAmount || 0) - (goal.currentAmount || 0);
  if (remaining <= 0) return { completed: true, monthsLeft: 0 };
  if (!goal.monthlyContribution || goal.monthlyContribution <= 0) return { completed: false, monthsLeft: Infinity };

  const monthsLeft = Math.ceil(remaining / goal.monthlyContribution);
  const projectedDate = new Date();
  projectedDate.setMonth(projectedDate.getMonth() + monthsLeft);

  return {
    completed: false,
    monthsLeft,
    projectedDate: projectedDate.toISOString().split('T')[0],
    percentComplete: ((goal.currentAmount || 0) / goal.targetAmount) * 100
  };
}

// Get quarter string from date
function getQuarterFromDate(date) {
  const d = date || new Date();
  const q = Math.ceil((d.getMonth() + 1) / 3);
  return `${d.getFullYear()}-Q${q}`;
}

// Get all months in a quarter
function getMonthsInQuarter(quarterString) {
  const [year, q] = quarterString.split('-Q');
  const quarter = parseInt(q);
  const startMonth = (quarter - 1) * 3 + 1;
  return [
    `${year}-${String(startMonth).padStart(2, '0')}`,
    `${year}-${String(startMonth + 1).padStart(2, '0')}`,
    `${year}-${String(startMonth + 2).padStart(2, '0')}`
  ];
}

// Get all months in a year
function getMonthsInYear(year) {
  return Array.from({ length: 12 }, (_, i) => `${year}-${String(i + 1).padStart(2, '0')}`);
}
