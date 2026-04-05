/* ============================================
   WHAT IF CALCULATOR
   ============================================ */

let wiBaseline = { income: 0, expenses: 0, savings: 0, rate: 0 };

function render_whatif() {
  calculateBaseline();
  populateGoalSelector();
  calcEmergencyHealth();
}

// ============================================
// Baseline
// ============================================

function calculateBaseline() {
  const allMonths = Object.keys(appData.months).sort().reverse();
  const recentMonths = allMonths.slice(0, 3);

  if (recentMonths.length === 0) {
    wiBaseline = { income: 0, expenses: 0, savings: 0, rate: 0 };
  } else {
    let totalInc = 0, totalExp = 0;
    recentMonths.forEach(m => {
      const t = calculateMonthTotals(appData.months[m]);
      totalInc += t.totalIncome;
      totalExp += t.totalExpenses;
    });
    const n = recentMonths.length;
    wiBaseline.income = totalInc / n;
    wiBaseline.expenses = totalExp / n;
    wiBaseline.savings = (totalInc - totalExp) / n;
    wiBaseline.rate = wiBaseline.income > 0 ? (wiBaseline.savings / wiBaseline.income * 100) : 0;
  }

  document.getElementById('wi-base-income').textContent = formatCurrency(wiBaseline.income);
  document.getElementById('wi-base-expenses').textContent = formatCurrency(wiBaseline.expenses);
  document.getElementById('wi-base-savings').textContent = formatCurrency(wiBaseline.savings);
  document.getElementById('wi-base-savings').style.color = wiBaseline.savings >= 0 ? 'var(--accent-green)' : 'var(--accent-red)';
  document.getElementById('wi-base-rate').textContent = formatPercent(wiBaseline.rate);
}

// ============================================
// Save More
// ============================================

function calcSaveMore() {
  const extra = parseFloat(document.getElementById('wi-extra-savings').value) || 0;
  const el = document.getElementById('wi-save-more-result');

  if (extra <= 0) { el.innerHTML = ''; return; }

  const newSavings = wiBaseline.savings + extra;
  const newRate = wiBaseline.income > 0 ? (newSavings / wiBaseline.income * 100) : 0;
  const yearlyExtra = extra * 12;
  const fiveYearExtra = extra * 60;

  el.innerHTML = `
    <div class="scenario-grid">
      <div class="scenario-stat">
        <span class="card-label">New Monthly Savings</span>
        <span class="scenario-value positive">${formatCurrency(newSavings)}</span>
      </div>
      <div class="scenario-stat">
        <span class="card-label">New Savings Rate</span>
        <span class="scenario-value">${formatPercent(newRate)}</span>
      </div>
      <div class="scenario-stat">
        <span class="card-label">Extra per Year</span>
        <span class="scenario-value">${formatCurrency(yearlyExtra)}</span>
      </div>
      <div class="scenario-stat">
        <span class="card-label">Extra in 5 Years</span>
        <span class="scenario-value">${formatCurrency(fiveYearExtra)}</span>
      </div>
    </div>
    <p class="scenario-insight">Saving an extra ${formatCurrency(extra)}/mo means ${formatCurrency(yearlyExtra)} more per year. That's ${formatCurrency(fiveYearExtra)} in 5 years (before any interest).</p>
  `;
}

// ============================================
// Income Change
// ============================================

function calcIncomeChange() {
  const newIncome = parseFloat(document.getElementById('wi-new-income').value) || 0;
  const el = document.getElementById('wi-income-result');

  if (newIncome <= 0) { el.innerHTML = ''; return; }

  const diff = newIncome - wiBaseline.income;
  const newSavings = newIncome - wiBaseline.expenses;
  const newRate = newIncome > 0 ? (newSavings / newIncome * 100) : 0;

  el.innerHTML = `
    <div class="scenario-grid">
      <div class="scenario-stat">
        <span class="card-label">Income Change</span>
        <span class="scenario-value ${diff >= 0 ? 'positive' : 'negative'}">${diff >= 0 ? '+' : ''}${formatCurrency(diff)}/mo</span>
      </div>
      <div class="scenario-stat">
        <span class="card-label">New Monthly Savings</span>
        <span class="scenario-value ${newSavings >= 0 ? 'positive' : 'negative'}">${formatCurrency(newSavings)}</span>
      </div>
      <div class="scenario-stat">
        <span class="card-label">New Savings Rate</span>
        <span class="scenario-value">${formatPercent(newRate)}</span>
      </div>
      <div class="scenario-stat">
        <span class="card-label">Annual Impact</span>
        <span class="scenario-value">${diff >= 0 ? '+' : ''}${formatCurrency(diff * 12)}/yr</span>
      </div>
    </div>
  `;
}

