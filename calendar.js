/* ============================================
   CALENDAR - Google Calendar Integration
   Monthly grid + weekly upcoming list
   ============================================ */

// Calendar state
let calendarEvents = [];
let calendarMonth = new Date().getMonth();
let calendarYear = new Date().getFullYear();

// ============================================
// GOOGLE CALENDAR API
// ============================================

const GCAL_DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest';
const GCAL_SCOPES = 'https://www.googleapis.com/auth/calendar.readonly';

let gapiInited = false;
let gisInited = false;
let tokenClient = null;

function getCalendarSettings() {
  const raw = localStorage.getItem('muralles-calendar-settings');
  return raw ? JSON.parse(raw) : { apiKey: '', clientId: '', calendarIds: [], connected: false };
}

function saveCalendarSettings(settings) {
  localStorage.setItem('muralles-calendar-settings', JSON.stringify(settings));
}

// Initialize the Google API client
async function initGapiClient() {
  const settings = getCalendarSettings();
  if (!settings.apiKey || !settings.clientId) return;

  await gapi.client.init({
    apiKey: settings.apiKey,
    discoveryDocs: [GCAL_DISCOVERY_DOC],
  });
  gapiInited = true;
  maybeEnableCalendar();
}

function gapiLoaded() {
  gapi.load('client', initGapiClient);
}

function gisLoaded() {
  const settings = getCalendarSettings();
  if (!settings.clientId) return;

  tokenClient = google.accounts.oauth2.initTokenClient({
    client_id: settings.clientId,
    scope: GCAL_SCOPES,
    callback: '', // set at request time
  });
  gisInited = true;
  maybeEnableCalendar();
}

function maybeEnableCalendar() {
  if (gapiInited && gisInited) {
    // Check if we have a stored token
    const token = localStorage.getItem('muralles-gcal-token');
    if (token) {
      try {
        gapi.client.setToken(JSON.parse(token));
        onCalendarConnected();
      } catch (e) {
        // Token expired, need re-auth
        connectGoogleCalendar();
      }
    } else {
      // First time: auto-trigger sign-in after scripts load
      const settings = getCalendarSettings();
      if (settings.apiKey && settings.clientId && !settings.connected) {
        connectGoogleCalendar();
      }
    }
  }
}

function connectGoogleCalendar() {
  if (!tokenClient) {
    showToast('Set up your API credentials first', 'error');
    return;
  }

  tokenClient.callback = async (resp) => {
    if (resp.error) {
      showToast('Calendar connection failed', 'error');
      return;
    }
    // Store the token
    localStorage.setItem('muralles-gcal-token', JSON.stringify(gapi.client.getToken()));
    const settings = getCalendarSettings();
    settings.connected = true;
    saveCalendarSettings(settings);
    onCalendarConnected();
    showToast('Google Calendar connected!');
  };

  if (gapi.client.getToken() === null) {
    tokenClient.requestAccessToken({ prompt: 'consent' });
  } else {
    tokenClient.requestAccessToken({ prompt: '' });
  }
}

function disconnectGoogleCalendar() {
  const token = gapi.client.getToken();
  if (token) {
    google.accounts.oauth2.revoke(token.access_token);
    gapi.client.setToken('');
  }
  localStorage.removeItem('muralles-gcal-token');
  const settings = getCalendarSettings();
  settings.connected = false;
  saveCalendarSettings(settings);
  calendarEvents = [];
  renderCalendarCard();
  showToast('Calendar disconnected');
}

async function onCalendarConnected() {
  await fetchCalendarList();
  await fetchCalendarEvents();
  renderCalendarCard();
}

// Fetch available calendars for the user to select
async function fetchCalendarList() {
  try {
    const response = await gapi.client.calendar.calendarList.list();
    const calendars = response.result.items || [];
    // Store available calendars
    const settings = getCalendarSettings();
    settings.availableCalendars = calendars.map(c => ({
      id: c.id,
      summary: c.summary,
      backgroundColor: c.backgroundColor,
      primary: c.primary || false
    }));
    // Auto-select all if none selected
    if (!settings.calendarIds || settings.calendarIds.length === 0) {
      settings.calendarIds = calendars.map(c => c.id);
    }
    saveCalendarSettings(settings);
  } catch (e) {
    console.error('Failed to fetch calendar list:', e);
  }
}

