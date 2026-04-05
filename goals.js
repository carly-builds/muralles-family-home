/* ============================================
   GOALS
   ============================================ */

function render_goals() {
  const partnerName = appData.settings.partnerName || 'Partner';
  const heading = document.getElementById('personal-partner-heading');
  if (heading) heading.textContent = partnerName;

  renderFinancialGoals();
  renderFamilyGoals();
  renderPersonalGoals();
}

// ============================================
// Tab Switching
// ============================================

function switchGoalTab(tab) {
  document.querySelectorAll('[data-goal-tab]').forEach(t => t.classList.remove('active'));
  document.querySelector(`[data-goal-tab="${tab}"]`)?.classList.add('active');

  document.querySelectorAll('.goal-tab-content').forEach(c => c.classList.remove('active'));
  document.getElementById(`goals-${tab}`)?.classList.add('active');
}

// ============================================
// FINANCIAL GOALS
// ============================================

function renderFinancialGoals() {
  const container = document.getElementById('financial-goals-list');
  const goals = appData.goals.financial || [];

  if (goals.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <p>No financial goals yet.</p>
        <p style="font-size:0.82rem;">What are you saving for? Emergency fund, vacation, house down payment, college fund...</p>
      </div>
    `;
    return;
  }

  const colorOptions = ['', 'butter', 'lavender', 'orange', 'pink'];

  container.innerHTML = goals.map((goal, i) => {
    const proj = projectGoalCompletion(goal);
    const pct = Math.min(proj.percentComplete || 0, 100);
    const colorClass = goal.color || colorOptions[i % colorOptions.length];

    let statusText = '';
    let statusBadge = '';
    if (proj.completed) {
      statusText = 'Goal reached!';
      statusBadge = '<span class="badge badge-sage">Complete</span>';
    } else if (proj.monthsLeft === Infinity) {
      statusText = 'Set a monthly contribution to see projection';
      statusBadge = '<span class="badge badge-butter">No contribution set</span>';
    } else {
      const projDate = new Date(proj.projectedDate);
      statusText = `On track for ${projDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })} (${proj.monthsLeft} months)`;

      // Check if deadline exists and compare
      if (goal.deadline) {
        const deadlineDate = new Date(goal.deadline);
        if (projDate <= deadlineDate) {
          statusBadge = '<span class="badge badge-sage">On Track</span>';
        } else {
          statusBadge = '<span class="badge badge-pink">Behind</span>';
          statusText += ` (deadline: ${deadlineDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })})`;
        }
      }
    }

    return `
      <div class="card goal-card">
        <div class="goal-card-top">
          <div class="goal-card-info">
            <h4>${goal.name}</h4>
            <div class="goal-amounts">
              <span class="goal-current">${formatCurrency(goal.currentAmount)}</span>
              <span class="goal-separator">of</span>
              <span class="goal-target">${formatCurrency(goal.targetAmount)}</span>
            </div>
          </div>
          <div class="goal-card-actions">
            ${statusBadge}
            <button class="btn btn-ghost btn-sm" onclick="showEditFinancialGoal('${goal.id}')">Edit</button>
          </div>
        </div>
        <div class="progress-bar" style="height:10px; margin: 12px 0;">
          <div class="progress-fill ${colorClass}" style="width: ${pct}%"></div>
        </div>
        <div class="goal-card-meta">
          <span>${pct.toFixed(0)}% complete</span>
          <span>${goal.monthlyContribution ? formatCurrency(goal.monthlyContribution) + '/mo' : ''}</span>
          <span>${statusText}</span>
        </div>
        ${goal.notes ? `<div class="goal-notes">${goal.notes}</div>` : ''}
      </div>
    `;
  }).join('');
}

function showAddFinancialGoal() {
  const colorOptions = [
    { value: '', label: 'Sage (default)' },
    { value: 'butter', label: 'Butter Yellow' },
    { value: 'lavender', label: 'Lavender' },
    { value: 'orange', label: 'Orange' },
    { value: 'pink', label: 'Pink' }
  ];

  showModal('New Financial Goal', `
    <div class="form-group">
      <label class="form-label">Goal Name</label>
      <input type="text" class="form-input" id="goal-name" placeholder="e.g., Emergency Fund, House Down Payment">
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Target Amount</label>
        <div class="currency-input">
          <input type="number" class="form-input" id="goal-target" placeholder="50000">
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Saved So Far</label>
        <div class="currency-input">
          <input type="number" class="form-input" id="goal-current" placeholder="0">
        </div>
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Monthly Contribution</label>
        <div class="currency-input">
          <input type="number" class="form-input" id="goal-monthly" placeholder="500">
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Target Date (optional)</label>
        <input type="date" class="form-input" id="goal-deadline">
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">Color</label>
      <select class="form-select" id="goal-color">
        ${colorOptions.map(c => `<option value="${c.value}">${c.label}</option>`).join('')}
      </select>
    </div>
    <div class="form-group">
      <label class="form-label">Notes (optional)</label>
      <textarea class="form-textarea" id="goal-notes" rows="2" placeholder="Any context for this goal"></textarea>
    </div>
  `, `
    <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
    <button class="btn btn-primary" onclick="saveFinancialGoal()">Add Goal</button>
  `);
  document.getElementById('goal-name').focus();
}

function saveFinancialGoal(editId) {
  const name = document.getElementById('goal-name').value.trim();
  const targetAmount = parseFloat(document.getElementById('goal-target').value) || 0;
  const currentAmount = parseFloat(document.getElementById('goal-current').value) || 0;
  const monthlyContribution = parseFloat(document.getElementById('goal-monthly').value) || 0;
  const deadline = document.getElementById('goal-deadline').value || '';
  const color = document.getElementById('goal-color').value || '';
  const notes = document.getElementById('goal-notes').value.trim();

  if (!name) { showToast('Give your goal a name', 'error'); return; }
  if (targetAmount <= 0) { showToast('Set a target amount', 'error'); return; }

  if (editId) {
    const goal = appData.goals.financial.find(g => g.id === editId);
    if (goal) {
      Object.assign(goal, { name, targetAmount, currentAmount, monthlyContribution, deadline, color, notes });
    }
  } else {
    appData.goals.financial.push({
      id: generateId(),
      name, targetAmount, currentAmount, monthlyContribution, deadline, color, notes
    });
  }

  saveData(appData);
  closeModal();
  renderFinancialGoals();
  showToast(editId ? 'Goal updated!' : 'Goal added!');
}

function showEditFinancialGoal(id) {
  const goal = appData.goals.financial.find(g => g.id === id);
  if (!goal) return;

  showAddFinancialGoal();

  // Populate fields
  document.getElementById('goal-name').value = goal.name;
  document.getElementById('goal-target').value = goal.targetAmount;
  document.getElementById('goal-current').value = goal.currentAmount;
  document.getElementById('goal-monthly').value = goal.monthlyContribution;
  document.getElementById('goal-deadline').value = goal.deadline || '';
  document.getElementById('goal-color').value = goal.color || '';
  document.getElementById('goal-notes').value = goal.notes || '';

  // Update modal title and buttons
  document.querySelector('.modal-header h3').textContent = 'Edit Financial Goal';
  document.querySelector('.modal-actions').innerHTML = `
    <button class="btn btn-danger" onclick="deleteFinancialGoal('${id}')">Delete</button>
    <div style="flex:1;"></div>
    <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
    <button class="btn btn-primary" onclick="saveFinancialGoal('${id}')">Save</button>
  `;
}

function deleteFinancialGoal(id) {
  showConfirm('Delete this goal?', () => {
    appData.goals.financial = appData.goals.financial.filter(g => g.id !== id);
    saveData(appData);
    closeModal();
    renderFinancialGoals();
    showToast('Goal deleted');
  });
}

// ============================================
// FAMILY GOALS
// ============================================

function renderFamilyGoals() {
  const container = document.getElementById('family-goals-list');
  const goals = appData.goals.family || [];
  const currentQuarter = getQuarterFromDate(new Date());

  if (goals.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <p>No family goals yet.</p>
        <p style="font-size:0.82rem;">What do you want to do together this quarter? Travel, date nights, experiences, routines...</p>
      </div>
    `;
    return;
  }

  // Group by quarter
  const grouped = {};
  goals.forEach(g => {
    const key = `${g.year}-Q${g.quarter}`;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(g);
  });

  // Sort quarters descending
  const quarters = Object.keys(grouped).sort().reverse();

  container.innerHTML = quarters.map(q => {
    const isCurrent = q === currentQuarter;
    return `
      <div class="card ${isCurrent ? '' : 'mt-md'}">
        <div class="card-header">
          <h4>${q} ${isCurrent ? '<span class="badge badge-sage">Current</span>' : ''}</h4>
        </div>
        ${grouped[q].map(goal => `
          <div class="family-goal-row">
            <button class="goal-status-toggle ${goal.status}" onclick="toggleFamilyGoalStatus('${goal.id}')">
              ${goal.status === 'done' ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20,6 9,17 4,12"/></svg>' : ''}
            </button>
            <div class="family-goal-info">
              <span class="${goal.status === 'done' ? 'goal-done-text' : ''}">${goal.name}</span>
              ${goal.notes ? `<span class="family-goal-note">${goal.notes}</span>` : ''}
            </div>
            <button class="btn btn-ghost btn-sm" onclick="showEditFamilyGoal('${goal.id}')">Edit</button>
          </div>
        `).join('')}
      </div>
    `;
  }).join('');
}