// ============================================
// Major Purchase (Mortgage Calculator)
// ============================================

function calcPurchase() {
  const price = parseFloat(document.getElementById('wi-purchase-price').value) || 0;
  const downPct = parseFloat(document.getElementById('wi-down-pct').value) || 20;
  const rate = parseFloat(document.getElementById('wi-interest-rate').value) || 6.5;
  const term = parseFloat(document.getElementById('wi-loan-term').value) || 30;
  const el = document.getElementById('wi-purchase-result');

  if (price <= 0) { el.innerHTML = ''; return; }

  const downPayment = price * (downPct / 100);
  const loanAmount = price - downPayment;
  const monthlyRate = rate / 100 / 12;
  const numPayments = term * 12;

  let monthlyPayment;
  if (monthlyRate === 0) {
    monthlyPayment = loanAmount / numPayments;
  } else {
    monthlyPayment = loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / (Math.pow(1 + monthlyRate, numPayments) - 1);
  }

  const totalPaid = monthlyPayment * numPayments;
  const totalInterest = totalPaid - loanAmount;
  const newSavings = wiBaseline.savings - monthlyPayment;
  const newRate = wiBaseline.income > 0 ? (Math.max(0, wiBaseline.income - wiBaseline.expenses - monthlyPayment) / wiBaseline.income * 100) : 0;

  el.innerHTML = `
    <div class="scenario-grid">
      <div class="scenario-stat">
        <span class="card-label">Down Payment</span>
        <span class="scenario-value">${formatCurrency(downPayment)}</span>
      </div>
      <div class="scenario-stat">
        <span class="card-label">Monthly Payment</span>
        <span class="scenario-value">${formatCurrency(monthlyPayment)}</span>
      </div>
      <div class="scenario-stat">
        <span class="card-label">Total Interest</span>
        <span class="scenario-value">${formatCurrency(totalInterest)}</span>
      </div>
      <div class="scenario-stat">
        <span class="card-label">Remaining Savings</span>
        <span class="scenario-value ${newSavings >= 0 ? 'positive' : 'negative'}">${formatCurrency(newSavings)}/mo</span>
      </div>
    </div>
    <p class="scenario-insight">
      ${newSavings < 0
        ? `This purchase would put you ${formatCurrency(Math.abs(newSavings))}/mo in the red based on current income and expenses. You may need to adjust your budget or increase income first.`
        : `After the ${formatCurrency(monthlyPayment)}/mo payment, you would still save ${formatCurrency(newSavings)}/mo (${formatPercent(newRate)} rate).`
      }
    </p>
  `;
}

// ============================================
// One Income
// ============================================

