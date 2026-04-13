/**
 * EHTIMAM — Daily Revenue Recording System
 * Frontend Application (app.js)
 *
 * Architecture:
 *  - State management via simple JS object
 *  - i18n via translation map
 *  - All API calls via fetch() to Apps Script Web App
 *  - No page reloads; screen switching by class toggle
 */

'use strict';

/* ═══════════════════════════════════════════════════════════════
   CONFIG — Replace APPS_SCRIPT_URL with your deployed web app URL
═══════════════════════════════════════════════════════════════ */
const CONFIG = {
  APPS_SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbyZOueAmwDuo1aa-LLVM8a69pUMI51R8mE-RwWHM00zXNA1VPKg1_CTnpYjV6SfPnujWQ/exec',
};

/* ═══════════════════════════════════════════════════════════════
   i18n — Translations
═══════════════════════════════════════════════════════════════ */
const TRANSLATIONS = {
  ar: {
    'login.subtitle':      'نظام تسجيل الإيرادات اليومية',
    'login.password':      'كلمة المرور',
    'login.btn':           'دخول',
    'login.error':         'كلمة المرور غير صحيحة',
    'driver.hello':        'مرحباً،',
    'driver.newSession':   'جلسة جديدة',
    'driver.employee':     'الموظفة',
    'driver.selectEmployee': 'اختر موظفة...',
    'driver.payment':      'طريقة الدفع',
    'driver.cash':         'كاش',
    'driver.card':         'بطاقة',
    'driver.app':          'تطبيق',
    'driver.amount':       'المبلغ (ر.س)',
    'driver.addSession':   'إضافة جلسة',
    'driver.sessions':     'الجلسات',
    'driver.total':        'الإجمالي:',
    'driver.noSessions':   'لا توجد جلسات بعد',
    'driver.submit':       'إرسال جميع الجلسات',
    'admin.badge':         'أدمن',
    'admin.totalRevenue':  'إجمالي اليوم',
    'admin.totalSessions': 'عدد الجلسات',
    'admin.byPayment':     'توزيع طريقة الدفع',
    'admin.byDriver':      'إيرادات السائقين',
    'admin.byEmployee':    'إيرادات الموظفات',
    'admin.entries':       'سجل الإدخالات',
    'admin.filters':       'تصفية البيانات',
    'admin.filterDate':    'التاريخ',
    'admin.filterDriver':  'السائق',
    'admin.filterEmployee':'الموظفة',
    'admin.all':           'الكل',
    'admin.apply':         'تطبيق الفلتر',
    'admin.clear':         'مسح',
    'table.date':          'التاريخ',
    'table.driver':        'السائق',
    'table.employee':      'الموظفة',
    'table.payment':       'الدفع',
    'table.amount':        'المبلغ',
    'toast.loginOk':       'تم تسجيل الدخول',
    'toast.sessionAdded':  'تمت إضافة الجلسة',
    'toast.submitted':     'تم الإرسال بنجاح! ✓',
    'toast.submitError':   'فشل الإرسال، حاول مرة أخرى',
    'toast.fillAll':       'يرجى ملء جميع الحقول',
    'toast.loading':       'جارٍ التحميل...',
    'toast.noSessions':    'لا توجد جلسات للإرسال',
    'toast.sessionDeleted':'تم حذف الجلسة',
  },
  en: {
    'login.subtitle':      'Daily Revenue Recording System',
    'login.password':      'Password',
    'login.btn':           'Login',
    'login.error':         'Incorrect password',
    'driver.hello':        'Hello,',
    'driver.newSession':   'New Session',
    'driver.employee':     'Employee',
    'driver.selectEmployee': 'Select employee...',
    'driver.payment':      'Payment Method',
    'driver.cash':         'Cash',
    'driver.card':         'Card',
    'driver.app':          'App',
    'driver.amount':       'Amount (SAR)',
    'driver.addSession':   'Add Session',
    'driver.sessions':     'Sessions',
    'driver.total':        'Total:',
    'driver.noSessions':   'No sessions yet',
    'driver.submit':       'Submit All Sessions',
    'admin.badge':         'Admin',
    'admin.totalRevenue':  'Today\'s Revenue',
    'admin.totalSessions': 'Total Sessions',
    'admin.byPayment':     'Revenue by Payment',
    'admin.byDriver':      'Revenue by Driver',
    'admin.byEmployee':    'Revenue by Employee',
    'admin.entries':       'Entry Log',
    'admin.filters':       'Filters',
    'admin.filterDate':    'Date',
    'admin.filterDriver':  'Driver',
    'admin.filterEmployee':'Employee',
    'admin.all':           'All',
    'admin.apply':         'Apply Filter',
    'admin.clear':         'Clear',
    'table.date':          'Date',
    'table.driver':        'Driver',
    'table.employee':      'Employee',
    'table.payment':       'Payment',
    'table.amount':        'Amount',
    'toast.loginOk':       'Logged in',
    'toast.sessionAdded':  'Session added',
    'toast.submitted':     'Submitted successfully! ✓',
    'toast.submitError':   'Submission failed, try again',
    'toast.fillAll':       'Please fill all fields',
    'toast.loading':       'Loading...',
    'toast.noSessions':    'No sessions to submit',
    'toast.sessionDeleted':'Session deleted',
  }
};

