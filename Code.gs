/**
 * EHTIMAM — Daily Revenue Recording System
 * Google Apps Script Backend (Code.gs)
 *
 * Sheets required:
 *   - Users     : Password | Role | DriverName | Status
 *   - Employees : Name | Status
 *   - Entries   : Date | Driver | Employee | PaymentMethod | Amount | Timestamp
 *
 * Deploy as: Web App
 *   - Execute as: Me
 *   - Who has access: Anyone
 */

// ═══════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════
const SPREADSHEET_ID = 'YOUR_GOOGLE_SHEETS_ID'; // ← Replace this

const SHEETS = {
  USERS:     'Users',
  EMPLOYEES: 'Employees',
  ENTRIES:   'Entries',
};

// ═══════════════════════════════════════════════════════════════
// ENTRY POINTS
// ═══════════════════════════════════════════════════════════════

/**
 * Handle POST requests
 * Actions: login | addEntries
 */
function doPost(e) {
  try {
    const body   = JSON.parse(e.postData.contents);
    const action = body.action;

    if (action === 'login')      return jsonResponse(handleLogin(body));
    if (action === 'addEntries') return jsonResponse(handleAddEntries(body));

    return jsonResponse({ success: false, error: 'Unknown action' });

  } catch (err) {
    Logger.log('doPost error: ' + err.message);
    return jsonResponse({ success: false, error: err.message });
  }
}

/**
 * Handle GET requests
 * Actions: getEmployees | getDashboard
 */
function doGet(e) {
  try {
    const action = e.parameter.action;

    if (action === 'getEmployees') return jsonResponse(handleGetEmployees());
    if (action === 'getDashboard') return jsonResponse(handleGetDashboard(e.parameter));

    return jsonResponse({ success: false, error: 'Unknown action' });

  } catch (err) {
    Logger.log('doGet error: ' + err.message);
    return jsonResponse({ success: false, error: err.message });
  }
}

// ═══════════════════════════════════════════════════════════════
// AUTH
// ═══════════════════════════════════════════════════════════════

/**
 * Login: match password in Users sheet
 * Returns: { success, role, driverName }
 */
function handleLogin(body) {
  const password = (body.password || '').trim();
  if (!password) return { success: false, error: 'Password required' };

  const sheet = getSheet(SHEETS.USERS);
  const rows  = sheet.getDataRange().getValues();

  // Row[0] = headers, skip it
  for (let i = 1; i < rows.length; i++) {
    const [rowPass, rowRole, rowDriver, rowStatus] = rows[i];

    if (
      String(rowPass).trim()   === password &&
      String(rowStatus).trim().toLowerCase() === 'active'
    ) {
      return {
        success:    true,
        role:       String(rowRole).trim().toLowerCase(),
        driverName: String(rowDriver).trim(),
      };
    }
  }

  return { success: false, error: 'Invalid password' };
}

// ═══════════════════════════════════════════════════════════════
// EMPLOYEES
// ═══════════════════════════════════════════════════════════════

/**
 * Returns active employees list
 */
function handleGetEmployees() {
  const sheet = getSheet(SHEETS.EMPLOYEES);
  const rows  = sheet.getDataRange().getValues();

  const employees = [];
  for (let i = 1; i < rows.length; i++) {
    const [name, status] = rows[i];
    if (String(status).trim().toLowerCase() === 'active') {
      employees.push(String(name).trim());
    }
  }

  return { success: true, employees };
}

// ═══════════════════════════════════════════════════════════════
// ENTRIES
// ═══════════════════════════════════════════════════════════════

/**
 * Append multiple entries to Entries sheet
 * Validates each entry before writing
 */
function handleAddEntries(body) {
  const entries = body.entries;

  if (!entries || !Array.isArray(entries) || entries.length === 0) {
    return { success: false, error: 'No entries provided' };
  }

  const sheet       = getSheet(SHEETS.ENTRIES);
  const validMethods = ['cash', 'card', 'app'];
  const rows         = [];

  for (const entry of entries) {
    const date      = sanitize(entry.date);
    const driver    = sanitize(entry.driver);
    const employee  = sanitize(entry.employee);
    const method    = sanitize(entry.paymentMethod).toLowerCase();
    const amount    = parseFloat(entry.amount);
    const timestamp = sanitize(entry.timestamp) || new Date().toISOString();

    // Validation
    if (!date || !driver || !employee || !method || isNaN(amount) || amount <= 0) {
      Logger.log('Skipping invalid entry: ' + JSON.stringify(entry));
      continue;
    }
    if (!validMethods.includes(method)) {
      Logger.log('Invalid payment method: ' + method);
      continue;
    }

    rows.push([date, driver, employee, method, amount, timestamp]);
  }

  if (rows.length === 0) {
    return { success: false, error: 'No valid entries' };
  }

  // Append all rows at once
  const lastRow = sheet.getLastRow();
  sheet.getRange(lastRow + 1, 1, rows.length, 6).setValues(rows);

  return { success: true, added: rows.length };
}

// ═══════════════════════════════════════════════════════════════
// DASHBOARD
// ═══════════════════════════════════════════════════════════════

/**
 * Returns aggregated stats + filtered entries
 * Filters: date | driver | employee
 */
