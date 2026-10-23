/* =====================================================================
 *  KARAMILA POS — Frontend SPA (vanilla JS, no build step needed)
 *  POS (cashier) + Admin dashboard (manager). Offline-first outbox.
 * ===================================================================== */
(() => {
'use strict';

const CFG = Object.assign({ API_URL: '', TIME_ZONE: 'Africa/Cairo', SYNC_SECONDS: 15 }, window.KARAMILA_CONFIG || {});
const TZ = CFG.TIME_ZONE;
const VERSION = '1.3.1';

const METHODS = {
  CASH:          { label: 'Cash',          short: 'Cash',     btn: 'bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700', dot: 'bg-emerald-500', text: 'text-emerald-400' },
  VODAFONE_CASH: { label: 'Vodafone Cash', short: 'Vodafone', btn: 'bg-red-600 hover:bg-red-500 active:bg-red-700',             dot: 'bg-red-500',     text: 'text-red-400' },
  INSTAPAY:      { label: 'InstaPay',      short: 'InstaPay', btn: 'bg-violet-600 hover:bg-violet-500 active:bg-violet-700',    dot: 'bg-violet-500',  text: 'text-violet-400' },
};
const STATUS_BADGE = {
  PAID:    'bg-emerald-500/15 text-emerald-300',
  PENDING: 'bg-amber-500/15 text-amber-300',
  VOID:    'bg-red-500/15 text-red-300 line-through',
  OPEN:    'bg-sky-500/15 text-sky-300',
  QUEUED:  'bg-slate-500/20 text-slate-300',
};

/* ---------------------------- utilities ---------------------------- */
const LS = {
  get(k, d) { try { const v = localStorage.getItem('krm:' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('krm:' + k, JSON.stringify(v)); } catch (e) { /* storage full / private mode */ } },
  del(k) { try { localStorage.removeItem('krm:' + k); } catch (e) { /* ignore */ } },
};
const $ = (s, r = document) => r.querySelector(s);
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = (p) => p + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 6).toUpperCase();
const num = (v) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };
const r2 = (n) => Math.round((num(n) + Number.EPSILON) * 100) / 100;
const digits = (s) => String(s || '').replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/\D/g, '');
const normName = (s) => String(s || '').toLowerCase().replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي').trim();
const initials = (n) => String(n || '?').trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
function cleanPhone(p) {
  let s = digits(p);
  if (s.startsWith('0020')) s = s.slice(4);
  if (s.startsWith('20') && s.length === 12) s = s.slice(2);
  if (s.length === 10 && s[0] === '1') s = '0' + s;
  return s.slice(0, 15);
}

const dfDate = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' });
const dfTime = new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour: '2-digit', minute: '2-digit' });
const dfDay = new Intl.DateTimeFormat('en-GB', { timeZone: TZ, day: 'numeric', month: 'short' });
const todayStr = () => dfDate.format(new Date());
const addDays = (ymd, n) => { const d = new Date(ymd + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const fmtTime = (iso) => (iso ? dfTime.format(new Date(iso)) : '');
const fmtDay = (ymd) => (ymd ? dfDay.format(new Date(ymd + 'T12:00:00Z')) : '');
const minsSince = (iso) => (iso ? Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000)) : 0);
const money = (n) => num(n).toLocaleString('en-US', { maximumFractionDigits: 2 });
const cur = () => (S.boot && S.boot.settings && S.boot.settings.currency) || 'EGP';
const fmt = (n) => money(n) + ' ' + cur();

function rangeFor(key) {
  const t = todayStr();
  switch (key) {
    case 'yesterday': { const y = addDays(t, -1); return [y, y]; }
    case 'week': return [addDays(t, -6), t];
    case 'month': return [t.slice(0, 8) + '01', t];
    case 'lastmonth': { const lp = addDays(t.slice(0, 8) + '01', -1); return [lp.slice(0, 8) + '01', lp]; }
    case 'custom': return [S.dash.from || t, S.dash.to || t];
    default: return [t, t];
  }
}

/* ------------------------------ icons ------------------------------ */
const ICONS = {
  pos: '<circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M20 4 8.12 15.88M14.47 14.48 20 20M8.12 8.12 12 12"/>',
  chart: '<path d="M3 3v18h18"/><path d="M7 16v-5M12 16V8M17 16V7"/>',
  list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
  users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
  wallet: '<rect x="2" y="6" width="20" height="14" rx="2"/><path d="M2 10h20M16 15h2"/>',
  shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/>',
  cog: '<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/>',
  logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>',
  plus: '<path d="M12 5v14M5 12h14"/>', minus: '<path d="M5 12h14"/>', x: '<path d="M18 6 6 18M6 6l12 12"/>',
  check: '<path d="M20 6 9 17l-5-5"/>', clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
  refresh: '<path d="M21 12a9 9 0 1 1-3-6.7L21 8"/><path d="M21 3v5h-5"/>',
  download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>',
  trash: '<path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>', edit: '<path d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  tag: '<path d="M20.59 13.41 13.42 20.6a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><path d="M7 7h.01"/>',
  chair: '<path d="M7 18v3M17 18v3M5 11V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v6"/><path d="M3 11h18v4a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3z"/>',
  receipt: '<path d="M4 2v20l3-2 3 2 3-2 3 2 3-2 1 .67V2l-1 .67L16 1l-3 2-3-2-3 2-3-1z"/><path d="M8 8h8M8 12h8M8 16h5"/>',
  install: '<path d="M12 3v12M7 10l5 5 5-5M5 21h14"/>', back: '<path d="M15 18l-6-6 6-6"/>',
  gift: '<rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v13M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7M7.5 8a2.5 2.5 0 0 1 0-5C11 3 12 8 12 8s1-5 4.5-5a2.5 2.5 0 0 1 0 5"/>',
  qr: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3h-3zM20 14v.01M14 20h.01M17 20h4v-3"/>',
  send: '<path d="M22 2 11 13M22 2l-7 20-4-9-9-4z"/>', copy: '<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
  print: '<path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>',
};
const ic = (n, c = 'h-5 w-5') => `<svg class="${c}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[n] || ''}</svg>`;

/* ------------------------------ state ------------------------------ */
const S = {
  apiUrl: LS.get('apiUrl', '') || CFG.API_URL,
  token: LS.get('token', null),
  role: LS.get('role', null),
  boot: LS.get('boot', null),           // settings, barbers, catalog, customers
  live: LS.get('live', null),           // open chairs, today's tickets, approvals, today's expenses
  outbox: LS.get('outbox', []),         // offline-safe write queue
  failed: LS.get('failed', []),
  seen: LS.get('seenDecisions', {}),
  view: 'pos',
  online: navigator.onLine,
  syncing: false,
  lastSync: 0,
  cart: null,
  posTab: 'SERVICE',
  custQuery: '',
  dash: { range: LS.get('dashRange', 'today'), from: '', to: '', data: null, loading: false, error: '' },
  logFilter: { barber: '', method: '', status: '', q: '' },
  loy: { data: null, loading: false, error: '', q: '', tab: 'customers' },
  installPrompt: null,
};

/* ------------------------------- API ------------------------------- */
async function api(action, data = {}, timeoutMs = 30000) {
  if (!S.apiUrl) { const e = new Error('Server URL is not configured.'); e.code = 'CONFIG'; throw e; }
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  let res;
  try {
    // text/plain body = "simple request" → no CORS preflight (Apps Script can't answer OPTIONS)
    res = await fetch(S.apiUrl, { method: 'POST', body: JSON.stringify({ action, token: S.token, data }), signal: ctrl.signal, redirect: 'follow' });
  } catch (err) {
    const e = new Error(navigator.onLine ? 'Server unreachable.' : 'You are offline.'); e.code = 'NETWORK'; throw e;
  } finally { clearTimeout(timer); }
  let j;
  try { j = await res.json(); } catch (err) { const e = new Error('Bad server response. Check the Web App URL & deployment access ("Anyone").'); e.code = 'NETWORK'; throw e; }
  if (!j.ok) {
    const e = new Error(j.message || j.error || 'Request failed'); e.code = j.error;
    if (j.error === 'AUTH' && action !== 'login') expireSession();
    throw e;
  }
  return j.data;
}

/* --------------------------- outbox (offline) --------------------------- */
const persistOutbox = () => { LS.set('outbox', S.outbox); LS.set('failed', S.failed); updateStatus(); };
const stripLocal = (o) => JSON.parse(JSON.stringify(o, (k, v) => (k.startsWith('_') ? undefined : v)));
const OP_LABEL = { checkout: 'Sale', openTicket: 'Chair', discardTicket: 'Discard chair', addExpense: 'Expense', saveCustomer: 'Customer' };

function enqueue(action, data) {
  S.outbox.push({ action, data, at: Date.now() });
  persistOutbox();
  flushOutbox();
}

let flushing = false;
async function flushOutbox() {
  if (flushing || !S.token || !S.outbox.length) return;
  flushing = true;
  let wrote = false;
  try {
    while (S.outbox.length) {
      const op = S.outbox[0];
      try {
        const res = await api(op.action, stripLocal(op.data));
        S.outbox.shift(); wrote = true; persistOutbox();
        afterOp(op, res);
      } catch (e) {
        if (e.code === 'NETWORK' || e.code === 'AUTH' || e.code === 'CONFIG') break;
        S.outbox.shift();
        S.failed.unshift({ ...op, error: e.message, failedAt: Date.now() });
        persistOutbox();
        toast(`${OP_LABEL[op.action] || op.action} not saved: ${e.message}`, 'error', 9000);
        if (S.view === 'pos') renderFailed();
      }
    }
  } finally { flushing = false; updateStatus(); }
  if (wrote) syncNow();
}

function afterOp(op, res) {
  if (op.action === 'checkout' && res && res.duplicate) return;
  if (op.action === 'checkout' && res && res.rewardError) toast(`Loyalty reward not applied: ${res.rewardError} The sale was sent to the manager for approval.`, 'error', 12000);
  if (op.action === 'saveCustomer' && res && res.customer) upsertLocalCustomer(res.customer);
  if ((op.action === 'checkout' || op.action === 'openTicket') && op.data.customer) refreshCustomers();
  if (op.action === 'addExpense' && S.role === 'MANAGER' && ['expenses', 'dashboard'].includes(S.view)) loadDash(true);
}

/* ------------------------------- sync ------------------------------- */
async function bootstrap() {
  try {
    const d = await api('bootstrap');
    S.role = d.role; LS.set('role', d.role);
    S.boot = { settings: d.settings, barbers: d.barbers, catalog: d.catalog, customers: d.customers };
    setLive(d, true);
    LS.set('boot', S.boot);
    renderShell();
    route();
    flushOutbox();
  } catch (e) {
    if (e.code === 'NETWORK') { toast('Offline — working from saved data', 'warn'); route(); }
    else if (e.code !== 'AUTH') { toast(e.message, 'error'); route(); }
  }
}

async function syncNow() {
  if (!S.token || S.syncing || !S.apiUrl) return;
  S.syncing = true; updateStatus();
  try {
    const d = await api('sync', {}, 20000);
    setLive(d, false);
    S.online = true;
  } catch (e) {
    if (e.code === 'NETWORK') S.online = false;
  } finally { S.syncing = false; updateStatus(); }
}

function setLive(d, prime) {
  S.live = { today: d.today, open: d.open || [], recent: d.recent || [], approvals: d.approvals || [], expensesToday: d.expensesToday || [], serverTime: d.serverTime };
  S.lastSync = Date.now();
  LS.set('live', S.live);
  notifyDecisions(prime);
  refreshLiveUI();
}

async function refreshCustomers() {
  try {
    const d = await api('listCustomers'); S.boot.customers = d.customers; LS.set('boot', S.boot);
    if (S.view === 'pos' && S.cart.customer && !S.cart.customer.isNew) renderCustomer();
  } catch (e) { /* later */ }
}

function notifyDecisions(prime) {
  const list = (S.live && S.live.approvals) || [];
  let changed = false;
  list.forEach((a) => {
    if (a.status === 'PENDING' || S.seen[a.id]) return;
    S.seen[a.id] = 1; changed = true;
    if (prime || S.role !== 'CASHIER') return;
    const t = findTicket(a.ticketId);
    const who = t ? `${t.barberName}${t.customerName ? ' · ' + t.customerName : ''}` : a.ticketId;
    if (a.type === 'DISCOUNT' && a.status === 'APPROVED') toast(`✅ Discount approved — ${who}`, 'success', 7000);
    if (a.type === 'DISCOUNT' && a.status === 'REJECTED') toast(`❌ Discount rejected — ${who} is back in the chair. Collect the full price.`, 'error', 12000);
    if (a.type === 'VOID' && a.status === 'APPROVED') toast(`Invoice cancelled — ${who}`, 'info', 7000);
    if (a.type === 'VOID' && a.status === 'REJECTED') toast(`Cancellation rejected — ${who}`, 'warn', 7000);
  });
  if (changed) LS.set('seenDecisions', S.seen);
}

/* ------------------------- derived local data ------------------------- */
const barbers = () => ((S.boot && S.boot.barbers) || []).filter((b) => b.active);
const barberById = (id) => ((S.boot && S.boot.barbers) || []).find((b) => b.id === id);
const catalogMap = () => Object.fromEntries(((S.boot && S.boot.catalog) || []).map((i) => [i.id, i]));
const customers = () => (S.boot && S.boot.customers) || [];
const customerById = (id) => customers().find((c) => c.id === id);
const pendingApprovals = () => ((S.live && S.live.approvals) || []).filter((a) => a.status === 'PENDING');

/** Server open chairs + local queued changes (so the UI is instant even offline). */
function openTickets() {
  let list = ((S.live && S.live.open) || []).slice();
  S.outbox.forEach((op) => {
    const d = op.data;
    if (op.action === 'openTicket') { list = list.filter((t) => t.id !== d.id); list.push(d._view); }
    else if (op.action === 'checkout' || op.action === 'discardTicket') list = list.filter((t) => t.id !== d.id);
  });
  return list;
}
function recentTickets() {
  const queued = S.outbox.filter((o) => o.action === 'checkout').map((o) => ({ ...o.data._view, queued: true })).reverse();
  const ids = new Set(queued.map((t) => t.id));
  return [...queued, ...((S.live && S.live.recent) || []).filter((t) => !ids.has(t.id))];
}
function findTicket(id) { return [...openTickets(), ...recentTickets()].find((t) => t.id === id); }

function upsertLocalCustomer(c) {
  if (!S.boot) return;
  const list = S.boot.customers;
  const i = list.findIndex((x) => x.id === c.id || (c.phone && x.phone === c.phone));
  if (i >= 0) list[i] = { ...list[i], ...c }; else list.push(c);
  LS.set('boot', S.boot);
}

/* ------------------------------ cart ------------------------------ */
const newCart = (barberId = null) => ({ id: uid('T'), barberId, items: [], customer: null, discount: null, reward: null, loaded: false, createdAt: null });

/* ---- loyalty (same rules as the server; the server re-validates everything) ---- */
const loyCfg = () => (S.boot && S.boot.settings && S.boot.settings.loyalty) || { active: false, required: 5, type: 'PERCENT', value: 50, services: [] };
const rewardLabel = (r) => (r.type === 'FIXED' ? `${fmt(r.value)} off` : `${num(r.value)}% off`);
function rewardLine(lines) {
  const set = new Set(loyCfg().services || []);
  let best = null;
  lines.forEach((l, k) => { if (l.type !== 'PRODUCT' && set.has(l.id) && (!best || l.price > best.price)) best = { ...l, index: k }; });
  return best;
}
function rewardAmountFor(r, lines) {
  const l = rewardLine(lines);
  if (!r || !l) return { amount: 0, line: null };
  const amt = r.type === 'FIXED' ? Math.min(num(r.value), l.price) : (l.price * num(r.value)) / 100;
  return { amount: r2(Math.max(0, Math.min(l.price, amt))), line: l };
}
const custLoyalty = (c) => (c && c.loyalty) || null;
S.cart = newCart();

function cartTotals() {
  const cat = catalogMap();
  let sub = 0;
  const lines = S.cart.items.filter((i) => cat[i.id]).map((i) => { const c = cat[i.id]; const amount = r2(c.price * i.qty); sub += amount; return { ...i, name: c.name, price: c.price, type: c.type, amount }; });
  sub = r2(sub);
  const rw = S.cart.reward ? rewardAmountFor(S.cart.reward, lines) : { amount: 0, line: null };
  const loyalty = Math.min(rw.amount, sub);
  const manual = S.cart.discount ? Math.min(r2(S.cart.discount.amount), r2(sub - loyalty)) : 0;
  const discount = r2(loyalty + manual);
  return { lines, sub, loyalty, rewardLine: rw.line, manual, discount, total: r2(sub - discount), count: lines.reduce((a, l) => a + l.qty, 0) };
}
function cartNeedsApproval(t) {
  if (S.role === 'MANAGER') return false;
  const c = S.cart;
  if (c.discount && t.manual > 0 && !c.discount.approvalToken) return true;
  return !!(c.reward && t.loyalty > 0 && loyCfg().needsApproval && !(c.reward.approvalToken && c.reward.approvedAmount === t.loyalty));
}
const itemsText = (lines) => lines.map((l) => (l.qty > 1 ? `${l.name} ×${l.qty}` : l.name)).join(', ');
function custPayload() {
  const c = S.cart.customer;
  if (!c) return null;
  return c.isNew ? { id: c.id, name: c.name, phone: c.phone } : { id: c.id };
}
function loadTicketIntoCart(t) {
  const cat = catalogMap();
  S.cart = {
    id: t.id, barberId: t.barberId, loaded: true, createdAt: t.createdAt, discount: null, reward: null,
    items: (t.items || []).filter((i) => cat[i.id]).map((i) => ({ id: i.id, qty: i.qty || 1 })),
    customer: t.customerId ? (customerById(t.customerId) || { id: t.customerId, name: t.customerName, phone: t.customerPhone }) : null,
  };
}

