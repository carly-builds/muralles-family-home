/* ============================================
   YEARLY REVIEW
   ============================================ */

let currentYear = new Date().getFullYear();
let yearlyBreakdownView = 'everyone';

function render_yearly() {
  document.getElementById('yearly-current').textContent = currentYear;
  renderYearlyBreakdown();
  renderYearStats();
  renderYearChart();
  renderYearLineChart();
  renderYearOverYear();
  renderYearScorecard();
  renderSubscriptionAudit();
  loadYearlyReflection();
}

function switchYearlyBreakdownView(view) {
  yearlyBreakdownView = view;
  renderYearlyBreakdown();
}

function renderYearlyBreakdown() {
  const container = document.getElementById('yearly-breakdown');
  const cardEl = document.getElementById('yearly-breakdown-card');
  const months = getMonthsInYear(currentYear);
  const hasData = months.some(function(m) { return appData.months[m]; });

  if (!hasData) {
    cardEl.style.display = 'none';
    return;
  }
  cardEl.style.display = 'block';

  const agg = aggregateSplits(months);
  const partnerName = appData.settings.partnerName || 'Matt';

  let html = renderPersonToggle(yearlyBreakdownView, 'switchYearlyBreakdownView');

  var split = {
    carly: { income: [], incomeTotal: agg.carly.incomeTotal, expenses: agg.carly.expenses, expenseTotal: agg.carly.expenseTotal },
    matt: { income: [], incomeTotal: agg.matt.incomeTotal, expenses: agg.matt.expenses, expenseTotal: agg.matt.expenseTotal },
    shared: { income: agg.shared.income, incomeTotal: agg.shared.incomeTotal, expenses: agg.shared.expenses, expenseTotal: agg.shared.expenseTotal },
    everyone: agg.everyone
  };

  ['carly', 'matt'].forEach(function(who) {
    var cats = agg[who].incomeByCategory;
    for (var cat in cats) {
      split[who].income.push({ category: cat, amount: cats[cat] });
    }
  });

  ['carly', 'matt', 'shared'].forEach(function(who) {
    var consolidated = {};
    split[who].expenses.forEach(function(exp) {
      consolidated[exp.name] = (consolidated[exp.name] || 0) + exp.amount;
    });
    split[who].expenses = Object.keys(consolidated).map(function(name) {
      return { name: name, amount: consolidated[name] };
    }).sort(function(a, b) { return b.amount - a.amount; });
  });

  if (yearlyBreakdownView === 'everyone') {
    html += renderSplitEveryone(split, partnerName);
  } else {
    var who = yearlyBreakdownView === 'carly' ? 'carly' : 'matt';
    var name = yearlyBreakdownView === 'carly' ? 'Carly' : partnerName;
    html += renderSplitPerson(split, who, name);
  }

  container.innerHTML = html;
}

function changeYear(delta) {
  currentYear += delta;
  render_yearly();
}

// ============================================
// Year Stats
// ============================================

function renderYearStats() {
  const months = getMonthsInYear(currentYear);
  let totalIncome = 0, totalExpenses = 0, rateSum = 0, rateCount = 0;

  months.forEach(m => {
    if (appData.months[m]) {
      const t = calculateMonthTotals(appData.months[m]);
      totalIncome += t.totalIncome;
      totalExpenses += t.totalExpenses;
      if (t.totalIncome > 0) { rateSum += t.savingsRate; rateCount++; }
    }
  });

  const totalSaved = totalIncome - totalExpenses;
  document.getElementById('y-income').textContent = formatCurrency(totalIncome);
  document.getElementById('y-expenses').textContent = formatCurrency(totalExpenses);
  document.getElementById('y-saved').textContent = formatCurrency(totalSaved);
  document.getElementById('y-saved').style.color = totalSaved >= 0 ? 'var(--text-heading)' : 'var(--accent-red)';
  document.getElementById('y-rate').textContent = formatPercent(rateCount > 0 ? rateSum / rateCount : 0);
}

// ============================================
// Month by Month Chart + Table
// ============================================

