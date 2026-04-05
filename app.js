/* ============================================
   APP.JS - Core navigation and shared logic
   ============================================ */

// Global app state
let appData = loadData();

// ============================================
// NAVIGATION
// ============================================

function initNavigation() {
  const links = document.querySelectorAll('.nav-link');
  links.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const section = link.dataset.section;
      navigateTo(section);
    });
  });

  // Handle hash on load
  const hash = window.location.hash.replace('#', '') || 'dashboard';
  navigateTo(hash);
}

function navigateTo(sectionId) {
  // Update nav links
  document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
  const activeLink = document.querySelector(`[data-section="${sectionId}"]`);
  if (activeLink) activeLink.classList.add('active');

  // Update sections
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  const activeSection = document.getElementById(sectionId);
  if (activeSection) activeSection.classList.add('active');

  // Update URL hash
  window.location.hash = sectionId;

  // Close mobile sidebar
  document.querySelector('.sidebar')?.classList.remove('open');

  // Trigger section render if it has one
  if (typeof window[`render_${sectionId}`] === 'function') {
    window[`render_${sectionId}`]();
  }
}

function toggleSidebar() {
  document.querySelector('.sidebar')?.classList.toggle('open');
}

// ============================================
// WELCOME / FIRST RUN
// ============================================

function checkFirstRun() {
  if (!appData.settings.partnerName) {
    showWelcomeModal();
  }
}

function showWelcomeModal() {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay active';
  overlay.innerHTML = `
    <div class="modal">
      <div class="modal-header">
        <h3>Welcome to your Family Command Center</h3>
      </div>
      <p style="margin-bottom: 20px; color: var(--text-muted);">
        Let's set up a couple of things so this feels like yours.
      </p>
      <div class="form-group">
        <label class="form-label">Your partner's name</label>
        <input type="text" class="form-input" id="welcome-partner" placeholder="e.g., Matt">
      </div>
      <div class="form-group">
        <label class="form-label">Quarterly intention or theme (optional)</label>
        <input type="text" class="form-input" id="welcome-intention" placeholder="e.g., Build our safety net">
      </div>
      <div class="modal-actions">
        <button class="btn btn-primary" onclick="saveWelcome()">Let's Go</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  document.getElementById('welcome-partner').focus();
}

function saveWelcome() {
  const partnerName = document.getElementById('welcome-partner').value.trim();
  const intention = document.getElementById('welcome-intention').value.trim();

  if (partnerName) {
    appData.settings.partnerName = partnerName;
    // Update income categories to use partner name
    appData.settings.incomeCategories = appData.settings.incomeCategories.map(c =>
      c.includes('Partner') ? c.replace('Partner', partnerName) : c
    );
  }
  if (intention) {
    appData.settings.quarterIntention = intention;
  }

  saveData(appData);

  const overlay = document.querySelector('.modal-overlay');
  if (overlay) overlay.remove();

  // Re-render current section
  const currentSection = document.querySelector('.section.active')?.id;
  if (currentSection && typeof window[`render_${currentSection}`] === 'function') {
    window[`render_${currentSection}`]();
  }
}

// ============================================
// SHARED UI HELPERS
// ============================================

function showModal(title, contentHTML, actions) {
  // Remove any existing modal
  document.querySelector('.modal-overlay')?.remove();

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay active';
  overlay.innerHTML = `
    <div class="modal">
      <div class="modal-header">
        <h3>${title}</h3>
        <button class="modal-close" onclick="closeModal()">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
      <div class="modal-body">${contentHTML}</div>
      ${actions ? `<div class="modal-actions">${actions}</div>` : ''}
    </div>
  `;

  // Close on overlay click
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeModal();
  });

  document.body.appendChild(overlay);
}

function closeModal() {
  const overlay = document.querySelector('.modal-overlay');
  if (overlay) {
    overlay.classList.remove('active');
    setTimeout(() => overlay.remove(), 200);
  }
}

function showConfirm(message, onConfirm) {
  showModal('Confirm', `<p>${message}</p>`,
    `<button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
     <button class="btn btn-primary" id="confirmBtn">Confirm</button>`
  );
  document.getElementById('confirmBtn').addEventListener('click', () => {
    closeModal();
    onConfirm();
  });
}

// Toast notification
function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  toast.style.cssText = `
    position: fixed; bottom: 24px; right: 24px; padding: 12px 20px;
    background: ${type === 'success' ? 'var(--accent-sage-dark)' : 'var(--accent-red)'};
    color: white; border-radius: var(--radius-sm); font-size: 0.85rem;
    font-family: 'Libre Franklin', sans-serif; z-index: 300;
    animation: fadeIn 0.2s ease; box-shadow: var(--shadow-md);
  `;
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 2500);
}

// ============================================
// KEYBOARD SHORTCUTS
// ============================================

document.addEventListener('keydown', (e) => {
  // Escape to close modal
  if (e.key === 'Escape') closeModal();

  // Number keys 1-7 to navigate (when not in input)
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
  const sections = ['dashboard', 'monthly', 'goals', 'accounts', 'quarterly', 'yearly', 'whatif'];
  const num = parseInt(e.key);
  if (num >= 1 && num <= 7) navigateTo(sections[num - 1]);
});

// ============================================
// INIT
// ============================================

document.addEventListener('DOMContentLoaded', async () => {
  // Try to load seed data on first run
  const seeded = loadSeedData();
  if (seeded) {
    appData = loadData();
  }

  initNavigation();
  if (!seeded) {
    checkFirstRun();
  }

  // Cloud sync
  if (typeof initSupabase === 'function') {
    initSupabase();
    await startupSync();
  }
});