// Fetch events for the current view window
async function fetchCalendarEvents() {
  const settings = getCalendarSettings();
  if (!settings.connected || !settings.calendarIds?.length) return;

  // Fetch a wide window: current month view + 2 weeks for the upcoming list
  const start = new Date(calendarYear, calendarMonth, 1);
  start.setDate(start.getDate() - 7); // buffer for prev month days shown in grid
  const end = new Date(calendarYear, calendarMonth + 1, 0);
  end.setDate(end.getDate() + 14); // buffer for upcoming week

  const allEvents = [];

  for (const calId of settings.calendarIds) {
    try {
      const response = await gapi.client.calendar.events.list({
        calendarId: calId,
        timeMin: start.toISOString(),
        timeMax: end.toISOString(),
        showDeleted: false,
        singleEvents: true,
        maxResults: 250,
        orderBy: 'startTime',
      });
      const events = response.result.items || [];
      // Find the calendar color
      const calInfo = settings.availableCalendars?.find(c => c.id === calId);
      events.forEach(ev => {
        allEvents.push({
          id: ev.id,
          title: ev.summary || '(No title)',
          start: ev.start.dateTime || ev.start.date,
          end: ev.end.dateTime || ev.end.date,
          allDay: !ev.start.dateTime,
          calendarId: calId,
          calendarName: calInfo?.summary || calId,
          color: ev.colorId ? getGoogleEventColor(ev.colorId) : (calInfo?.backgroundColor || 'var(--accent-sage)'),
          location: ev.location || '',
          description: ev.description || '',
          htmlLink: ev.htmlLink,
        });
      });
    } catch (e) {
      console.error(`Failed to fetch events for ${calId}:`, e);
    }
  }

  // Sort by start time
  allEvents.sort((a, b) => new Date(a.start) - new Date(b.start));
  calendarEvents = allEvents;
}

// Google Calendar event color map
function getGoogleEventColor(colorId) {
  const colors = {
    '1': '#7986cb', '2': '#33b679', '3': '#8e24aa', '4': '#e67c73',
    '5': '#f6bf26', '6': '#f4511e', '7': '#039be5', '8': '#616161',
    '9': '#3f51b5', '10': '#0b8043', '11': '#d50000'
  };
  return colors[colorId] || 'var(--accent-sage)';
}

// ============================================
// RENDERING
// ============================================

function renderCalendarCard() {
  const settings = getCalendarSettings();

  // Render the connect state or the calendar views
  const container = document.getElementById('dash-calendar');
  if (!container) return;

  if (!settings.connected || !settings.apiKey) {
    container.innerHTML = renderCalendarSetupState();
    return;
  }

  container.innerHTML = `
    <div class="calendar-views">
      ${renderMonthlyGrid()}
      ${renderWeeklyList()}
    </div>
  `;

  // Attach month navigation
  document.getElementById('cal-prev-month')?.addEventListener('click', () => {
    calendarMonth--;
    if (calendarMonth < 0) { calendarMonth = 11; calendarYear--; }
    fetchCalendarEvents().then(() => renderCalendarCard());
  });
  document.getElementById('cal-next-month')?.addEventListener('click', () => {
    calendarMonth++;
    if (calendarMonth > 11) { calendarMonth = 0; calendarYear++; }
    fetchCalendarEvents().then(() => renderCalendarCard());
  });
  document.getElementById('cal-today-btn')?.addEventListener('click', () => {
    calendarMonth = new Date().getMonth();
    calendarYear = new Date().getFullYear();
    fetchCalendarEvents().then(() => renderCalendarCard());
  });
}

function renderCalendarSetupState() {
  return `
    <div class="calendar-empty-state">
      <div class="calendar-empty-icon">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--text-light)" stroke-width="1">
          <rect x="3" y="4" width="18" height="18" rx="2"/>
          <line x1="16" y1="2" x2="16" y2="6"/>
          <line x1="8" y1="2" x2="8" y2="6"/>
          <line x1="3" y1="10" x2="21" y2="10"/>
          <circle cx="12" cy="15" r="1.5"/>
        </svg>
      </div>
      <p style="font-size:0.92rem; color:var(--text-body); margin-bottom:4px;">See your family's schedule at a glance</p>
      <p style="font-size:0.82rem; color:var(--text-muted); margin-bottom:20px;">Connect Google Calendar to pull in events, birthdays, and plans.</p>
      <button class="btn btn-primary btn-sm" onclick="showCalendarSetupModal()">Connect Google Calendar</button>
    </div>
  `;
}