function showAddFamilyGoal() {
  const now = new Date();
  const currentQ = Math.ceil((now.getMonth() + 1) / 3);
  const currentYear = now.getFullYear();

  showModal('New Family Goal', `
    <div class="form-group">
      <label class="form-label">What's the goal?</label>
      <input type="text" class="form-input" id="fgoal-name" placeholder="e.g., Take a weekend trip together">
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Quarter</label>
        <select class="form-select" id="fgoal-quarter">
          <option value="1" ${currentQ === 1 ? 'selected' : ''}>Q1 (Jan-Mar)</option>
          <option value="2" ${currentQ === 2 ? 'selected' : ''}>Q2 (Apr-Jun)</option>
          <option value="3" ${currentQ === 3 ? 'selected' : ''}>Q3 (Jul-Sep)</option>
          <option value="4" ${currentQ === 4 ? 'selected' : ''}>Q4 (Oct-Dec)</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Year</label>
        <select class="form-select" id="fgoal-year">
          <option value="${currentYear}" selected>${currentYear}</option>
          <option value="${currentYear + 1}">${currentYear + 1}</option>
        </select>
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">Notes (optional)</label>
      <textarea class="form-textarea" id="fgoal-notes" rows="2"></textarea>
    </div>
  `, `
    <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
    <button class="btn btn-primary" onclick="saveFamilyGoal()">Add Goal</button>
  `);
  document.getElementById('fgoal-name').focus();
}

