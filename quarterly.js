/* ============================================
   QUARTERLY REVIEW
   ============================================ */

let currentQuarter = getQuarterFromDate(new Date());

function render_quarterly() {
  document.getElementById('quarterly-current').textContent = currentQuarter;
  renderQuarterStats();
  renderMonthBreakdown();
  renderCategoryAnalysis();
  renderLifestyleCreep();
  renderQuarterGoals();
  loadQuarterlyReflection();
}

function changeQuarter(delta) {
  const [year, q] = currentQuarter.split('-Q').map(Number);
  if (delta === -1) {
    currentQuarter = q === 1 ? `${year - 1}-Q4` : `${year}-Q${q - 1}`;
  } else {
    currentQuarter = q === 4 ? `${year + 1}-Q1` : `${year}-Q${q + 1}`;
  }
  render_quarterly();
}

// ============================================
// Quarter Stats
// ============================================

function renderQuarterStats() {
  const months = getMonthsInQuarter(currentQuarter);
  let totalIncome = 0, totalExpenses = 0, totalSaved = 0, rateCount = 0, rateSum = 0;

  months.forEach(m => {
    if (appData.months[m]) {
      const t = calculateMonthTotals(appData.months[m]);
      totalIncome += t.totalIncome;
      totalExpenses += t.totalExpenses;
      totalSaved += t.totalSaved;
      if (t.totalIncome > 0) {
        rateSum += t.savingsRate;
        rateCount++;
      }
    }
  });

  document.getElementById('q-income').textContent = formatCurrency(totalIncome);
  document.getElementById('q-expenses').textContent = formatCurrency(totalExpenses);
  document.getElementById('q-saved').textContent = formatCurrency(totalSaved);
  document.getElementById('q-saved').style.color = totalSaved >= 0 ? 'var(--text-heading)' : 'var(--accent-red)';
  document.getElementById('q-rate').textContent = formatPercent(rateCount > 0 ? rateSum / rateCount : 0);
}

// ============================================
// Month by Month
// ============================================

function renderMonthBreakdown() {
  const container = document.getElementById('q-month-breakdown');
  const months = getMonthsInQuarter(currentQuarter);

  const hasData = months.some(m => appData.months[m]);
  if (!hasData) {
    container.innerHTML = '<div class="empty-state" style="padding:20px;"><p>No monthly data logged for this quarter yet.</p></div>';
    return;
  }

  let html = `
    <table>
      <thead>
        <tr>
          <th>Month</th>
          <th style="text-align:right;">Income</th>
          <th style="text-align:right;">Expenses</th>
          <th style="text-align:right;">Saved</th>
          <th style="text-align:right;">Rate</th>
          <th>Feeling</th>
        </tr>
      </thead>
      <tbody>
  `;

  months.forEach(m => {
    const data = appData.months[m];
    if (data) {
      const t = calculateMonthTotals(data);
      const pulse = data.pulse || {};
      const avgFeeling = (pulse.carlyFeeling && pulse.partnerFeeling)
        ? ((pulse.carlyFeeling + pulse.partnerFeeling) / 2).toFixed(1)
        : (pulse.carlyFeeling || pulse.partnerFeeling || '--');

      html += `
        <tr>
          <td>${getMonthName(m)}</td>
          <td style="text-align:right; font-family:'Roboto Mono',monospace;">${formatCurrency(t.totalIncome)}</td>
          <td style="text-align:right; font-family:'Roboto Mono',monospace;">${formatCurrency(t.totalExpenses)}</td>
          <td style="text-align:right; font-family:'Roboto Mono',monospace; color:${t.totalSaved >= 0 ? 'var(--accent-green)' : 'var(--accent-red)'};">${formatCurrency(t.totalSaved)}</td>
          <td style="text-align:right; font-family:'Roboto Mono',monospace;">${formatPercent(t.savingsRate)}</td>
          <td>${avgFeeling}/5</td>
        </tr>
      `;
    } else {
      html += `
        <tr style="color:var(--text-light);">
          <td>${getMonthName(m)}</td>
          <td colspan="5" style="text-align:center; font-style:italic;">Not logged</td>
        </tr>
      `;
    }
  });

  html += '</tbody></table>';
  container.innerHTML = html;
}

// ============================================
// Category Spend Analysis
// ============================================

