/* ============================================
   DASHBOARD
   ============================================ */

function render_dashboard() {
  renderDashIntention();
  renderDashNudge();
  renderDashStats();
  renderDashSavingsBreakdown();
  renderDashBarChart();
  renderDashGoals();
  renderDashPulse();
  renderDashAccounts();
  renderDashMilestones();
}

// ============================================
// Quarterly Intention
// ============================================

function renderDashIntention() {
  const el = document.getElementById('dash-intention');
  if (appData.settings.quarterIntention) {
    el.textContent = `"${appData.settings.quarterIntention}"`;
  } else {
    el.textContent = '';
  }
}

// ============================================
// Update Nudge
// ============================================

function renderDashNudge() {
  const el = document.getElementById('dash-nudge');
  const currentMonth = getCurrentYearMonth();
  const lastMonth = getPreviousYearMonth(currentMonth);

  // Check if current month has been logged
  const hasCurrentMonth = appData.months[currentMonth];
  const hasLastMonth = appData.months[lastMonth];

  if (hasCurrentMonth) {
    el.innerHTML = '';
    return;
  }

  // Figure out the most recent logged month
  const loggedMonths = Object.keys(appData.months).sort();
  const lastLogged = loggedMonths[loggedMonths.length - 1];

  if (!lastLogged) {
    el.innerHTML = `
      <div class="nudge-banner gentle">
        <span>Ready to start tracking? Log your first month to see everything come alive.</span>
        <button class="btn btn-primary btn-sm" onclick="navigateTo('monthly')">Get Started</button>
      </div>
    `;
    return;
  }

  // Calculate days since last update
  const lastLoggedDate = new Date(lastLogged + '-15'); // mid-month approximation
  const daysSince = Math.floor((new Date() - lastLoggedDate) / (1000 * 60 * 60 * 24));

  if (daysSince > 60) {
    el.innerHTML = `
      <div class="nudge-banner overdue">
        <span>It's been a while! Your last update was ${getMonthName(lastLogged)}. Catch up?</span>
        <button class="btn btn-sm" style="background:rgba(122,63,56,0.15);color:#7a3f38;" onclick="navigateTo('monthly')">Log ${getMonthName(currentMonth).split(' ')[0]}</button>
      </div>
    `;
  } else if (daysSince > 30) {
    el.innerHTML = `
      <div class="nudge-banner reminder">
        <span>Time for your ${getMonthName(currentMonth).split(' ')[0]} update! Last logged: ${getMonthName(lastLogged)}.</span>
        <button class="btn btn-sm" style="background:rgba(138,115,64,0.15);color:#8a7340;" onclick="navigateTo('monthly')">Update Now</button>
      </div>
    `;
  }
}

// ============================================
// Top Stats
// ============================================

