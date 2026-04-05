/* ============================================
   SUPABASE CLOUD SYNC
   Syncs app data to Supabase for shared access
   ============================================ */

const SUPABASE_URL = 'https://ovunhzdefwlmbkhxevjt.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_QfBcBblJbOli2pBcTOjVBg_xtGxC-Wl';
const SYNC_SESSION_KEY = 'fcc-supabase-session';
const DATA_ROW_ID = 'family-command-center';

let supabaseClient = null;
let isSyncing = false;

// ============================================
// Initialize
// ============================================

function initSupabase() {
  try {
    supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    updateSyncUI();
    return true;
  } catch (e) {
    console.warn('Supabase init failed:', e);
    return false;
  }
}

// ============================================
// Auth
// ============================================

async function supabaseLogin(email, password) {
  if (!supabaseClient) return null;

  const { data, error } = await supabaseClient.auth.signInWithPassword({
    email,
    password
  });

  if (error) throw error;
  updateSyncUI();
  return data;
}

async function supabaseLogout() {
  if (!supabaseClient) return;
  await supabaseClient.auth.signOut();
  updateSyncUI();
}

async function getSession() {
  if (!supabaseClient) return null;
  const { data } = await supabaseClient.auth.getSession();
  return data?.session;
}

// ============================================
// Sync Operations
// ============================================

async function syncToCloud(data) {
  const session = await getSession();
  if (!session || !navigator.onLine) return false;
  if (isSyncing) return false;

  isSyncing = true;
  showSyncIndicator('syncing');

  try {
    const { error } = await supabaseClient
      .from('app_data')
      .upsert({
        id: DATA_ROW_ID,
        data: data,
        updated_at: new Date().toISOString(),
        updated_by: session.user.email
      });

    if (error) throw error;

    showSyncIndicator('synced');
    return true;
  } catch (e) {
    console.warn('Cloud sync failed:', e);
    showSyncIndicator('error');
    return false;
  } finally {
    isSyncing = false;
  }
}

async function syncFromCloud() {
  const session = await getSession();
  if (!session || !navigator.onLine) return null;

  try {
    const { data, error } = await supabaseClient
      .from('app_data')
      .select('data, updated_at')
      .eq('id', DATA_ROW_ID)
      .single();

    if (error) throw error;
    return data;
  } catch (e) {
    console.warn('Cloud fetch failed:', e);
    return null;
  }
}

// ============================================
// Startup Sync
// ============================================

async function startupSync() {
  if (!supabaseClient) return;

  const session = await getSession();
  if (!session) {
    updateSyncUI();
    return;
  }

  showSyncIndicator('syncing');

  const remote = await syncFromCloud();
  if (!remote || !remote.data || Object.keys(remote.data).length === 0) {
    // Remote is empty, push local data up
    if (appData && Object.keys(appData.months || {}).length > 0) {
      await syncToCloud(appData);
      showToast('Data synced to cloud');
    }
    showSyncIndicator('synced');
    return;
  }

  const localUpdated = appData?.lastUpdated || '';
  const remoteUpdated = remote.data?.lastUpdated || remote.updated_at || '';

  if (remoteUpdated > localUpdated) {
    // Remote is newer, use it
    appData = deepMerge(getDefaultData(), remote.data);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(appData));

    // Re-render current section
    const current = document.querySelector('.section.active')?.id;
    if (current && typeof window[`render_${current}`] === 'function') {
      window[`render_${current}`]();
    }
    showToast('Synced latest from cloud');
  } else if (localUpdated > remoteUpdated) {
    // Local is newer, push to cloud
    await syncToCloud(appData);
  }

  showSyncIndicator('synced');
}

// ============================================
// Online/Offline Handling
// ============================================

window.addEventListener('online', async () => {
  const session = await getSession();
  if (session && appData) {
    showToast('Back online, syncing...');
    await syncToCloud(appData);
  }
});

// ============================================
// UI: Login Modal
// ============================================

function showSyncLogin() {
  showModal('Cloud Sync', `
    <p style="font-size:0.85rem; color:var(--text-muted); margin-bottom:20px;">
      Sign in so you and Matt can both access this from any device.
    </p>
    <div class="form-group">
      <label class="form-label">Email</label>
      <input type="email" class="form-input" id="sync-email" placeholder="your shared email">
    </div>
    <div class="form-group">
      <label class="form-label">Password</label>
      <input type="password" class="form-input" id="sync-password" placeholder="password">
    </div>
    <div id="sync-error" style="color:var(--accent-red); font-size:0.82rem; display:none; margin-top:8px;"></div>
  `, `
    <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
    <button class="btn btn-primary" onclick="handleSyncLogin()">Sign In</button>
  `);
  document.getElementById('sync-email').focus();
}

async function handleSyncLogin() {
  const email = document.getElementById('sync-email').value.trim();
  const password = document.getElementById('sync-password').value;
  const errorEl = document.getElementById('sync-error');

  if (!email || !password) {
    errorEl.textContent = 'Enter both email and password';
    errorEl.style.display = 'block';
    return;
  }

  try {
    errorEl.style.display = 'none';
    await supabaseLogin(email, password);
    closeModal();
    showToast('Connected to cloud!');
    await startupSync();
  } catch (e) {
    errorEl.textContent = e.message || 'Login failed';
    errorEl.style.display = 'block';
  }
}

function showSyncLogoutConfirm() {
  showConfirm('Disconnect from cloud sync? Your data stays on this device.', async () => {
    await supabaseLogout();
    showToast('Disconnected from cloud');
  });
}

// ============================================
// UI: Sync Status Indicator
// ============================================

function updateSyncUI() {
  const loginBtn = document.getElementById('sync-login-btn');
  const statusEl = document.getElementById('sync-indicator');
  if (!loginBtn || !statusEl) return;

  getSession().then(session => {
    if (session) {
      loginBtn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
        Connected
      `;
      loginBtn.onclick = showSyncLogoutConfirm;
      loginBtn.style.color = 'var(--accent-green)';
      statusEl.innerHTML = '<span class="sync-dot connected"></span> Cloud sync active';
    } else {
      loginBtn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17,8 12,3 7,8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
        Cloud Sync
      `;
      loginBtn.onclick = showSyncLogin;
      loginBtn.style.color = '';
      statusEl.innerHTML = '<span class="sync-dot"></span> Not connected';
    }
  });
}

function showSyncIndicator(status) {
  const el = document.getElementById('sync-indicator');
  if (!el) return;

  if (status === 'syncing') {
    el.innerHTML = '<span class="sync-dot syncing"></span> Syncing...';
  } else if (status === 'synced') {
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    el.innerHTML = `<span class="sync-dot connected"></span> Synced at ${now}`;
  } else if (status === 'error') {
    el.innerHTML = '<span class="sync-dot error"></span> Sync failed';
  }
}