// ============================================
// MONTHLY GRID
// ============================================

function renderMonthlyGrid() {
  const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const dayNames = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

  const today = new Date();
  const firstDay = new Date(calendarYear, calendarMonth, 1);
  const lastDay = new Date(calendarYear, calendarMonth + 1, 0);
  const startDay = firstDay.getDay(); // 0=Sun
  const daysInMonth = lastDay.getDate();

  // Previous month overflow
  const prevMonthLast = new Date(calendarYear, calendarMonth, 0).getDate();

  let gridHTML = '';

  // Day headers
  gridHTML += '<div class="cal-grid-header">';
  dayNames.forEach(d => {
    gridHTML += `<div class="cal-day-name">${d}</div>`;
  });
  gridHTML += '</div>';

  // Day cells
  gridHTML += '<div class="cal-grid-body">';

  // Previous month days
  for (let i = startDay - 1; i >= 0; i--) {
    const dayNum = prevMonthLast - i;
    gridHTML += `<div class="cal-day other-month"><span class="cal-day-num">${dayNum}</span></div>`;
  }

  // Current month days
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${calendarYear}-${String(calendarMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const isToday = (d === today.getDate() && calendarMonth === today.getMonth() && calendarYear === today.getFullYear());
    const dayEvents = getEventsForDate(dateStr);

    let eventsHTML = '';
    const maxShow = 3;
    dayEvents.slice(0, maxShow).forEach(ev => {
      const dotColor = ev.color || 'var(--accent-sage)';
      if (ev.allDay) {
        eventsHTML += `<div class="cal-event-bar" style="background:${dotColor}20; border-left:2px solid ${dotColor};" title="${escapeHTML(ev.title)}">${escapeHTML(truncate(ev.title, 12))}</div>`;
      } else {
        const time = formatEventTime(ev.start);
        eventsHTML += `<div class="cal-event-line" title="${escapeHTML(ev.title)}"><span class="cal-event-dot" style="background:${dotColor};"></span><span class="cal-event-time">${time}</span> ${escapeHTML(truncate(ev.title, 10))}</div>`;
      }
    });
    if (dayEvents.length > maxShow) {
      eventsHTML += `<div class="cal-event-more">+${dayEvents.length - maxShow} more</div>`;
    }

    gridHTML += `
      <div class="cal-day${isToday ? ' today' : ''}" data-date="${dateStr}">
        <span class="cal-day-num${isToday ? ' today-num' : ''}">${d}</span>
        <div class="cal-day-events">${eventsHTML}</div>
      </div>
    `;
  }

  // Next month days to fill grid
  const totalCells = startDay + daysInMonth;
  const remaining = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
  for (let i = 1; i <= remaining; i++) {
    gridHTML += `<div class="cal-day other-month"><span class="cal-day-num">${i}</span></div>`;
  }

  gridHTML += '</div>';

  const isCurrentMonth = calendarMonth === today.getMonth() && calendarYear === today.getFullYear();

  return `
    <div class="calendar-monthly">
      <div class="cal-month-nav">
        <button class="cal-nav-btn" id="cal-prev-month">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polyline points="15,18 9,12 15,6"/></svg>
        </button>
        <div class="cal-month-title">
          <h4>${monthNames[calendarMonth]} ${calendarYear}</h4>
          ${!isCurrentMonth ? '<button class="cal-today-pill" id="cal-today-btn">Today</button>' : ''}
        </div>
        <button class="cal-nav-btn" id="cal-next-month">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polyline points="9,6 15,12 9,18"/></svg>
        </button>
      </div>
      ${gridHTML}
    </div>
  `;
}

// ============================================
// WEEKLY UPCOMING LIST
// ============================================

function renderWeeklyList() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const weekEnd = new Date(today);
  weekEnd.setDate(weekEnd.getDate() + 7);

  const upcoming = calendarEvents.filter(ev => {
    const evDate = new Date(ev.start);
    return evDate >= today && evDate < weekEnd;
  });

  if (upcoming.length === 0) {
    return `
      <div class="calendar-weekly">
        <div class="cal-weekly-header">
          <h4>This Week</h4>
          <span class="card-label">Next 7 days</span>
        </div>
        <div class="cal-weekly-empty">
          <p>No events this week. Enjoy the calm.</p>
        </div>
      </div>
    `;
  }

  // Group by day
  const grouped = {};
  upcoming.forEach(ev => {
    const date = new Date(ev.start);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(ev);
  });

  let listHTML = '';
  const dayNames = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  Object.keys(grouped).sort().forEach(dateKey => {
    const date = new Date(dateKey + 'T12:00:00');
    const isToday = dateKey === formatDateKey(today);
    const isTomorrow = dateKey === formatDateKey(new Date(today.getTime() + 86400000));
    const dayLabel = isToday ? 'Today' : (isTomorrow ? 'Tomorrow' : dayNames[date.getDay()]);
    const dateLabel = `${monthNames[date.getMonth()]} ${date.getDate()}`;

    listHTML += `
      <div class="cal-weekly-day${isToday ? ' is-today' : ''}">
        <div class="cal-weekly-day-header">
          <span class="cal-weekly-day-name">${dayLabel}</span>
          <span class="cal-weekly-day-date">${dateLabel}</span>
        </div>
        <div class="cal-weekly-events">
    `;

    grouped[dateKey].forEach(ev => {
      const dotColor = ev.color || 'var(--accent-sage)';
      const timeStr = ev.allDay ? 'All day' : `${formatEventTime(ev.start)} \u2013 ${formatEventTime(ev.end)}`;
      const locationStr = ev.location ? `<span class="cal-weekly-location">${escapeHTML(truncate(ev.location, 30))}</span>` : '';

      listHTML += `
        <div class="cal-weekly-event">
          <div class="cal-weekly-event-color" style="background:${dotColor};"></div>
          <div class="cal-weekly-event-details">
            <div class="cal-weekly-event-title">${escapeHTML(ev.title)}</div>
            <div class="cal-weekly-event-meta">
              <span class="cal-weekly-event-time">${timeStr}</span>
              ${locationStr}
            </div>
          </div>
        </div>
      `;
    });

    listHTML += '</div></div>';
  });

  return `
    <div class="calendar-weekly">
      <div class="cal-weekly-header">
        <h4>This Week</h4>
        <span class="card-label">Next 7 days</span>
      </div>
      <div class="cal-weekly-list">${listHTML}</div>
    </div>
  `;
}