function calcOneIncome() {
  const oneIncome = parseFloat(document.getElementById('wi-one-income').value) || 0;
  const months = parseFloat(document.getElementById('wi-one-duration').value) || 6;
  const el = document.getElementById('wi-one-income-result');

  if (oneIncome <= 0) { el.innerHTML = ''; return; }

  const monthlyGap = wiBaseline.expenses - oneIncome;
  const totalGap = monthlyGap > 0 ? monthlyGap * months : 0;

  // How long savings would cover the gap
  const totalSavings = (appData.accounts.savings || []).reduce((s, a) => s + (parseFloat(a.balance) || 0), 0)
    + (appData.accounts.checking || []).reduce((s, a) => s + (parseFloat(a.balance) || 0), 0);
  const runwayMonths = monthlyGap > 0 ? totalSavings / monthlyGap : Infinity;

  el.innerHTML = `
    <div class="scenario-grid">
      <div class="scenario-stat">
        <span class="card-label">Monthly Shortfall</span>
        <span class="scenario-value ${monthlyGap > 0 ? 'negative' : 'positive'}">
          ${monthlyGap > 0 ? '-' + formatCurrency(monthlyGap) : formatCurrency(Math.abs(monthlyGap)) + ' surplus'}
        </span>
      </div>
      <div class="scenario-stat">
        <span class="card-label">Total Gap (${months}mo)</span>
        <span class="scenario-value">${formatCurrency(totalGap)}</span>
      </div>
      <div class="scenario-stat">
        <span class="card-label">Cash Available</span>
        <span class="scenario-value">${formatCurrency(totalSavings)}</span>
      </div>
      <div class="scenario-stat">
        <span class="card-label">Runway</span>
        <span class="scenario-value ${runwayMonths >= months ? 'positive' : 'negative'}">
          ${isFinite(runwayMonths) ? runwayMonths.toFixed(1) + ' months' : 'Covered'}
        </span>
      </div>
    </div>
    <p class="scenario-insight">
      ${monthlyGap <= 0
        ? `You could cover expenses on ${formatCurrency(oneIncome)}/mo alone. You would still save ${formatCurrency(Math.abs(monthlyGap))}/mo.`
        : runwayMonths >= months
          ? `Your savings would cover the ${months}-month gap with ${formatCurrency(totalSavings - totalGap)} left over.`
          : `Your savings would run out after ${runwayMonths.toFixed(1)} months. You would need an additional ${formatCurrency(totalGap - totalSavings)} to cover ${months} months.`
      }
    </p>
  `;
}

// ============================================
// Goal Accelerator
// ============================================

function populateGoalSelector() {
  const select = document.getElementById('wi-goal-select');
  const goals = appData.goals.financial || [];

  select.innerHTML = '<option value="">Select a goal...</option>' +
    goals.filter(g => !projectGoalCompletion(g).completed).map(g =>
      `<option value="${g.id}">${g.name} (${formatCurrency(g.currentAmount)} / ${formatCurrency(g.targetAmount)})</option>`
    ).join('');
}

function calcGoalAccelerator() {
  const goalId = document.getElementById('wi-goal-select').value;
  const newContrib = parseFloat(document.getElementById('wi-goal-contribution').value) || 0;
  const el = document.getElementById('wi-goal-result');

  if (!goalId) { el.innerHTML = ''; return; }

  const goal = appData.goals.financial.find(g => g.id === goalId);
  if (!goal) return;

  const remaining = goal.targetAmount - goal.currentAmount;

  // Current projection
  const currentProj = projectGoalCompletion(goal);

  // New projection
  const newMonths = newContrib > 0 ? Math.ceil(remaining / newContrib) : Infinity;
  const newDate = new Date();
  newDate.setMonth(newDate.getMonth() + newMonths);

  const monthsSaved = currentProj.monthsLeft - newMonths;

  el.innerHTML = `
    <div class="scenario-grid">
      <div class="scenario-stat">
        <span class="card-label">Remaining</span>
        <span class="scenario-value">${formatCurrency(remaining)}</span>
      </div>
      <div class="scenario-stat">
        <span class="card-label">Current Pace</span>
        <span class="scenario-value">${isFinite(currentProj.monthsLeft) ? currentProj.monthsLeft + ' months' : 'Never'}</span>
      </div>
      <div class="scenario-stat">
        <span class="card-label">New Pace</span>
        <span class="scenario-value ${isFinite(newMonths) ? 'positive' : ''}">${isFinite(newMonths) ? newMonths + ' months' : 'Never'}</span>
      </div>
      <div class="scenario-stat">
        <span class="card-label">Time Saved</span>
        <span class="scenario-value positive">${isFinite(monthsSaved) && monthsSaved > 0 ? monthsSaved + ' months' : '--'}</span>
      </div>
    </div>
    ${isFinite(newMonths) ? `<p class="scenario-insight">At ${formatCurrency(newContrib)}/mo, you would reach ${goal.name} by ${newDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}.</p>` : ''}
  `;
}

// ============================================
// Emergency Fund Health
// ============================================