function renderDashStats() {
  const currentMonth = getCurrentYearMonth();
  const prevMonth = getPreviousYearMonth(currentMonth);

  // Net Worth
  const nw = calculateNetWorth(appData);
  document.getElementById('dash-net-worth').textContent = formatCurrency(nw.netWorth);

  // Current month savings
  const currentData = appData.months[currentMonth];
  const prevData = appData.months[prevMonth];

  if (currentData) {
    const totals = calculateMonthTotals(currentData);
    document.getElementById('dash-savings').textContent = formatCurrency(totals.totalSaved);
    document.getElementById('dash-rate').textContent = formatPercent(totals.savingsRate);

    // Compare with previous month
    if (prevData) {
      const prevTotals = calculateMonthTotals(prevData);

      const savingsDiff = totals.totalSaved - prevTotals.totalSaved;
      const savingsEl = document.getElementById('dash-savings-change');
      savingsEl.textContent = `${savingsDiff >= 0 ? '+' : ''}${formatCurrency(savingsDiff)} vs last month`;
      savingsEl.className = `stat-change ${savingsDiff >= 0 ? 'positive' : 'negative'}`;

      const rateDiff = totals.savingsRate - prevTotals.savingsRate;
      const rateEl = document.getElementById('dash-rate-change');
      rateEl.textContent = `${rateDiff >= 0 ? '+' : ''}${rateDiff.toFixed(1)}% vs last month`;
      rateEl.className = `stat-change ${rateDiff >= 0 ? 'positive' : 'negative'}`;
    }
  } else {
    // Show most recent month if current isn't logged
    const loggedMonths = Object.keys(appData.months).sort();
    const latest = loggedMonths[loggedMonths.length - 1];
    if (latest) {
      const totals = calculateMonthTotals(appData.months[latest]);
      document.getElementById('dash-savings').textContent = formatCurrency(totals.totalSaved);
      document.getElementById('dash-rate').textContent = formatPercent(totals.savingsRate);
      document.getElementById('dash-savings-change').textContent = `as of ${getMonthName(latest)}`;
      document.getElementById('dash-savings-change').className = 'stat-change neutral';
      document.getElementById('dash-rate-change').textContent = '';
    }
  }

  // Emergency Runway
  const runway = getEmergencyRunway(appData);
  const runwayEl = document.getElementById('dash-runway');
  const runwaySub = document.getElementById('dash-runway-sub');
  if (runway !== null && isFinite(runway)) {
    runwayEl.textContent = runway.toFixed(1);
    if (runway < 3) {
      runwaySub.textContent = 'months (build this up!)';
      runwaySub.className = 'stat-change negative';
    } else if (runway < 6) {
      runwaySub.textContent = 'months of expenses';
      runwaySub.className = 'stat-change neutral';
    } else {
      runwaySub.textContent = 'months (solid!)';
      runwaySub.className = 'stat-change positive';
    }
  } else {
    runwayEl.textContent = '--';
    runwaySub.textContent = 'add accounts & expenses to calculate';
    runwaySub.className = 'stat-change neutral';
  }
}

// ============================================
// Income vs Expenses Bar Chart
// ============================================

function renderDashBarChart() {
  const chartEl = document.getElementById('dash-bar-chart');
  const emptyEl = document.getElementById('dash-bar-empty');

  const allMonths = Object.keys(appData.months).sort();
  const recentMonths = allMonths.slice(-6);

  if (recentMonths.length === 0) {
    chartEl.style.display = 'none';
    emptyEl.style.display = 'block';
    return;
  }

  chartEl.style.display = 'flex';
  emptyEl.style.display = 'none';

  // Calculate max value for scaling
  let maxVal = 0;
  const monthData = recentMonths.map(m => {
    const totals = calculateMonthTotals(appData.months[m]);
    maxVal = Math.max(maxVal, totals.totalIncome, totals.totalExpenses);
    return { month: m, ...totals };
  });

  if (maxVal === 0) maxVal = 1;

  const chartHeight = 170; // px available for bars

  let html = '';
  monthData.forEach(d => {
    const incomeHeight = (d.totalIncome / maxVal) * chartHeight;
    const expenseHeight = (d.totalExpenses / maxVal) * chartHeight;
    const monthLabel = new Date(d.month + '-15').toLocaleDateString('en-US', { month: 'short' });

    html += `
      <div class="bar-group">
        <div class="bar-pair">
          <div class="bar income" style="height: ${incomeHeight}px;" title="Income: ${formatCurrency(d.totalIncome)}"></div>
          <div class="bar expense" style="height: ${expenseHeight}px;" title="Expenses: ${formatCurrency(d.totalExpenses)}"></div>
        </div>
        <div class="bar-label">${monthLabel}</div>
      </div>
    `;
  });

  html += `
    </div>
    <div class="bar-chart-legend">
      <div class="legend-item"><div class="legend-dot income"></div> Income</div>
      <div class="legend-item"><div class="legend-dot expense"></div> Expenses</div>
    </div>
  `;

  // We need to handle the structure carefully
  chartEl.innerHTML = html;
}

// ============================================
// Goal Progress
// ============================================