// ============================================
// SETUP MODAL
// ============================================

function showCalendarSetupModal() {
  const settings = getCalendarSettings();

  showModal('Connect Google Calendar', `
    <p style="font-size:0.85rem; color:var(--text-muted); margin-bottom:20px;">
      To display your family calendar, you'll need a Google Cloud API key and OAuth Client ID.
      <a href="https://console.cloud.google.com/apis/credentials" target="_blank" style="color:var(--accent-sage-dark);">Get them here</a> (enable the Google Calendar API first).
    </p>
    <div class="form-group">
      <label class="form-label">API Key</label>
      <input type="text" class="form-input" id="gcal-api-key" placeholder="AIza..." value="${settings.apiKey || ''}">
    </div>
    <div class="form-group">
      <label class="form-label">OAuth Client ID</label>
      <input type="text" class="form-input" id="gcal-client-id" placeholder="xxxx.apps.googleusercontent.com" value="${settings.clientId || ''}">
    </div>
    ${settings.connected ? `
      <div style="margin-bottom:16px; padding:12px; background:var(--accent-sage-light); border-radius:var(--radius-sm);">
        <span style="font-size:0.85rem; color:var(--accent-sage-dark);">Connected</span>
      </div>
      <div class="form-group">
        <label class="form-label">Calendars to show</label>
        <div id="gcal-calendar-list" style="max-height:200px; overflow-y:auto;">
          ${(settings.availableCalendars || []).map(cal => `
            <label style="display:flex; align-items:center; gap:8px; padding:6px 0; font-size:0.88rem; cursor:pointer;">
              <input type="checkbox" class="gcal-cal-checkbox" value="${cal.id}" ${settings.calendarIds?.includes(cal.id) ? 'checked' : ''}>
              <span class="cal-event-dot" style="background:${cal.backgroundColor}; width:8px; height:8px; display:inline-block; border-radius:50%; flex-shrink:0;"></span>
              ${escapeHTML(cal.summary)}${cal.primary ? ' <span style="color:var(--text-muted); font-size:0.75rem;">(primary)</span>' : ''}
            </label>
          `).join('')}
        </div>
      </div>
    ` : ''}
  `,
  `
    ${settings.connected
      ? '<button class="btn btn-secondary" onclick="disconnectGoogleCalendar();closeModal();">Disconnect</button>'
      : ''}
    <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
    <button class="btn btn-primary" onclick="saveCalendarSetup()">${settings.connected ? 'Save' : 'Connect'}</button>
  `);
}