function renderCategoryAnalysis() {
  const container = document.getElementById('q-category-analysis');
  const months = getMonthsInQuarter(currentQuarter);

  // Aggregate spending by category from credit cards and fixed expenses
  const categoryTotals = {};
  let grandTotal = 0;

  months.forEach(m => {
    const data = appData.months[m];
    if (!data) return;

    // Fixed expenses as a category
    (data.fixedExpenses || []).forEach(e => {
      const cat = e.name || 'Uncategorized';
      categoryTotals[cat] = (categoryTotals[cat] || 0) + (parseFloat(e.amount) || 0);
      grandTotal += parseFloat(e.amount) || 0;
    });

    // Credit card categories
    (data.creditCards || []).forEach(card => {
      if (card.categories && card.categories.length > 0) {
        card.categories.forEach(c => {
          const cat = c.category || 'Uncategorized';
          categoryTotals[cat] = (categoryTotals[cat] || 0) + (parseFloat(c.amount) || 0);
        });
        grandTotal += parseFloat(card.total) || 0;
      } else {
        const cat = card.name || 'Credit Card';
        categoryTotals[cat] = (categoryTotals[cat] || 0) + (parseFloat(card.total) || 0);
        grandTotal += parseFloat(card.total) || 0;
      }
    });

    // Surprise
    if (data.surpriseSpend) {
      categoryTotals['Surprise Spend'] = (categoryTotals['Surprise Spend'] || 0) + parseFloat(data.surpriseSpend);
      grandTotal += parseFloat(data.surpriseSpend);
    }
  });

  if (Object.keys(categoryTotals).length === 0) {
    container.innerHTML = '<div class="empty-state" style="padding:20px;"><p>No spend data for this quarter.</p></div>';
    return;
  }

  // Sort by amount descending
  const sorted = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]);
  const barColors = ['var(--accent-sage)', 'var(--accent-butter)', 'var(--accent-lavender)', 'var(--accent-orange)', 'var(--accent-pink)', 'var(--accent-blue)'];

  container.innerHTML = sorted.map(([cat, amount], i) => {
    const pct = grandTotal > 0 ? (amount / grandTotal * 100) : 0;
    const color = barColors[i % barColors.length];
    return `
      <div class="category-bar-row">
        <div class="category-bar-label">
          <span>${cat}</span>
          <span class="category-bar-amount">${formatCurrency(amount)} (${pct.toFixed(0)}%)</span>
        </div>
        <div class="progress-bar" style="height:6px;">
          <div class="progress-fill" style="width:${pct}%; background:${color};"></div>
        </div>
      </div>
    `;
  }).join('');
}

// ============================================
// Lifestyle Creep Check
// ============================================

function renderLifestyleCreep() {
  const card = document.getElementById('q-creep-card');
  const container = document.getElementById('q-creep');

  // Compare this quarter's avg fixed expenses to previous quarter
  const [year, q] = currentQuarter.split('-Q').map(Number);
  const prevQ = q === 1 ? `${year - 1}-Q4` : `${year}-Q${q - 1}`;

  const currentMonths = getMonthsInQuarter(currentQuarter);
  const prevMonths = getMonthsInQuarter(prevQ);

  function getAvgFixed(months) {
    let total = 0, count = 0;
    months.forEach(m => {
      if (appData.months[m]) {
        const fixed = (appData.months[m].fixedExpenses || []).reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
        total += fixed;
        count++;
      }
    });
    return count > 0 ? total / count : 0;
  }

  const currentAvg = getAvgFixed(currentMonths);
  const prevAvg = getAvgFixed(prevMonths);

  if (prevAvg <= 0 || currentAvg <= 0) {
    card.style.display = 'none';
    return;
  }

  card.style.display = 'block';
  const diff = currentAvg - prevAvg;
  const pctChange = (diff / prevAvg) * 100;

  let status, message;
  if (pctChange > 10) {
    status = 'warning';
    message = `Your average monthly fixed expenses went up ${formatPercent(pctChange)} (${formatCurrency(diff)}/mo). Worth looking into what changed.`;
  } else if (pctChange > 0) {
    status = 'minor';
    message = `Fixed expenses crept up slightly: ${formatPercent(pctChange)} (${formatCurrency(diff)}/mo). Normal, but keep an eye on it.`;
  } else {
    status = 'good';
    message = `Fixed expenses stayed flat or decreased (${formatPercent(pctChange)}). No lifestyle creep detected.`;
  }

  container.innerHTML = `
    <div class="nudge-banner ${status === 'warning' ? 'overdue' : status === 'minor' ? 'reminder' : 'gentle'}">
      <span>${message}</span>
    </div>
    <div class="grid-2 mt-md">
      <div>
        <span class="card-label">Previous Quarter Avg</span>
        <div style="font-family:'Roboto Mono',monospace; font-size:1rem;">${formatCurrency(prevAvg)}/mo</div>
      </div>
      <div>
        <span class="card-label">This Quarter Avg</span>
        <div style="font-family:'Roboto Mono',monospace; font-size:1rem;">${formatCurrency(currentAvg)}/mo</div>
      </div>
    </div>
  `;
}