function renderDashGoals() {
  const container = document.getElementById('dash-goals');
  const emptyEl = document.getElementById('dash-goals-empty');
  const goals = appData.goals.financial || [];

  if (goals.length === 0) {
    container.style.display = 'none';
    emptyEl.style.display = 'block';
    return;
  }

  container.style.display = 'block';
  emptyEl.style.display = 'none';

  // Show top 4 goals sorted by activity
  const goalColors = ['', 'butter', 'lavender', 'orange', 'pink'];
  let html = '';

  goals.slice(0, 4).forEach((goal, i) => {
    const projection = projectGoalCompletion(goal);
    const pct = Math.min(projection.percentComplete || 0, 100);
    const colorClass = goal.color || goalColors[i % goalColors.length] || '';

    let metaRight = '';
    if (projection.completed) {
      metaRight = 'Complete!';
    } else if (projection.monthsLeft === Infinity) {
      metaRight = 'Set monthly contribution';
    } else {
      const projDate = new Date(projection.projectedDate);
      metaRight = `On track for ${projDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`;
    }

    html += `
      <div class="dash-goal-item">
        <div class="dash-goal-top">
          <span class="dash-goal-name">${goal.name}</span>
          <span class="dash-goal-amount">${formatCurrency(goal.currentAmount)} / ${formatCurrency(goal.targetAmount)}</span>
        </div>
        <div class="progress-bar">
          <div class="progress-fill ${colorClass}" style="width: ${pct}%"></div>
        </div>
        <div class="dash-goal-meta">
          <span>${pct.toFixed(0)}%</span>
          <span>${metaRight}</span>
        </div>
      </div>
    `;
  });

  if (goals.length > 4) {
    html += `<div style="text-align:center; padding-top:8px;">
      <button class="btn btn-ghost btn-sm" onclick="navigateTo('goals')">+${goals.length - 4} more goals</button>
    </div>`;
  }

  container.innerHTML = html;
}

// ============================================
// Last Month's Pulse
// ============================================

function renderDashPulse() {
  const container = document.getElementById('dash-pulse');
  const emptyEl = document.getElementById('dash-pulse-empty');

  // Find most recent month with pulse data
  const loggedMonths = Object.keys(appData.months).sort().reverse();
  let pulseMonth = null;
  for (const m of loggedMonths) {
    const pulse = appData.months[m]?.pulse;
    if (pulse && (pulse.carlyFeeling > 0 || pulse.wentWell || pulse.toAdjust)) {
      pulseMonth = m;
      break;
    }
  }

  if (!pulseMonth) {
    container.style.display = 'none';
    emptyEl.style.display = 'block';
    return;
  }

  container.style.display = 'block';
  emptyEl.style.display = 'none';

  const pulse = appData.months[pulseMonth].pulse;
  const partnerName = appData.settings.partnerName || 'Partner';

  let html = `
    <div class="pulse-display">
      <div class="card-label">${getMonthName(pulseMonth)}</div>
      <div class="pulse-feelings">
        <div class="pulse-person">
          <div class="pulse-person-name">Carly</div>
          <div class="pulse-dots">
            ${[1,2,3,4,5].map(n => `<div class="pulse-dot ${n <= pulse.carlyFeeling ? 'filled' : ''}">${n}</div>`).join('')}
          </div>
        </div>
        <div class="pulse-person">
          <div class="pulse-person-name">${partnerName}</div>
          <div class="pulse-dots">
            ${[1,2,3,4,5].map(n => `<div class="pulse-dot ${n <= pulse.partnerFeeling ? 'filled' : ''}">${n}</div>`).join('')}
          </div>
        </div>
      </div>
  `;

  if (pulse.wentWell) {
    html += `
      <div>
        <div class="pulse-note-label">What went well</div>
        <div class="pulse-note">${pulse.wentWell}</div>
      </div>
    `;
  }

  if (pulse.toAdjust) {
    html += `
      <div>
        <div class="pulse-note-label">To adjust</div>
        <div class="pulse-note">${pulse.toAdjust}</div>
      </div>
    `;
  }

  html += '</div>';
  container.innerHTML = html;
}

// ============================================
// Accounts Snapshot
// ============================================