function calcEmergencyHealth() {
  const el = document.getElementById('wi-emergency-result');
  const avgSpend = getAverageMonthlySpend(appData);
  const runway = getEmergencyRunway(appData);

  if (avgSpend <= 0) {
    el.innerHTML = `
      <p style="color:var(--text-muted); font-style:italic;">Log some monthly expenses so we can calculate your emergency fund health.</p>
    `;
    return;
  }

  const threeMonths = avgSpend * 3;
  const sixMonths = avgSpend * 6;

  const totalSavings = (appData.accounts.savings || []).reduce((s, a) => s + (parseFloat(a.balance) || 0), 0);
  const emergencyFunds = (appData.accounts.savings || [])
    .filter(a => a.purpose && a.purpose.toLowerCase().includes('emergency'))
    .reduce((s, a) => s + (parseFloat(a.balance) || 0), 0);

  const fundAmount = emergencyFunds > 0 ? emergencyFunds : totalSavings;
  const fundLabel = emergencyFunds > 0 ? 'Emergency Fund' : 'Total Savings';

  let statusMsg, statusClass;
  if (runway >= 6) {
    statusMsg = 'You have a solid 6+ month emergency fund. Well done.';
    statusClass = 'positive';
  } else if (runway >= 3) {
    statusMsg = 'You have 3-6 months covered. Good foundation, keep building toward 6.';
    statusClass = 'neutral';
  } else if (runway > 0) {
    statusMsg = 'Less than 3 months of runway. Prioritize building this up.';
    statusClass = 'negative';
  } else {
    statusMsg = 'No emergency fund detected. This should be your first financial goal.';
    statusClass = 'negative';
  }

  el.innerHTML = `
    <div class="scenario-grid">
      <div class="scenario-stat">
        <span class="card-label">Avg Monthly Spend</span>
        <span class="scenario-value">${formatCurrency(avgSpend)}</span>
      </div>
      <div class="scenario-stat">
        <span class="card-label">${fundLabel}</span>
        <span class="scenario-value">${formatCurrency(fundAmount)}</span>
      </div>
      <div class="scenario-stat">
        <span class="card-label">3-Month Target</span>
        <span class="scenario-value">${formatCurrency(threeMonths)}</span>
      </div>
      <div class="scenario-stat">
        <span class="card-label">6-Month Target</span>
        <span class="scenario-value">${formatCurrency(sixMonths)}</span>
      </div>
    </div>
    <div class="progress-bar mt-md" style="height:12px;">
      <div class="progress-fill ${runway >= 6 ? '' : runway >= 3 ? 'butter' : 'pink'}" style="width:${Math.min((fundAmount / sixMonths) * 100, 100)}%"></div>
    </div>
    <div style="display:flex; justify-content:space-between; margin-top:4px;">
      <span style="font-size:0.6rem; font-family:'Roboto Mono',monospace; color:var(--text-light);">$0</span>
      <span style="font-size:0.6rem; font-family:'Roboto Mono',monospace; color:var(--text-light);">3mo: ${formatCurrency(threeMonths)}</span>
      <span style="font-size:0.6rem; font-family:'Roboto Mono',monospace; color:var(--text-light);">6mo: ${formatCurrency(sixMonths)}</span>
    </div>
    <p class="scenario-insight ${statusClass}">${statusMsg}</p>
  `;
}

// ============================================
// Inflation Adjuster
// ============================================

function calcInflation() {
  const amount = parseFloat(document.getElementById('wi-inflation-amount').value) || 0;
  const years = parseFloat(document.getElementById('wi-inflation-years').value) || 5;
  const rate = parseFloat(document.getElementById('wi-inflation-rate').value) || 3;
  const el = document.getElementById('wi-inflation-result');

  if (amount <= 0) { el.innerHTML = ''; return; }

  const inflatedAmount = amount * Math.pow(1 + rate / 100, years);
  const todayValue = amount / Math.pow(1 + rate / 100, years);

  el.innerHTML = `
    <div class="scenario-grid">
      <div class="scenario-stat">
        <span class="card-label">${formatCurrency(amount)} in ${years} years</span>
        <span class="scenario-value">worth ${formatCurrency(todayValue)} today</span>
      </div>
      <div class="scenario-stat">
        <span class="card-label">To have ${formatCurrency(amount)} of today's buying power</span>
        <span class="scenario-value">you'll need ${formatCurrency(inflatedAmount)}</span>
      </div>
    </div>
    <p class="scenario-insight">At ${rate}% inflation, ${formatCurrency(amount)} today will only buy ${formatCurrency(todayValue)} worth of stuff in ${years} years. Plan accordingly.</p>
  `;
}