function saveFamilyGoal(editId) {
  const name = document.getElementById('fgoal-name').value.trim();
  const quarter = parseInt(document.getElementById('fgoal-quarter').value);
  const year = parseInt(document.getElementById('fgoal-year').value);
  const notes = document.getElementById('fgoal-notes').value.trim();

  if (!name) { showToast('Give your goal a name', 'error'); return; }

  if (editId) {
    const goal = appData.goals.family.find(g => g.id === editId);
    if (goal) Object.assign(goal, { name, quarter, year, notes });
  } else {
    appData.goals.family.push({
      id: generateId(), name, quarter, year, status: 'pending', notes
    });
  }

  saveData(appData);
  closeModal();
  renderFamilyGoals();
  showToast(editId ? 'Goal updated!' : 'Goal added!');
}

function showEditFamilyGoal(id) {
  const goal = appData.goals.family.find(g => g.id === id);
  if (!goal) return;

  showAddFamilyGoal();
  document.getElementById('fgoal-name').value = goal.name;
  document.getElementById('fgoal-quarter').value = goal.quarter;
  document.getElementById('fgoal-year').value = goal.year;
  document.getElementById('fgoal-notes').value = goal.notes || '';

  document.querySelector('.modal-header h3').textContent = 'Edit Family Goal';
  document.querySelector('.modal-actions').innerHTML = `
    <button class="btn btn-danger" onclick="deleteFamilyGoal('${id}')">Delete</button>
    <div style="flex:1;"></div>
    <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
    <button class="btn btn-primary" onclick="saveFamilyGoal('${id}')">Save</button>
  `;
}

