/* ============================================
   DASHBOARD
   ============================================ */

function render_dashboard() {
  renderDashIntention();
  renderDashNudge();
  renderDashStats();
  renderRevenueVerticals();
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
// Revenue by Vertical
// ============================================

let revenueView = 'everyone'; // 'everyone', 'carly', 'partner'

// Define income stream configs
const INCOME_STREAMS = {
  carly: {
    keys: ['Reach Out Party (Stripe)', 'TETHER (Stripe)', 'Coaching (Stripe)', 'Substack (Stripe)'],
    labels: {
      'Reach Out Party (Stripe)': 'Reach Out Party',
      'TETHER (Stripe)': 'TETHER',
      'Coaching (Stripe)': 'Coaching',
      'Substack (Stripe)': 'Substack'
    },
    colors: {
      'Reach Out Party (Stripe)': 'var(--accent-sage)',
      'TETHER (Stripe)': 'var(--accent-lavender)',
      'Coaching (Stripe)': 'var(--accent-butter)',
      'Substack (Stripe)': 'var(--accent-orange)'
    }
  },
  matt: {
    keys: ['Salary (Matt/Flywire)', 'Bonus (Flywire)', 'RSU/Stock Sales', 'ESPP (Flywire)'],
    labels: {
      'Salary (Matt/Flywire)': 'Flywire Salary',
      'Bonus (Flywire)': 'Bonus',
      'RSU/Stock Sales': 'RSU / Stock Sales',
      'ESPP (Flywire)': 'ESPP'
    },
    colors: {
      'Salary (Matt/Flywire)': 'var(--accent-blue)',
      'Bonus (Flywire)': 'var(--accent-butter)',
      'RSU/Stock Sales': 'var(--accent-sage)',
      'ESPP (Flywire)': 'var(--accent-lavender)'
    }
  }
};

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

  // Determine which streams to show based on view
  let streamConfigs = [];
  if (revenueView === 'carly') {
    streamConfigs = [INCOME_STREAMS.carly];
  } else if (revenueView === 'partner') {
    streamConfigs = [INCOME_STREAMS.matt];
  } else {
    streamConfigs = [INCOME_STREAMS.carly, INCOME_STREAMS.matt];
  }

  // Gather all keys, labels, colors
  const allKeys = [];
  const allLabels = {};
  const allColors = {};
  streamConfigs.forEach(cfg => {
    cfg.keys.forEach(k => {
      allKeys.push(k);
      allLabels[k] = cfg.labels[k];
      allColors[k] = cfg.colors[k];
    });
  });

  // Build monthly data
  const monthlyVerticals = {};
  let grandTotal = 0;
  const verticalTotals = {};
  allKeys.forEach(k => { verticalTotals[k] = 0; });

  // Also track totals per person for "everyone" view
  let carlyTotal = 0, mattTotal = 0;

  allMonths.forEach(ym => {
    monthlyVerticals[ym] = {};
    (appData.months[ym].income || []).forEach(inc => {
      if (allKeys.includes(inc.category)) {
        monthlyVerticals[ym][inc.category] = (monthlyVerticals[ym][inc.category] || 0) + inc.amount;
        verticalTotals[inc.category] = (verticalTotals[inc.category] || 0) + inc.amount;
        grandTotal += inc.amount;
      }
      // Track per-person totals
      if (INCOME_STREAMS.carly.keys.includes(inc.category)) carlyTotal += inc.amount;
      if (INCOME_STREAMS.matt.keys.includes(inc.category)) mattTotal += inc.amount;
    });
  });

  const activeVerticals = allKeys.filter(k => verticalTotals[k] > 0);

  // Build toggle
  let html = `
    <div class="revenue-toggle-row">
      <div class="revenue-toggles">
        <button class="revenue-toggle ${revenueView === 'everyone' ? 'active' : ''}" onclick="switchRevenueView('everyone')">Everyone</button>
        <button class="revenue-toggle ${revenueView === 'carly' ? 'active' : ''}" onclick="switchRevenueView('carly')">Carly</button>
        <button class="revenue-toggle ${revenueView === 'partner' ? 'active' : ''}" onclick="switchRevenueView('partner')">${partnerName}</button>
      </div>
    </div>
  `;

  // Summary cards
  html += '<div class="revenue-summary-row">';

  if (revenueView === 'everyone') {
    html += `<div class="revenue-total-card">
      <div class="stat-label">Household Income</div>
      <div class="stat-value" style="font-size:1.6rem;">${formatCurrency(carlyTotal + mattTotal)}</div>
      <div class="stat-change neutral">${allMonths.length} months tracked</div>
    </div>`;
    html += `<div class="revenue-vertical-card">
      <div class="revenue-vertical-dot" style="background:var(--accent-pink);"></div>
      <div>
        <div class="revenue-vertical-name">Carly</div>
        <div class="revenue-vertical-amount">${formatCurrency(carlyTotal)}</div>
        <div class="revenue-vertical-pct">${(carlyTotal + mattTotal) > 0 ? ((carlyTotal / (carlyTotal + mattTotal)) * 100).toFixed(0) : 0}% of household</div>
      </div>
    </div>`;
    html += `<div class="revenue-vertical-card">
      <div class="revenue-vertical-dot" style="background:var(--accent-blue);"></div>
      <div>
        <div class="revenue-vertical-name">${partnerName}</div>
        <div class="revenue-vertical-amount">${formatCurrency(mattTotal)}</div>
        <div class="revenue-vertical-pct">${(carlyTotal + mattTotal) > 0 ? ((mattTotal / (carlyTotal + mattTotal)) * 100).toFixed(0) : 0}% of household</div>
      </div>
    </div>`;
  } else {
    const viewTotal = revenueView === 'carly' ? carlyTotal : mattTotal;
    const viewLabel = revenueView === 'carly' ? "Carly's Revenue" : `${partnerName}'s Income`;
    html += `<div class="revenue-total-card">
      <div class="stat-label">${viewLabel}</div>
      <div class="stat-value" style="font-size:1.6rem;">${formatCurrency(viewTotal)}</div>
      <div class="stat-change neutral">${allMonths.length} months tracked</div>
    </div>`;

    activeVerticals.forEach(key => {
      const total = verticalTotals[key];
      const pct = viewTotal > 0 ? (total / viewTotal * 100) : 0;
      html += `
        <div class="revenue-vertical-card">
          <div class="revenue-vertical-dot" style="background:${allColors[key]};"></div>
          <div>
            <div class="revenue-vertical-name">${allLabels[key]}</div>
            <div class="revenue-vertical-amount">${formatCurrency(total)}</div>
            <div class="revenue-vertical-pct">${pct.toFixed(0)}%</div>
          </div>
        </div>
      `;
    });
  }
  html += '</div>';

  // Monthly table
  if (revenueView !== 'everyone') {
    html += '<div class="revenue-table-wrap"><table><thead><tr><th>Month</th>';
    activeVerticals.forEach(key => {
      html += `<th style="text-align:right;">${allLabels[key]}</th>`;
    });
    html += '<th style="text-align:right;">Total</th></tr></thead><tbody>';

    allMonths.forEach(ym => {
      let monthTotal = 0;
      html += `<tr><td>${getMonthName(ym)}</td>`;
      activeVerticals.forEach(key => {
        const val = monthlyVerticals[ym][key] || 0;
        monthTotal += val;
        html += `<td style="text-align:right; font-family:'Roboto Mono',monospace; font-size:0.82rem; ${val === 0 ? 'color:var(--text-light);' : ''}">${val > 0 ? formatCurrency(val) : '--'}</td>`;
      });
      html += `<td style="text-align:right; font-family:'Roboto Mono',monospace; font-size:0.82rem; font-weight:500;">${monthTotal > 0 ? formatCurrency(monthTotal) : '--'}</td>`;
      html += '</tr>';
    });
    html += '</tbody></table></div>';
  } else {
    // Everyone view: show combined monthly table with Carly total + Matt total
    html += '<div class="revenue-table-wrap"><table><thead><tr><th>Month</th>';
    html += '<th style="text-align:right;">Carly</th>';
    html += `<th style="text-align:right;">${partnerName}</th>`;
    html += '<th style="text-align:right;">Household</th></tr></thead><tbody>';

    allMonths.forEach(ym => {
      let cMonth = 0, mMonth = 0;
      (appData.months[ym].income || []).forEach(inc => {
        if (INCOME_STREAMS.carly.keys.includes(inc.category)) cMonth += inc.amount;
        if (INCOME_STREAMS.matt.keys.includes(inc.category)) mMonth += inc.amount;
      });
      const household = cMonth + mMonth;
      html += `<tr>
        <td>${getMonthName(ym)}</td>
        <td style="text-align:right; font-family:'Roboto Mono',monospace; font-size:0.82rem; ${cMonth === 0 ? 'color:var(--text-light);' : ''}">${cMonth > 0 ? formatCurrency(cMonth) : '--'}</td>
        <td style="text-align:right; font-family:'Roboto Mono',monospace; font-size:0.82rem; ${mMonth === 0 ? 'color:var(--text-light);' : ''}">${mMonth > 0 ? formatCurrency(mMonth) : '--'}</td>
        <td style="text-align:right; font-family:'Roboto Mono',monospace; font-size:0.82rem; font-weight:500;">${household > 0 ? formatCurrency(household) : '--'}</td>
      </tr>`;
    });
    html += '</tbody></table></div>';
  }

  container.innerHTML = html;
}
