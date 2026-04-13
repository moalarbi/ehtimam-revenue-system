# ⚡ EHTIMAM — Daily Revenue Recording System

نظام تسجيل الإيرادات اليومية لخدمات المنازل  
A mobile-first revenue recording system for home-service businesses.

---

## 📋 System Overview

| Layer      | Technology              | Hosting         |
|------------|-------------------------|-----------------|
| Frontend   | HTML + CSS + Vanilla JS | GitHub Pages    |
| Backend    | Google Apps Script      | Google Cloud    |
| Database   | Google Sheets           | Google Drive    |

---

## 🏗️ Project Structure

```
ehtimam/
├── index.html         ← Main app (all screens)
├── style.css          ← Styling (dark theme, RTL/LTR)
├── app.js             ← Frontend logic
├── Code.gs            ← Apps Script backend
├── appsscript.json    ← Apps Script manifest
└── README.md          ← This file
```

---

## 🚀 Setup Instructions

### Step 1 — Create Google Sheet

1. Go to [Google Sheets](https://sheets.google.com) and create a new spreadsheet
2. Name it: **EHTIMAM Revenue**
3. Copy the **Spreadsheet ID** from the URL:
   ```
   https://docs.google.com/spreadsheets/d/[SPREADSHEET_ID]/edit
   ```

---

### Step 2 — Set Up Apps Script

1. In the spreadsheet, click **Extensions → Apps Script**
2. Delete any existing code in `Code.gs`
3. Paste the entire contents of `Code.gs` from this project
4. Replace `YOUR_GOOGLE_SHEETS_ID` on line 20 with your actual Spreadsheet ID:
   ```javascript
   const SPREADSHEET_ID = 'your_actual_id_here';
   ```
5. Add `appsscript.json`:
   - Click the gear icon (⚙) → Show "appsscript.json" manifest file
   - Replace the contents with the provided `appsscript.json`
6. Save all files (Ctrl+S)

---

### Step 3 — Initialize Sheets

1. In Apps Script, click **Run → setupSheets**
2. Authorize when prompted (allow all permissions)
3. After completion, your spreadsheet will have 3 sheets:
   - **Users** — with sample login passwords
   - **Employees** — pre-filled with all 17 employees
   - **Entries** — ready for data

> ⚠️ **IMPORTANT**: Change the default passwords in the Users sheet before going live!

---

### Step 4 — Deploy as Web App

1. In Apps Script, click **Deploy → New deployment**
2. Select type: **Web app**
3. Settings:
   - Description: `EHTIMAM API v1`
   - Execute as: **Me**
   - Who has access: **Anyone**
4. Click **Deploy**
5. **Copy the Web App URL** (looks like `https://script.google.com/macros/s/AKfycb.../exec`)

---

### Step 5 — Connect Frontend to Backend

1. Open `app.js`
2. Replace the placeholder URL:
   ```javascript
   const CONFIG = {
     APPS_SCRIPT_URL: 'https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec',
   };
   ```
3. Paste the Web App URL from Step 4

---

### Step 6 — Deploy to GitHub Pages

1. Create a new GitHub repository (e.g., `ehtimam-app`)
2. Upload all frontend files:
   - `index.html`
   - `style.css`
   - `app.js`
3. Go to **Settings → Pages**
4. Source: **Deploy from branch → main → / (root)**
5. Your app will be live at: `https://[username].github.io/ehtimam-app`

---

## 👥 User Management

### Adding a Driver

In the **Users** sheet, add a row:

| Password   | Role   | DriverName | Status |
|------------|--------|------------|--------|
| driver007  | driver | خالد       | active |

### Adding an Admin

| Password  | Role  | DriverName | Status |
|-----------|-------|------------|--------|
| myadmin99 | admin | Admin      | active |

### Deactivating a User

Change their **Status** from `active` to `inactive`.

---

## 👩‍💼 Employee Management

To add/remove employees, edit the **Employees** sheet:

| Name    | Status   |
|---------|----------|
| NewName | active   |
| OldName | inactive |

Changes appear immediately in the app.

---

## 🔐 Security Notes

- Passwords are stored in plain text in Google Sheets — use strong, unique passwords
- The backend validates all inputs before writing to the sheet
- Never share your Apps Script Web App URL publicly if using sensitive data
- For higher security: consider hashing passwords in Apps Script using `Utilities.computeDigest()`
- Admin access is protected server-side by role check

---

## 📊 Google Sheets Structure

### Users Sheet
| Column | Description |
|--------|-------------|
| Password | Login password (plain text) |
| Role | `driver` or `admin` |
| DriverName | Display name shown in app |
| Status | `active` or `inactive` |

### Employees Sheet
| Column | Description |
|--------|-------------|
| Name | Employee display name |
| Status | `active` or `inactive` |

### Entries Sheet
| Column | Description |
|--------|-------------|
| Date | ISO date (YYYY-MM-DD) |
| Driver | Driver name |
| Employee | Employee name |
| PaymentMethod | `cash`, `card`, or `app` |
| Amount | Number (SAR) |
| Timestamp | ISO timestamp |

---

## 🌍 Language Support

The app supports **Arabic (AR)** and **English (EN)**.

- Default language: **Arabic (RTL)**
- Toggle using the **EN/AR** button in the top bar
- Language preference resets on page reload (stateless)

---

## 🔄 Updating the Apps Script

After any change to `Code.gs`:
1. Go to **Deploy → Manage deployments**
2. Click the edit (pencil) icon on the existing deployment
3. Change version to **New version**
4. Click **Deploy**

> ⚠️ The Web App URL stays the same after updates.

---

## 🐛 Troubleshooting

| Problem | Solution |
|---------|----------|
| "Login failed" | Check password in Users sheet, verify status is `active` |
| Employees not loading | Check `active` status in Employees sheet |
| Submit fails | Check Apps Script logs (View → Logs), re-deploy if needed |
| CORS error | Ensure Web App access is set to "Anyone" |
| Blank dashboard | Check if Entries sheet has data for today's date |
| Sheet not found | Run `setupSheets()` again to recreate sheets |

---

## 📱 Usage Guide

### Driver Flow
1. Open app URL
2. Enter your password → Login
3. For each service:
   - Select the employee who performed it
   - Tap payment method (Cash / Card / App)
   - Enter amount (or tap quick amount buttons)
   - Tap **Add Session**
4. After all services: tap **Submit All Sessions**

### Admin Flow
1. Login with admin password
2. Dashboard shows today's stats automatically
3. Use filters to analyze by date / driver / employee
4. View payment breakdown and performance bars

---

## ⚡ Performance Tips

- The app uses `fetch()` with no page reloads
- Apps Script has a 6-minute execution limit (not an issue for this use case)
- For very large datasets (10,000+ rows), consider archiving old entries monthly

---

Built for **EHTIMAM** home services | Designed for Saudi/Gulf market 🇸🇦