function renderDashAccounts() {
  const container = document.getElementById('dash-accounts');
  const emptyEl = document.getElementById('dash-accounts-empty');

  const accts = appData.accounts;
  const hasAny = ['checking', 'savings', 'investment', 'property', 'vehicles', 'other'].some(
    type => (accts[type] || []).length > 0
  ) || (appData.debts || []).length > 0;

  if (!hasAny) {
    container.style.display = 'none';
    emptyEl.style.display = 'block';
    return;
  }

  container.style.display = 'block';
  emptyEl.style.display = 'none';

  const categories = [
    { key: 'checking', label: 'Checking', field: 'balance' },
    { key: 'savings', label: 'Savings', field: 'balance' },
    { key: 'investment', label: 'Investments', field: 'balance' },
    { key: 'property', label: 'Property', field: 'value' },
    { key: 'vehicles', label: 'Vehicles', field: 'value' },
    { key: 'other', label: 'Other Assets', field: 'value' },
  ];

  let html = '';
  let totalAssets = 0;
  let totalDebts = 0;

  categories.forEach(cat => {
    const items = accts[cat.key] || [];
    if (items.length === 0) return;
    const total = items.reduce((sum, a) => sum + (parseFloat(a[cat.field]) || 0), 0);
    totalAssets += total;
    html += `
      <div class="accounts-snapshot-row">
        <span class="accounts-snapshot-label">${cat.label} (${items.length})</span>
        <span class="accounts-snapshot-value">${formatCurrency(total)}</span>
      </div>
    `;
  });

  // Debts
  const debts = appData.debts || [];
  const mortgages = (accts.property || []).reduce((sum, p) => sum + (parseFloat(p.mortgage) || 0), 0);
  totalDebts = debts.reduce((sum, d) => sum + (parseFloat(d.balance) || 0), 0) + mortgages;

  if (totalDebts > 0) {
    html += `
      <div class="accounts-snapshot-row">
        <span class="accounts-snapshot-label" style="color: var(--accent-red);">Debts</span>
        <span class="accounts-snapshot-value" style="color: var(--accent-red);">-${formatCurrency(totalDebts)}</span>
      </div>
    `;
  }

  html += `
    <div class="accounts-snapshot-total">
      <span class="accounts-snapshot-label">Net Worth</span>
      <span class="accounts-snapshot-value">${formatCurrency(totalAssets - totalDebts)}</span>
    </div>
  `;

  container.innerHTML = html;
}

// ============================================
// Milestones / Celebrations
// ============================================

function renderDashMilestones() {
  const container = document.getElementById('dash-milestones');
  const milestones = [];

  // Check for recently completed goals
  (appData.goals.financial || []).forEach(g => {
    const proj = projectGoalCompletion(g);
    if (proj.completed) {
      milestones.push({
        icon: '\u2728',
        title: `Goal reached: ${g.name}!`,
        text: `You hit ${formatCurrency(g.targetAmount)}. That's worth celebrating.`
      });
    }
  });

  // Check tracking anniversary
  if (appData.settings.createdAt) {
    const created = new Date(appData.settings.createdAt);
    const now = new Date();
    const monthsTracking = (now.getFullYear() - created.getFullYear()) * 12 + (now.getMonth() - created.getMonth());
    if (monthsTracking === 12) {
      milestones.push({
        icon: '\ud83c\udf89',
        title: 'One year of tracking!',
        text: 'You\'ve been at this for a full year. Check your yearly review to see how far you\'ve come.'
      });
    } else if (monthsTracking === 6) {
      milestones.push({
        icon: '\ud83c\udf1f',
        title: 'Six months strong!',
        text: 'Half a year of consistent tracking. The habit is real.'
      });
    }
  }

  // Emergency fund milestones
  const runway = getEmergencyRunway(appData);
  if (runway !== null && isFinite(runway)) {
    if (runway >= 6 && runway < 6.5) {
      milestones.push({
        icon: '\ud83d\udee1\ufe0f',
        title: '6-month emergency fund!',
        text: 'You\'ve got a solid safety net. That\'s real peace of mind.'
      });
    } else if (runway >= 3 && runway < 3.5) {
      milestones.push({
        icon: '\ud83d\udcaa',
        title: '3-month emergency fund reached!',
        text: 'A great milestone. Keep building toward 6 months.'
      });
    }
  }

  if (milestones.length === 0) {
    container.innerHTML = '';
    return;
  }

  container.innerHTML = milestones.map(m => `
    <div class="milestone-card">
      <div class="milestone-icon">${m.icon}</div>
      <div class="milestone-text">
        <h4>${m.title}</h4>
        <p>${m.text}</p>
      </div>
    </div>
  `).join('');
}

// ============================================
// Savings Breakdown (main dashboard card)
// ============================================