async function saveCalendarSetup() {
  const apiKey = document.getElementById('gcal-api-key')?.value.trim();
  const clientId = document.getElementById('gcal-client-id')?.value.trim();

  if (!apiKey || !clientId) {
    showToast('Both API Key and Client ID are required', 'error');
    return;
  }

  const settings = getCalendarSettings();
  const credentialsChanged = apiKey !== settings.apiKey || clientId !== settings.clientId;

  settings.apiKey = apiKey;
  settings.clientId = clientId;

  // Save selected calendars if connected
  if (settings.connected) {
    const checkboxes = document.querySelectorAll('.gcal-cal-checkbox');
    settings.calendarIds = Array.from(checkboxes).filter(cb => cb.checked).map(cb => cb.value);
  }

  saveCalendarSettings(settings);
  closeModal();

  if (credentialsChanged || !settings.connected) {
    // Reinitialize GAPI with new credentials
    loadGoogleCalendarScripts();
  } else {
    // Just refresh events with updated calendar selection
    await fetchCalendarEvents();
    renderCalendarCard();
  }
}

// ============================================
// SCRIPT LOADING
// ============================================

function loadGoogleCalendarScripts() {
  const settings = getCalendarSettings();
  if (!settings.apiKey || !settings.clientId) return;

  // Load GAPI
  if (!document.getElementById('gapi-script')) {
    const gapiScript = document.createElement('script');
    gapiScript.id = 'gapi-script';
    gapiScript.src = 'https://apis.google.com/js/api.js';
    gapiScript.onload = gapiLoaded;
    document.head.appendChild(gapiScript);
  } else if (typeof gapi !== 'undefined') {
    gapiLoaded();
  }

  // Load GIS (Google Identity Services)
  if (!document.getElementById('gis-script')) {
    const gisScript = document.createElement('script');
    gisScript.id = 'gis-script';
    gisScript.src = 'https://accounts.google.com/gsi/client';
    gisScript.onload = gisLoaded;
    document.head.appendChild(gisScript);
  } else if (typeof google !== 'undefined' && google.accounts) {
    gisLoaded();
  }
}

// ============================================
// HELPERS
// ============================================

function getEventsForDate(dateStr) {
  return calendarEvents.filter(ev => {
    if (ev.allDay) {
      // All-day events: start date inclusive, end date exclusive
      return dateStr >= ev.start && dateStr < ev.end;
    }
    const evDate = new Date(ev.start);
    const evKey = `${evDate.getFullYear()}-${String(evDate.getMonth() + 1).padStart(2, '0')}-${String(evDate.getDate()).padStart(2, '0')}`;
    return evKey === dateStr;
  });
}

function formatEventTime(dateTimeStr) {
  const date = new Date(dateTimeStr);
  let hours = date.getHours();
  const mins = date.getMinutes();
  const ampm = hours >= 12 ? 'p' : 'a';
  hours = hours % 12 || 12;
  return mins === 0 ? `${hours}${ampm}` : `${hours}:${String(mins).padStart(2, '0')}${ampm}`;
}

function formatDateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function truncate(str, len) {
  return str.length > len ? str.slice(0, len) + '\u2026' : str;
}

function escapeHTML(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ============================================
// INIT ON DASHBOARD LOAD
// ============================================

function initCalendar() {
  const settings = getCalendarSettings();
  if (settings.apiKey && settings.clientId) {
    loadGoogleCalendarScripts();
  }
  renderCalendarCard();
}