function renderYearChart() {
  const chartEl = document.getElementById('y-month-chart');
  const tableEl = document.getElementById('y-month-table');
  const months = getMonthsInYear(currentYear);

  let maxVal = 0;
  const monthData = months.map(m => {
    if (appData.months[m]) {
      const t = calculateMonthTotals(appData.months[m]);
      maxVal = Math.max(maxVal, t.totalIncome, t.totalExpenses);
      return { month: m, ...t, exists: true };
    }
    return { month: m, totalIncome: 0, totalExpenses: 0, totalSaved: 0, savingsRate: 0, exists: false };
  });

  if (maxVal === 0) maxVal = 1;
  const chartHeight = 190;

  chartEl.innerHTML = monthData.map(d => {
    const incH = (d.totalIncome / maxVal) * chartHeight;
    const expH = (d.totalExpenses / maxVal) * chartHeight;
    const label = new Date(d.month + '-15').toLocaleDateString('en-US', { month: 'short' });
    return `
      <div class="bar-group">
        <div class="bar-pair">
          <div class="bar income" style="height:${incH}px;" title="${formatCurrency(d.totalIncome)}"></div>
          <div class="bar expense" style="height:${expH}px;" title="${formatCurrency(d.totalExpenses)}"></div>
        </div>
        <div class="bar-label">${label}</div>
      </div>
    `;
  }).join('') + `
    <div class="bar-chart-legend" style="position:absolute; bottom:-30px; left:0; right:0;">
      <div class="legend-item"><div class="legend-dot income"></div> Income</div>
      <div class="legend-item"><div class="legend-dot expense"></div> Expenses</div>
    </div>
  `;
  chartEl.style.position = 'relative';
  chartEl.style.marginBottom = '40px';

  // Table
  tableEl.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>Month</th>
          <th style="text-align:right;">Income</th>
          <th style="text-align:right;">Expenses</th>
          <th style="text-align:right;">Saved</th>
          <th style="text-align:right;">Rate</th>
        </tr>
      </thead>
      <tbody>
        ${monthData.map(d => d.exists ? `
          <tr>
            <td>${getMonthName(d.month)}</td>
            <td style="text-align:right; font-family:'Roboto Mono',monospace;">${formatCurrency(d.totalIncome)}</td>
            <td style="text-align:right; font-family:'Roboto Mono',monospace;">${formatCurrency(d.totalExpenses)}</td>
            <td style="text-align:right; font-family:'Roboto Mono',monospace; color:${d.totalSaved >= 0 ? 'var(--accent-green)' : 'var(--accent-red)'};">${formatCurrency(d.totalSaved)}</td>
            <td style="text-align:right; font-family:'Roboto Mono',monospace;">${formatPercent(d.savingsRate)}</td>
          </tr>
        ` : `
          <tr style="color:var(--text-light);">
            <td>${getMonthName(d.month)}</td>
            <td colspan="4" style="text-align:center; font-style:italic;">--</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

// ============================================
// Line Chart: Income / Expenses / Savings
// ============================================

function renderYearLineChart() {
  var el = document.getElementById('y-line-chart');
  if (!el) return;

  var months = getMonthsInYear(currentYear);
  var data = [];
  var hasAny = false;

  months.forEach(function(m) {
    if (appData.months[m]) {
      var t = calculateMonthTotals(appData.months[m]);
      data.push({ month: m, income: t.totalIncome, expenses: t.totalExpenses, saved: t.totalSaved, exists: true });
      hasAny = true;
    } else {
      data.push({ month: m, income: 0, expenses: 0, saved: 0, exists: false });
    }
  });

  if (!hasAny) {
    el.innerHTML = '<div class="empty-state" style="padding:40px;"><p>No data for this year yet.</p></div>';
    return;
  }

  // SVG dimensions
  var w = 1000, h = 260;
  var padL = 70, padR = 20, padT = 20, padB = 40;
  var chartW = w - padL - padR;
  var chartH = h - padT - padB;

  // Find max value for scaling
  var maxVal = 0;
  var minVal = 0;
  data.forEach(function(d) {
    if (d.exists) {
      maxVal = Math.max(maxVal, d.income, d.expenses, d.saved);
      minVal = Math.min(minVal, d.saved);
    }
  });
  // Add padding
  var range = maxVal - minVal;
  if (range === 0) range = 1;
  maxVal += range * 0.1;
  minVal -= range * 0.05;
  if (minVal > 0) minVal = 0;

  function yPos(val) {
    return padT + chartH - ((val - minVal) / (maxVal - minVal)) * chartH;
  }

  function xPos(i) {
    return padL + (i / 11) * chartW;
  }

  // Build SVG
  var svg = '<svg viewBox="0 0 ' + w + ' ' + h + '" style="width:100%; height:100%;" preserveAspectRatio="xMidYMid meet">';

  // Grid lines
  var gridSteps = 5;
  for (var g = 0; g <= gridSteps; g++) {
    var gVal = minVal + (maxVal - minVal) * (g / gridSteps);
    var gy = yPos(gVal);
    svg += '<line x1="' + padL + '" y1="' + gy + '" x2="' + (w - padR) + '" y2="' + gy + '" stroke="#e5e0da" stroke-width="1" stroke-dasharray="4,4"/>';
    svg += '<text x="' + (padL - 10) + '" y="' + (gy + 4) + '" text-anchor="end" fill="#9e958b" font-family="Roboto Mono,monospace" font-size="10">' + formatCurrency(Math.round(gVal)) + '</text>';
  }

  // Zero line if savings go negative
  if (minVal < 0) {
    var zeroY = yPos(0);
    svg += '<line x1="' + padL + '" y1="' + zeroY + '" x2="' + (w - padR) + '" y2="' + zeroY + '" stroke="#c4bcb2" stroke-width="1.5"/>';
  }

  // Month labels
  var monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  for (var i = 0; i < 12; i++) {
    svg += '<text x="' + xPos(i) + '" y="' + (h - 8) + '" text-anchor="middle" fill="#9e958b" font-family="Roboto Mono,monospace" font-size="10">' + monthLabels[i] + '</text>';
  }

  // Build line paths
  var series = [
    { key: 'income', color: '#8babc4', label: 'Income' },
    { key: 'expenses', color: '#e39589', label: 'Expenses' },
    { key: 'saved', color: '#7ba87b', label: 'Savings' }
  ];

  series.forEach(function(s) {
    var points = [];
    var dots = '';
    data.forEach(function(d, idx) {
      if (d.exists) {
        var px = xPos(idx);
        var py = yPos(d[s.key]);
        points.push(px + ',' + py);
        dots += '<circle cx="' + px + '" cy="' + py + '" r="4" fill="' + s.color + '" stroke="white" stroke-width="2"/>';
        // Tooltip area
        dots += '<circle cx="' + px + '" cy="' + py + '" r="12" fill="transparent" class="y-line-hover" data-tip="' + monthLabels[idx] + ': ' + formatCurrency(d[s.key]) + '"/>';
      }
    });

    if (points.length > 1) {
      svg += '<polyline points="' + points.join(' ') + '" fill="none" stroke="' + s.color + '" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>';
    }
    svg += dots;
  });

  svg += '</svg>';

  // Legend
  var legend = '<div style="display:flex; justify-content:center; gap:24px; margin-top:12px;">';
  series.forEach(function(s) {
    legend += '<div style="display:flex; align-items:center; gap:6px;">';
    legend += '<div style="width:12px; height:3px; border-radius:2px; background:' + s.color + ';"></div>';
    legend += '<span style="font-family:\'Roboto Mono\',monospace; font-size:0.65rem; text-transform:uppercase; letter-spacing:0.08em; color:var(--text-muted);">' + s.label + '</span>';
    legend += '</div>';
  });
  legend += '</div>';

  el.innerHTML = svg + legend;
}

// ============================================
// Year over Year Comparison
// ============================================

function renderYearOverYear() {
  const card = document.getElementById('y-yoy-card');
  const container = document.getElementById('y-yoy');

  const prevYear = currentYear - 1;
  const prevMonths = getMonthsInYear(prevYear);
  const currMonths = getMonthsInYear(currentYear);

  function yearTotals(months) {
    let inc = 0, exp = 0, count = 0;
    months.forEach(m => {
      if (appData.months[m]) {
        const t = calculateMonthTotals(appData.months[m]);
        inc += t.totalIncome;
        exp += t.totalExpenses;
        count++;
      }
    });
    return { income: inc, expenses: exp, saved: inc - exp, count };
  }

  const prev = yearTotals(prevMonths);
  const curr = yearTotals(currMonths);

  if (prev.count === 0) {
    card.style.display = 'none';
    return;
  }

  card.style.display = 'block';

  function changeStr(curr, prev) {
    if (prev === 0) return '--';
    const pct = ((curr - prev) / prev * 100);
    const sign = pct >= 0 ? '+' : '';
    const cls = pct >= 0 ? 'positive' : 'negative';
    return `<span class="stat-change ${cls}">${sign}${pct.toFixed(1)}%</span>`;
  }

  container.innerHTML = `
    <table>
      <thead>
        <tr>
          <th></th>
          <th style="text-align:right;">${prevYear}</th>
          <th style="text-align:right;">${currentYear}</th>
          <th style="text-align:right;">Change</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Total Income</td>
          <td style="text-align:right; font-family:'Roboto Mono',monospace;">${formatCurrency(prev.income)}</td>
          <td style="text-align:right; font-family:'Roboto Mono',monospace;">${formatCurrency(curr.income)}</td>
          <td style="text-align:right;">${changeStr(curr.income, prev.income)}</td>
        </tr>
        <tr>
          <td>Total Expenses</td>
          <td style="text-align:right; font-family:'Roboto Mono',monospace;">${formatCurrency(prev.expenses)}</td>
          <td style="text-align:right; font-family:'Roboto Mono',monospace;">${formatCurrency(curr.expenses)}</td>
          <td style="text-align:right;">${changeStr(curr.expenses, prev.expenses)}</td>
        </tr>
        <tr>
          <td>Total Saved</td>
          <td style="text-align:right; font-family:'Roboto Mono',monospace;">${formatCurrency(prev.saved)}</td>
          <td style="text-align:right; font-family:'Roboto Mono',monospace;">${formatCurrency(curr.saved)}</td>
          <td style="text-align:right;">${changeStr(curr.saved, prev.saved)}</td>
        </tr>
        <tr>
          <td>Months Logged</td>
          <td style="text-align:right; font-family:'Roboto Mono',monospace;">${prev.count}</td>
          <td style="text-align:right; font-family:'Roboto Mono',monospace;">${curr.count}</td>
          <td></td>
        </tr>
      </tbody>
    </table>
  `;
}

// ============================================
// Goal Scorecard
// ============================================

function renderYearScorecard() {
  const container = document.getElementById('y-scorecard');

  // Financial goals
  const financialGoals = appData.goals.financial || [];
  // Family goals for this year
  const familyGoals = (appData.goals.family || []).filter(g => g.year === currentYear);
  // Personal goals for this year
  const personalCarly = (appData.goals.personal.carly || []).filter(g => g.year === currentYear);
  const personalPartner = (appData.goals.personal.partner || []).filter(g => g.year === currentYear);

  const allGoals = [
    ...financialGoals.map(g => {
      const proj = projectGoalCompletion(g);
      return { name: g.name, type: 'Financial', done: proj.completed, pct: proj.percentComplete || 0 };
    }),
    ...familyGoals.map(g => ({ name: g.name, type: 'Family', done: g.status === 'done', pct: g.status === 'done' ? 100 : 0 })),
    ...personalCarly.map(g => ({ name: g.name, type: 'Carly', done: g.status === 'done', pct: g.status === 'done' ? 100 : 0 })),
    ...personalPartner.map(g => {
      const pName = appData.settings.partnerName || 'Partner';
      return { name: g.name, type: pName, done: g.status === 'done', pct: g.status === 'done' ? 100 : 0 };
    })
  ];

  if (allGoals.length === 0) {
    container.innerHTML = '<div class="empty-state" style="padding:20px;"><p>No goals for this year.</p></div>';
    return;
  }

  const completed = allGoals.filter(g => g.done).length;
  const total = allGoals.length;

  container.innerHTML = `
    <div style="text-align:center; margin-bottom:20px;">
      <div style="font-family:'Ibarra Real Nova',serif; font-size:2.5rem; color:var(--text-heading);">${completed}/${total}</div>
      <div class="card-label">goals completed</div>
      <div class="progress-bar mt-sm" style="max-width:300px; margin:8px auto; height:10px;">
        <div class="progress-fill" style="width:${(completed/total*100)}%"></div>
      </div>
    </div>
    <table>
      <thead>
        <tr>
          <th>Goal</th>
          <th>Type</th>
          <th style="text-align:center;">Status</th>
        </tr>
      </thead>
      <tbody>
        ${allGoals.map(g => `
          <tr>
            <td>${g.name}</td>
            <td><span class="badge badge-lavender">${g.type}</span></td>
            <td style="text-align:center;">
              ${g.done
                ? '<span class="badge badge-sage">Done</span>'
                : g.pct > 0 ? `<span class="badge badge-butter">${g.pct.toFixed(0)}%</span>` : '<span class="badge" style="background:var(--border-light); color:var(--text-muted);">Pending</span>'
              }
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

// ============================================
// Subscription Audit
// ============================================

function renderSubscriptionAudit() {
  const container = document.getElementById('y-subscriptions');
  const review = appData.yearlyReviews[currentYear] || {};
  const subs = review.subscriptions || [];

  if (subs.length === 0) {
    container.innerHTML = '<p style="font-size:0.82rem; color:var(--text-muted); font-style:italic;">No subscriptions listed yet. Add your recurring charges to review them.</p>';
    return;
  }

  container.innerHTML = subs.map((s, i) => `
    <div class="monthly-row">
      <input type="text" class="form-input name-input" value="${s.name}" placeholder="Service name" onchange="updateSubscription(${i}, 'name', this.value)">
      <div class="currency-input" style="width:120px;">
        <input type="number" class="form-input" value="${s.amount || ''}" placeholder="0" onchange="updateSubscription(${i}, 'amount', this.value)">
      </div>
      <select class="form-select" style="width:130px;" onchange="updateSubscription(${i}, 'decision', this.value)">
        <option value="" ${!s.decision ? 'selected' : ''}>Decide...</option>
        <option value="keep" ${s.decision === 'keep' ? 'selected' : ''}>Keep</option>
        <option value="cancel" ${s.decision === 'cancel' ? 'selected' : ''}>Cancel</option>
        <option value="downgrade" ${s.decision === 'downgrade' ? 'selected' : ''}>Downgrade</option>
      </select>
      <button class="row-delete" onclick="removeSubscription(${i})">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    </div>
  `).join('');
}

function addSubscriptionAuditRow() {
  if (!appData.yearlyReviews[currentYear]) {
    appData.yearlyReviews[currentYear] = {};
  }
  if (!appData.yearlyReviews[currentYear].subscriptions) {
    appData.yearlyReviews[currentYear].subscriptions = [];
  }
  appData.yearlyReviews[currentYear].subscriptions.push({ name: '', amount: 0, decision: '' });
  saveData(appData);
  renderSubscriptionAudit();
}

function updateSubscription(index, field, value) {
  const subs = appData.yearlyReviews[currentYear]?.subscriptions;
  if (subs && subs[index]) {
    subs[index][field] = field === 'amount' ? parseFloat(value) || 0 : value;
    saveData(appData);
  }
}

function removeSubscription(index) {
  const subs = appData.yearlyReviews[currentYear]?.subscriptions;
  if (subs) {
    subs.splice(index, 1);
    saveData(appData);
    renderSubscriptionAudit();
  }
}

// ============================================
// Load/Save Yearly Reflection
// ============================================

function loadYearlyReflection() {
  const review = appData.yearlyReviews[currentYear] || {};
  document.getElementById('y-biggest-win').value = review.biggestWin || '';
  document.getElementById('y-biggest-surprise').value = review.biggestSurprise || '';
  document.getElementById('y-highlights').value = review.highlights || '';
  document.getElementById('y-next-goals').value = review.nextGoals || '';
}

function saveYearlyReview() {
  if (!appData.yearlyReviews[currentYear]) {
    appData.yearlyReviews[currentYear] = {};
  }
  Object.assign(appData.yearlyReviews[currentYear], {
    biggestWin: document.getElementById('y-biggest-win').value,
    biggestSurprise: document.getElementById('y-biggest-surprise').value,
    highlights: document.getElementById('y-highlights').value,
    nextGoals: document.getElementById('y-next-goals').value,
    savedAt: new Date().toISOString()
  });

  saveData(appData);
  showToast(`${currentYear} review saved!`);
}
