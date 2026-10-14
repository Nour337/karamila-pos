# Karamila POS — Setup Guide

A free, installable (PWA) barbershop POS + manager dashboard.
**Frontend:** HTML + Tailwind + vanilla JS (static, any free host) · **Backend/DB:** Google Sheets + Apps Script.

```
karamila/
├── index.html, app.js, config.js, styles.css   ← the app (deploy these)
├── sw.js, manifest.webmanifest, icons/         ← PWA (offline + install)
├── backend/Code.gs, backend/appsscript.json    ← paste into Apps Script
├── src/input.css, tailwind.config.js           ← only to rebuild CSS
└── test/                                       ← local mock server + backend tests
```

## How it works (30-second architecture)

```
Phone / Tablet / PC (PWA)  ──POST JSON (text/plain)──►  Apps Script Web App  ──►  Google Sheet (7 tabs)
   │ offline outbox queue                               │ PIN → signed token (HMAC)
   │ optimistic UI (sale "saves" instantly)             │ prices & commission computed server-side
   └ polls every 15 s for live chairs/approvals         └ LockService prevents double writes
```

- The cashier never sends prices — the server reads them from the `Catalog` tab, so prices can't be tampered with from the browser.
- Each sale has a client-generated ID, so if the internet drops and the app retries, the server **won't double-charge** (idempotent).
- No internet? Sales queue on the device ("Offline · 2 queued") and upload automatically when back online.

---

## Step 1 — Create the Google Sheet + backend (≈5 min)

1. Go to <https://sheets.new> and name it **Karamila POS DB**.
2. Menu **Extensions ▸ Apps Script**.
3. Delete the sample code in `Code.gs` and paste the full contents of **`backend/Code.gs`**. Save (Ctrl+S).
4. (Recommended) **Project Settings ⚙ ▸ tick "Show appsscript.json manifest file in editor"**, open `appsscript.json` and replace it with **`backend/appsscript.json`** (sets Cairo time zone + V8).
5. In the toolbar function dropdown choose **`setup`** ▸ **Run**.
   - Google asks for permission → *Review permissions* → choose your account → *Advanced* → *Go to project (unsafe)* → *Allow*. (It's "unverified" only because it's your own script.)
   - Check the sheet: you now have tabs `Settings, Barbers, Catalog, Customers, Tickets, Expenses, Approvals` with sample barbers and placeholder prices.

> Default PINs → **Manager: `123456`** · **Cashier: `1111`**. Change them on first login (Settings ▸ Security).

## Step 2 — Deploy the API (≈2 min)

1. In Apps Script: **Deploy ▸ New deployment** ▸ gear icon ▸ **Web app**.
2. Set:
   - *Execute as:* **Me**
   - *Who has access:* **Anyone**  ← required, the app authenticates with PINs, not Google accounts
3. **Deploy** → copy the **Web app URL** (ends with `/exec`).
4. Test it: open the URL in a browser → you should see `{"ok":true,"app":"Karamila POS API",...}`.

> ⚠️ **When you change `Code.gs` later:** *Deploy ▸ Manage deployments ▸ ✏️ Edit ▸ Version: **New version** ▸ Deploy.* This keeps the **same URL**. Creating a *new deployment* gives a different URL and the app would keep talking to the old code.

## Step 3 — Connect the app

Open **`config.js`** and paste the URL:

```js
API_URL: 'https://script.google.com/macros/s/AKfycb.../exec',
```

(Alternative: leave it empty — the app shows a "Connect server" screen where you paste the URL once per device.)

## Step 4 — Host the frontend for free (pick one)

**A) Vercel (this repo is set up for it):** <https://vercel.com/new> ▸ import this GitHub repo ▸ Framework preset **Other** ▸ Deploy (no build command needed). Every push to `main` redeploys automatically.

**B) Netlify (no Git):** go to <https://app.netlify.com/drop> and drag the folder in.