let savingsView = 'everyone';

function switchSavingsView(view) {
  savingsView = view;
  renderDashSavingsBreakdown();
}

function renderDashSavingsBreakdown() {
  const container = document.getElementById('dash-savings-breakdown');
  if (!container) return;

  const allMonths = Object.keys(appData.months).sort();
  if (allMonths.length === 0) {
    container.innerHTML = '<div class="empty-state" style="padding:20px;"><p>No data yet. Log your first month to see savings here.</p></div>';
    return;
  }

  const agg = aggregateSplits(allMonths);
  const partnerName = appData.settings.partnerName || 'Matt';

  let html = renderPersonToggle(savingsView, 'switchSavingsView');

  if (savingsView === 'everyone') {
    const saved = agg.everyone.incomeTotal - agg.everyone.expenseTotal;
    const rate = agg.everyone.incomeTotal > 0 ? (saved / agg.everyone.incomeTotal * 100) : 0;

    html += '<div class="revenue-summary-row">';
    html += '<div class="revenue-total-card"><div class="stat-label">Total Income</div><div class="stat-value" style="font-size:1.5rem;">' + formatCurrency(agg.everyone.incomeTotal) + '</div><div class="stat-change neutral">' + agg.monthCount + ' months</div></div>';
    html += '<div class="revenue-total-card"><div class="stat-label">Total Expenses</div><div class="stat-value" style="font-size:1.5rem;">' + formatCurrency(agg.everyone.expenseTotal) + '</div></div>';
    html += '<div class="revenue-total-card"><div class="stat-label">Total Saved</div><div class="stat-value" style="font-size:1.5rem; color:' + (saved >= 0 ? 'var(--accent-green)' : 'var(--accent-red)') + ';">' + formatCurrency(saved) + '</div><div class="stat-change neutral">' + rate.toFixed(1) + '% savings rate</div></div>';
    html += '</div>';

    // Per-person savings row
    var carlySaved = agg.carly.incomeTotal - agg.carly.expenseTotal;
    var mattSaved = agg.matt.incomeTotal - agg.matt.expenseTotal;
    html += '<div class="revenue-table-wrap"><table><thead><tr><th></th><th style="text-align:right;">Income</th><th style="text-align:right;">Expenses</th><th style="text-align:right;">Saved</th></tr></thead><tbody>';
    html += '<tr><td style="color:var(--accent-pink);">Carly</td><td style="text-align:right; font-family:\'Roboto Mono\',monospace; font-size:0.82rem;">' + formatCurrency(agg.carly.incomeTotal) + '</td><td style="text-align:right; font-family:\'Roboto Mono\',monospace; font-size:0.82rem;">' + formatCurrency(agg.carly.expenseTotal) + '</td><td style="text-align:right; font-family:\'Roboto Mono\',monospace; font-size:0.82rem; color:' + (carlySaved >= 0 ? 'var(--accent-green)' : 'var(--accent-red)') + ';">' + formatCurrency(carlySaved) + '</td></tr>';
    html += '<tr><td style="color:var(--accent-blue);">' + partnerName + '</td><td style="text-align:right; font-family:\'Roboto Mono\',monospace; font-size:0.82rem;">' + formatCurrency(agg.matt.incomeTotal) + '</td><td style="text-align:right; font-family:\'Roboto Mono\',monospace; font-size:0.82rem;">' + formatCurrency(agg.matt.expenseTotal) + '</td><td style="text-align:right; font-family:\'Roboto Mono\',monospace; font-size:0.82rem; color:' + (mattSaved >= 0 ? 'var(--accent-green)' : 'var(--accent-red)') + ';">' + formatCurrency(mattSaved) + '</td></tr>';
    if (agg.shared.incomeTotal > 0 || agg.shared.expenseTotal > 0) {
      var sharedSaved = agg.shared.incomeTotal - agg.shared.expenseTotal;
      html += '<tr><td style="color:var(--text-muted);">Other</td><td style="text-align:right; font-family:\'Roboto Mono\',monospace; font-size:0.82rem;">' + formatCurrency(agg.shared.incomeTotal) + '</td><td style="text-align:right; font-family:\'Roboto Mono\',monospace; font-size:0.82rem;">' + formatCurrency(agg.shared.expenseTotal) + '</td><td style="text-align:right; font-family:\'Roboto Mono\',monospace; font-size:0.82rem;">' + formatCurrency(sharedSaved) + '</td></tr>';
    }
    html += '</tbody></table></div>';

    // Monthly savings trend
    html += '<div class="revenue-table-wrap"><table><thead><tr><th>Month</th><th style="text-align:right;">Income</th><th style="text-align:right;">Expenses</th><th style="text-align:right;">Saved</th><th style="text-align:right;">Rate</th></tr></thead><tbody>';
    allMonths.forEach(function(ym) {
      var s = splitMonthByOwner(appData.months[ym]);
      if (!s) return;
      var sv = s.everyone.saved;
      var rt = s.everyone.incomeTotal > 0 ? (sv / s.everyone.incomeTotal * 100) : 0;
      html += '<tr><td>' + getMonthName(ym) + '</td><td style="text-align:right; font-family:\'Roboto Mono\',monospace; font-size:0.82rem;">' + formatCurrency(s.everyone.incomeTotal) + '</td><td style="text-align:right; font-family:\'Roboto Mono\',monospace; font-size:0.82rem;">' + formatCurrency(s.everyone.expenseTotal) + '</td><td style="text-align:right; font-family:\'Roboto Mono\',monospace; font-size:0.82rem; color:' + (sv >= 0 ? 'var(--accent-green)' : 'var(--accent-red)') + ';">' + formatCurrency(sv) + '</td><td style="text-align:right; font-family:\'Roboto Mono\',monospace; font-size:0.82rem;">' + rt.toFixed(1) + '%</td></tr>';
    });
    html += '</tbody></table></div>';
  } else {
    var who = savingsView === 'carly' ? 'carly' : 'matt';
    var name = savingsView === 'carly' ? 'Carly' : partnerName;
    var personAgg = agg[who];
    var personSaved = personAgg.incomeTotal - personAgg.expenseTotal;
    var personRate = personAgg.incomeTotal > 0 ? (personSaved / personAgg.incomeTotal * 100) : 0;

    html += '<div class="revenue-summary-row">';
    html += '<div class="revenue-total-card"><div class="stat-label">' + name + '\'s Income</div><div class="stat-value" style="font-size:1.5rem;">' + formatCurrency(personAgg.incomeTotal) + '</div></div>';
    html += '<div class="revenue-total-card"><div class="stat-label">' + name + '\'s Expenses</div><div class="stat-value" style="font-size:1.5rem;">' + formatCurrency(personAgg.expenseTotal) + '</div></div>';
    html += '<div class="revenue-total-card"><div class="stat-label">' + name + '\'s Saved</div><div class="stat-value" style="font-size:1.5rem; color:' + (personSaved >= 0 ? 'var(--accent-green)' : 'var(--accent-red)') + ';">' + formatCurrency(personSaved) + '</div><div class="stat-change neutral">' + personRate.toFixed(1) + '% rate</div></div>';
    html += '</div>';

    // Monthly trend for this person
    html += '<div class="revenue-table-wrap"><table><thead><tr><th>Month</th><th style="text-align:right;">Income</th><th style="text-align:right;">Expenses</th><th style="text-align:right;">Saved</th></tr></thead><tbody>';
    allMonths.forEach(function(ym) {
      var s = splitMonthByOwner(appData.months[ym]);
      if (!s) return;
      var p = s[who];
      var sv = p.incomeTotal - p.expenseTotal;
      html += '<tr><td>' + getMonthName(ym) + '</td><td style="text-align:right; font-family:\'Roboto Mono\',monospace; font-size:0.82rem;">' + formatCurrency(p.incomeTotal) + '</td><td style="text-align:right; font-family:\'Roboto Mono\',monospace; font-size:0.82rem;">' + formatCurrency(p.expenseTotal) + '</td><td style="text-align:right; font-family:\'Roboto Mono\',monospace; font-size:0.82rem; color:' + (sv >= 0 ? 'var(--accent-green)' : 'var(--accent-red)') + ';">' + formatCurrency(sv) + '</td></tr>';
    });
    html += '</tbody></table></div>';
  }

  container.innerHTML = html;
}