// ============================================
// Quarter Goal Progress
// ============================================

function renderQuarterGoals() {
  const container = document.getElementById('q-goals');
  const [year, q] = currentQuarter.split('-Q').map(Number);

  // Financial goals
  const financialGoals = appData.goals.financial || [];
  // Family goals for this quarter
  const familyGoals = (appData.goals.family || []).filter(g => g.year === year && g.quarter === q);
  // Personal goals
  const personalCarly = (appData.goals.personal.carly || []).filter(g => g.year === year && g.quarter === q);
  const personalPartner = (appData.goals.personal.partner || []).filter(g => g.year === year && g.quarter === q);

  if (financialGoals.length === 0 && familyGoals.length === 0 && personalCarly.length === 0 && personalPartner.length === 0) {
    container.innerHTML = '<div class="empty-state" style="padding:20px;"><p>No goals set for this quarter.</p></div>';
    return;
  }

  let html = '';

  if (financialGoals.length > 0) {
    html += '<div class="card-label mb-sm">Financial Goals</div>';
    html += financialGoals.map(g => {
      const proj = projectGoalCompletion(g);
      const pct = Math.min(proj.percentComplete || 0, 100);
      return `
        <div class="dash-goal-item">
          <div class="dash-goal-top">
            <span class="dash-goal-name">${g.name}</span>
            <span class="dash-goal-amount">${formatCurrency(g.currentAmount)} / ${formatCurrency(g.targetAmount)}</span>
          </div>
          <div class="progress-bar"><div class="progress-fill" style="width:${pct}%"></div></div>
          <div class="dash-goal-meta"><span>${pct.toFixed(0)}%</span><span>${proj.completed ? 'Complete!' : ''}</span></div>
        </div>
      `;
    }).join('');
  }

  if (familyGoals.length > 0) {
    html += '<div class="card-label mt-lg mb-sm">Family Goals</div>';
    html += familyGoals.map(g => `
      <div class="family-goal-row">
        <div class="goal-status-toggle ${g.status}">${g.status === 'done' ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20,6 9,17 4,12"/></svg>' : ''}</div>
        <span class="${g.status === 'done' ? 'goal-done-text' : ''}">${g.name}</span>
      </div>
    `).join('');
  }

  const partnerName = appData.settings.partnerName || 'Partner';
  const personalAll = [
    ...personalCarly.map(g => ({ ...g, who: 'Carly' })),
    ...personalPartner.map(g => ({ ...g, who: partnerName }))
  ];

  if (personalAll.length > 0) {
    html += '<div class="card-label mt-lg mb-sm">Personal Goals</div>';
    html += personalAll.map(g => `
      <div class="family-goal-row">
        <div class="goal-status-toggle ${g.status}">${g.status === 'done' ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20,6 9,17 4,12"/></svg>' : ''}</div>
        <span class="${g.status === 'done' ? 'goal-done-text' : ''}">${g.name}</span>
        <span class="badge badge-lavender">${g.who}</span>
      </div>
    `).join('');
  }

  container.innerHTML = html;
}

// ============================================
// Load/Save Quarterly Reflection
// ============================================

function loadQuarterlyReflection() {
  const review = appData.quarterlyReviews[currentQuarter] || {};
  document.getElementById('q-wins').value = review.wins || '';
  document.getElementById('q-surprises').value = review.surprises || '';
  document.getElementById('q-carry-forward').value = review.carryForward || '';
  document.getElementById('q-next-intention').value = review.nextIntention || '';
}

function saveQuarterlyReview() {
  appData.quarterlyReviews[currentQuarter] = {
    wins: document.getElementById('q-wins').value,
    surprises: document.getElementById('q-surprises').value,
    carryForward: document.getElementById('q-carry-forward').value,
    nextIntention: document.getElementById('q-next-intention').value,
    savedAt: new Date().toISOString()
  };

  // Update the global quarter intention if they set one for next quarter
  const nextIntention = document.getElementById('q-next-intention').value.trim();
  if (nextIntention) {
    appData.settings.quarterIntention = nextIntention;
  }

  saveData(appData);
  showToast(`${currentQuarter} review saved!`);
}