function toggleFamilyGoalStatus(id) {
  const goal = appData.goals.family.find(g => g.id === id);
  if (!goal) return;
  goal.status = goal.status === 'done' ? 'pending' : 'done';
  saveData(appData);
  renderFamilyGoals();
}

function deleteFamilyGoal(id) {
  appData.goals.family = appData.goals.family.filter(g => g.id !== id);
  saveData(appData);
  closeModal();
  renderFamilyGoals();
}

// ============================================
// PERSONAL GOALS
// ============================================

function renderPersonalGoals() {
  renderPersonalGoalsList('carly');
  renderPersonalGoalsList('partner');
}

function renderPersonalGoalsList(person) {
  const container = document.getElementById(`personal-goals-${person}`);
  const goals = appData.goals.personal[person] || [];
  const currentQuarter = getQuarterFromDate(new Date());

  if (goals.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="padding:24px;">
        <p style="font-size:0.85rem; color:var(--text-muted);">No goals yet.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = goals.map(goal => {
    const qKey = `${goal.year}-Q${goal.quarter}`;
    return `
      <div class="card" style="padding:16px; margin-bottom:8px;">
        <div class="family-goal-row" style="border:none; padding:0;">
          <button class="goal-status-toggle ${goal.status}" onclick="togglePersonalGoalStatus('${person}', '${goal.id}')">
            ${goal.status === 'done' ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20,6 9,17 4,12"/></svg>' : ''}
          </button>
          <div class="family-goal-info">
            <span class="${goal.status === 'done' ? 'goal-done-text' : ''}">${goal.name}</span>
            <span class="family-goal-note">${qKey}</span>
          </div>
          <button class="row-delete" onclick="deletePersonalGoal('${person}', '${goal.id}')">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
      </div>
    `;
  }).join('');
}

function showAddPersonalGoal(person) {
  const now = new Date();
  const currentQ = Math.ceil((now.getMonth() + 1) / 3);
  const label = person === 'carly' ? 'Carly' : (appData.settings.partnerName || 'Partner');

  showModal(`New Goal for ${label}`, `
    <div class="form-group">
      <label class="form-label">Goal</label>
      <input type="text" class="form-input" id="pgoal-name" placeholder="e.g., Run a half marathon, Read 12 books">
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Quarter</label>
        <select class="form-select" id="pgoal-quarter">
          <option value="1" ${currentQ === 1 ? 'selected' : ''}>Q1</option>
          <option value="2" ${currentQ === 2 ? 'selected' : ''}>Q2</option>
          <option value="3" ${currentQ === 3 ? 'selected' : ''}>Q3</option>
          <option value="4" ${currentQ === 4 ? 'selected' : ''}>Q4</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Year</label>
        <input type="number" class="form-input" id="pgoal-year" value="${now.getFullYear()}">
      </div>
    </div>
  `, `
    <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
    <button class="btn btn-primary" onclick="savePersonalGoal('${person}')">Add</button>
  `);
  document.getElementById('pgoal-name').focus();
}

function savePersonalGoal(person) {
  const name = document.getElementById('pgoal-name').value.trim();
  const quarter = parseInt(document.getElementById('pgoal-quarter').value);
  const year = parseInt(document.getElementById('pgoal-year').value);

  if (!name) { showToast('Give your goal a name', 'error'); return; }

  if (!appData.goals.personal[person]) appData.goals.personal[person] = [];
  appData.goals.personal[person].push({
    id: generateId(), name, quarter, year, status: 'pending', notes: ''
  });

  saveData(appData);
  closeModal();
  renderPersonalGoals();
  showToast('Goal added!');
}

function togglePersonalGoalStatus(person, id) {
  const goal = (appData.goals.personal[person] || []).find(g => g.id === id);
  if (!goal) return;
  goal.status = goal.status === 'done' ? 'pending' : 'done';
  saveData(appData);
  renderPersonalGoals();
}

function deletePersonalGoal(person, id) {
  appData.goals.personal[person] = (appData.goals.personal[person] || []).filter(g => g.id !== id);
  saveData(appData);
  renderPersonalGoals();
}