**C) GitHub Pages:** repo **Settings ▸ Pages ▸ Deploy from a branch ▸ `main` / root** (needs a public repo on the free plan).

HTTPS is mandatory for install/offline — all three provide it.

## Step 5 — First login & configuration

1. Open the site → enter manager PIN `123456`.
2. **Settings:**
   - **Security** → change the Manager PIN (6–8 digits) and Cashier PIN (4–8 digits). This logs out every device.
   - **Commission rules** → e.g. 30% services, 10% products.
   - **Barbers** → rename the samples, set colors/photos, optional per-barber % override.
   - **Price list** → set your real prices; untick *Active* to hide an item.
   - **Shop** → quick expense buttons (Hospitality, Cleaning, …) and fixed categories (Rent, Electricity, …).

## Step 6 — Install on phones/tablets

- **Android (Chrome):** open the link → menu ⋮ ▸ **Install app** (or the install icon in the app header).
- **iPhone/iPad (Safari):** Share ▸ **Add to Home Screen**.
- Cashier tablet: log in with the cashier PIN once — the session lasts 14 days.

---

## Daily use

| Who | Flow |
|---|---|
| **Cashier – quick sale** | Tap barber ▸ tap service(s) ▸ tap **Cash / Vodafone / InstaPay** → saved. |
| **Cashier – live chair** | Tap barber ▸ (customer) ▸ services ▸ **Start chair** → shows on the manager's Live Board. When done: tap that barber (loads the chair) ▸ pay. |
| **Customer** | Type name or phone → pick from list (shows visits, last service, preferences ★) or add new with name + phone. Optional — skip for walk-ins. |
| **Discount** | Cashier: **Discount** ▸ amount/% ▸ reason ▸ either manager types PIN on the spot (*approved now*) or leave empty → sale goes **PENDING** to the manager's Approvals. Rejected → ticket returns to the chair at full price. |
| **Cancel invoice** | POS ▸ **Today** ▸ *Cancel* ▸ reason → needs manager approval (or manager PIN). |
| **Manager** | Dashboard (revenue by method, net profit, live chairs, approvals) · Log (filter + CSV) · Payroll (per barber, any date range, CSV) · Expenses. |

**Net Profit = Revenue − (Barbers' commissions + Fixed & variable expenses)** for the selected period.
Commission is locked at sale time (changing the % later doesn't rewrite history) and is reduced proportionally when a discount is applied.

## The sheet (your database)

| Tab | Purpose | Safe to edit by hand? |
|---|---|---|
| Settings | commission %, shop name, expense categories | ✅ |
| Barbers | id, name, color, photo, active, svcPct/prodPct (blank = default) | ✅ (don't change `id`) |
| Catalog | services & products with prices | ✅ (don't change `id`) |
| Customers | profiles, visits, total spent, notes | ✅ name/phone/notes |
| Tickets | every sale (items as JSON) | ❌ use the app (void instead of deleting) |
| Expenses | daily + fixed expenses | ⚠️ set `deleted` = TRUE instead of deleting rows |
| Approvals | discount/cancel requests | ❌ |

## Security notes

- PINs are stored **hashed** in Script Properties (not in the sheet). Sessions are HMAC-signed tokens; changing a PIN invalidates all sessions.
- After 8 wrong PINs, all PIN entry is locked for 10 minutes. Lost the manager PIN? In Apps Script run **`resetPins`** → back to defaults.
- Role enforcement is server-side: a cashier cannot change prices, see the dashboard, delete expenses, void, or discount without approval — even by calling the API directly.

## Updating the app

- **Frontend:** edit files, push to GitHub (Vercel redeploys), and bump `VERSION` in `sw.js`. Devices show *"New version available — tap to update"*.
- **Styling:** if you add new Tailwind classes, run `npm install` then `npm run build:css`.
- **Backend:** paste the new `Code.gs`, then *Manage deployments ▸ Edit ▸ New version*.