function handleGetDashboard(params) {
  const sheet = getSheet(SHEETS.ENTRIES);
  const rows  = sheet.getDataRange().getValues();

  if (rows.length <= 1) {
    return { success: true, stats: emptyStats(), entries: [] };
  }

  // headers: Date|Driver|Employee|PaymentMethod|Amount|Timestamp
  const headers = rows[0].map(h => String(h).toLowerCase().replace(/\s/g, ''));

  // Parse filters
  const filterDate     = params.date     || '';
  const filterDriver   = params.driver   || '';
  const filterEmployee = params.employee || '';

  // If no date filter, use today
  const today = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
  const effectiveDate = filterDate || today;

  const entries   = [];
  const stats     = {
    totalAmount:  0,
    totalSessions: 0,
    byPayment:    { cash: 0, card: 0, app: 0 },
    byDriver:     {},
    byEmployee:   {},
  };

  for (let i = 1; i < rows.length; i++) {
    const row      = rows[i];
    const rowDate  = String(row[0]).trim().substring(0, 10); // YYYY-MM-DD
    const driver   = String(row[1]).trim();
    const employee = String(row[2]).trim();
    const method   = String(row[3]).trim().toLowerCase();
    const amount   = parseFloat(row[4]) || 0;
    const ts       = String(row[5]).trim();

    // Apply filters
    if (effectiveDate && rowDate !== effectiveDate) continue;
    if (filterDriver   && driver   !== filterDriver)   continue;
    if (filterEmployee && employee !== filterEmployee) continue;

    entries.push({ date: rowDate, driver, employee, paymentMethod: method, amount, timestamp: ts });

    stats.totalAmount  += amount;
    stats.totalSessions++;

    if (stats.byPayment[method] !== undefined) {
      stats.byPayment[method] += amount;
    }

    stats.byDriver[driver]     = (stats.byDriver[driver]   || 0) + amount;
    stats.byEmployee[employee] = (stats.byEmployee[employee] || 0) + amount;
  }

  // Sort entries newest first
  entries.sort((a, b) => b.timestamp.localeCompare(a.timestamp));

  return { success: true, stats, entries };
}

function emptyStats() {
  return {
    totalAmount:   0,
    totalSessions: 0,
    byPayment:     { cash: 0, card: 0, app: 0 },
    byDriver:      {},
    byEmployee:    {},
  };
}

// ═══════════════════════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════════════════════

function getSheet(name) {
  const ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(name);
  if (!sheet) throw new Error(`Sheet "${name}" not found`);
  return sheet;
}

function sanitize(val) {
  if (val === null || val === undefined) return '';
  return String(val).trim().replace(/[<>]/g, '');
}

function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// ═══════════════════════════════════════════════════════════════
// SHEET SETUP HELPER (run once manually)
// ═══════════════════════════════════════════════════════════════

/**
 * Run this function ONCE to set up all required sheets with headers and sample data.
 * Go to: Apps Script Editor → Run → setupSheets
 */
function setupSheets() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);

  // ── Users sheet ──────────────────────────────────────────────
  let usersSheet = ss.getSheetByName(SHEETS.USERS);
  if (!usersSheet) usersSheet = ss.insertSheet(SHEETS.USERS);
  usersSheet.clearContents();
  usersSheet.getRange(1, 1, 1, 4).setValues([['Password', 'Role', 'DriverName', 'Status']]);
  // Add sample users — CHANGE PASSWORDS BEFORE GOING LIVE
  usersSheet.getRange(2, 1, 3, 4).setValues([
    ['admin123',  'admin',  'Admin',   'active'],
    ['driver001', 'driver', 'أحمد',    'active'],
    ['driver002', 'driver', 'محمد',    'active'],
  ]);
  styleHeaderRow(usersSheet);

  // ── Employees sheet ───────────────────────────────────────────
  let empSheet = ss.getSheetByName(SHEETS.EMPLOYEES);
  if (!empSheet) empSheet = ss.insertSheet(SHEETS.EMPLOYEES);
  empSheet.clearContents();
  empSheet.getRange(1, 1, 1, 2).setValues([['Name', 'Status']]);

  const employees = [
    'Aderson','Gerard','Maria','Feryal','Yayat','Buthaina',
    'Carla','Sanaa','Mylin','DiDi','NooR','Latifa',
    'RJ','Karin','MarCo','Jeny','Toban'
  ];
  const empData = employees.map(name => [name, 'active']);
  empSheet.getRange(2, 1, empData.length, 2).setValues(empData);
  styleHeaderRow(empSheet);

  // ── Entries sheet ─────────────────────────────────────────────
  let entriesSheet = ss.getSheetByName(SHEETS.ENTRIES);
  if (!entriesSheet) entriesSheet = ss.insertSheet(SHEETS.ENTRIES);
  entriesSheet.clearContents();
  entriesSheet.getRange(1, 1, 1, 6).setValues([
    ['Date', 'Driver', 'Employee', 'PaymentMethod', 'Amount', 'Timestamp']
  ]);
  styleHeaderRow(entriesSheet);

  Logger.log('✅ Sheets setup complete!');
  SpreadsheetApp.getUi().alert('✅ Sheets setup complete! Check the spreadsheet.');
}

/** Apply bold + background to header row */
function styleHeaderRow(sheet) {
  const range = sheet.getRange(1, 1, 1, sheet.getLastColumn());
  range.setFontWeight('bold');
  range.setBackground('#1a2235');
  range.setFontColor('#00c9b1');
}