/* ═══════════════════════════════════════════════════════════════
   STATE
═══════════════════════════════════════════════════════════════ */
const State = {
  lang:           'ar',
  role:           null,       // 'driver' | 'admin'
  driverName:     null,
  sessions:       [],         // [{employee, method, amount}]
  selectedMethod: null,
  employees:      [],
  adminData:      null,
};

/* ═══════════════════════════════════════════════════════════════
   DOM HELPERS
═══════════════════════════════════════════════════════════════ */
const $  = (id)  => document.getElementById(id);
const $$ = (sel) => document.querySelectorAll(sel);

function showScreen(name) {
  $$('.screen').forEach(s => {
    s.classList.add('hidden');
    s.classList.remove('active');
  });
  const sc = $(`screen-${name}`);
  if (sc) {
    sc.classList.remove('hidden');
    sc.classList.add('active');
    sc.style.display = 'block';
  }
}

function showLoader()  { $('global-loader').classList.remove('hidden'); }
function hideLoader()  { $('global-loader').classList.add('hidden'); }

let toastTimer;
function showToast(key, type = '') {
  const el = $('toast');
  el.textContent = t(key);
  el.className = `toast ${type}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.classList.add('hidden'); }, 2800);
}

function t(key) {
  return (TRANSLATIONS[State.lang] || TRANSLATIONS.ar)[key] || key;
}

/* ═══════════════════════════════════════════════════════════════
   i18n — Apply translations to DOM
═══════════════════════════════════════════════════════════════ */
function applyTranslations() {
  document.documentElement.lang = State.lang;

  $$('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    const translated = t(key);
    if (el.tagName === 'INPUT' && el.placeholder) {
      el.placeholder = translated;
    } else {
      el.textContent = translated;
    }
  });

  // Update lang toggle buttons
  const label = State.lang === 'ar' ? 'EN' : 'AR';
  ['lang-toggle','lang-toggle-driver','lang-toggle-admin'].forEach(id => {
    const el = $(id);
    if (el) el.textContent = label;
  });

  // Re-render quick amount buttons
  updateQuickAmountLabels();
}

function updateQuickAmountLabels() {
  $$('.quick-btn').forEach(btn => {
    const amt = btn.dataset.amount;
    btn.textContent = State.lang === 'ar' ? `+${toArabicNumerals(amt)}` : `+${amt}`;
  });
}

function toArabicNumerals(str) {
  return String(str).replace(/[0-9]/g, d => '٠١٢٣٤٥٦٧٨٩'[d]);
}

function toggleLang() {
  State.lang = State.lang === 'ar' ? 'en' : 'ar';
  applyTranslations();
}

/* ═══════════════════════════════════════════════════════════════
   API CALLS
═══════════════════════════════════════════════════════════════ */
async function apiPost(payload) {
  const res = await fetch(CONFIG.APPS_SCRIPT_URL, {
    method:  'POST',
    headers: { 'Content-Type': 'text/plain' }, // text/plain avoids CORS preflight
    body:    JSON.stringify(payload),
  });
  return res.json();
}

async function apiGet(params) {
  const url = new URL(CONFIG.APPS_SCRIPT_URL);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url.toString());
  return res.json();
}

/* ═══════════════════════════════════════════════════════════════
   AUTH
═══════════════════════════════════════════════════════════════ */
async function handleLogin() {
  const password = $('input-password').value.trim();
  if (!password) return;

  showLoader();
  $('login-error').classList.add('hidden');

  try {
    const data = await apiPost({ action: 'login', password });

    if (data.success) {
      State.role       = data.role;
      State.driverName = data.driverName;
      showToast('toast.loginOk', 'success');

      if (data.role === 'admin') {
        await initAdmin();
        showScreen('admin');
      } else {
        await initDriver();
        showScreen('driver');
      }
    } else {
      $('login-error').classList.remove('hidden');
    }
  } catch (err) {
    console.error('Login error:', err);
    $('login-error').classList.remove('hidden');
  } finally {
    hideLoader();
  }
}

function logout() {
  State.role       = null;
  State.driverName = null;
  State.sessions   = [];
  State.selectedMethod = null;
  $('input-password').value = '';
  $('sessions-list').innerHTML = `<p class="empty-msg">${t('driver.noSessions')}</p>`;
  updateLiveTotal();
  showScreen('login');
}

/* ═══════════════════════════════════════════════════════════════
   DRIVER — Init
═══════════════════════════════════════════════════════════════ */
async function initDriver() {
  $('driver-name-display').textContent = State.driverName || '—';
  await loadEmployees();
  renderSessionList();
}

async function loadEmployees() {
  try {
    const data = await apiGet({ action: 'getEmployees' });
    if (data.employees) {
      State.employees = data.employees;
      populateEmployeeSelect('select-employee');
    }
  } catch (err) {
    console.error('Failed to load employees:', err);
  }
}

function populateEmployeeSelect(selectId, withAll = false) {
  const sel = $(selectId);
  if (!sel) return;
  sel.innerHTML = withAll
    ? `<option value="">${t('admin.all')}</option>`
    : `<option value="">${t('driver.selectEmployee')}</option>`;
  State.employees.forEach(emp => {
    const opt = document.createElement('option');
    opt.value = emp;
    opt.textContent = emp;
    sel.appendChild(opt);
  });
}

/* ═══════════════════════════════════════════════════════════════
   DRIVER — Payment Method Selection
═══════════════════════════════════════════════════════════════ */
function selectPaymentMethod(method) {
  State.selectedMethod = method;
  $$('.pay-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.method === method);
  });
}

/* ═══════════════════════════════════════════════════════════════
   DRIVER — Quick Amount Buttons
═══════════════════════════════════════════════════════════════ */
function addQuickAmount(amount) {
  const input = $('input-amount');
  const current = parseFloat(input.value) || 0;
  input.value = current + amount;
}

/* ═══════════════════════════════════════════════════════════════
   DRIVER — Add Session
═══════════════════════════════════════════════════════════════ */
function addSession() {
  const employee = $('select-employee').value;
  const method   = State.selectedMethod;
  const amount   = parseFloat($('input-amount').value);

  if (!employee || !method || !amount || amount <= 0) {
    showToast('toast.fillAll', 'error');
    return;
  }

  State.sessions.push({ employee, method, amount });

  // Reset form
  $('select-employee').value = '';
  $('input-amount').value    = '';
  State.selectedMethod = null;
  $$('.pay-btn').forEach(b => b.classList.remove('active'));

  renderSessionList();
  updateLiveTotal();
  updateSubmitCount();
  showToast('toast.sessionAdded', 'success');
}

/* ═══════════════════════════════════════════════════════════════
   DRIVER — Render Sessions
═══════════════════════════════════════════════════════════════ */
function renderSessionList() {
  const list = $('sessions-list');

  if (State.sessions.length === 0) {
    list.innerHTML = `<p class="empty-msg">${t('driver.noSessions')}</p>`;
    return;
  }

  list.innerHTML = '';
  State.sessions.forEach((session, idx) => {
    const row = document.createElement('div');
    row.className = 'session-row';
    row.innerHTML = `
      <div class="session-pay-dot ${session.method}"></div>
      <div class="session-info">
        <div class="session-employee">${escapeHtml(session.employee)}</div>
        <div class="session-method">${getMethodLabel(session.method)}</div>
      </div>
      <div class="session-amount">${session.amount} ${State.lang === 'ar' ? 'ر.س' : 'SAR'}</div>
      <button class="session-del" data-idx="${idx}" title="Delete">✕</button>
    `;
    list.appendChild(row);
  });
}

function deleteSession(idx) {
  State.sessions.splice(idx, 1);
  renderSessionList();
  updateLiveTotal();
  updateSubmitCount();
  showToast('toast.sessionDeleted');
}

function updateLiveTotal() {
  const total = State.sessions.reduce((sum, s) => sum + s.amount, 0);
  $('live-total').textContent = State.lang === 'ar'
    ? `${total.toLocaleString('ar-SA')} ر.س`
    : `${total.toLocaleString()} SAR`;
}

function updateSubmitCount() {
  $('submit-count').textContent = State.sessions.length;
}

function getMethodLabel(method) {
  const map = { cash: t('driver.cash'), card: t('driver.card'), app: t('driver.app') };
  return map[method] || method;
}

/* ═══════════════════════════════════════════════════════════════
   DRIVER — Submit All Sessions
═══════════════════════════════════════════════════════════════ */
async function submitAllSessions() {
  if (State.sessions.length === 0) {
    showToast('toast.noSessions', 'error');
    return;
  }

  showLoader();
  try {
    const today = new Date().toISOString().split('T')[0];
    const entries = State.sessions.map(s => ({
      date:          today,
      driver:        State.driverName,
      employee:      s.employee,
      paymentMethod: s.method,
      amount:        s.amount,
      timestamp:     new Date().toISOString(),
    }));

    const data = await apiPost({ action: 'addEntries', entries });

    if (data.success) {
      State.sessions = [];
      renderSessionList();
      updateLiveTotal();
      updateSubmitCount();
      showToast('toast.submitted', 'success');
    } else {
      showToast('toast.submitError', 'error');
    }
  } catch (err) {
    console.error('Submit error:', err);
    showToast('toast.submitError', 'error');
  } finally {
    hideLoader();
  }
}

/* ═══════════════════════════════════════════════════════════════
   ADMIN — Init
═══════════════════════════════════════════════════════════════ */
async function initAdmin() {
  await loadEmployees();
  await loadAdminDashboard({});
}

async function loadAdminDashboard(filters) {
  showLoader();
  try {
    const params = { action: 'getDashboard', ...filters };
    const data   = await apiGet(params);

    if (data.success) {
      renderAdminDashboard(data);
      populateFilterDropdowns(data);
    }
  } catch (err) {
    console.error('Admin load error:', err);
  } finally {
    hideLoader();
  }
}

function renderAdminDashboard(data) {
  // Stats
  const totalAmt = data.stats?.totalAmount || 0;
  const totalSes = data.stats?.totalSessions || 0;

  $('stat-val-revenue').textContent = State.lang === 'ar'
    ? `${totalAmt.toLocaleString('ar-SA')} ر.س`
    : `${totalAmt.toLocaleString()} SAR`;
  $('stat-val-sessions').textContent = totalSes;

  // Payment breakdown
  const byPayment = data.stats?.byPayment || {};
  $('ps-cash').textContent = formatAmt(byPayment.cash || 0);
  $('ps-card').textContent = formatAmt(byPayment.card || 0);
  $('ps-app').textContent  = formatAmt(byPayment.app  || 0);

  // Driver bars
  renderBarList('driver-stats', data.stats?.byDriver || {}, totalAmt);

  // Employee bars
  renderBarList('employee-stats', data.stats?.byEmployee || {}, totalAmt);

  // Entries table
  renderEntriesTable(data.entries || []);
}

function formatAmt(n) {
  return State.lang === 'ar'
    ? `${n.toLocaleString('ar-SA')} ر.س`
    : `${n.toLocaleString()} SAR`;
}

function renderBarList(containerId, obj, total) {
  const el = $(containerId);
  el.innerHTML = '';

  const sorted = Object.entries(obj).sort((a, b) => b[1] - a[1]);
  if (sorted.length === 0) {
    el.innerHTML = `<p class="empty-msg">${t('driver.noSessions')}</p>`;
    return;
  }

  sorted.forEach(([name, amt]) => {
    const pct = total > 0 ? Math.round((amt / total) * 100) : 0;
    const item = document.createElement('div');
    item.className = 'bar-item';
    item.innerHTML = `
      <div class="bar-label">
        <span>${escapeHtml(name)}</span>
        <strong>${formatAmt(amt)}</strong>
      </div>
      <div class="bar-track">
        <div class="bar-fill" style="width:${pct}%"></div>
      </div>
    `;
    el.appendChild(item);
  });
}

function renderEntriesTable(entries) {
  const tbody = $('entries-tbody');
  tbody.innerHTML = '';

  if (entries.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="empty-msg">${t('driver.noSessions')}</td></tr>`;
    return;
  }

  entries.forEach(entry => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${escapeHtml(entry.date || '')}</td>
      <td>${escapeHtml(entry.driver || '')}</td>
      <td>${escapeHtml(entry.employee || '')}</td>
      <td><span class="badge-pay ${entry.paymentMethod}">${getMethodLabel(entry.paymentMethod)}</span></td>
      <td>${formatAmt(parseFloat(entry.amount) || 0)}</td>
    `;
    tbody.appendChild(tr);
  });
}

function populateFilterDropdowns(data) {
  // Driver filter
  const driverSel = $('filter-driver');
  const drivers   = [...new Set((data.entries || []).map(e => e.driver).filter(Boolean))];
  driverSel.innerHTML = `<option value="">${t('admin.all')}</option>`;
  drivers.forEach(d => {
    const opt = document.createElement('option');
    opt.value = d;
    opt.textContent = d;
    driverSel.appendChild(opt);
  });

  // Employee filter
  populateEmployeeSelect('filter-employee-admin', true);
}

async function applyAdminFilters() {
  const filters = {};
  const date     = $('filter-date').value;
  const driver   = $('filter-driver').value;
  const employee = $('filter-employee-admin').value;
  if (date)     filters.date     = date;
  if (driver)   filters.driver   = driver;
  if (employee) filters.employee = employee;
  await loadAdminDashboard(filters);
}

function clearAdminFilters() {
  $('filter-date').value                  = '';
  $('filter-driver').value                = '';
  $('filter-employee-admin').value        = '';
  loadAdminDashboard({});
}

/* ═══════════════════════════════════════════════════════════════
   UTILS
═══════════════════════════════════════════════════════════════ */
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/* ═══════════════════════════════════════════════════════════════
   EVENT LISTENERS
═══════════════════════════════════════════════════════════════ */
function bindEvents() {
  // Login
  $('btn-login').addEventListener('click', handleLogin);
  $('input-password').addEventListener('keydown', e => {
    if (e.key === 'Enter') handleLogin();
  });

  // Lang toggles
  ['lang-toggle','lang-toggle-driver','lang-toggle-admin'].forEach(id => {
    const el = $(id);
    if (el) el.addEventListener('click', toggleLang);
  });

  // Logout
  $('btn-logout-driver').addEventListener('click', logout);
  $('btn-logout-admin').addEventListener('click', logout);

  // Payment method buttons
  $$('.pay-btn').forEach(btn => {
    btn.addEventListener('click', () => selectPaymentMethod(btn.dataset.method));
  });

  // Quick amount buttons
  $$('.quick-btn').forEach(btn => {
    btn.addEventListener('click', () => addQuickAmount(Number(btn.dataset.amount)));
  });

  // Add session
  $('btn-add-session').addEventListener('click', addSession);

  // Delete session (delegated)
  $('sessions-list').addEventListener('click', e => {
    const btn = e.target.closest('.session-del');
    if (btn) deleteSession(Number(btn.dataset.idx));
  });

  // Submit all
  $('btn-submit-all').addEventListener('click', submitAllSessions);

  // Admin filters
  $('btn-apply-filter').addEventListener('click', applyAdminFilters);
  $('btn-clear-filter').addEventListener('click', clearAdminFilters);
}

/* ═══════════════════════════════════════════════════════════════
   BOOT
═══════════════════════════════════════════════════════════════ */
function init() {
  bindEvents();
  applyTranslations();

  // Set today's date as default filter
  const today = new Date().toISOString().split('T')[0];
  const filterDate = $('filter-date');
  if (filterDate) filterDate.value = today;
}

document.addEventListener('DOMContentLoaded', init);