/* ============================== RENDER ============================== */
const NAV = [
  { id: 'pos', label: 'POS', icon: 'pos', roles: ['CASHIER', 'MANAGER'] },
  { id: 'dashboard', label: 'Dashboard', icon: 'chart', roles: ['MANAGER'] },
  { id: 'log', label: 'Log', icon: 'list', roles: ['MANAGER'] },
  { id: 'payroll', label: 'Payroll', icon: 'users', roles: ['MANAGER'] },
  { id: 'expenses', label: 'Expenses', icon: 'wallet', roles: ['CASHIER', 'MANAGER'] },
  { id: 'approvals', label: 'Approvals', icon: 'shield', roles: ['MANAGER'] },
  { id: 'loyalty', label: 'Loyalty', icon: 'gift', roles: ['MANAGER'] },
  { id: 'settings', label: 'Settings', icon: 'cog', roles: ['MANAGER'] },
];
const MGR_DATA_VIEWS = ['dashboard', 'log', 'payroll', 'expenses', 'approvals'];
const navFor = () => NAV.filter((n) => n.roles.includes(S.role));

function route() {
  if (!S.token) { renderLogin(); return; }
  const want = (location.hash || '').replace(/^#\/?/, '') || (S.role === 'MANAGER' ? 'dashboard' : 'pos');
  S.view = navFor().some((n) => n.id === want) ? want : 'pos';
  if (!$('#shell')) renderShell();
  updateNav();
  renderView();
}

function renderShell() {
  const shop = (S.boot && S.boot.settings && S.boot.settings.shopName) || 'Karamila';
  $('#app').innerHTML = `
  <div id="shell" class="min-h-screen">
    <header class="sticky top-0 z-40 border-b border-white/5 bg-slate-900/90 backdrop-blur" style="padding-top:env(safe-area-inset-top)">
      <div class="mx-auto flex h-14 max-w-7xl items-center gap-3 px-3 lg:px-5">
        <a href="#/${S.role === 'MANAGER' ? 'dashboard' : 'pos'}" class="flex items-center gap-2">
          <span class="grid h-9 w-9 place-items-center rounded-xl bg-amber-500 text-slate-900">${ic('pos', 'h-5 w-5')}</span>
          <span class="text-lg font-extrabold tracking-tight">${esc(shop)}</span>
        </a>
        <nav id="topnav" class="ml-4 hidden gap-1 lg:flex"></nav>
        <div class="ml-auto flex items-center gap-2">
          <button id="install-btn" data-act="install" class="${S.installPrompt ? '' : 'hidden'} rounded-xl px-3 py-2 text-sm text-amber-400 hover:bg-slate-800" title="Install app">${ic('install')}</button>
          <button id="status" data-act="sync-now" class="flex items-center gap-2 rounded-full bg-slate-800 px-3 py-1.5 text-xs font-medium"></button>
          <span class="hidden rounded-full bg-amber-500/15 px-3 py-1.5 text-xs font-semibold text-amber-400 sm:inline">${S.role === 'MANAGER' ? 'Manager' : 'Cashier'}</span>
          <button data-act="logout" class="rounded-xl p-2 text-slate-400 hover:bg-slate-800 hover:text-slate-100" title="Log out">${ic('logout')}</button>
        </div>
      </div>
    </header>
    <main id="view"></main>
    <nav id="bottomnav" class="fixed inset-x-0 bottom-0 z-40 flex border-t border-white/5 bg-slate-900/95 backdrop-blur lg:hidden" style="padding-bottom:env(safe-area-inset-bottom)"></nav>
  </div>`;
  updateStatus();
}

function updateNav() {
  const pend = pendingCountForBadge();
  const items = navFor();
  const badge = (n) => (n.id === 'approvals' && pend ? `<span class="ml-1 rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">${pend}</span>` : '');
  const top = $('#topnav');
  if (top) top.innerHTML = items.map((n) => `<a href="#/${n.id}" class="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium ${S.view === n.id ? 'bg-slate-800 text-amber-400' : 'text-slate-300 hover:bg-slate-800/60'}">${ic(n.icon, 'h-4 w-4')}${n.label}${badge(n)}</a>`).join('');
  const bot = $('#bottomnav');
  if (bot) bot.innerHTML = items.map((n) => `<a href="#/${n.id}" class="relative flex h-16 flex-1 flex-col items-center justify-center gap-1 text-[10px] font-medium ${S.view === n.id ? 'text-amber-400' : 'text-slate-400'}">${ic(n.icon, 'h-5 w-5')}<span>${n.label}</span>${n.id === 'approvals' && pend ? `<span class="absolute right-1/4 top-2 h-4 min-w-4 rounded-full bg-red-500 px-1 text-[10px] font-bold leading-4 text-white">${pend}</span>` : ''}</a>`).join('');
}
function pendingCountForBadge() {
  if (S.role !== 'MANAGER') return 0;
  const fromDash = S.dash.data && S.dash.data.approvals ? S.dash.data.approvals.length : 0;
  return Math.max(fromDash, pendingApprovals().length);
}

function updateStatus() {
  const el = $('#status');
  if (!el) return;
  const q = S.outbox.length;
  let dot = 'bg-emerald-400', txt = 'Live';
  if (!S.online) { dot = 'bg-red-500'; txt = q ? `Offline · ${q} queued` : 'Offline'; }
  else if (q) { dot = 'bg-amber-400 animate-pulse'; txt = `Syncing ${q}`; }
  else if (S.syncing) { dot = 'bg-emerald-400 animate-pulse'; }
  el.innerHTML = `<span class="h-2 w-2 rounded-full ${dot}"></span><span>${txt}</span>`;
}

function renderView() {
  const v = $('#view');
  if (!v) return;
  if (!S.boot) { v.innerHTML = `<div class="grid h-[60vh] place-items-center text-slate-400">${S.online ? 'Loading data…' : 'No connection — connect once to load the shop data.'}</div>`; return; }
  ({ pos: renderPOS, dashboard: renderDashboard, log: renderLog, payroll: renderPayroll, expenses: renderExpenses, approvals: renderApprovals, settings: renderSettings, loyalty: renderLoyalty }[S.view] || renderPOS)();
  if (S.role === 'MANAGER' && MGR_DATA_VIEWS.includes(S.view) && !S.dash.data && !S.dash.loading) loadDash();
  if (S.role === 'MANAGER' && S.view === 'loyalty' && !S.loy.data && !S.loy.loading && !S.loy.error) loadLoyalty();
}

function refreshLiveUI() {
  updateNav();
  if (S.view === 'pos' && $('#barbers')) {
    if (S.cart.loaded && !openTickets().some((t) => t.id === S.cart.id)) {
      const closed = recentTickets().find((t) => t.id === S.cart.id);
      if (closed) { S.cart = newCart(); toast('That chair was closed on another device.', 'info'); }
    }
    renderBarbers(); renderCart();
    const rc = $('#recent-count'); if (rc) rc.textContent = recentTickets().length;
  }
  if (S.view === 'expenses' && S.role === 'CASHIER') renderExpenses();
}

/* ------------------------------ LOGIN ------------------------------ */
let pinBuf = '';
function renderLogin(err = '') {
  pinBuf = '';
  const needUrl = !S.apiUrl;
  $('#app').innerHTML = `
  <div class="flex min-h-screen flex-col items-center justify-center px-6 py-10" style="padding-top:env(safe-area-inset-top)">
    <div class="mb-8 flex flex-col items-center">
      <span class="mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-amber-500 text-slate-900 shadow-lg shadow-amber-500/20">${ic('pos', 'h-8 w-8')}</span>
      <h1 class="text-3xl font-extrabold tracking-tight">Karamila</h1>
      <p class="mt-1 text-sm text-slate-400">${needUrl ? 'Connect your Google Sheet server to start' : 'Enter your PIN'}</p>
    </div>
    ${needUrl ? serverForm() : `
    <div id="pin-dots" class="mb-6 flex h-4 gap-3"></div>
    <p id="pin-err" class="mb-4 h-5 text-sm text-red-400">${esc(err)}</p>
    <div class="grid w-full max-w-xs grid-cols-3 gap-3">
      ${['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => `<button data-act="pin" data-d="${d}" class="h-16 rounded-2xl bg-slate-800 text-2xl font-semibold hover:bg-slate-700 active:scale-95 transition">${d}</button>`).join('')}
      <button data-act="pin-del" class="h-16 rounded-2xl text-slate-400 hover:bg-slate-800 active:scale-95 transition grid place-items-center">${ic('back', 'h-6 w-6')}</button>
      <button data-act="pin" data-d="0" class="h-16 rounded-2xl bg-slate-800 text-2xl font-semibold hover:bg-slate-700 active:scale-95 transition">0</button>
      <button data-act="pin-go" class="h-16 rounded-2xl bg-amber-500 text-slate-900 hover:bg-amber-400 active:scale-95 transition grid place-items-center">${ic('check', 'h-7 w-7')}</button>
    </div>
    <button data-act="server-settings" class="mt-8 text-xs text-slate-500 underline-offset-4 hover:text-slate-300 hover:underline">Server settings</button>
    ${S.outbox.length ? `<p class="mt-3 text-xs text-amber-400">${S.outbox.length} unsynced item(s) will upload after login.</p>` : ''}`}
    <p class="mt-6 text-[10px] text-slate-600">v${VERSION}</p>
  </div>`;
  drawPinDots();
}
function serverForm() {
  return `<div class="w-full max-w-md rounded-3xl bg-slate-800 p-5 ring-1 ring-white/5">
    <label class="mb-2 block text-sm font-medium text-slate-300">Google Apps Script Web App URL</label>
    <input id="api-url" value="${esc(S.apiUrl)}" placeholder="https://script.google.com/macros/s/…/exec" class="inp mb-3" autocomplete="off" spellcheck="false">
    <button data-act="save-url" data-primary class="btn-primary w-full">Test & Save</button>
    <p class="mt-3 text-xs text-slate-500">Paste the /exec URL from Apps Script ▸ Deploy ▸ Manage deployments.</p>
  </div>`;
}
function drawPinDots() {
  const el = $('#pin-dots');
  if (!el) return;
  const n = Math.max(4, pinBuf.length);
  el.innerHTML = Array.from({ length: n }, (_, i) => `<span class="h-4 w-4 rounded-full ${i < pinBuf.length ? 'bg-amber-500' : 'bg-slate-700'}"></span>`).join('');
}
async function submitPin() {
  if (pinBuf.length < 4) return;
  const pin = pinBuf;
  pinBuf = ''; drawPinDots();
  const errEl = $('#pin-err'); if (errEl) errEl.textContent = 'Checking…';
  try {
    const d = await api('login', { pin });
    S.token = d.token; S.role = d.role;
    LS.set('token', d.token); LS.set('role', d.role);
    location.hash = d.role === 'MANAGER' ? '#/dashboard' : '#/pos';
    $('#app').innerHTML = '';
    renderShell(); route();
    bootstrap();
  } catch (e) {
    if (errEl) errEl.textContent = e.message;
    const dots = $('#pin-dots'); if (dots) { dots.classList.add('animate-shake'); setTimeout(() => dots.classList.remove('animate-shake'), 400); }
  }
}
function expireSession() {
  if (!S.token) return;
  S.token = null; LS.del('token');
  closeModal();
  renderLogin('Session expired — please log in again.');
}

/* =============================== POS =============================== */
function renderPOS() {
  $('#view').innerHTML = `
  <div class="mx-auto max-w-7xl p-3 pb-48 lg:p-5 lg:pb-8">
    <div id="failed-banner"></div>
    <section class="mb-3">
      <div class="mb-2 flex items-center justify-between">
        <h2 class="text-xs font-semibold uppercase tracking-widest text-slate-400">1 · Barber</h2>
        <button data-act="today-list" class="flex items-center gap-1.5 rounded-full bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-700">${ic('receipt', 'h-4 w-4')} Today · <span id="recent-count">${recentTickets().length}</span></button>
      </div>
      <div id="barbers" class="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1"></div>
    </section>
    <div class="grid gap-4 lg:grid-cols-[1fr_380px]">
      <div class="min-w-0">
        <div id="customer" class="mb-3"></div>
        <div id="grid"></div>
      </div>
      <aside id="cart" class="self-start lg:sticky lg:top-20"></aside>
    </div>
  </div>
  <div id="paybar" class="fixed inset-x-0 z-30 border-t border-white/5 bg-slate-900/95 p-3 backdrop-blur lg:hidden" style="bottom:calc(4rem + env(safe-area-inset-bottom))"></div>`;
  renderFailed(); renderBarbers(); renderCustomer(); renderGrid(); renderCart();
}

function renderFailed() {
  const el = $('#failed-banner');
  if (!el) return;
  el.innerHTML = S.failed.length ? `<div class="mb-3 rounded-2xl bg-red-500/10 p-3 text-sm ring-1 ring-red-500/30">
    <div class="mb-2 font-semibold text-red-300">${S.failed.length} item(s) were rejected by the server</div>
    ${S.failed.slice(0, 5).map((f, i) => `<div class="flex items-center gap-2 py-1 text-red-200"><span class="flex-1">${esc(OP_LABEL[f.action] || f.action)}${f.data && f.data._view ? ' · ' + esc(f.data._view.barberName || '') + ' · ' + fmt(f.data._view.total) : ''} — ${esc(f.error)}</span>
      <button data-act="retry-failed" data-i="${i}" class="rounded-lg bg-red-500/20 px-2 py-1 text-xs">Retry</button></div>`).join('')}
    <button data-act="dismiss-failed" class="mt-1 text-xs text-red-300 underline">Dismiss all</button></div>` : '';
}

function renderBarbers() {
  const el = $('#barbers');
  if (!el) return;
  const open = openTickets();
  const list = barbers();
  el.innerHTML = list.length ? list.map((b) => {
    const t = open.find((x) => x.barberId === b.id);
    const sel = S.cart.barberId === b.id;
    return `<button data-act="pick-barber" data-id="${esc(b.id)}" class="relative flex w-[5.5rem] shrink-0 flex-col items-center gap-1 rounded-2xl p-2 transition active:scale-95 ${sel ? 'bg-amber-500/15 ring-2 ring-amber-500' : 'bg-slate-800/50 hover:bg-slate-800'}">
      ${avatar(b, 'h-14 w-14 text-lg')}
      <span class="w-full truncate text-center text-sm font-semibold">${esc(b.name)}</span>
      ${t ? `<span class="absolute right-2 top-2 h-3.5 w-3.5 animate-pulse rounded-full bg-emerald-400 ring-2 ring-slate-900"></span>
             <span class="w-full truncate text-center text-[10px] font-medium text-emerald-400">${minsSince(t.createdAt)}m · ${money(t.total)}</span>`
           : '<span class="text-[10px] text-slate-500">Free</span>'}
    </button>`;
  }).join('') : '<p class="py-4 text-sm text-slate-400">No active barbers. Add them in Settings.</p>';
}

function avatar(b, cls) {
  if (b && b.photo) return `<img src="${esc(b.photo)}" alt="" class="${cls} rounded-full object-cover" referrerpolicy="no-referrer">`;
  return `<span class="${cls} grid shrink-0 place-items-center rounded-full font-bold text-slate-900" style="background:${esc((b && b.color) || '#D97706')}">${esc(initials(b && b.name))}</span>`;
}

function renderCustomer() {
  const el = $('#customer');
  if (!el) return;
  const c = S.cart.customer;
  if (c) {
    const full = customerById(c.id) || c;
    el.innerHTML = `<div class="flex items-start gap-3 rounded-2xl bg-slate-800/70 p-3 ring-1 ring-white/5">
      <span class="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-amber-500/20 text-amber-400">${ic('user')}</span>
      <div class="min-w-0 flex-1">
        <div class="flex flex-wrap items-center gap-x-2"><span class="font-semibold">${esc(full.name)}</span><span class="text-sm text-slate-400">${esc(full.phone || '')}</span>
          ${c.isNew ? '<span class="rounded-full bg-sky-500/15 px-2 text-[10px] font-semibold text-sky-300">NEW</span>' : `<span class="rounded-full bg-amber-500/15 px-2 text-[10px] font-semibold text-amber-300">${num(full.visits)} visits</span>`}</div>
        ${!c.isNew && full.lastVisit ? `<div class="mt-0.5 truncate text-xs text-slate-400">Last: ${esc(fmtDay(full.lastVisit))} · ${esc(full.lastItems || '')}${full.favBarberId && barberById(full.favBarberId) ? ' · with ' + esc(barberById(full.favBarberId).name) : ''}</div>` : ''}
        ${full.notes ? `<div class="mt-1 rounded-lg bg-amber-500/10 px-2 py-1 text-xs text-amber-200">★ ${esc(full.notes)}</div>` : ''}
      </div>
      ${!c.isNew ? `<button data-act="edit-notes" class="rounded-lg p-2 text-slate-400 hover:bg-slate-700" title="Preferences">${ic('edit', 'h-4 w-4')}</button>` : ''}
      <button data-act="clear-customer" class="rounded-lg p-2 text-slate-400 hover:bg-slate-700" title="Remove">${ic('x', 'h-4 w-4')}</button>
    </div>${c.isNew ? newCustomerLoyaltyNote() : loyaltyStrip(full)}`;
    return;
  }
  el.innerHTML = `<div class="relative">
    <span class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">${ic('user', 'h-5 w-5')}</span>
    <input id="cust-q" value="${esc(S.custQuery)}" placeholder="Customer name or phone (optional)" autocomplete="off" spellcheck="false"
      class="inp h-12 pl-10 text-base">
    <div id="cust-dd" class="absolute inset-x-0 top-full z-20 mt-1"></div>
  </div>`;
  renderCustDropdown();
}

function progressDots(progress, required, cls = 'h-3 w-3') {
  if (required > 12) return `<div class="h-2 w-full rounded-full bg-slate-700"><div class="h-2 rounded-full bg-amber-500" style="width:${Math.round((progress / required) * 100)}%"></div></div>`;
  return `<span class="inline-flex flex-wrap gap-1">${Array.from({ length: required }, (_, i) => `<span class="${cls} rounded-full ${i < progress ? 'bg-amber-500' : 'bg-slate-700 ring-1 ring-white/10'}"></span>`).join('')}</span>`;
}
function newCustomerLoyaltyNote() {
  const L = loyCfg();
  if (!L.active) return '';
  return `<div class="mt-2 flex items-center gap-2 rounded-2xl bg-slate-800/40 px-3 py-2 text-xs text-slate-400 ring-1 ring-white/5">${ic('gift', 'h-4 w-4 text-amber-400')}<span>Joins the rewards program automatically with this visit.</span></div>`;
}
function loyaltyStrip(c) {
  const L = loyCfg();
  const lo = custLoyalty(c);
  if (!lo || (!L.active && !lo.available.length)) return '';
  const applied = S.cart.reward;
  const t = cartTotals();
  return `<div class="mt-2 rounded-2xl bg-slate-800/40 p-3 ring-1 ring-white/5">
    <div class="flex items-center gap-2">
      ${ic('gift', 'h-4 w-4 shrink-0 text-amber-400')}
      <span class="text-xs font-semibold text-slate-300">Rewards</span>
      <span class="text-xs text-slate-400">${lo.progress}/${lo.required}</span>
      ${progressDots(lo.progress, lo.required)}
      <button data-act="loy-card" data-id="${esc(c.id)}" class="ml-auto flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-slate-300 hover:bg-slate-700" title="Rewards card">${ic('qr', 'h-4 w-4')} Card</button>
    </div>
    ${!L.active ? '<div class="mt-1 text-xs text-slate-500">Program paused — visits are not counted.</div>'
      : lo.remaining > 0 && !lo.available.length ? `<div class="mt-1 text-xs text-slate-400">${lo.remaining} more visit${lo.remaining === 1 ? '' : 's'} to the next reward</div>` : ''}
    ${lo.available.map((r) => {
      const on = applied && applied.id === r.id;
      return `<div class="mt-2 flex items-center gap-2 rounded-xl ${on ? 'bg-emerald-500/15 ring-1 ring-emerald-500/40' : 'bg-amber-500/10 ring-1 ring-amber-500/40'} px-3 py-2">
        <span class="text-lg">🎁</span>
        <div class="min-w-0 flex-1"><div class="text-sm font-bold ${on ? 'text-emerald-300' : 'text-amber-300'}">${on ? 'Reward applied' : 'Reward available!'} · ${esc(rewardLabel(r))}</div>
          <div class="text-[11px] text-slate-400">${on && t.rewardLine ? `On ${esc(t.rewardLine.name)}` : 'On the next haircut'}${r.expiresOn ? ` · expires ${esc(fmtDay(r.expiresOn))}` : ''}</div></div>
        ${on ? `<button data-act="remove-reward" class="btn-ghost px-3 py-1.5 text-xs">Remove</button>` : `<button data-act="apply-reward" data-id="${esc(r.id)}" class="btn-primary px-3 py-1.5 text-xs">Apply</button>`}
      </div>`;
    }).join('')}
  </div>`;
}

function searchCustomers(q) {
  const d = digits(q);
  const n = normName(q);
  if (!n && !d) return [];
  const isPhone = d.length >= 3 && d.length >= q.replace(/\s/g, '').length - 1;
  const p = cleanPhone(q);
  return customers().filter((c) => (isPhone ? c.phone.includes(d) || (p.length >= 3 && c.phone.includes(p)) : normName(c.name).includes(n)))
    .sort((a, b) => b.visits - a.visits).slice(0, 6);
}

function renderCustDropdown() {
  const el = $('#cust-dd');
  if (!el) return;
  const q = S.custQuery.trim();
  if (!q) { el.innerHTML = ''; return; }
  const res = searchCustomers(q);
  const d = digits(q);
  const isPhone = d.length >= 3 && d.length >= q.replace(/\s/g, '').length - 1;
  el.innerHTML = `<div class="overflow-hidden rounded-2xl bg-slate-800 shadow-2xl ring-1 ring-white/10">
    ${res.map((c) => `<button data-act="pick-customer" data-id="${esc(c.id)}" class="flex w-full items-center gap-3 border-b border-white/5 px-4 py-3 text-left hover:bg-slate-700">
      <span class="flex-1"><span class="font-medium">${esc(c.name)}</span> <span class="text-sm text-slate-400">${esc(c.phone)}</span>
      ${c.notes ? `<span class="block truncate text-xs text-amber-300/80">★ ${esc(c.notes)}</span>` : ''}</span>
      <span class="text-xs text-slate-400">${c.loyalty && c.loyalty.available && c.loyalty.available.length ? '🎁 ' : ''}${c.visits} visits</span></button>`).join('')}
    <div class="grid gap-2 p-3 sm:grid-cols-[1fr_1fr_auto]">
      <input id="new-name" class="inp" placeholder="New customer name" value="${isPhone ? '' : esc(q)}">
      <input id="new-phone" class="inp" placeholder="Phone 01xxxxxxxxx" inputmode="tel" value="${isPhone ? esc(q) : ''}">
      <button data-act="add-customer" class="btn-primary whitespace-nowrap">${ic('plus', 'h-4 w-4')} Add</button>
    </div>
  </div>`;
}

function renderGrid() {
  const el = $('#grid');
  if (!el) return;
  const qty = Object.fromEntries(S.cart.items.map((i) => [i.id, i.qty]));
  const items = ((S.boot && S.boot.catalog) || []).filter((i) => i.active && i.type === S.posTab);
  const tab = (t, label) => `<button data-act="pos-tab" data-tab="${t}" class="rounded-xl px-4 py-2 text-sm font-semibold transition ${S.posTab === t ? 'bg-amber-500 text-slate-900' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}">${label}</button>`;
  el.innerHTML = `<div class="mb-2 flex items-center gap-2"><h2 class="mr-auto text-xs font-semibold uppercase tracking-widest text-slate-400">2 · Services & products</h2>${tab('SERVICE', 'Services')}${tab('PRODUCT', 'Products')}</div>
  <div class="grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-4">
    ${items.map((i) => `<button data-act="add-item" data-id="${esc(i.id)}" class="relative flex h-24 flex-col justify-between rounded-2xl p-3 text-left transition active:scale-[.97] ${qty[i.id] ? 'bg-amber-500/15 ring-2 ring-amber-500/70' : 'bg-slate-800 hover:bg-slate-700/80'}">
      <span class="line-clamp-2 text-[15px] font-semibold leading-tight">${esc(i.name)}</span>
      <span class="text-sm font-bold text-amber-400">${fmt(i.price)}</span>
      ${qty[i.id] ? `<span class="absolute right-2 top-2 grid h-6 min-w-6 place-items-center rounded-full bg-amber-500 px-1.5 text-xs font-bold text-slate-900">${qty[i.id]}</span>` : ''}
    </button>`).join('') || '<p class="col-span-full py-6 text-sm text-slate-400">Nothing here yet — add items in Settings.</p>'}
  </div>`;
}

function payButtons(t, compact) {
  const ready = S.cart.barberId && t.lines.length;
  const needsApproval = cartNeedsApproval(t);
  return Object.entries(METHODS).map(([k, m]) => `<button data-act="pay" data-method="${k}" class="${m.btn} ${ready ? '' : 'opacity-40'} flex ${compact ? 'h-14' : 'h-16'} flex-col items-center justify-center rounded-2xl px-2 font-bold text-white shadow-lg transition active:scale-95">
    <span class="${compact ? 'text-sm' : 'text-base'} leading-tight">${m.short}</span>
    <span class="text-[10px] font-medium opacity-80">${needsApproval ? 'Send for approval' : 'Pay & Save'}</span></button>`).join('');
}

function renderCart() {
  const el = $('#cart');
  if (!el) return;
  const t = cartTotals();
  const b = barberById(S.cart.barberId);
  const disc = S.cart.discount;
  const needsApproval = disc && t.manual > 0 && S.role !== 'MANAGER' && !disc.approvalToken;
  const rwNeeds = S.cart.reward && t.loyalty > 0 && cartNeedsApproval(t) && !needsApproval;
  el.innerHTML = `<div class="rounded-3xl bg-slate-800/80 p-4 ring-1 ring-white/5">
    <div class="mb-3 flex items-center gap-3">
      ${b ? avatar(b, 'h-10 w-10 text-sm') : `<span class="grid h-10 w-10 place-items-center rounded-full bg-slate-700 text-slate-400">${ic('chair', 'h-5 w-5')}</span>`}
      <div class="min-w-0 flex-1">
        <div class="truncate font-semibold">${b ? esc(b.name) : '<span class="text-slate-400">Select a barber ↑</span>'}</div>
        <div class="text-xs ${S.cart.loaded ? 'text-emerald-400' : 'text-slate-400'}">${S.cart.loaded ? `In chair · ${minsSince(S.cart.createdAt)} min` : 'New ticket'}</div>
      </div>
      ${S.cart.items.length || S.cart.customer || S.cart.barberId ? `<button data-act="${S.cart.loaded ? 'discard-chair' : 'clear-cart'}" class="rounded-lg px-2 py-1 text-xs text-slate-400 hover:bg-slate-700">${S.cart.loaded ? 'Discard chair' : 'Clear'}</button>` : ''}
    </div>
    <div class="max-h-[36vh] space-y-1 overflow-y-auto">
      ${t.lines.map((l) => `<div class="flex items-center gap-2 rounded-xl bg-slate-900/40 px-3 py-2">
        <div class="min-w-0 flex-1"><div class="truncate text-sm font-medium">${esc(l.name)}</div><div class="text-xs text-slate-400">${fmt(l.price)}${l.type === 'PRODUCT' ? ' · product' : ''}</div></div>
        <button data-act="dec-item" data-id="${esc(l.id)}" class="grid h-8 w-8 place-items-center rounded-lg bg-slate-700 hover:bg-slate-600">${ic('minus', 'h-4 w-4')}</button>
        <span class="w-6 text-center text-sm font-bold">${l.qty}</span>
        <button data-act="inc-item" data-id="${esc(l.id)}" class="grid h-8 w-8 place-items-center rounded-lg bg-slate-700 hover:bg-slate-600">${ic('plus', 'h-4 w-4')}</button>
      </div>`).join('') || '<p class="py-6 text-center text-sm text-slate-500">Tap services to add them</p>'}
    </div>
    <div class="mt-3 space-y-1 border-t border-white/5 pt-3 text-sm">
      <div class="flex justify-between text-slate-400"><span>Subtotal</span><span>${fmt(t.sub)}</span></div>
      ${S.cart.reward ? (t.loyalty > 0 ? `<div class="flex items-center justify-between text-emerald-300">
        <span class="flex items-center gap-1">${ic('gift', 'h-3.5 w-3.5')} Loyalty reward ${esc(rewardLabel(S.cart.reward))}${rwNeeds ? ' (needs approval)' : ''} <button data-act="remove-reward" class="ml-1 text-slate-400 hover:text-white">${ic('x', 'h-3.5 w-3.5')}</button></span><span>− ${fmt(t.loyalty)}</span></div>
        <div class="text-[11px] text-slate-500">${esc(t.rewardLine.name)}: ${fmt(t.rewardLine.price)} → ${fmt(r2(t.rewardLine.price - t.loyalty))}</div>`
        : `<div class="flex items-center justify-between text-amber-300"><span class="flex items-center gap-1">${ic('gift', 'h-3.5 w-3.5')} Add a haircut to use the reward <button data-act="remove-reward" class="ml-1 text-slate-400 hover:text-white">${ic('x', 'h-3.5 w-3.5')}</button></span></div>`) : ''}
      ${disc ? `<div class="flex items-center justify-between ${needsApproval ? 'text-amber-300' : 'text-emerald-300'}">
        <span class="flex items-center gap-1">${ic('tag', 'h-3.5 w-3.5')} Discount ${needsApproval ? '(needs approval)' : '(approved)'} <button data-act="remove-discount" class="ml-1 text-slate-400 hover:text-white">${ic('x', 'h-3.5 w-3.5')}</button></span><span>− ${fmt(t.manual)}</span></div>` : ''}
      <div class="flex items-end justify-between pt-1"><span class="font-semibold">Total</span><span class="text-3xl font-extrabold text-amber-400">${fmt(t.total)}</span></div>
    </div>
    <div class="mt-3 grid grid-cols-2 gap-2">
      <button data-act="discount" class="btn-ghost">${ic('tag', 'h-4 w-4')} Discount</button>
      <button data-act="seat" class="btn-ghost ${S.cart.barberId ? '' : 'opacity-40'}">${ic('chair', 'h-4 w-4')} ${S.cart.loaded ? 'Update chair' : 'Start chair'}</button>
    </div>
    <div class="mt-3 hidden grid-cols-3 gap-2 lg:grid">${payButtons(t, false)}</div>
  </div>`;
  const bar = $('#paybar');
  if (bar) bar.innerHTML = `<div class="mb-2 flex items-center justify-between text-sm">
      <button data-act="scroll-cart" class="text-slate-300">${b ? esc(b.name) : 'No barber'} · ${t.count} item${t.count === 1 ? '' : 's'}</button>
      <span class="text-xl font-extrabold text-amber-400">${fmt(t.total)}</span></div>
    <div class="grid grid-cols-3 gap-2">${payButtons(t, true)}</div>`;
}

/* ---- POS actions ---- */
async function pickBarber(id) {
  const open = openTickets().find((t) => t.barberId === id);
  if (open) {
    if (S.cart.loaded && S.cart.id === open.id) return;
    if (!S.cart.loaded && S.cart.items.length && !(await confirmModal('Discard the current unsaved ticket and open this barber\'s chair?', 'Open chair'))) return;
    loadTicketIntoCart(open);
    toast(`Loaded ${barberById(id) ? barberById(id).name : ''}'s chair`, 'info', 1500);
  } else if (S.cart.loaded) {
    S.cart = newCart(id);
  } else {
    S.cart.barberId = S.cart.barberId === id ? null : id;
  }
  renderBarbers(); renderCustomer(); renderGrid(); renderCart();
}

function changeQty(id, delta) {
  const it = S.cart.items.find((i) => i.id === id);
  if (it) { it.qty += delta; if (it.qty <= 0) S.cart.items = S.cart.items.filter((i) => i !== it); }
  else if (delta > 0) S.cart.items.push({ id, qty: 1 });
  if (S.cart.discount && S.cart.discount.approvalToken) {
    const t = cartTotals();
    if (r2(t.sub - t.loyalty) < S.cart.discount.amount) { S.cart.discount = null; toast('Discount removed — bill is now smaller than the discount.', 'warn'); }
  }
  renderGrid(); renderCart();
  if (S.cart.reward) renderCustomer();
}

function viewForCart(extra) {
  const t = cartTotals();
  const b = barberById(S.cart.barberId);
  return Object.assign({ id: S.cart.id, barberId: S.cart.barberId, barberName: b ? b.name : '', customerId: S.cart.customer ? S.cart.customer.id : '',
    customerName: S.cart.customer ? S.cart.customer.name : '', customerPhone: S.cart.customer ? S.cart.customer.phone : '',
    items: t.lines.map((l) => ({ id: l.id, name: l.name, price: l.price, qty: l.qty, type: l.type })), itemsText: itemsText(t.lines),
    subtotal: t.sub, discount: t.discount, loyaltyDiscount: t.loyalty, rewardId: S.cart.reward && t.loyalty > 0 ? S.cart.reward.id : '', total: t.total, createdAt: S.cart.createdAt || new Date().toISOString() }, extra || {});
}

function seat() {
  if (!S.cart.barberId) return toast('Select a barber first', 'warn');
  const b = barberById(S.cart.barberId);
  const busy = openTickets().find((t) => t.barberId === S.cart.barberId && t.id !== S.cart.id);
  if (busy) return toast(`${b.name} already has an open chair`, 'warn');
  const view = viewForCart({ status: 'OPEN' });
  enqueue('openTicket', { id: S.cart.id, barberId: S.cart.barberId, items: S.cart.items.map((i) => ({ id: i.id, qty: i.qty })), customer: custPayload(), _view: view });
  if (S.cart.customer && S.cart.customer.isNew) markCustomerSaved();
  toast(`${S.cart.loaded ? 'Chair updated' : 'Chair started'} — ${b.name}`, 'success', 1800);
  S.cart = newCart(); S.custQuery = '';
  renderBarbers(); renderCustomer(); renderGrid(); renderCart();
}

function markCustomerSaved() {
  const c = S.cart.customer;
  upsertLocalCustomer({ id: c.id, name: c.name, phone: c.phone, visits: 0, totalSpent: 0, lastVisit: '', lastItems: '', favBarberId: '', notes: '' });
}

function pay(method) {
  const c = S.cart;
  if (!c.barberId) return toast('Select a barber first', 'warn');
  const t = cartTotals();
  if (!t.lines.length) return toast('Add a service or product', 'warn');
  if (c.reward && !(t.loyalty > 0)) return toast('Add a haircut to use the reward, or remove the reward', 'warn');
  const needsApproval = cartNeedsApproval(t);
  const view = viewForCart({ method, status: needsApproval ? 'PENDING' : 'PAID', closedAt: new Date().toISOString(), date: todayStr() });
  enqueue('checkout', {
    id: c.id, barberId: c.barberId, method,
    items: c.items.map((i) => ({ id: i.id, qty: i.qty })),
    customer: custPayload(),
    discount: c.discount && t.manual > 0 ? { amount: t.manual, reason: c.discount.reason || '', approvalToken: c.discount.approvalToken || '' } : null,
    rewardId: c.reward && t.loyalty > 0 ? c.reward.id : '',
    rewardAmount: c.reward && t.loyalty > 0 ? t.loyalty : 0,
    rewardApproval: c.reward && c.reward.approvalToken ? c.reward.approvalToken : '',
    _view: view,
  });
  if (c.customer) {
    if (c.customer.isNew) markCustomerSaved();
    const lc = customerById(c.customer.id);
    if (lc && !needsApproval) {
      lc.visits = num(lc.visits) + 1; lc.totalSpent = num(lc.totalSpent) + t.total; lc.lastVisit = todayStr(); lc.lastItems = view.itemsText; lc.favBarberId = c.barberId;
      const lo = lc.loyalty;
      if (lo) {   // optimistic — the server's numbers replace this on the next sync
        if (c.reward) { lo.available = lo.available.filter((r) => r.id !== c.reward.id); lo.redeemed = num(lo.redeemed) + 1; }
        else if (loyCfg().active && rewardLine(t.lines)) { lo.total++; lo.progress = Math.min(lo.required, lo.progress + 1); lo.remaining = Math.max(0, lo.required - lo.progress); }
      }
      LS.set('boot', S.boot);
    }
    if (c.reward) toast(`🎁 Reward redeemed for ${c.customer.name} — new cycle started`, 'success', 4000);
    else if (lc && lc.loyalty && loyCfg().active && rewardLine(t.lines) && lc.loyalty.progress >= lc.loyalty.required) toast(`🎉 ${lc.name} just unlocked a reward! Send the card on WhatsApp.`, 'success', 6000);
  }
  flash(needsApproval ? 'Sent for approval' : 'Saved', `${fmt(t.total)} · ${METHODS[method].label}`, needsApproval);
  S.cart = newCart(); S.custQuery = '';
  renderBarbers(); renderCustomer(); renderGrid(); renderCart();
  const rc = $('#recent-count'); if (rc) rc.textContent = recentTickets().length;
}

function flash(title, sub, warn) {
  const el = document.createElement('div');
  el.className = 'pointer-events-none fixed inset-0 z-[70] grid place-items-center bg-black/40 animate-fade';
  el.innerHTML = `<div class="flex flex-col items-center rounded-3xl ${warn ? 'bg-amber-500 text-slate-900' : 'bg-emerald-600 text-white'} px-10 py-8 shadow-2xl animate-pop">
    ${ic(warn ? 'clock' : 'check', 'h-14 w-14')}<div class="mt-2 text-2xl font-extrabold">${esc(title)}</div><div class="text-sm font-medium opacity-90">${esc(sub)}</div></div>`;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 950);
}

function openDiscountModal() {
  const t = cartTotals();
  if (!t.lines.length) return toast('Add items first', 'warn');
  const isMgr = S.role === 'MANAGER';
  modal(`<h3 class="mb-1 text-lg font-bold">Discount</h3><p class="mb-4 text-sm text-slate-400">Bill: ${fmt(t.sub)}</p>
    <div class="mb-2 flex gap-2">
      <input id="disc-val" type="number" inputmode="decimal" min="0" class="inp flex-1 text-lg" placeholder="Amount" autofocus>
      <select id="disc-type" class="inp w-28"><option value="amt">${esc(cur())}</option><option value="pct">%</option></select>
    </div>
    <div class="mb-4 flex flex-wrap gap-2">${['10%', '20%', '50', '100'].map((v) => `<button data-act="disc-quick" data-v="${v}" class="chip">${v}</button>`).join('')}</div>
    <input id="disc-reason" class="inp mb-2" placeholder="Reason" maxlength="120">
    <div class="mb-4 flex flex-wrap gap-2">${['Regular customer', 'Friends & family', 'Promo', 'Complaint'].map((v) => `<button data-act="disc-reason" data-v="${v}" class="chip">${v}</button>`).join('')}</div>
    ${isMgr ? '' : `<label class="mb-1 block text-sm font-medium text-slate-300">Manager PIN <span class="font-normal text-slate-500">(approve now)</span></label>
      <input id="disc-pin" type="password" inputmode="numeric" autocomplete="off" class="inp mb-1" placeholder="••••••">
      <p class="mb-4 text-xs text-slate-500">Leave empty to send the request to the manager's dashboard. The sale will be held until approved.</p>`}
    <p id="disc-err" class="mb-2 min-h-5 text-sm text-red-400"></p>
    <div class="grid grid-cols-2 gap-2"><button data-act="close-modal" class="btn-ghost">Cancel</button><button data-act="apply-discount" data-primary class="btn-primary">Apply</button></div>`);
}

async function applyDiscount(btn) {
  const t = cartTotals();
  const v = num($('#disc-val').value);
  const amount = r2($('#disc-type').value === 'pct' ? (t.sub * v) / 100 : v);
  const reason = $('#disc-reason').value.trim();
  const err = $('#disc-err');
  if (!(amount > 0)) { err.textContent = 'Enter a discount amount.'; return; }
  if (amount > t.sub) { err.textContent = 'Discount is bigger than the bill.'; return; }
  const pinEl = $('#disc-pin');
  const pin = pinEl ? pinEl.value.trim() : '';
  let approvalToken = '';
  if (pin) {
    btn.disabled = true; btn.textContent = 'Checking…';
    try { approvalToken = (await api('managerApprove', { pin, purpose: 'DISCOUNT', amount })).approvalToken; }
    catch (e) { err.textContent = e.code === 'NETWORK' ? 'Offline — leave PIN empty to send for approval.' : e.message; btn.disabled = false; btn.textContent = 'Apply'; return; }
  }
  S.cart.discount = { amount, reason, approvalToken };
  closeModal(); renderCart();
  toast(S.role === 'MANAGER' || approvalToken ? 'Discount approved' : 'Discount will be sent for approval', approvalToken || S.role === 'MANAGER' ? 'success' : 'warn');
}

function openTodayModal() {
  const list = recentTickets();
  const sum = list.filter((t) => t.status === 'PAID').reduce((a, t) => a + num(t.total), 0);
  modal(`<div class="mb-4 flex items-center justify-between"><h3 class="text-lg font-bold">Today's tickets</h3><button data-act="close-modal" class="rounded-lg p-1 text-slate-400 hover:bg-slate-700">${ic('x')}</button></div>
    ${S.role === 'MANAGER' ? `<p class="mb-3 text-sm text-slate-400">Paid total: <b class="text-amber-400">${fmt(sum)}</b></p>` : ''}
    <div class="space-y-2">${list.map((t) => `<div class="rounded-2xl bg-slate-900/50 p-3">
      <div class="flex items-center gap-2 text-sm"><span class="text-slate-400">${fmtTime(t.closedAt)}</span><span class="font-semibold">${esc(t.barberName)}</span>
        <span class="ml-auto rounded-full px-2 py-0.5 text-[10px] font-bold ${STATUS_BADGE[t.queued ? 'QUEUED' : t.status] || ''}">${t.queued ? 'QUEUED' : t.status}</span></div>
      <div class="mt-1 text-sm text-slate-300">${esc(t.itemsText)}${t.customerName ? ' · ' + esc(t.customerName) : ''}</div>
      <div class="mt-1 flex items-center gap-2 text-sm"><span class="${(METHODS[t.method] || {}).text || ''}">${esc((METHODS[t.method] || {}).label || '')}</span><b class="ml-auto">${fmt(t.total)}</b>
        ${!t.queued && (t.status === 'PAID' || t.status === 'PENDING') ? `<button data-act="void-ticket" data-id="${esc(t.id)}" class="rounded-lg bg-red-500/15 px-2 py-1 text-xs font-medium text-red-300 hover:bg-red-500/25">Cancel</button>` : ''}</div>
    </div>`).join('') || '<p class="py-8 text-center text-slate-500">No tickets yet today.</p>'}</div>`, { wide: true });
}

function openVoidModal(id) {
  const t = findTicket(id) || ((S.dash.data && S.dash.data.log) || []).find((x) => x.id === id);
  if (!t) return;
  const isMgr = S.role === 'MANAGER';
  modal(`<h3 class="mb-1 text-lg font-bold">Cancel invoice</h3>
    <p class="mb-4 text-sm text-slate-400">${esc(t.barberName)} · ${esc(t.itemsText)} · <b class="text-slate-200">${fmt(t.total)}</b></p>
    <input id="void-reason" class="inp mb-3" placeholder="Reason (required)" maxlength="200" autofocus>
    ${isMgr ? '' : `<input id="void-pin" type="password" inputmode="numeric" class="inp mb-1" placeholder="Manager PIN (optional — cancels now)">
    <p class="mb-3 text-xs text-slate-500">Without a PIN, the request goes to the manager for approval.</p>`}
    <p id="void-err" class="mb-2 min-h-5 text-sm text-red-400"></p>
    <div class="grid grid-cols-2 gap-2"><button data-act="close-modal" class="btn-ghost">Back</button>
    <button data-act="confirm-void" data-id="${esc(id)}" data-primary class="btn-danger">${isMgr ? 'Cancel invoice' : 'Request cancel'}</button></div>`);
}

async function confirmVoid(btn) {
  const reason = $('#void-reason').value.trim();
  const pinEl = $('#void-pin');
  const err = $('#void-err');
  if (!reason) { err.textContent = 'Please write a reason.'; return; }
  btn.disabled = true;
  try {
    const r = await api('requestVoid', { ticketId: btn.dataset.id, reason, managerPin: pinEl ? pinEl.value.trim() : '' });
    closeModal();
    toast(r.status === 'VOID' ? 'Invoice cancelled' : r.status === 'ALREADY_PENDING' ? 'Already waiting for approval' : 'Cancellation sent to manager', r.status === 'VOID' ? 'success' : 'info');
    syncNow();
    if (S.role === 'MANAGER') loadDash(true);
  } catch (e) { err.textContent = e.message; btn.disabled = false; }
}

function openNotesModal() {
  const c = customerById(S.cart.customer.id) || S.cart.customer;
  modal(`<h3 class="mb-1 text-lg font-bold">${esc(c.name)}</h3><p class="mb-4 text-sm text-slate-400">Preferences & notes (style, clipper number, allergies…)</p>
    <input id="cn-name" class="inp mb-2" value="${esc(c.name)}" placeholder="Name">
    <input id="cn-phone" class="inp mb-2" value="${esc(c.phone)}" placeholder="Phone" inputmode="tel">
    <textarea id="cn-notes" rows="3" class="inp mb-4" maxlength="300" placeholder="e.g. Skin fade #1, no line-up">${esc(c.notes || '')}</textarea>
    <div class="grid grid-cols-2 gap-2"><button data-act="close-modal" class="btn-ghost">Cancel</button><button data-act="save-notes" data-primary class="btn-primary">Save</button></div>`);
}

/* ============================ DASHBOARD ============================ */
async function loadDash(silent) {
  if (S.role !== 'MANAGER') return;
  const [from, to] = rangeFor(S.dash.range);
  S.dash.loading = true; S.dash.error = '';
  if (!silent) rerenderMgr();
  try {
    S.dash.data = await api('dashboard', { from, to });
    S.online = true;
  } catch (e) { S.dash.error = e.message; if (e.code === 'NETWORK') S.online = false; }
  S.dash.loading = false;
  updateStatus(); updateNav();
  const active = document.activeElement;
  if (silent && active && $('#view') && $('#view').contains(active) && /INPUT|SELECT|TEXTAREA/.test(active.tagName)) return;
  rerenderMgr();
}
function rerenderMgr() { if (MGR_DATA_VIEWS.includes(S.view)) renderView(); }
const rangeIncludesToday = () => { const [, to] = rangeFor(S.dash.range); return to >= todayStr(); };

function rangeBar(title) {
  const chips = [['today', 'Today'], ['yesterday', 'Yesterday'], ['week', '7 days'], ['month', 'This month'], ['lastmonth', 'Last month'], ['custom', 'Custom']];
  const [from, to] = rangeFor(S.dash.range);
  const upd = S.dash.data && S.dash.data.serverTime ? fmtTime(S.dash.data.serverTime) : '—';
  return `<div class="mb-4 flex flex-wrap items-center gap-2">
    <h1 class="mr-auto text-2xl font-extrabold tracking-tight">${title}</h1>
    <div class="no-scrollbar -mx-3 flex w-[calc(100%+1.5rem)] gap-1.5 overflow-x-auto px-3 sm:mx-0 sm:w-auto sm:px-0">${chips.map(([k, l]) => `<button data-act="range" data-r="${k}" class="whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold ${S.dash.range === k ? 'bg-amber-500 text-slate-900' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}">${l}</button>`).join('')}</div>
    <button data-act="reload-dash" class="flex items-center gap-1 rounded-full bg-slate-800 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-700">${ic('refresh', `h-3.5 w-3.5 ${S.dash.loading ? 'animate-spin' : ''}`)} ${upd}</button>
  </div>
  ${S.dash.range === 'custom' ? `<div class="mb-4 flex flex-wrap items-center gap-2 text-sm"><input type="date" id="r-from" value="${from}" class="inp w-auto"> → <input type="date" id="r-to" value="${to}" class="inp w-auto"><button data-act="apply-custom" class="btn-primary">Apply</button></div>` : ''}
  ${S.dash.error ? `<div class="mb-4 rounded-2xl bg-red-500/10 p-3 text-sm text-red-300 ring-1 ring-red-500/30">${esc(S.dash.error)}</div>` : ''}
  <p class="-mt-2 mb-4 text-xs text-slate-500">${from === to ? fmtDay(from) : `${fmtDay(from)} → ${fmtDay(to)}`}</p>`;
}

const kpi = (label, value, sub, accent) => `<div class="rounded-2xl bg-slate-800/80 p-4 ring-1 ring-white/5">
  <div class="text-xs font-medium uppercase tracking-wider text-slate-400">${label}</div>
  <div class="mt-1 text-2xl font-extrabold tracking-tight ${accent || ''}">${value}</div>${sub ? `<div class="mt-0.5 text-xs text-slate-500">${sub}</div>` : ''}</div>`;

function skeleton() { return `<div class="grid grid-cols-2 gap-3 md:grid-cols-4">${'<div class="h-24 animate-pulse rounded-2xl bg-slate-800/60"></div>'.repeat(8)}</div>`; }

function renderDashboard() {
  const d = S.dash.data;
  const s = d && d.summary;
  $('#view').innerHTML = `<div class="mx-auto max-w-7xl p-3 pb-24 lg:p-5">${rangeBar('Dashboard')}
  ${!s ? skeleton() : `
    <div class="grid grid-cols-2 gap-3 md:grid-cols-4">
      ${kpi('Total revenue', fmt(s.revenue), `${s.tickets} tickets · avg ${fmt(s.avgTicket)}`, 'text-amber-400')}
      ${kpi('Net profit', fmt(s.netProfit), 'Revenue − (Commissions + Expenses)', s.netProfit >= 0 ? 'text-emerald-400' : 'text-red-400')}
      ${kpi('Commissions', fmt(s.commission), `Shop cut ${fmt(s.shopCut)}`)}
      ${kpi('Expenses', fmt(s.expenses), `Variable ${money(s.expensesVariable)} · Fixed ${money(s.expensesFixed)}`)}
      ${Object.entries(METHODS).map(([k, m]) => kpi(`<span class="inline-flex items-center gap-1.5"><span class="h-2 w-2 rounded-full ${m.dot}"></span>${m.label}</span>`, fmt(s.byMethod[k]), s.revenue ? Math.round((s.byMethod[k] / s.revenue) * 100) + '% of revenue' : '')).join('')}
      ${kpi('Services / Products', `${money(s.services)} <span class="text-base text-slate-500">/</span> ${money(s.products)}`, `Discounts ${fmt(s.discounts)}${s.loyaltyDiscounts ? ` · Loyalty ${fmt(s.loyaltyDiscounts)}` : ''}${s.voidCount ? ` · ${s.voidCount} voided` : ''}`)}
    </div>
    <section class="mt-6">
      <h2 class="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-widest text-slate-400"><span class="h-2 w-2 animate-pulse rounded-full bg-emerald-400"></span> Live chairs</h2>
      <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">${liveChairs(d.open)}</div>
    </section>
    ${d.approvals.length ? `<section class="mt-6"><h2 class="mb-3 text-sm font-semibold uppercase tracking-widest text-amber-400">Pending approvals · ${d.approvals.length}</h2><div class="grid gap-3 md:grid-cols-2">${d.approvals.map(approvalCard).join('')}</div></section>` : ''}
    <section class="mt-6">
      <div class="mb-3 flex items-center justify-between"><h2 class="text-sm font-semibold uppercase tracking-widest text-slate-400">Who cut what</h2><a href="#/log" class="text-xs font-semibold text-amber-400">Full log →</a></div>
      ${logTable(d.log.slice(0, 12), false)}
    </section>`}
  </div>`;
}

function liveChairs(open) {
  return barbers().map((b) => {
    const t = (open || []).find((x) => x.barberId === b.id);
    return `<div class="flex items-center gap-3 rounded-2xl p-4 ring-1 ${t ? 'bg-emerald-500/10 ring-emerald-500/30' : 'bg-slate-800/60 ring-white/5'}">
      ${avatar(b, 'h-12 w-12 text-base')}
      <div class="min-w-0 flex-1"><div class="font-semibold">${esc(b.name)}</div>
        ${t ? `<div class="truncate text-sm text-slate-300">${esc(t.customerName || 'Walk-in')} · ${esc(t.itemsText || 'No service yet')}</div>
               <div class="text-xs text-emerald-400">${ic('clock', 'inline h-3 w-3')} ${minsSince(t.createdAt)} min</div>` : '<div class="text-sm text-slate-500">Free</div>'}
      </div>
      ${t ? `<div class="text-right text-lg font-extrabold text-amber-400">${fmt(t.total)}</div>` : ''}
    </div>`;
  }).join('') || '<p class="text-sm text-slate-500">No active barbers.</p>';
}

function approvalCard(a) {
  const t = a.ticket;
  return `<div class="rounded-2xl bg-amber-500/5 p-4 ring-1 ring-amber-500/30">
    <div class="mb-2 flex items-center gap-2"><span class="rounded-full ${a.type === 'VOID' ? 'bg-red-500/20 text-red-300' : 'bg-amber-500/20 text-amber-300'} px-2 py-0.5 text-[10px] font-bold">${a.type === 'VOID' ? 'CANCEL INVOICE' : 'DISCOUNT'}</span>
      <span class="text-xs text-slate-400">${fmtTime(a.ts)} · by ${esc(a.requestedBy.toLowerCase())}</span></div>
    ${t ? `<div class="text-sm"><b>${esc(t.barberName)}</b>${t.customerName ? ' · ' + esc(t.customerName) : ''} · ${esc(t.itemsText)}</div>
    <div class="mt-1 text-sm text-slate-300">${a.type === 'DISCOUNT' ? `Bill ${fmt(t.subtotal)} → <b class="text-amber-300">−${fmt(a.amount)}</b> = <b>${fmt(t.total)}</b> · ${esc((METHODS[t.method] || {}).label || '')}` : `Refund/cancel <b class="text-red-300">${fmt(t.total)}</b> (${esc((METHODS[t.method] || {}).label || '')})`}</div>` : '<div class="text-sm text-slate-400">Ticket not found</div>'}
    ${a.reason ? `<div class="mt-1 text-xs text-slate-400">Reason: ${esc(a.reason)}</div>` : ''}
    <div class="mt-3 grid grid-cols-2 gap-2"><button data-act="decide" data-id="${esc(a.id)}" data-d="REJECT" class="btn-ghost">Reject</button><button data-act="decide" data-id="${esc(a.id)}" data-d="APPROVE" class="btn-primary">Approve</button></div>
  </div>`;
}

function logTable(rows, withActions) {
  const multiDay = S.dash.data && S.dash.data.from !== S.dash.data.to;
  if (!rows.length) return '<div class="rounded-2xl bg-slate-800/50 p-8 text-center text-sm text-slate-500">No transactions in this period.</div>';
  return `<div class="overflow-x-auto rounded-2xl ring-1 ring-white/5"><table class="w-full min-w-[760px] text-left text-sm">
    <thead class="bg-slate-800 text-xs uppercase tracking-wider text-slate-400"><tr>
      <th class="px-3 py-3">Time</th><th class="px-3 py-3">Barber</th><th class="px-3 py-3">Service / Product</th><th class="px-3 py-3">Payment</th>
      <th class="px-3 py-3 text-right">Total</th><th class="px-3 py-3 text-right">Commission</th><th class="px-3 py-3">Status</th>${withActions ? '<th class="px-3 py-3"></th>' : ''}</tr></thead>
    <tbody class="divide-y divide-white/5 bg-slate-800/40">${rows.map((t) => `<tr class="${t.status === 'VOID' ? 'opacity-50' : ''}">
      <td class="whitespace-nowrap px-3 py-2.5 text-slate-400">${multiDay ? esc(fmtDay(t.date)) + ' ' : ''}${fmtTime(t.closedAt)}</td>
      <td class="whitespace-nowrap px-3 py-2.5 font-medium">${esc(t.barberName)}</td>
      <td class="px-3 py-2.5"><div>${esc(t.itemsText)}</div>${t.customerName ? `<div class="text-xs text-slate-500">${esc(t.customerName)}</div>` : ''}${t.discount ? `<div class="text-xs text-amber-300">−${fmt(t.discount)} discount${t.loyaltyDiscount ? ` (🎁 ${fmt(t.loyaltyDiscount)} reward)` : ''}</div>` : ''}</td>
      <td class="whitespace-nowrap px-3 py-2.5"><span class="inline-flex items-center gap-1.5"><span class="h-2 w-2 rounded-full ${(METHODS[t.method] || {}).dot || 'bg-slate-500'}"></span>${esc((METHODS[t.method] || {}).label || '—')}</span></td>
      <td class="whitespace-nowrap px-3 py-2.5 text-right font-semibold">${fmt(t.total)}</td>
      <td class="whitespace-nowrap px-3 py-2.5 text-right text-amber-300">${fmt(t.commission)}</td>
      <td class="px-3 py-2.5"><span class="rounded-full px-2 py-0.5 text-[10px] font-bold ${STATUS_BADGE[t.status] || ''}">${esc(t.status)}</span></td>
      ${withActions ? `<td class="px-3 py-2.5 text-right">${t.status !== 'VOID' ? `<button data-act="void-ticket" data-id="${esc(t.id)}" class="rounded-lg p-1.5 text-slate-400 hover:bg-red-500/20 hover:text-red-300" title="Cancel invoice">${ic('trash', 'h-4 w-4')}</button>` : ''}</td>` : ''}
    </tr>`).join('')}</tbody></table></div>`;
}

/* ------------------------------- LOG ------------------------------- */
function filteredLog() {
  const f = S.logFilter;
  const q = normName(f.q);
  return ((S.dash.data && S.dash.data.log) || []).filter((t) => (!f.barber || t.barberId === f.barber) && (!f.method || t.method === f.method) && (!f.status || t.status === f.status)
    && (!q || normName(`${t.itemsText} ${t.customerName} ${t.customerPhone} ${t.barberName}`).includes(q)));
}
function renderLog() {
  const d = S.dash.data;
  const f = S.logFilter;
  const opt = (v, l, cur) => `<option value="${esc(v)}" ${cur === v ? 'selected' : ''}>${esc(l)}</option>`;
  $('#view').innerHTML = `<div class="mx-auto max-w-7xl p-3 pb-24 lg:p-5">${rangeBar('Who cut what')}
    <div class="mb-3 grid grid-cols-2 gap-2 md:grid-cols-[1fr_auto_auto_auto_auto]">
      <input id="log-q" class="inp col-span-2 md:col-span-1" placeholder="Search service, customer, phone…" value="${esc(f.q)}">
      <select id="log-barber" class="inp">${opt('', 'All barbers', f.barber)}${((S.boot && S.boot.barbers) || []).map((b) => opt(b.id, b.name, f.barber)).join('')}</select>
      <select id="log-method" class="inp">${opt('', 'All payments', f.method)}${Object.entries(METHODS).map(([k, m]) => opt(k, m.label, f.method)).join('')}</select>
      <select id="log-status" class="inp">${opt('', 'All statuses', f.status)}${['PAID', 'PENDING', 'VOID'].map((s) => opt(s, s, f.status)).join('')}</select>
      <button data-act="export-log" class="btn-ghost">${ic('download', 'h-4 w-4')} CSV</button>
    </div>
    <div id="log-table">${d ? logBody() : skeleton()}</div></div>`;
}
function logBody() {
  const rows = filteredLog();
  const paid = rows.filter((t) => t.status === 'PAID');
  const tot = paid.reduce((a, t) => a + t.total, 0), com = paid.reduce((a, t) => a + t.commission, 0);
  return `<div class="mb-2 flex flex-wrap gap-x-4 text-sm text-slate-400"><span>${rows.length} rows</span><span>Paid: <b class="text-slate-100">${fmt(tot)}</b></span><span>Commission: <b class="text-amber-300">${fmt(com)}</b></span></div>${logTable(rows, true)}`;
}

/* ----------------------------- PAYROLL ----------------------------- */
function renderPayroll() {
  const d = S.dash.data;
  const rows = (d && d.payroll) || [];
  const T = rows.reduce((a, p) => ({ tickets: a.tickets + p.tickets, services: a.services + p.services, products: a.products + p.products, sales: a.sales + p.sales, commission: a.commission + p.commission, shopCut: a.shopCut + p.shopCut }), { tickets: 0, services: 0, products: 0, sales: 0, commission: 0, shopCut: 0 });
  const max = Math.max(1, ...rows.map((p) => p.sales));
  $('#view').innerHTML = `<div class="mx-auto max-w-7xl p-3 pb-24 lg:p-5">${rangeBar('Payroll')}
  ${!d ? skeleton() : `
    <div class="mb-4 grid grid-cols-3 gap-3">${kpi('Total sales', fmt(T.sales), `${T.tickets} tickets`, 'text-amber-400')}${kpi('Barbers earned', fmt(T.commission))}${kpi('Shop net cut', fmt(T.shopCut), 'before expenses', 'text-emerald-400')}</div>
    <div class="mb-2 flex flex-wrap justify-end gap-2"><button data-act="reset-barber" data-id="ALL" class="btn-ghost text-red-300">${ic('refresh', 'h-4 w-4')} Reset all barbers</button><button data-act="export-payroll" class="btn-ghost">${ic('download', 'h-4 w-4')} Export CSV</button></div>
    <div class="overflow-x-auto rounded-2xl ring-1 ring-white/5"><table class="w-full min-w-[720px] text-left text-sm">
      <thead class="bg-slate-800 text-xs uppercase tracking-wider text-slate-400"><tr><th class="px-3 py-3">Barber</th><th class="px-3 py-3 text-right">Tickets</th><th class="px-3 py-3 text-right">Services</th><th class="px-3 py-3 text-right">Products</th><th class="px-3 py-3 text-right">Total sales</th><th class="px-3 py-3 text-right">Commission</th><th class="px-3 py-3 text-right">Shop cut</th><th class="px-3 py-3"></th></tr></thead>
      <tbody class="divide-y divide-white/5 bg-slate-800/40">${rows.map((p) => `<tr>
        <td class="px-3 py-3"><div class="flex items-center gap-2">${avatar(barberById(p.barberId) || p, 'h-8 w-8 text-xs')}<div class="min-w-0"><div class="font-medium">${esc(p.name)}</div>${p.resetAt ? `<div class="text-[11px] text-slate-500">Reset ${esc(dfDay.format(new Date(p.resetAt)))} ${esc(fmtTime(p.resetAt))}</div>` : ''}<div class="mt-1 h-1.5 w-28 rounded-full bg-slate-700"><div class="h-1.5 rounded-full bg-amber-500" style="width:${Math.round((p.sales / max) * 100)}%"></div></div></div></div></td>
        <td class="px-3 py-3 text-right">${p.tickets}</td><td class="px-3 py-3 text-right">${fmt(p.services)}</td><td class="px-3 py-3 text-right">${fmt(p.products)}</td>
        <td class="px-3 py-3 text-right font-semibold">${fmt(p.sales)}</td><td class="px-3 py-3 text-right font-bold text-amber-400">${fmt(p.commission)}</td><td class="px-3 py-3 text-right text-emerald-400">${fmt(p.shopCut)}</td><td class="px-3 py-3 text-right"><button data-act="reset-barber" data-id="${esc(p.barberId)}" class="rounded-lg px-2 py-1 text-xs font-semibold text-red-300 hover:bg-red-500/20">Reset to zero</button></td></tr>`).join('')}
      </tbody>
      <tfoot class="bg-slate-800 font-bold"><tr><td class="px-3 py-3">Total</td><td class="px-3 py-3 text-right">${T.tickets}</td><td class="px-3 py-3 text-right">${fmt(T.services)}</td><td class="px-3 py-3 text-right">${fmt(T.products)}</td><td class="px-3 py-3 text-right">${fmt(T.sales)}</td><td class="px-3 py-3 text-right text-amber-400">${fmt(T.commission)}</td><td class="px-3 py-3 text-right text-emerald-400">${fmt(T.shopCut)}</td><td></td></tr></tfoot>
    </table></div>
    <p class="mt-3 text-xs text-slate-500">Commission is locked at sale time using the barber's rate then (default ${num(S.boot.settings.svcPct)}% services · ${num(S.boot.settings.prodPct)}% products). Discounts reduce commission proportionally; voided invoices are excluded.</p>
    <p class="mt-1 text-xs text-slate-500">Reset = the barber starts from zero in Log & Payroll (e.g. after paying him). Nothing is deleted: every invoice stays in the Google Sheet, and shop revenue & profit don't change.</p>
    ${(d.settlements || []).length ? `<h2 class="mb-2 mt-6 text-sm font-semibold uppercase tracking-widest text-slate-400">Reset history</h2>
    <div class="divide-y divide-white/5 overflow-hidden rounded-2xl bg-slate-800/50 ring-1 ring-white/5">${d.settlements.map((x) => `<div class="flex items-center gap-3 px-4 py-2.5 text-sm">
      <div class="min-w-0 flex-1"><div class="font-medium">${esc(x.barberName)}</div><div class="text-xs text-slate-500">${esc(dfDay.format(new Date(x.ts)))} ${esc(fmtTime(x.ts))} · ${x.tickets} tickets · ${fmt(x.sales)}</div></div>
      <b class="text-amber-400">${fmt(x.commission)}</b></div>`).join('')}</div>` : ''}`}
  </div>`;
}

/* ---------------------------- APPROVALS ---------------------------- */
function renderApprovals() {
  const d = S.dash.data;
  $('#view').innerHTML = `<div class="mx-auto max-w-4xl p-3 pb-24 lg:p-5">
    <div class="mb-4 flex items-center"><h1 class="mr-auto text-2xl font-extrabold tracking-tight">Approvals</h1><button data-act="reload-dash" class="btn-ghost">${ic('refresh', 'h-4 w-4')} Refresh</button></div>
    ${!d ? skeleton() : d.approvals.length ? `<div class="grid gap-3 md:grid-cols-2">${d.approvals.map(approvalCard).join('')}</div>` : `<div class="rounded-2xl bg-slate-800/50 p-10 text-center text-slate-400">${ic('shield', 'mx-auto mb-2 h-8 w-8 text-emerald-400')}Nothing waiting for you.</div>`}
  </div>`;
}

/* ----------------------------- EXPENSES ----------------------------- */
function renderExpenses() {
  const isMgr = S.role === 'MANAGER';
  const st = S.boot.settings;
  const queued = S.outbox.filter((o) => o.action === 'addExpense').map((o) => ({ ...o.data, ts: new Date(o.at).toISOString(), queued: true }));
  const list = [...queued, ...(isMgr ? ((S.dash.data && S.dash.data.expenses) || []) : ((S.live && S.live.expensesToday) || []))];
  const total = list.reduce((a, e) => a + num(e.amount), 0);
  $('#view').innerHTML = `<div class="mx-auto max-w-5xl p-3 pb-24 lg:p-5">
    ${isMgr ? rangeBar('Expenses') : '<h1 class="mb-4 text-2xl font-extrabold tracking-tight">Quick expenses</h1>'}
    <div class="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3">${st.quickExpenses.map((c) => `<button data-act="quick-exp" data-c="${esc(c)}" class="flex h-24 flex-col items-start justify-between rounded-2xl bg-slate-800 p-4 text-left transition hover:bg-slate-700 active:scale-95">
      <span class="text-amber-400">${ic('plus', 'h-5 w-5')}</span><span class="font-semibold">${esc(c)}</span></button>`).join('')}</div>
    ${isMgr ? `<div class="mb-6 rounded-3xl bg-slate-800/80 p-4 ring-1 ring-white/5">
      <h2 class="mb-3 font-bold">Fixed / other expense</h2>
      <div class="grid gap-2 sm:grid-cols-[1fr_1fr_1fr_2fr_auto]">
        <select id="fx-cat" class="inp">${st.fixedCategories.map((c) => `<option>${esc(c)}</option>`).join('')}</select>
        <input id="fx-amt" type="number" inputmode="decimal" class="inp" placeholder="Amount">
        <input id="fx-date" type="date" class="inp" value="${todayStr()}">
        <input id="fx-note" class="inp" placeholder="Note (optional)">
        <button data-act="save-fixed" class="btn-primary">Save</button>
      </div></div>` : ''}
    <div class="mb-2 flex items-center justify-between"><h2 class="text-sm font-semibold uppercase tracking-widest text-slate-400">${isMgr ? 'Expenses in period' : 'Today'}</h2><span class="text-sm">Total <b class="text-red-300">${fmt(total)}</b></span></div>
    <div class="divide-y divide-white/5 overflow-hidden rounded-2xl bg-slate-800/50 ring-1 ring-white/5">
      ${list.map((e) => `<div class="flex items-center gap-3 px-4 py-3">
        <span class="rounded-full ${e.kind === 'FIXED' ? 'bg-sky-500/15 text-sky-300' : 'bg-slate-600/40 text-slate-300'} px-2 py-0.5 text-[10px] font-bold">${e.kind === 'FIXED' ? 'FIXED' : 'DAILY'}</span>
        <div class="min-w-0 flex-1"><div class="font-medium">${esc(e.category)}${e.queued ? ' <span class="text-xs text-amber-400">(queued)</span>' : ''}</div><div class="truncate text-xs text-slate-500">${esc(e.date ? fmtDay(e.date) : '')} ${fmtTime(e.ts)}${e.note ? ' · ' + esc(e.note) : ''}</div></div>
        <b class="text-red-300">${fmt(e.amount)}</b>
        ${isMgr && !e.queued ? `<button data-act="del-exp" data-id="${esc(e.id)}" class="rounded-lg p-1.5 text-slate-500 hover:bg-red-500/20 hover:text-red-300">${ic('trash', 'h-4 w-4')}</button>` : ''}
      </div>`).join('') || '<p class="p-8 text-center text-sm text-slate-500">No expenses yet.</p>'}
    </div></div>`;
}

function openQuickExpense(cat) {
  modal(`<h3 class="mb-4 text-lg font-bold">${esc(cat)}</h3>
    <input id="qe-amt" type="number" inputmode="decimal" class="inp mb-2 h-14 text-2xl font-bold" placeholder="Amount (${esc(cur())})" autofocus>
    <input id="qe-note" class="inp mb-4" placeholder="Note (optional)" maxlength="200">
    <div class="grid grid-cols-2 gap-2"><button data-act="close-modal" class="btn-ghost">Cancel</button><button data-act="save-quick-exp" data-c="${esc(cat)}" data-primary class="btn-primary">Save</button></div>`);
}

/* ----------------------------- SETTINGS ----------------------------- */
function renderSettings() {
  const st = S.boot.settings;
  const bs = S.boot.barbers || [];
  const cat = S.boot.catalog || [];
  const itemRow = (i) => `<div class="flex items-center gap-3 px-4 py-3 ${i.active ? '' : 'opacity-50'}"><div class="flex-1"><div class="font-medium">${esc(i.name)}</div><div class="text-xs text-slate-500">${i.type === 'PRODUCT' ? 'Product' : 'Service'}${i.active ? '' : ' · hidden'}</div></div><b class="text-amber-400">${fmt(i.price)}</b><button data-act="edit-item" data-id="${esc(i.id)}" class="rounded-lg p-2 text-slate-400 hover:bg-slate-700">${ic('edit', 'h-4 w-4')}</button></div>`;
  $('#view').innerHTML = `<div class="mx-auto max-w-5xl space-y-6 p-3 pb-24 lg:p-5">
    <h1 class="text-2xl font-extrabold tracking-tight">Settings</h1>
    <section class="card"><h2 class="mb-1 font-bold">Commission rules</h2><p class="mb-3 text-sm text-slate-400">Default barber cut per sale. Override per barber below.</p>
      <div class="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
        <label class="text-sm text-slate-300">Services %<input id="st-svc" type="number" min="0" max="100" class="inp mt-1" value="${num(st.svcPct)}"></label>
        <label class="text-sm text-slate-300">Products %<input id="st-prod" type="number" min="0" max="100" class="inp mt-1" value="${num(st.prodPct)}"></label>
        <button data-act="save-settings" class="btn-primary self-end">Save</button></div></section>
    <section class="card"><div class="mb-3 flex items-center"><h2 class="mr-auto font-bold">Barbers</h2><button data-act="edit-barber" data-id="" class="btn-ghost">${ic('plus', 'h-4 w-4')} Add</button></div>
      <div class="divide-y divide-white/5 overflow-hidden rounded-2xl bg-slate-900/40">${bs.map((b) => `<div class="flex items-center gap-3 px-4 py-3 ${b.active ? '' : 'opacity-50'}">${avatar(b, 'h-10 w-10 text-sm')}
        <div class="flex-1"><div class="font-medium">${esc(b.name)}</div><div class="text-xs text-slate-500">Services ${b.svcPct === '' ? `${num(st.svcPct)}% (default)` : b.svcPct + '%'} · Products ${b.prodPct === '' ? `${num(st.prodPct)}% (default)` : b.prodPct + '%'}${b.active ? '' : ' · inactive'}</div></div>
        <button data-act="edit-barber" data-id="${esc(b.id)}" class="rounded-lg p-2 text-slate-400 hover:bg-slate-700">${ic('edit', 'h-4 w-4')}</button></div>`).join('')}</div></section>
    <section class="card"><div class="mb-3 flex items-center"><h2 class="mr-auto font-bold">Services & products (price list)</h2><button data-act="edit-item" data-id="" class="btn-ghost">${ic('plus', 'h-4 w-4')} Add</button></div>
      <div class="divide-y divide-white/5 overflow-hidden rounded-2xl bg-slate-900/40">${cat.filter((i) => i.type === 'SERVICE').map(itemRow).join('')}${cat.filter((i) => i.type === 'PRODUCT').map(itemRow).join('')}</div></section>
    <section class="card"><h2 class="mb-3 font-bold">Shop</h2>
      <div class="grid gap-3 sm:grid-cols-2">
        <label class="text-sm text-slate-300">Shop name<input id="st-name" class="inp mt-1" value="${esc(st.shopName)}"></label>
        <label class="text-sm text-slate-300">Currency<input id="st-cur" class="inp mt-1" value="${esc(st.currency)}"></label>
        <label class="text-sm text-slate-300 sm:col-span-2">Quick expense buttons (comma separated)<input id="st-quick" class="inp mt-1" value="${esc(st.quickExpenses.join(', '))}"></label>
        <label class="text-sm text-slate-300 sm:col-span-2">Fixed expense categories<input id="st-fixed" class="inp mt-1" value="${esc(st.fixedCategories.join(', '))}"></label>
      </div><button data-act="save-settings" class="btn-primary mt-3">Save</button></section>
    <section class="card"><h2 class="mb-1 font-bold">Security · PINs</h2><p class="mb-3 text-sm text-slate-400">Changing a PIN logs out every device.</p>
      <div class="grid gap-3 sm:grid-cols-4">
        <select id="pin-which" class="inp"><option value="CASHIER">Cashier PIN</option><option value="MANAGER">Manager PIN</option></select>
        <input id="pin-cur" type="password" inputmode="numeric" class="inp" placeholder="Current manager PIN">
        <input id="pin-new" type="password" inputmode="numeric" class="inp" placeholder="New PIN">
        <button data-act="change-pin" class="btn-primary">Change PIN</button></div></section>
    <section class="card"><h2 class="mb-3 font-bold">App</h2>
      <div class="flex flex-wrap gap-2"><button data-act="server-settings" class="btn-ghost">Server URL</button><button data-act="reload-all" class="btn-ghost">${ic('refresh', 'h-4 w-4')} Reload data</button>
      ${S.installPrompt ? `<button data-act="install" class="btn-ghost">${ic('install', 'h-4 w-4')} Install app</button>` : ''}</div>
      <p class="mt-3 break-all text-xs text-slate-500">v${VERSION} · ${esc(S.apiUrl)}</p></section>
  </div>`;
}

function openBarberModal(id) {
  const b = (S.boot.barbers || []).find((x) => x.id === id) || { id: '', name: '', color: '#D97706', photo: '', active: true, svcPct: '', prodPct: '', sort: (S.boot.barbers || []).length + 1 };
  modal(`<h3 class="mb-4 text-lg font-bold">${b.id ? 'Edit barber' : 'Add barber'}</h3>
    <div class="space-y-3">
      <input id="bb-name" class="inp" placeholder="Name" value="${esc(b.name)}" autofocus>
      <div class="flex gap-2"><input id="bb-color" type="color" value="${esc(b.color)}" class="h-11 w-16 cursor-pointer rounded-xl bg-slate-900"><input id="bb-photo" class="inp flex-1" placeholder="Photo URL (https://… optional)" value="${esc(b.photo)}"></div>
      <div class="grid grid-cols-3 gap-2">
        <label class="text-xs text-slate-400">Services %<input id="bb-svc" type="number" class="inp mt-1" placeholder="Default" value="${esc(b.svcPct)}"></label>
        <label class="text-xs text-slate-400">Products %<input id="bb-prod" type="number" class="inp mt-1" placeholder="Default" value="${esc(b.prodPct)}"></label>
        <label class="text-xs text-slate-400">Order<input id="bb-sort" type="number" class="inp mt-1" value="${esc(b.sort)}"></label>
      </div>
      <label class="flex items-center gap-2 text-sm"><input id="bb-active" type="checkbox" class="h-5 w-5 accent-amber-500" ${b.active ? 'checked' : ''}> Active (shown on POS)</label>
    </div>
    <p id="m-err" class="my-2 min-h-5 text-sm text-red-400"></p>
    <div class="grid grid-cols-2 gap-2"><button data-act="close-modal" class="btn-ghost">Cancel</button><button data-act="save-barber" data-id="${esc(b.id)}" data-primary class="btn-primary">Save</button></div>`);
}

function openItemModal(id) {
  const i = (S.boot.catalog || []).find((x) => x.id === id) || { id: '', name: '', type: S.posTab, price: '', active: true, sort: (S.boot.catalog || []).length + 1 };
  modal(`<h3 class="mb-4 text-lg font-bold">${i.id ? 'Edit item' : 'Add item'}</h3>
    <div class="space-y-3">
      <input id="it-name" class="inp" placeholder="Name" value="${esc(i.name)}" autofocus>
      <div class="grid grid-cols-3 gap-2">
        <select id="it-type" class="inp"><option value="SERVICE" ${i.type === 'SERVICE' ? 'selected' : ''}>Service</option><option value="PRODUCT" ${i.type === 'PRODUCT' ? 'selected' : ''}>Product</option></select>
        <input id="it-price" type="number" inputmode="decimal" class="inp" placeholder="Price" value="${esc(i.price)}">
        <input id="it-sort" type="number" class="inp" placeholder="Order" value="${esc(i.sort)}">
      </div>
      <label class="flex items-center gap-2 text-sm"><input id="it-active" type="checkbox" class="h-5 w-5 accent-amber-500" ${i.active ? 'checked' : ''}> Active (shown on POS)</label>
    </div>
    <p id="m-err" class="my-2 min-h-5 text-sm text-red-400"></p>
    <div class="grid grid-cols-2 gap-2"><button data-act="close-modal" class="btn-ghost">Cancel</button><button data-act="save-item" data-id="${esc(i.id)}" data-primary class="btn-primary">Save</button></div>`);
}

/* ============================== LOYALTY ============================== */
const publicUrl = () => new URL('rewards.html', location.href.split('#')[0]).href;
const cardLink = (key) => `${publicUrl()}#k=${encodeURIComponent(key)}`;
const waPhone = (p) => { const d = cleanPhone(p); return d.startsWith('0') ? '20' + d.slice(1) : d; };
function waLink(c) {
  const shop = (S.boot && S.boot.settings && S.boot.settings.shopName) || 'Karamila';
  const lo = c.available && c.available.length;
  const msg = [`${shop} 💈 — كارت المكافآت بتاعك`,
    lo ? '🎁 عندك مكافأة جاهزة في زيارتك الجاية!' : `زياراتك: ${c.progress}/${c.program.required}`,
    `الكود السري: ${c.code}`, `تابع مكافآتك: ${cardLink(c.key)}`, '',
    `Your ${shop} rewards card · code ${c.code}`].join('\n');
  return `https://wa.me/${waPhone(c.phone)}?text=${encodeURIComponent(msg)}`;
}
function qrSvg(text, cls = 'h-44 w-44') {
  if (typeof window.qrcode !== 'function') return `<div class="${cls} grid place-items-center rounded-xl bg-slate-900 text-xs text-slate-500">QR</div>`;
  const q = window.qrcode(0, 'M'); q.addData(text); q.make();
  return `<div class="${cls} overflow-hidden rounded-xl bg-white p-2" data-noi18n>${q.createSvgTag({ cellSize: 4, margin: 0, scalable: true })}</div>`;
}

function applyReward(id) {
  const c = S.cart.customer && (customerById(S.cart.customer.id) || S.cart.customer);
  const r = c && c.loyalty && c.loyalty.available.find((x) => x.id === id);
  if (!r) return;
  const t0 = cartTotals();
  S.cart.reward = { ...r };
  if (!rewardLine(t0.lines)) {
    // auto-add the cheapest eligible haircut so the cashier doesn't have to hunt for it
    const set = new Set(loyCfg().services || []);
    const cut = ((S.boot && S.boot.catalog) || []).filter((i) => i.active && i.type === 'SERVICE' && set.has(i.id)).sort((a, b) => num(a.sort) - num(b.sort))[0];
    if (cut) { S.cart.items.push({ id: cut.id, qty: 1 }); toast(`${cut.name} added for the reward`, 'info', 2200); }
  }
  const t = cartTotals();
  if (S.cart.discount && S.cart.discount.amount > r2(t.sub - t.loyalty)) { S.cart.discount = null; toast('Discount removed — bill is now smaller than the discount.', 'warn'); }
  renderCustomer(); renderGrid(); renderCart();
  if (loyCfg().needsApproval && S.role !== 'MANAGER') {
    modal(`<h3 class="mb-1 text-lg font-bold">🎁 Loyalty reward</h3>
      <p class="mb-4 text-sm text-slate-400">${esc(rewardLabel(r))} · −${fmt(t.loyalty)}. Rewards need manager approval.</p>
      <label class="mb-1 block text-sm font-medium text-slate-300">Manager PIN <span class="font-normal text-slate-500">(approve now)</span></label>
      <input id="rw-pin" type="password" inputmode="numeric" autocomplete="off" class="inp mb-1" placeholder="••••••" autofocus>
      <p class="mb-4 text-xs text-slate-500">Leave empty to send the request to the manager's dashboard. The sale will be held until approved.</p>
      <p id="rw-err" class="mb-2 min-h-5 text-sm text-red-400"></p>
      <div class="grid grid-cols-2 gap-2"><button data-act="close-modal" class="btn-ghost">Later</button><button data-act="confirm-reward" data-primary class="btn-primary">Approve</button></div>`);
  } else toast(`Reward applied: −${fmt(t.loyalty)}`, 'success', 1800);
}
async function confirmReward(btn) {
  const pin = $('#rw-pin').value.trim();
  if (!pin) { closeModal(); return; }
  const t = cartTotals();
  btn.disabled = true; btn.textContent = 'Checking…';
  try {
    const tok = (await api('managerApprove', { pin, purpose: 'REWARD', amount: t.loyalty })).approvalToken;
    S.cart.reward.approvalToken = tok; S.cart.reward.approvedAmount = t.loyalty;
    closeModal(); renderCart(); toast('Reward approved', 'success');
  } catch (e) { $('#rw-err').textContent = e.code === 'NETWORK' ? 'Offline — leave PIN empty to send for approval.' : e.message; btn.disabled = false; btn.textContent = 'Approve'; }
}

async function openCardModal(id) {
  const local = customerById(id);
  modal(`<div class="py-10 text-center text-slate-400">${ic('refresh', 'mx-auto mb-2 h-6 w-6 animate-spin')}Loading card…</div>`);
  let c;
  try { c = await api('loyaltyCustomer', { customerId: id }); }
  catch (e) { modal(`<p class="mb-4 text-sm text-red-300">${esc(e.code === 'NETWORK' ? 'Needs internet to load the card.' : e.message)}</p><button data-act="close-modal" class="btn-ghost w-full">Close</button>`); return; }
  c.id = id; S.cardInfo = c;
  const L = c.program;
  modal(`<div class="mb-3 flex items-center justify-between"><h3 class="text-lg font-bold">${ic('gift', 'mr-1 inline h-5 w-5 text-amber-400')} Rewards card</h3><button data-act="close-modal" class="rounded-lg p-1 text-slate-400 hover:bg-slate-700">${ic('x')}</button></div>
    <div class="mb-3 text-sm"><b>${esc(c.name)}</b> <span class="text-slate-400">${esc(c.phone)}</span></div>
    <div class="mb-3 rounded-2xl bg-slate-900/50 p-3">
      <div class="mb-2 flex items-center justify-between text-sm"><span class="text-slate-300">Progress</span><b>${c.progress}/${L.required}</b></div>
      ${progressDots(c.progress, L.required, 'h-5 w-5')}
      <div class="mt-2 text-xs text-slate-400">${c.available.length ? `🎁 ${c.available.length} reward(s) ready` : `${c.remaining} more visit${c.remaining === 1 ? '' : 's'} to the next reward`} · Total qualifying visits: ${c.totalVisits}</div>
    </div>
    <div class="mb-3 flex flex-col items-center gap-2 rounded-2xl bg-slate-900/50 p-4">
      ${qrSvg(cardLink(c.key))}
      <div class="text-xs text-slate-400">Customer scans this with their phone camera</div>
      <div class="mt-1 text-sm text-slate-300">Secret code <b class="font-mono text-2xl tracking-[.3em] text-amber-400" data-noi18n>${esc(c.code)}</b></div>
    </div>
    <div class="grid grid-cols-2 gap-2">
      <button data-act="loy-wa" class="btn-primary !bg-emerald-600 !text-white hover:!bg-emerald-500">${ic('send', 'h-4 w-4')} WhatsApp</button>
      <button data-act="loy-copy" class="btn-ghost">${ic('copy', 'h-4 w-4')} Copy link</button>
    </div>
    <p class="mt-3 text-xs text-slate-500">Send it only to the customer's own number. The code + phone (or the link) open their rewards page.</p>
    ${S.role === 'MANAGER' ? `<button data-act="loy-reset" class="mt-3 w-full text-xs text-red-300 underline-offset-4 hover:underline">Reset code & link (if leaked)</button>` : ''}`);
}

async function loadLoyalty() {
  if (S.role !== 'MANAGER') return;
  S.loy.loading = true; S.loy.error = '';
  if (S.view === 'loyalty') renderLoyalty();
  try { S.loy.data = await api('loyaltyReport'); S.online = true; }
  catch (e) { S.loy.error = e.message; if (e.code === 'NETWORK') S.online = false; }
  S.loy.loading = false; updateStatus();
  if (S.view === 'loyalty') renderLoyalty();
}

const RW_BADGE = { AVAILABLE: 'bg-amber-500/15 text-amber-300', REDEEMED: 'bg-emerald-500/15 text-emerald-300', RESERVED: 'bg-sky-500/15 text-sky-300', EXPIRED: 'bg-slate-500/20 text-slate-400', REVOKED: 'bg-red-500/15 text-red-300' };
function renderLoyalty() {
  const d = S.loy.data;
  const k = d && d.kpi;
  const L = loyCfg();
  const tab = (t, l) => `<button data-act="loy-tab" data-t="${t}" class="whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold ${S.loy.tab === t ? 'bg-amber-500 text-slate-900' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}">${l}</button>`;
  $('#view').innerHTML = `<div class="mx-auto max-w-7xl p-3 pb-24 lg:p-5">
    <div class="mb-4 flex flex-wrap items-center gap-2">
      <h1 class="mr-auto text-2xl font-extrabold tracking-tight">Loyalty program</h1>
      <span class="rounded-full px-3 py-1 text-xs font-bold ${L.active ? 'bg-emerald-500/15 text-emerald-300' : 'bg-red-500/15 text-red-300'}">${L.active ? 'Active' : 'Paused'}</span>
      <button data-act="loy-reload" class="flex items-center gap-1 rounded-full bg-slate-800 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-700">${ic('refresh', `h-3.5 w-3.5 ${S.loy.loading ? 'animate-spin' : ''}`)} ${d ? fmtTime(d.serverTime) : '—'}</button>
    </div>
    <p class="-mt-2 mb-4 text-sm text-slate-400">${L.required} qualifying visits → ${esc(rewardLabel(L))} the next haircut${L.expiryDays ? ` · valid ${L.expiryDays} days` : ''}${L.nextVisitOnly ? ' · next visit only' : ''}</p>
    ${S.loy.error ? `<div class="mb-4 rounded-2xl bg-red-500/10 p-3 text-sm text-red-300 ring-1 ring-red-500/30">${esc(S.loy.error)}</div>` : ''}
    ${!k ? skeleton() : `<div class="grid grid-cols-2 gap-3 md:grid-cols-4">
      ${kpi('Enrolled customers', k.enrolled, `of ${k.customers} customers`, 'text-amber-400')}
      ${kpi('Close to a reward', k.close, '1–2 visits away')}
      ${kpi('Unused rewards', k.available, `${k.withRewards} customers waiting`, 'text-amber-300')}
      ${kpi('Rewards redeemed', k.redeemed, `${k.issued} issued · ${k.expired} expired`, 'text-emerald-400')}
      ${kpi('Loyalty discounts', fmt(k.discountTotal), 'Total given through rewards')}
      ${kpi('Qualifying visits', k.visits, 'All time')}
    </div>`}
    <div class="no-scrollbar mt-6 mb-3 flex gap-1.5 overflow-x-auto">${tab('customers', 'Customers')}${tab('rewards', 'Rewards')}${tab('settings', 'Program rules')}${tab('qr', 'QR & link')}</div>
    <div id="loy-panel">${S.loy.tab === 'settings' ? loyaltySettingsForm() : S.loy.tab === 'qr' ? loyaltyQrPanel() : !d ? skeleton() : S.loy.tab === 'rewards' ? rewardsTable(d.rewards) : `
      <div class="mb-3 grid grid-cols-[1fr_auto] gap-2"><input id="loy-q" class="inp" placeholder="Search name or phone…" value="${esc(S.loy.q)}">
        <button data-act="loy-export" data-k="customers" class="btn-ghost">${ic('download', 'h-4 w-4')} Excel</button></div>
      <div id="loy-body">${loyaltyBody()}</div>`}</div>
  </div>`;
}
function loyaltyFiltered() {
  const q = normName(S.loy.q), dq = digits(S.loy.q);
  return ((S.loy.data && S.loy.data.customers) || []).filter((c) => !q || normName(c.name).includes(q) || (dq.length >= 3 && c.phone.includes(dq)))
    .sort((a, b) => (b.available - a.available) || (a.remaining - b.remaining) || (b.total - a.total));
}
function loyaltyBody() {
  const rows = loyaltyFiltered();
  if (!rows.length) return '<div class="rounded-2xl bg-slate-800/50 p-8 text-center text-sm text-slate-500">No customers found.</div>';
  return `<div class="overflow-x-auto rounded-2xl ring-1 ring-white/5"><table class="w-full min-w-[640px] text-left text-sm">
    <thead class="bg-slate-800 text-xs uppercase tracking-wider text-slate-400"><tr><th class="px-3 py-3">Customer</th><th class="px-3 py-3">Progress</th><th class="px-3 py-3 text-right">Visits</th><th class="px-3 py-3 text-right">Rewards</th><th class="px-3 py-3">Last visit</th><th class="px-3 py-3"></th></tr></thead>
    <tbody class="divide-y divide-white/5 bg-slate-800/40">${rows.slice(0, 300).map((c) => `<tr>
      <td class="px-3 py-2.5"><div class="font-medium">${esc(c.name)}</div><div class="text-xs text-slate-500">${esc(c.phone)}</div></td>
      <td class="px-3 py-2.5"><div class="flex items-center gap-2">${progressDots(c.progress, (S.loy.data.program || {}).required || 5, 'h-2.5 w-2.5')}<span class="text-xs text-slate-400">${c.progress}/${(S.loy.data.program || {}).required || 5}</span></div></td>
      <td class="px-3 py-2.5 text-right">${c.total}</td>
      <td class="px-3 py-2.5 text-right">${c.available ? `<span class="rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-bold text-amber-300">🎁 ${c.available} ready</span>` : ''} <span class="text-xs text-slate-500">${c.redeemed} used</span></td>
      <td class="whitespace-nowrap px-3 py-2.5 text-slate-400">${c.lastVisit ? esc(fmtDay(c.lastVisit)) : '—'}</td>
      <td class="whitespace-nowrap px-3 py-2.5 text-right"><button data-act="loy-history" data-id="${esc(c.id)}" class="rounded-lg px-2 py-1 text-xs text-slate-300 hover:bg-slate-700">History</button><button data-act="loy-card" data-id="${esc(c.id)}" class="rounded-lg p-1.5 text-slate-300 hover:bg-slate-700" title="Rewards card">${ic('qr', 'h-4 w-4')}</button></td>
    </tr>`).join('')}</tbody></table></div>${rows.length > 300 ? '<p class="mt-2 text-xs text-slate-500">Showing first 300 — use search.</p>' : ''}`;
}
function rewardsTable(list, compact) {
  if (!list.length) return '<div class="rounded-2xl bg-slate-800/50 p-8 text-center text-sm text-slate-500">No rewards yet.</div>';
  return `${compact ? '' : `<div class="mb-2 flex justify-end gap-2"><button data-act="loy-export" data-k="visits" class="btn-ghost">${ic('download', 'h-4 w-4')} Visits</button><button data-act="loy-export" data-k="rewards" class="btn-ghost">${ic('download', 'h-4 w-4')} Rewards</button></div>`}
  <div class="overflow-x-auto rounded-2xl ring-1 ring-white/5"><table class="w-full ${compact ? '' : 'min-w-[720px]'} text-left text-sm">
    <thead class="bg-slate-800 text-xs uppercase tracking-wider text-slate-400"><tr>${compact ? '' : '<th class="px-3 py-3">Customer</th>'}<th class="px-3 py-3">Reward</th><th class="px-3 py-3">Issued</th><th class="px-3 py-3">Status</th><th class="px-3 py-3 text-right">Discount</th></tr></thead>
    <tbody class="divide-y divide-white/5 bg-slate-800/40">${list.map((r) => `<tr>
      ${compact ? '' : `<td class="px-3 py-2.5"><div class="font-medium">${esc(r.customerName)}</div><div class="text-xs text-slate-500">${esc(r.phone)}</div></td>`}
      <td class="whitespace-nowrap px-3 py-2.5">${esc(rewardLabel(r))}</td>
      <td class="whitespace-nowrap px-3 py-2.5 text-slate-400">${esc(fmtDay(r.issuedDate))}${r.expiresOn ? `<div class="text-[11px]">expires ${esc(fmtDay(r.expiresOn))}</div>` : ''}</td>
      <td class="px-3 py-2.5"><span class="rounded-full px-2 py-0.5 text-[10px] font-bold ${RW_BADGE[r.status] || ''}">${esc(r.status)}</span>${r.redeemedDate ? `<div class="text-[11px] text-slate-500">${esc(fmtDay(r.redeemedDate))}</div>` : ''}${r.note ? `<div class="text-[11px] text-slate-500">${esc(r.note)}</div>` : ''}</td>
      <td class="whitespace-nowrap px-3 py-2.5 text-right">${r.discount ? fmt(r.discount) : '—'}</td></tr>`).join('')}</tbody></table></div>`;
}
function openHistoryModal(id) {
  const d = S.loy.data; if (!d) return;
  const c = d.customers.find((x) => x.id === id); if (!c) return;
  const visits = d.visits.filter((v) => v.customerId === id);
  modal(`<div class="mb-3 flex items-center justify-between"><h3 class="text-lg font-bold">${esc(c.name)}</h3><button data-act="close-modal" class="rounded-lg p-1 text-slate-400 hover:bg-slate-700">${ic('x')}</button></div>
    <p class="mb-3 text-sm text-slate-400">${esc(c.phone)} · ${c.total} qualifying visits · ${c.progress}/${d.program.required} now</p>
    <h4 class="mb-2 text-xs font-semibold uppercase tracking-widest text-slate-400">Rewards</h4>
    ${rewardsTable(d.rewards.filter((r) => r.customerId === id), true)}
    <h4 class="mb-2 mt-4 text-xs font-semibold uppercase tracking-widest text-slate-400">Visits</h4>
    <div class="divide-y divide-white/5 overflow-hidden rounded-2xl bg-slate-900/40">${visits.map((v) => `<div class="flex items-center gap-2 px-3 py-2 text-sm ${v.status === 'REVERSED' ? 'opacity-50' : ''}">
      <span class="w-16 text-slate-400">${esc(fmtDay(v.date))}</span><span class="flex-1 truncate text-xs text-slate-500">${esc(v.ticketId)}${v.note ? ' · ' + esc(v.note) : ''}</span>
      <span class="rounded-full px-2 py-0.5 text-[10px] font-bold ${v.status === 'VALID' ? (v.rewardId ? 'bg-emerald-500/15 text-emerald-300' : 'bg-amber-500/15 text-amber-300') : 'bg-red-500/15 text-red-300'}">${v.status === 'VALID' ? (v.rewardId ? 'USED FOR REWARD' : 'COUNTING') : 'CANCELLED'}</span></div>`).join('') || '<p class="p-4 text-center text-sm text-slate-500">No visits yet.</p>'}</div>`, { wide: true });
}
function loyaltySettingsForm() {
  const L = loyCfg();
  const svc = ((S.boot && S.boot.catalog) || []).filter((i) => i.type === 'SERVICE');
  const prods = ((S.boot && S.boot.catalog) || []).filter((i) => i.type === 'PRODUCT');
  const set = new Set(L.services || []);
  const chk = (id, label, on, hint) => `<label class="flex items-start gap-3 rounded-xl bg-slate-900/40 p-3"><input id="${id}" type="checkbox" class="mt-0.5 h-5 w-5 shrink-0 accent-amber-500" ${on ? 'checked' : ''}><span><span class="block text-sm font-medium">${label}</span>${hint ? `<span class="block text-xs text-slate-500">${hint}</span>` : ''}</span></label>`;
  return `<div class="card space-y-4">
    ${chk('loy-active', 'Program active', L.active, 'Paused = visits are not counted and no new rewards are issued. Rewards already earned can still be used.')}
    <div class="grid gap-3 sm:grid-cols-3">
      <label class="text-sm text-slate-300">Visits needed<input id="loy-visits" type="number" min="1" max="50" class="inp mt-1" value="${num(L.required)}"></label>
      <label class="text-sm text-slate-300">Reward type<select id="loy-type" class="inp mt-1"><option value="PERCENT" ${L.type === 'PERCENT' ? 'selected' : ''}>Percentage off</option><option value="FIXED" ${L.type === 'FIXED' ? 'selected' : ''}>Fixed amount off</option></select></label>
      <label class="text-sm text-slate-300">Reward value (<span id="loy-unit">${L.type === 'FIXED' ? esc(cur()) : '%'}</span>)<input id="loy-value" type="number" min="1" class="inp mt-1" value="${num(L.value)}"></label>
    </div>
    <div><div class="mb-2 text-sm font-medium text-slate-300">Eligible services <span class="font-normal text-slate-500">(earn visits & get the discount)</span></div>
      <div class="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">${svc.map((i) => `<label class="flex items-center gap-2 rounded-xl bg-slate-900/40 px-3 py-2 text-sm ${i.active ? '' : 'opacity-50'}"><input type="checkbox" data-loy-svc="${esc(i.id)}" class="h-4 w-4 accent-amber-500" ${set.has(i.id) ? 'checked' : ''}> <span class="flex-1">${esc(i.name)}</span><span class="text-xs text-slate-500">${fmt(i.price)}</span></label>`).join('')}</div>
      ${L.servicesAuto ? '<p class="mt-1 text-xs text-slate-500">Auto-selected haircut services. Save to lock your choice.</p>' : ''}</div>
    <div class="grid gap-2 sm:grid-cols-2">
      ${chk('loy-products', 'Product purchases count as visits', L.countProducts, `Off by default${prods.length ? ` (${prods.length} products)` : ''}.`)}
      ${chk('loy-next', 'Reward valid for the next visit only', L.nextVisitOnly, 'If the customer comes for a haircut and the reward isn\'t used, it is lost.')}
      ${chk('loy-approval', 'Cashier needs manager approval to redeem', L.needsApproval, 'Same flow as discounts: manager PIN now, or the sale waits on the dashboard.')}
      ${chk('loy-redeemcounts', 'The discounted visit also counts toward the next reward', L.redeemCounts, 'Off = the free/discounted haircut starts the new cycle at 0.')}
    </div>
    <label class="block text-sm text-slate-300 sm:w-1/3">Reward expires after (days)<input id="loy-expiry" type="number" min="0" class="inp mt-1" value="${num(L.expiryDays)}"><span class="text-xs text-slate-500">0 = never expires</span></label>
    <button data-act="loy-save" class="btn-primary">Save program rules</button>
    <p class="text-xs text-slate-500">Changes apply to new rewards. Rewards already issued keep their value.</p>
  </div>`;
}
async function saveLoyaltySettings(btn) {
  const services = [...document.querySelectorAll('[data-loy-svc]')].filter((x) => x.checked).map((x) => x.dataset.loySvc);
  if (!services.length) return toast('Pick at least one eligible service', 'warn');
  await busy(btn, async () => {
    try {
      const r = await api('saveSettings', { loyaltyActive: $('#loy-active').checked, loyaltyVisits: $('#loy-visits').value, loyaltyRewardType: $('#loy-type').value,
        loyaltyRewardValue: $('#loy-value').value, loyaltyServices: services, loyaltyCountProducts: $('#loy-products').checked, loyaltyNextVisitOnly: $('#loy-next').checked,
        loyaltyNeedsApproval: $('#loy-approval').checked, loyaltyRedeemCounts: $('#loy-redeemcounts').checked, loyaltyExpiryDays: $('#loy-expiry').value });
      S.boot.settings = r.settings; LS.set('boot', S.boot);
      toast('Program rules saved', 'success');
      refreshCustomers(); loadLoyalty();
    } catch (e) { toast(e.message, 'error', 6000); }
  });
  renderLoyalty();
}
function loyaltyQrPanel() {
  return `<div class="grid gap-4 md:grid-cols-[auto_1fr]">
    <div class="card flex flex-col items-center gap-3">${qrSvg(publicUrl(), 'h-56 w-56')}<div class="text-sm font-semibold" data-noi18n>My Rewards — مكافآتي</div></div>
    <div class="card space-y-3">
      <h2 class="font-bold">Public rewards page</h2>
      <p class="text-sm text-slate-400">Print this QR for the mirror or the cashier desk. Customers scan it, type their phone number and the 6-digit code from their WhatsApp card, and see their progress. Nobody can see anything with a phone number alone.</p>
      <div class="break-all rounded-xl bg-slate-900/60 p-3 font-mono text-xs text-slate-300" data-noi18n>${esc(publicUrl())}</div>
      <div class="flex flex-wrap gap-2"><button data-act="loy-print" class="btn-primary">${ic('print', 'h-4 w-4')} Print poster</button><button data-act="loy-copy-public" class="btn-ghost">${ic('copy', 'h-4 w-4')} Copy link</button></div>
      <p class="text-xs text-slate-500">Each customer's personal card (QR + code) is in POS ▸ customer ▸ Card, or in the Customers tab here.</p>
    </div></div>`;
}
function printPoster() {
  const shop = esc((S.boot && S.boot.settings && S.boot.settings.shopName) || 'Karamila');
  const L = loyCfg();
  const reward = L.type === 'FIXED' ? `${money(L.value)} ${esc(cur())}` : `${num(L.value)}%`;
  const w = window.open('', '_blank');
  if (!w) return toast('Allow pop-ups to print', 'warn');
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${shop} — Rewards</title><style>
    body{font-family:system-ui,"Segoe UI",Tahoma,sans-serif;text-align:center;margin:0;padding:40px;color:#0f172a}
    .b{border:6px solid #f59e0b;border-radius:32px;padding:36px;max-width:520px;margin:auto}
    h1{font-size:44px;margin:0}h2{font-size:28px;margin:8px 0 0}p{font-size:20px;margin:10px 0}.qr{width:300px;height:300px;margin:24px auto}.qr svg{width:100%;height:100%}
    .s{color:#64748b;font-size:14px;word-break:break-all}</style></head><body><div class="b">
    <h1>${shop} 💈</h1><h2 dir="rtl">مكافآتي · My Rewards</h2>
    <p dir="rtl"><b>${L.required}</b> زيارات = <b>${reward}</b> خصم على الحلاقة الجاية</p>
    <p>${L.required} visits = <b>${reward} off</b> your next haircut</p>
    <div class="qr">${qrSvg(publicUrl(), '').replace(/^<div[^>]*>|<\/div>$/g, '')}</div>
    <p dir="rtl">امسح الكود بكاميرا الموبايل</p><p>Scan with your phone camera</p><div class="s">${esc(publicUrl())}</div>
    </div><script>setTimeout(()=>print(),300)<\/script></body></html>`);
  w.document.close();
}
function exportLoyalty(kind) {
  const d = S.loy.data; if (!d) return;
  const day = todayStr();
  if (kind === 'customers') downloadCSV(`karamila-loyalty-customers-${day}.csv`, [['Customer', 'Phone', 'Qualifying visits', 'Progress', 'Required', 'Remaining', 'Rewards ready', 'Rewards used', 'Last visit'],
    ...loyaltyFiltered().map((c) => [c.name, c.phone, c.total, c.progress, d.program.required, c.remaining, c.available, c.redeemed, c.lastVisit])]);
  if (kind === 'rewards') downloadCSV(`karamila-loyalty-rewards-${day}.csv`, [['Reward ID', 'Customer', 'Phone', 'Type', 'Value', 'Status', 'Issued', 'Expires', 'Redeemed', 'Ticket', 'Discount', 'Note'],
    ...d.rewards.map((r) => [r.id, r.customerName, r.phone, r.type, r.value, r.status, r.issuedDate, r.expiresOn, r.redeemedDate, r.ticketId, r.discount, r.note])]);
  if (kind === 'visits') downloadCSV(`karamila-loyalty-visits-${day}.csv`, [['Date', 'Customer', 'Ticket', 'Status', 'Reward', 'Note'],
    ...d.visits.map((v) => [v.date, v.customerName, v.ticketId, v.status, v.rewardId, v.note])]);
}

/* ------------------------------ modals ------------------------------ */
let confirmResolver = null;
function modal(html, opts = {}) {
  $('#modal-root').innerHTML = `<div data-act="modal-bg" class="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center sm:p-4">
    <div data-modal class="max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-slate-800 p-5 shadow-2xl ring-1 ring-white/10 sm:rounded-3xl ${opts.wide ? 'sm:max-w-2xl' : 'sm:max-w-md'}" style="padding-bottom:calc(1.25rem + env(safe-area-inset-bottom))">${html}</div></div>`;
  const f = $('#modal-root [autofocus]');
  if (f) setTimeout(() => f.focus(), 60);
}
function closeModal() {
  $('#modal-root').innerHTML = '';
  if (confirmResolver) { confirmResolver(false); confirmResolver = null; }
}
function confirmModal(text, ok = 'Confirm') {
  return new Promise((resolve) => {
    modal(`<p class="mb-5 text-base">${esc(text)}</p><div class="grid grid-cols-2 gap-2"><button data-act="close-modal" class="btn-ghost">Cancel</button><button data-act="confirm-yes" data-primary class="btn-primary">${esc(ok)}</button></div>`);
    confirmResolver = resolve;
  });
}

function toast(msg, type = 'info', ms = 2600) {
  const cls = { success: 'bg-emerald-600 text-white', error: 'bg-red-600 text-white', warn: 'bg-amber-500 text-slate-900', info: 'bg-slate-700 text-slate-50' }[type] || '';
  const el = document.createElement('div');
  el.className = `pointer-events-auto max-w-md rounded-2xl px-4 py-3 text-sm font-semibold shadow-xl ring-1 ring-white/10 transition-opacity duration-300 ${cls}`;
  el.textContent = msg;
  el.addEventListener('click', () => el.remove());
  $('#toasts').appendChild(el);
  setTimeout(() => { el.style.opacity = '0'; setTimeout(() => el.remove(), 320); }, ms);
}

function downloadCSV(name, rows) {
  const cell = (v) => { let s = String(v ?? ''); if (/^[=+\-@]/.test(s)) s = "'" + s; return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  const blob = new Blob(['﻿' + rows.map((r) => r.map(cell).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1500);
}

async function busy(btn, fn) {
  const label = btn.innerHTML;
  btn.disabled = true; btn.innerHTML = 'Saving…';
  try { return await fn(); } finally { if (btn.isConnected) { btn.disabled = false; btn.innerHTML = label; } }
}
async function reloadBoot() {
  const d = await api('bootstrap');
  S.boot = { settings: d.settings, barbers: d.barbers, catalog: d.catalog, customers: d.customers };
  LS.set('boot', S.boot); setLive(d, false);
}

/* ============================== EVENTS ============================== */
const ACT = {
  // login
  pin: (el) => { if (pinBuf.length < 8) { pinBuf += el.dataset.d; drawPinDots(); const e = $('#pin-err'); if (e) e.textContent = ''; } },
  'pin-del': () => { pinBuf = pinBuf.slice(0, -1); drawPinDots(); },
  'pin-go': submitPin,
  'server-settings': () => modal(`<h3 class="mb-4 text-lg font-bold">Server</h3>${serverForm()}<button data-act="close-modal" class="btn-ghost mt-3 w-full">Close</button>`),
  'save-url': async (el) => {
    const url = $('#api-url').value.trim();
    if (!/^https:\/\/script\.google(usercontent)?\.com\/.+/.test(url) && !/^https?:\/\/(localhost|127\.0\.0\.1)/.test(url)) return toast('That doesn\'t look like an Apps Script /exec URL', 'error');
    const prev = S.apiUrl; S.apiUrl = url;
    el.disabled = true; el.textContent = 'Testing…';
    try { await api('ping'); LS.set('apiUrl', url); toast('Connected ✓', 'success'); closeModal(); if (!S.token) renderLogin(); }
    catch (e) { S.apiUrl = prev; toast('Could not connect: ' + e.message, 'error', 6000); el.disabled = false; el.textContent = 'Test & Save'; }
  },
  logout: async () => {
    if (!(await confirmModal(S.outbox.length ? `${S.outbox.length} item(s) are not synced yet. They stay on this device and upload after the next login. Log out?` : 'Log out of this device?', 'Log out'))) return;
    closeModal();
    S.token = null; S.role = null; S.boot = null; S.live = null; S.dash.data = null; S.cart = newCart();
    ['token', 'role', 'boot', 'live'].forEach(LS.del);
    location.hash = ''; renderLogin();
  },
  'sync-now': () => { flushOutbox(); syncNow(); if (S.role === 'MANAGER' && MGR_DATA_VIEWS.includes(S.view)) loadDash(true); },
  install: async () => { if (!S.installPrompt) return; S.installPrompt.prompt(); await S.installPrompt.userChoice; S.installPrompt = null; const b = $('#install-btn'); if (b) b.classList.add('hidden'); },

  // POS
  'pick-barber': (el) => pickBarber(el.dataset.id),
  'add-item': (el) => changeQty(el.dataset.id, +1),
  'inc-item': (el) => changeQty(el.dataset.id, +1),
  'dec-item': (el) => changeQty(el.dataset.id, -1),
  'pos-tab': (el) => { S.posTab = el.dataset.tab; renderGrid(); },
  pay: (el) => pay(el.dataset.method),
  seat,
  'clear-cart': () => { S.cart = newCart(); S.custQuery = ''; renderBarbers(); renderCustomer(); renderGrid(); renderCart(); },
  'discard-chair': async () => {
    if (!(await confirmModal('Discard this open chair? (No sale is recorded.)', 'Discard'))) return;
    closeModal();
    enqueue('discardTicket', { id: S.cart.id });
    S.cart = newCart(); renderBarbers(); renderCustomer(); renderGrid(); renderCart();
  },
  'scroll-cart': () => $('#cart').scrollIntoView({ behavior: 'smooth' }),
  discount: openDiscountModal,
  'disc-quick': (el) => { const v = el.dataset.v; $('#disc-type').value = v.endsWith('%') ? 'pct' : 'amt'; $('#disc-val').value = parseFloat(v); },
  'disc-reason': (el) => { $('#disc-reason').value = el.dataset.v; },
  'apply-discount': applyDiscount,
  'remove-discount': () => { S.cart.discount = null; renderCart(); },
  'pick-customer': (el) => { const c = customerById(el.dataset.id); if (!c) return; S.cart.customer = { ...c }; S.cart.reward = null; S.custQuery = ''; renderCustomer(); renderCart();
    const lo = c.loyalty; if (lo && lo.available && lo.available.length) toast(`🎁 ${c.name} has a reward ready: ${rewardLabel(lo.available[0])}`, 'success', 5000); },
  'add-customer': () => {
    const name = $('#new-name').value.trim();
    const phone = cleanPhone($('#new-phone').value);
    if (!name) return toast('Enter the customer name', 'warn');
    if (phone.length < 10) return toast('Enter a valid phone number', 'warn');
    const ex = customers().find((c) => c.phone === phone);
    if (ex) { S.cart.customer = { ...ex }; toast(`Found existing: ${ex.name}`, 'info'); }
    else S.cart.customer = { id: uid('C'), name, phone, isNew: true, visits: 0 };
    S.custQuery = ''; renderCustomer();
  },
  'clear-customer': () => { S.cart.customer = null; S.cart.reward = null; renderCustomer(); renderCart(); },
  'apply-reward': (el) => applyReward(el.dataset.id),
  'remove-reward': () => { S.cart.reward = null; renderCustomer(); renderCart(); },
  'confirm-reward': confirmReward,
  'loy-card': (el) => openCardModal(el.dataset.id),
  'loy-wa': () => { const c = S.cardInfo; if (c) window.open(waLink(c), '_blank', 'noopener'); },
  'loy-copy': async () => { const c = S.cardInfo; if (!c) return; try { await navigator.clipboard.writeText(cardLink(c.key)); toast('Link copied', 'success'); } catch (e) { toast(cardLink(c.key), 'info', 8000); } },
  'loy-reset': async (el) => {
    const c = S.cardInfo; if (!c) return;
    if (!(await confirmModal('Create a new code and link? The old ones stop working immediately.', 'Reset'))) return;
    try { await api('loyaltyResetKey', { customerId: c.id }); toast('New code created', 'success'); openCardModal(c.id); } catch (e) { toast(e.message, 'error'); }
  },
  'loy-tab': (el) => { S.loy.tab = el.dataset.t; renderLoyalty(); },
  'loy-reload': () => loadLoyalty(),
  'loy-history': (el) => openHistoryModal(el.dataset.id),
  'loy-save': saveLoyaltySettings,
  'loy-print': printPoster,
  'loy-copy-public': async () => { try { await navigator.clipboard.writeText(publicUrl()); toast('Link copied', 'success'); } catch (e) { toast(publicUrl(), 'info', 8000); } },
  'loy-export': (el) => exportLoyalty(el.dataset.k),
  'edit-notes': openNotesModal,
  'save-notes': () => {
    const c = S.cart.customer;
    const data = { id: c.id, name: $('#cn-name').value.trim(), phone: cleanPhone($('#cn-phone').value), notes: $('#cn-notes').value.trim() };
    if (!data.name || data.phone.length < 10) return toast('Name and a valid phone are required', 'warn');
    upsertLocalCustomer(data);
    Object.assign(S.cart.customer, data);
    enqueue('saveCustomer', data);
    closeModal(); renderCustomer();
  },
  'today-list': openTodayModal,
  'void-ticket': (el) => openVoidModal(el.dataset.id),
  'confirm-void': confirmVoid,
  'retry-failed': (el) => { const f = S.failed.splice(Number(el.dataset.i), 1)[0]; if (f) { delete f.error; S.outbox.push(f); } persistOutbox(); renderFailed(); flushOutbox(); },
  'dismiss-failed': () => { S.failed = []; persistOutbox(); renderFailed(); },

  // dashboard
  range: (el) => { S.dash.range = el.dataset.r; LS.set('dashRange', S.dash.range); if (S.dash.range !== 'custom') loadDash(); else rerenderMgr(); },
  'apply-custom': () => { S.dash.from = $('#r-from').value; S.dash.to = $('#r-to').value; if (S.dash.to < S.dash.from) return toast('End date is before start date', 'warn'); loadDash(); },
  'reload-dash': () => loadDash(),
  'reset-barber': async (el) => {
    const all = el.dataset.id === 'ALL';
    const p = !all && ((S.dash.data && S.dash.data.payroll) || []).find((x) => x.barberId === el.dataset.id);
    const msg = all ? 'Reset ALL barbers to zero? Their Log & Payroll start again from now. Invoices stay saved in the Google Sheet.'
      : `Reset ${p ? p.name : 'this barber'} to zero? Log & Payroll start again from now. Invoices stay saved in the Google Sheet.`;
    if (!(await confirmModal(msg, 'Reset to zero'))) return;
    closeModal();
    try {
      const r = await api('resetBarbers', all ? { all: true } : { barberId: el.dataset.id });
      const paid = r.settlements.reduce((a, x) => a + x.commission, 0);
      toast(`Reset done · commission ${fmt(paid)}`, 'success', 4000);
      reloadBoot().catch(() => {}); loadDash(true);
    } catch (e) { toast(e.message, 'error'); }
  },
  decide: async (el) => {
    const ok = el.dataset.d === 'APPROVE';
    await busy(el, async () => {
      try { await api('decideApproval', { id: el.dataset.id, decision: el.dataset.d }); toast(ok ? 'Approved' : 'Rejected', ok ? 'success' : 'warn'); }
      catch (e) { toast(e.message, 'error'); }
    });
    loadDash(true); syncNow();
  },
  'export-log': () => {
    const rows = filteredLog();
    downloadCSV(`karamila-log-${S.dash.data.from}_${S.dash.data.to}.csv`, [['Date', 'Time', 'Barber', 'Service/Product', 'Customer', 'Phone', 'Payment', 'Subtotal', 'Discount', 'Total', 'Commission', 'Status', 'Ticket ID'],
      ...rows.map((t) => [t.date, fmtTime(t.closedAt), t.barberName, t.itemsText, t.customerName, t.customerPhone, (METHODS[t.method] || {}).label || t.method, t.subtotal, t.discount, t.total, t.commission, t.status, t.id])]);
  },
  'export-payroll': () => {
    const d = S.dash.data;
    downloadCSV(`karamila-payroll-${d.from}_${d.to}.csv`, [['Barber', 'Tickets', 'Services', 'Products', 'Total sales', 'Commission', 'Shop cut'], ...d.payroll.map((p) => [p.name, p.tickets, p.services, p.products, p.sales, p.commission, p.shopCut])]);
  },

  // expenses
  'quick-exp': (el) => openQuickExpense(el.dataset.c),
  'save-quick-exp': (el) => {
    const amount = r2($('#qe-amt').value);
    if (!(amount > 0)) return toast('Enter an amount', 'warn');
    enqueue('addExpense', { id: uid('E'), kind: 'VARIABLE', category: el.dataset.c, amount, note: $('#qe-note').value.trim(), date: todayStr() });
    closeModal(); toast(`${el.dataset.c}: ${fmt(amount)} saved`, 'success'); renderExpenses();
  },
  'save-fixed': () => {
    const amount = r2($('#fx-amt').value);
    if (!(amount > 0)) return toast('Enter an amount', 'warn');
    enqueue('addExpense', { id: uid('E'), kind: 'FIXED', category: $('#fx-cat').value, amount, date: $('#fx-date').value || todayStr(), note: $('#fx-note').value.trim() });
    toast('Expense saved', 'success'); renderExpenses();
  },
  'del-exp': async (el) => {
    if (!(await confirmModal('Delete this expense?', 'Delete'))) return;
    closeModal();
    try { await api('deleteExpense', { id: el.dataset.id }); toast('Deleted', 'success'); loadDash(true); } catch (e) { toast(e.message, 'error'); }
  },

  // settings
  'save-settings': (el) => busy(el, async () => {
    const list = (id) => $(id).value.split(',').map((s) => s.trim()).filter(Boolean);
    try {
      const r = await api('saveSettings', { svcPct: $('#st-svc').value, prodPct: $('#st-prod').value, shopName: $('#st-name').value, currency: $('#st-cur').value, quickExpenses: list('#st-quick'), fixedCategories: list('#st-fixed') });
      S.boot.settings = r.settings; LS.set('boot', S.boot); toast('Settings saved', 'success'); renderShell(); route();
    } catch (e) { toast(e.message, 'error'); }
  }),
  'edit-barber': (el) => openBarberModal(el.dataset.id),
  'save-barber': (el) => busy(el, async () => {
    try {
      await api('saveBarber', { id: el.dataset.id, name: $('#bb-name').value, color: $('#bb-color').value, photo: $('#bb-photo').value.trim(), svcPct: $('#bb-svc').value, prodPct: $('#bb-prod').value, sort: $('#bb-sort').value, active: $('#bb-active').checked });
      await reloadBoot(); closeModal(); toast('Barber saved', 'success'); renderSettings();
    } catch (e) { $('#m-err').textContent = e.message; }
  }),
  'edit-item': (el) => openItemModal(el.dataset.id),
  'save-item': (el) => busy(el, async () => {
    try {
      await api('saveCatalogItem', { id: el.dataset.id, name: $('#it-name').value, type: $('#it-type').value, price: $('#it-price').value, sort: $('#it-sort').value, active: $('#it-active').checked });
      await reloadBoot(); closeModal(); toast('Price list updated', 'success'); renderSettings();
    } catch (e) { $('#m-err').textContent = e.message; }
  }),
  'change-pin': (el) => busy(el, async () => {
    try {
      const r = await api('changePin', { which: $('#pin-which').value, currentPin: $('#pin-cur').value, newPin: $('#pin-new').value });
      S.token = r.token; LS.set('token', r.token);
      $('#pin-cur').value = ''; $('#pin-new').value = '';
      toast('PIN changed. Other devices must log in again.', 'success', 5000);
    } catch (e) { toast(e.message, 'error'); }
  }),
  'reload-all': (el) => busy(el, async () => { try { await reloadBoot(); S.dash.data = null; toast('Data reloaded', 'success'); renderSettings(); } catch (e) { toast(e.message, 'error'); } }),

  // modals
  'close-modal': closeModal,
  'modal-bg': closeModal,
  'confirm-yes': () => { const r = confirmResolver; confirmResolver = null; $('#modal-root').innerHTML = ''; if (r) r(true); },
};

document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-act]');
  if (!el) return;
  if (el.dataset.act === 'modal-bg' && e.target !== el) return;
  const fn = ACT[el.dataset.act];
  if (fn) { e.preventDefault(); fn(el, e); }
});

document.addEventListener('input', (e) => {
  const id = e.target.id;
  if (id === 'cust-q') { S.custQuery = e.target.value; renderCustDropdown(); }
  else if (id === 'loy-q') { S.loy.q = e.target.value; const t = $('#loy-body'); if (t && S.loy.data) t.innerHTML = loyaltyBody(); }
  else if (id === 'loy-type') { const u = $('#loy-unit'); if (u) u.textContent = e.target.value === 'FIXED' ? cur() : '%'; }
  else if (id === 'log-q') { S.logFilter.q = e.target.value; const t = $('#log-table'); if (t && S.dash.data) t.innerHTML = logBody(); }
});
document.addEventListener('change', (e) => {
  const m = { 'log-barber': 'barber', 'log-method': 'method', 'log-status': 'status' }[e.target.id];
  if (m) { S.logFilter[m] = e.target.value; const t = $('#log-table'); if (t && S.dash.data) t.innerHTML = logBody(); }
});

document.addEventListener('keydown', (e) => {
  if (!S.token && /^\d$/.test(e.key) && $('#pin-dots') && !$('#modal-root').innerHTML) { ACT.pin({ dataset: { d: e.key } }); return; }
  if (!S.token && e.key === 'Backspace' && $('#pin-dots') && !$('#modal-root').innerHTML) { ACT['pin-del'](); return; }
  if (!S.token && e.key === 'Enter' && $('#pin-dots') && !$('#modal-root').innerHTML) { submitPin(); return; }
  if (e.key === 'Escape' && $('#modal-root').innerHTML) { closeModal(); return; }
  if (e.key === 'Enter' && e.target.closest && e.target.closest('[data-modal]') && e.target.tagName !== 'TEXTAREA') {
    const p = $('#modal-root [data-primary]'); if (p && !p.disabled) { e.preventDefault(); p.click(); }
    return;
  }
  if (e.key === 'Enter' && e.target.id === 'cust-q') {
    const first = $('#cust-dd [data-act="pick-customer"]');
    if (first) first.click(); else { const n = $('#new-name'); if (n && !n.value) n.focus(); else $('#new-phone') && $('#new-phone').focus(); }
  }
  if (e.key === 'Enter' && (e.target.id === 'new-phone' || e.target.id === 'new-name')) ACT['add-customer']();
});

/* ------------------------------ boot ------------------------------ */
window.addEventListener('hashchange', route);
window.addEventListener('online', () => { S.online = true; updateStatus(); flushOutbox(); syncNow(); });
window.addEventListener('offline', () => { S.online = false; updateStatus(); });
document.addEventListener('visibilitychange', () => { if (!document.hidden && S.token) { flushOutbox(); syncNow(); } });
window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); S.installPrompt = e; const b = $('#install-btn'); if (b) b.classList.remove('hidden'); });

setInterval(() => {
  if (document.hidden || !S.token) return;
  flushOutbox();
  syncNow();
  if (S.role === 'MANAGER' && MGR_DATA_VIEWS.includes(S.view) && rangeIncludesToday()) loadDash(true);
}, Math.max(5, num(CFG.SYNC_SECONDS)) * 1000);
setInterval(() => { if (S.view === 'pos' && $('#barbers') && !document.hidden) { renderBarbers(); } }, 60000); // tick elapsed minutes

function registerSW() {
  if (!('serviceWorker' in navigator) || !/^https?:/.test(location.protocol)) return;
  navigator.serviceWorker.register('sw.js').then((reg) => {
    reg.addEventListener('updatefound', () => {
      const nw = reg.installing;
      if (!nw) return;
      nw.addEventListener('statechange', () => {
        if (nw.state === 'installed' && navigator.serviceWorker.controller) {
          const el = document.createElement('button');
          el.className = 'pointer-events-auto rounded-2xl bg-amber-500 px-4 py-3 text-sm font-bold text-slate-900 shadow-xl';
          el.textContent = 'New version available — tap to update';
          el.onclick = () => { if (S.outbox.length) toast('Wait until all items are synced', 'warn'); else nw.postMessage('SKIP_WAITING'); };
          $('#toasts').appendChild(el);
        }
      });
    });
    setInterval(() => reg.update().catch(() => {}), 30 * 60 * 1000);
  }).catch((e) => console.warn('SW registration failed', e));
  let reloaded = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (!reloaded) { reloaded = true; location.reload(); } });
}

registerSW();
if (S.token) { renderShell(); route(); bootstrap(); } else renderLogin();
})();