// ============================================
// Revenue by Vertical (collapsible)
// ============================================

let revenueView = 'everyone'; // 'everyone', 'carly', 'partner'
let revenueExpanded = false;

// Backwards-compat alias for monthly.js references
const INCOME_STREAMS = { carly: OWNERSHIP.carly, matt: OWNERSHIP.matt };

function toggleRevenueVerticals() {
  revenueExpanded = !revenueExpanded;
  var el = document.getElementById('dash-revenue-verticals');
  var btn = document.getElementById('revenue-toggle-btn');
  if (revenueExpanded) {
    el.style.display = 'block';
    btn.textContent = 'Hide';
    renderRevenueVerticals();
  } else {
    el.style.display = 'none';
    btn.textContent = 'Show';
  }
}

function switchRevenueView(view) {
  revenueView = view;
  renderRevenueVerticals();
}

function renderRevenueVerticals() {
  const container = document.getElementById('dash-revenue-verticals');
  if (!container) return;

  const partnerName = appData.settings.partnerName || 'Matt';
  const allMonths = Object.keys(appData.months).sort();

  if (allMonths.length === 0) {
    container.innerHTML = '<div class="empty-state" style="padding:20px;"><p>No income data yet.</p></div>';
    return;
  }

  const agg = aggregateSplits(allMonths);

  let html = renderPersonToggle(revenueView, 'switchRevenueView');

  // Summary cards
  html += '<div class="revenue-summary-row">';

  if (revenueView === 'everyone') {
    const total = agg.carly.incomeTotal + agg.matt.incomeTotal;
    html += `<div class="revenue-total-card">
      <div class="stat-label">Household Income</div>
      <div class="stat-value" style="font-size:1.6rem;">${formatCurrency(agg.everyone.incomeTotal)}</div>
      <div class="stat-change neutral">${agg.monthCount} months tracked</div>
    </div>`;
    html += `<div class="revenue-vertical-card">
      <div class="revenue-vertical-dot" style="background:var(--accent-pink);"></div>
      <div>
        <div class="revenue-vertical-name">Carly</div>
        <div class="revenue-vertical-amount">${formatCurrency(agg.carly.incomeTotal)}</div>
        <div class="revenue-vertical-pct">${agg.everyone.incomeTotal > 0 ? ((agg.carly.incomeTotal / agg.everyone.incomeTotal) * 100).toFixed(0) : 0}%</div>
      </div>
    </div>`;
    html += `<div class="revenue-vertical-card">
      <div class="revenue-vertical-dot" style="background:var(--accent-blue);"></div>
      <div>
        <div class="revenue-vertical-name">${partnerName}</div>
        <div class="revenue-vertical-amount">${formatCurrency(agg.matt.incomeTotal)}</div>
        <div class="revenue-vertical-pct">${agg.everyone.incomeTotal > 0 ? ((agg.matt.incomeTotal / agg.everyone.incomeTotal) * 100).toFixed(0) : 0}%</div>
      </div>
    </div>`;
    if (agg.shared.incomeTotal > 0) {
      html += `<div class="revenue-vertical-card">
        <div class="revenue-vertical-dot" style="background:var(--text-muted);"></div>
        <div>
          <div class="revenue-vertical-name">Other</div>
          <div class="revenue-vertical-amount">${formatCurrency(agg.shared.incomeTotal)}</div>
          <div class="revenue-vertical-pct">${((agg.shared.incomeTotal / agg.everyone.incomeTotal) * 100).toFixed(0)}%</div>
        </div>
      </div>`;
    }
  } else {
    const who = revenueView === 'carly' ? 'carly' : 'matt';
    const cfg = OWNERSHIP[who];
    const personAgg = agg[who];
    const viewLabel = revenueView === 'carly' ? "Carly's Revenue" : `${partnerName}'s Income`;

    html += `<div class="revenue-total-card">
      <div class="stat-label">${viewLabel}</div>
      <div class="stat-value" style="font-size:1.6rem;">${formatCurrency(personAgg.incomeTotal)}</div>
      <div class="stat-change neutral">${agg.monthCount} months tracked</div>
    </div>`;

    cfg.incomeKeys.forEach(key => {
      const total = personAgg.incomeByCategory[key] || 0;
      if (total <= 0) return;
      const pct = personAgg.incomeTotal > 0 ? (total / personAgg.incomeTotal * 100) : 0;
      html += `
        <div class="revenue-vertical-card">
          <div class="revenue-vertical-dot" style="background:${cfg.incomeColors[key]};"></div>
          <div>
            <div class="revenue-vertical-name">${cfg.incomeLabels[key]}</div>
            <div class="revenue-vertical-amount">${formatCurrency(total)}</div>
            <div class="revenue-vertical-pct">${pct.toFixed(0)}%</div>
          </div>
        </div>
      `;
    });

    // Show expenses total for this person
    if (personAgg.expenseTotal > 0) {
      html += `<div class="revenue-total-card">
        <div class="stat-label">${revenueView === 'carly' ? "Carly's" : `${partnerName}'s`} Expenses</div>
        <div class="stat-value" style="font-size:1.4rem;">${formatCurrency(personAgg.expenseTotal)}</div>
      </div>`;
    }
  }
  html += '</div>';

  // Monthly table
  if (revenueView !== 'everyone') {
    const who = revenueView === 'carly' ? 'carly' : 'matt';
    const cfg = OWNERSHIP[who];
    const activeKeys = cfg.incomeKeys.filter(k => agg[who].incomeByCategory[k] > 0);

    html += '<div class="revenue-table-wrap"><table><thead><tr><th>Month</th>';
    activeKeys.forEach(key => {
      html += `<th style="text-align:right;">${cfg.incomeLabels[key]}</th>`;
    });
    html += '<th style="text-align:right;">Income</th><th style="text-align:right;">Expenses</th></tr></thead><tbody>';

    allMonths.forEach(ym => {
      const split = splitMonthByOwner(appData.months[ym]);
      if (!split) return;
      html += `<tr><td>${getMonthName(ym)}</td>`;
      activeKeys.forEach(key => {
        const val = split[who].income.filter(i => i.category === key).reduce((s, i) => s + i.amount, 0);
        html += `<td style="text-align:right; font-family:'Roboto Mono',monospace; font-size:0.82rem; ${val === 0 ? 'color:var(--text-light);' : ''}">${val > 0 ? formatCurrency(val) : '--'}</td>`;
      });
      html += `<td style="text-align:right; font-family:'Roboto Mono',monospace; font-size:0.82rem; font-weight:500;">${split[who].incomeTotal > 0 ? formatCurrency(split[who].incomeTotal) : '--'}</td>`;
      html += `<td style="text-align:right; font-family:'Roboto Mono',monospace; font-size:0.82rem; color:var(--text-muted);">${split[who].expenseTotal > 0 ? formatCurrency(split[who].expenseTotal) : '--'}</td>`;
      html += '</tr>';
    });
    html += '</tbody></table></div>';
  } else {
    html += '<div class="revenue-table-wrap"><table><thead><tr><th>Month</th>';
    html += '<th style="text-align:right;">Carly</th>';
    html += `<th style="text-align:right;">${partnerName}</th>`;
    html += '<th style="text-align:right;">Household</th></tr></thead><tbody>';

    allMonths.forEach(ym => {
      const split = splitMonthByOwner(appData.months[ym]);
      if (!split) return;
      html += `<tr>
        <td>${getMonthName(ym)}</td>
        <td style="text-align:right; font-family:'Roboto Mono',monospace; font-size:0.82rem; ${split.carly.incomeTotal === 0 ? 'color:var(--text-light);' : ''}">${split.carly.incomeTotal > 0 ? formatCurrency(split.carly.incomeTotal) : '--'}</td>
        <td style="text-align:right; font-family:'Roboto Mono',monospace; font-size:0.82rem; ${split.matt.incomeTotal === 0 ? 'color:var(--text-light);' : ''}">${split.matt.incomeTotal > 0 ? formatCurrency(split.matt.incomeTotal) : '--'}</td>
        <td style="text-align:right; font-family:'Roboto Mono',monospace; font-size:0.82rem; font-weight:500;">${split.everyone.incomeTotal > 0 ? formatCurrency(split.everyone.incomeTotal) : '--'}</td>
      </tr>`;
    });
    html += '</tbody></table></div>';
  }

  container.innerHTML = html;
}
