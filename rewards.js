/* =====================================================================
 *  Karamila — "My Rewards · مكافآتي" public customer page
 *  No login. Shows nothing until the customer proves who they are with
 *  phone + 6-digit code, or their personal link (#k=…) from WhatsApp.
 *  The server never returns phone, spending, notes or services here.
 * ===================================================================== */
(() => {
'use strict';
const CFG = Object.assign({ API_URL: '' }, window.KARAMILA_CONFIG || {});
const store = {
  get(k) { try { return JSON.parse(localStorage.getItem('krm:' + k)); } catch (e) { return null; } },
  set(k, v) { try { localStorage.setItem('krm:' + k, JSON.stringify(v)); } catch (e) { /* private mode */ } },
  del(k) { try { localStorage.removeItem('krm:' + k); } catch (e) { /* ignore */ } },
};
const API = store.get('apiUrl') || CFG.API_URL;
let lang = store.get('lang') || ((navigator.language || '').toLowerCase().startsWith('en') ? 'en' : 'ar');

const T = {
  ar: {
    title: 'مكافآتي', sub: 'تابع زياراتك ومكافآتك', phone: 'رقم الموبايل', code: 'الكود السري (6 أرقام)',
    codeHint: 'الكود بيوصلك على واتساب من الكاشير. مش معاك؟ اطلبه في زيارتك الجاية.',
    show: 'اعرض مكافآتي', checking: 'جاري التحقق…', hi: (n) => `أهلًا ${n} 👋`, hiAnon: 'أهلًا 👋',
    of: (p, r) => `${p} من ${r} زيارات`, done: 'زيارات مكتملة', remaining: (n) => n === 1 ? 'فاضل زيارة واحدة بس!' : `فاضل ${n} زيارات`,
    next: (rw, r) => `المكافأة الجاية: ${rw} على حلاقتك الجاية بعد ${r} زيارات مؤهلة.`,
    congrats: 'مبروك! Congratulations! 🎉', unlocked: (rw) => `فتحت ${rw} على حلاقتك الجاية!`, ready: 'مكافأتك جاهزة — قول للكاشير وانت بتدفع.',
    expires: (d) => `صالحة لحد ${d}`, nextOnly: 'صالحة في زيارتك الجاية بس', total: (n) => `إجمالي الزيارات المؤهلة: ${n}`,
    history: 'مكافآت سابقة', used: (d) => `اتستخدمت ${d}`, expired: 'انتهت', saved: (a) => `وفّرت ${a}`,
    rules: (r, rw) => `كل ${r} زيارات (حلاقة) = ${rw} على الحلاقة اللي بعدها`, paused: 'برنامج المكافآت متوقف مؤقتًا.',
    logout: 'مش أنت؟ خروج', refresh: 'تحديث', lang: 'English', percent: (v) => `خصم ${v}%`, fixed: (v, c) => `خصم ${v} ${c}`,
    cycle: 'الدورة الحالية', privacy: 'بياناتك محمية — محدش يقدر يشوفها برقم الموبايل لوحده.',
    offline: 'مفيش إنترنت. حاول تاني.', err: 'حصلت مشكلة. حاول تاني.', badInput: 'اكتب رقم موبايل صحيح والكود 6 أرقام.',
    GENERIC: 'مقدرناش نتأكد من البيانات دي. راجع الرقم والكود.', LOCK30: 'محاولات كتير. حاول تاني بعد 30 دقيقة.', LOCK: 'محاولات كتير. حاول تاني بعد شوية.',
  },
  en: {
    title: 'My Rewards', sub: 'Track your visits and rewards', phone: 'Mobile number', code: 'Secret code (6 digits)',
    codeHint: 'The cashier sends your code on WhatsApp. No code yet? Ask on your next visit.',
    show: 'Show my rewards', checking: 'Checking…', hi: (n) => `Hi ${n} 👋`, hiAnon: 'Hi 👋',
    of: (p, r) => `${p} of ${r} visits completed`, done: 'visits completed', remaining: (n) => n === 1 ? 'Just 1 more visit!' : `${n} more visits to go`,
    next: (rw, r) => `Next reward: ${rw} your next haircut after completing ${r} qualifying visits.`,
    congrats: 'Congratulations! مبروك! 🎉', unlocked: (rw) => `You've unlocked ${rw} your next haircut!`, ready: 'Your reward is ready to redeem — just tell the cashier.',
    expires: (d) => `Valid until ${d}`, nextOnly: 'Valid on your next visit only', total: (n) => `Total qualifying visits: ${n}`,
    history: 'Past rewards', used: (d) => `Used ${d}`, expired: 'Expired', saved: (a) => `You saved ${a}`,
    rules: (r, rw) => `Every ${r} haircut visits = ${rw} the next one`, paused: 'The rewards program is paused for now.',
    logout: 'Not you? Sign out', refresh: 'Refresh', lang: 'عربي', percent: (v) => `${v}% OFF`, fixed: (v, c) => `${v} ${c} OFF`,
    cycle: 'Current cycle', privacy: 'Your data is protected — nobody can see it with a phone number alone.',
    offline: 'No internet connection. Try again.', err: 'Something went wrong. Try again.', badInput: 'Enter a valid mobile number and the 6-digit code.',
    GENERIC: "We couldn't verify these details. Check the number and the code.", LOCK30: 'Too many attempts. Please try again in 30 minutes.', LOCK: 'Too many attempts. Please try again later.',
  },
};
const t = (k, ...a) => { const v = T[lang][k]; return typeof v === 'function' ? v(...a) : v; };
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const digits = (s) => String(s || '').replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/[۰-۹]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d)).replace(/\D/g, '');
const $ = (s) => document.querySelector(s);
const fmtDate = (ymd) => { try { return new Intl.DateTimeFormat(lang === 'ar' ? 'ar-EG' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(ymd + 'T12:00:00Z')); } catch (e) { return ymd; } };
const curName = (c) => (lang === 'ar' && /^EGP$/i.test(c) ? 'ج.م' : c);
const rewardText = (type, value, cur) => (type === 'FIXED' ? t('fixed', Number(value).toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-US'), curName(cur)) : t('percent', value));
const rewardWords = (type, value, cur) => (lang === 'ar' ? `خصم ${type === 'FIXED' ? `${value} ${curName(cur)}` : value + '%'}` : rewardText(type, value, cur) + ' on');

function applyLang() {
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  document.title = `${t('title')} — Karamila`;
}

async function api(action, data) {
  if (!API) throw Object.assign(new Error(t('err')), { code: 'CONFIG' });
  let res;
  try { res = await fetch(API, { method: 'POST', body: JSON.stringify({ action, data }), redirect: 'follow' }); }
  catch (e) { throw Object.assign(new Error(t('offline')), { code: 'NETWORK' }); }
  let j; try { j = await res.json(); } catch (e) { throw Object.assign(new Error(t('err')), { code: 'NETWORK' }); }
  if (!j.ok) {
    const m = String(j.message || '');
    const msg = /30 minutes/.test(m) ? t('LOCK30') : /Too many/.test(m) ? t('LOCK') : /verify/.test(m) ? t('GENERIC') : t('err');
    throw Object.assign(new Error(msg), { code: 'API' });
  }
  return j.data;
}

const shell = (inner) => `
  <header class="mb-6 flex items-center gap-3">
    <span class="grid h-11 w-11 place-items-center rounded-2xl bg-amber-500 text-slate-900 shadow-lg shadow-amber-500/20">
      <svg class="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M20 4 8.12 15.88M14.47 14.48 20 20M8.12 8.12 12 12"/></svg></span>
    <div class="min-w-0 flex-1"><div class="text-xl font-extrabold leading-tight">${esc(t('title'))}</div><div class="text-xs text-slate-400">${esc(state.shop || 'Karamila')} · ${esc(t('sub'))}</div></div>
    <button id="lang" class="rounded-full bg-slate-800 px-3 py-1.5 text-xs font-bold text-amber-400">${esc(t('lang'))}</button>
  </header>${inner}`;

const state = { shop: '', program: null, card: null };

function renderForm(err = '') {
  const p = state.program;
  $('#rw').innerHTML = shell(`
    ${p ? `<div class="mb-5 rounded-3xl bg-gradient-to-br from-amber-500/20 to-slate-800 p-5 ring-1 ring-amber-500/30">
      <div class="text-3xl">🎁</div>
      <div class="mt-2 text-lg font-bold leading-snug">${p.active ? esc(t('rules', p.required, rewardWords(p.type, p.value, p.currency))) : esc(t('paused'))}</div>
      <div class="mt-3 flex gap-1.5">${dots(0, p.required, 'h-8 w-8')}</div></div>` : ''}
    <form id="f" class="space-y-3 rounded-3xl bg-slate-800/80 p-5 ring-1 ring-white/5" autocomplete="off" novalidate>
      <label class="block text-sm font-medium text-slate-300">${esc(t('phone'))}
        <input id="ph" type="tel" inputmode="tel" dir="ltr" class="inp mt-1 h-14 text-center text-xl tracking-wider" placeholder="01xxxxxxxxx" maxlength="16" required></label>
      <label class="block text-sm font-medium text-slate-300">${esc(t('code'))}
        <input id="cd" type="text" inputmode="numeric" dir="ltr" autocomplete="one-time-code" class="inp mt-1 h-14 text-center font-mono text-2xl tracking-[.4em]" placeholder="••••••" maxlength="6" required></label>
      <p id="err" class="min-h-5 text-sm font-medium text-red-400" role="alert">${esc(err)}</p>
      <button id="go" class="btn-primary h-14 w-full text-lg">${esc(t('show'))}</button>
      <p class="text-xs leading-relaxed text-slate-400">${esc(t('codeHint'))}</p>
    </form>
    <p class="mt-4 flex items-center justify-center gap-1.5 text-center text-[11px] text-slate-500">🔒 ${esc(t('privacy'))}</p>`);
  bindCommon();
  $('#f').addEventListener('submit', async (e) => {
    e.preventDefault();
    const phone = digits($('#ph').value), code = digits($('#cd').value);
    if (phone.length < 10 || code.length !== 6) { $('#err').textContent = t('badInput'); return; }
    const btn = $('#go'); btn.disabled = true; btn.textContent = t('checking');
    try { const c = await api('loyaltyCard', { phone, code }); store.set('rwKey', c.key); showCard(c); }
    catch (er) { $('#err').textContent = er.message; btn.disabled = false; btn.textContent = t('show'); }
  });
}

function dots(progress, required, cls) {
  if (required > 10) return `<div class="h-3 w-full rounded-full bg-slate-700"><div class="h-3 rounded-full bg-amber-500" style="width:${Math.round((progress / required) * 100)}%"></div></div>`;
  return Array.from({ length: required }, (_, i) => `<span class="${cls} grid place-items-center rounded-full ${i < progress ? 'bg-amber-500 text-slate-900' : 'bg-slate-700/70 text-slate-500 ring-1 ring-white/10'}">
    <svg class="h-1/2 w-1/2" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">${i < progress ? '<path d="M20 6 9 17l-5-5"/>' : '<circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M20 4 8.12 15.88M14.47 14.48 20 20M8.12 8.12 12 12"/>'}</svg></span>`).join('');
}

function showCard(c) {
  state.card = c; state.shop = c.shopName;
  const p = c.program, cur = c.currency;
  const has = c.available.length > 0;
  // A just-completed cycle shows full (5/5) until the reward is used; the next cycle starts after redemption.
  const prog = has && c.progress === 0 ? p.required : c.progress;
  const rem = has && c.progress === 0 ? 0 : c.remaining;
  $('#rw').innerHTML = shell(`
    <div class="mb-1 text-2xl font-extrabold">${esc(c.firstName ? t('hi', c.firstName) : t('hiAnon'))}</div>
    <p class="mb-5 text-sm text-slate-400">${esc(t('total', c.totalVisits))}</p>
    ${c.available.map((r) => `<div class="mb-4 overflow-hidden rounded-3xl bg-gradient-to-br from-amber-400 to-amber-600 p-5 text-slate-900 shadow-xl shadow-amber-500/20">
      <div class="text-2xl font-extrabold">${esc(t('congrats'))}</div>
      <div class="mt-2 text-lg font-bold leading-snug">${esc(t('unlocked', rewardWords(r.type, r.value, cur)))}</div>
      <div class="mt-1 text-sm font-medium opacity-90">${esc(t('ready'))}</div>
      <div class="mt-3 inline-flex flex-wrap gap-2 text-xs font-bold">${r.expiresOn ? `<span class="rounded-full bg-slate-900/15 px-3 py-1">⏳ ${esc(t('expires', fmtDate(r.expiresOn)))}</span>` : ''}${p.nextVisitOnly ? `<span class="rounded-full bg-slate-900/15 px-3 py-1">${esc(t('nextOnly'))}</span>` : ''}</div>
    </div>`).join('')}
    <section class="rounded-3xl bg-slate-800/80 p-5 ring-1 ring-white/5">
      <div class="mb-1 text-xs font-semibold text-slate-400">${esc(t('cycle'))}</div>
      <div class="mb-4 flex items-baseline gap-2"><span class="text-5xl font-extrabold text-amber-400">${prog}</span><span class="text-xl font-bold text-slate-400">/ ${p.required}</span><span class="text-sm text-slate-400">${esc(t('done'))}</span></div>
      <div class="mb-4 flex flex-wrap gap-2" aria-label="${esc(t('of', prog, p.required))}">${dots(prog, p.required, 'h-11 w-11')}</div>
      <div class="text-base font-bold">${esc(t('of', prog, p.required))}</div>
      ${p.active ? `<div class="mt-1 text-sm text-amber-300">${rem ? esc(t('remaining', rem)) : ''}</div>
      <div class="mt-3 rounded-2xl bg-slate-900/50 p-3 text-sm text-slate-300">🎯 ${esc(t('next', rewardWords(p.type, p.value, cur), p.required))}</div>`
      : `<div class="mt-3 rounded-2xl bg-slate-900/50 p-3 text-sm text-slate-300">${esc(t('paused'))}</div>`}
      ${c.cycleDates.length ? `<div class="mt-3 flex flex-wrap gap-1.5">${c.cycleDates.map((d) => `<span class="rounded-full bg-slate-900/60 px-2.5 py-1 text-[11px] text-slate-400">✓ ${esc(fmtDate(d))}</span>`).join('')}</div>` : ''}
    </section>
    ${c.history.length ? `<section class="mt-4 rounded-3xl bg-slate-800/60 p-5 ring-1 ring-white/5"><div class="mb-2 text-sm font-bold">${esc(t('history'))}</div>
      ${c.history.map((r) => `<div class="flex items-center gap-3 border-t border-white/5 py-2.5 text-sm first:border-0">
        <span class="text-lg">${r.status === 'REDEEMED' ? '✅' : '⌛'}</span>
        <div class="flex-1"><div class="font-medium">${esc(rewardText(r.type, r.value, cur))}</div>
        <div class="text-xs text-slate-400">${r.status === 'REDEEMED' ? esc(t('used', fmtDate(r.redeemedDate))) + (r.discount ? ' · ' + esc(t('saved', `${r.discount} ${curName(cur)}`)) : '') : esc(t('expired')) + (r.expiresOn ? ' · ' + esc(fmtDate(r.expiresOn)) : '')}</div></div></div>`).join('')}</section>` : ''}
    <div class="mt-6 flex items-center justify-between text-sm">
      <button id="out" class="text-slate-400 underline-offset-4 hover:underline">${esc(t('logout'))}</button>
      <button id="ref" class="rounded-full bg-slate-800 px-4 py-2 font-semibold text-slate-200">↻ ${esc(t('refresh'))}</button>
    </div>
    <p class="mt-6 text-center text-[11px] text-slate-500">🔒 ${esc(t('privacy'))}</p>`);
  bindCommon();
  if (has && !sessionStorage.getItem('rwCelebrated')) { try { sessionStorage.setItem('rwCelebrated', '1'); } catch (e) { /* ignore */ } confetti(); }
  $('#out').addEventListener('click', () => { store.del('rwKey'); state.card = null; renderForm(); });
  $('#ref').addEventListener('click', () => loadByKey(store.get('rwKey')));
}

function bindCommon() {
  $('#lang').addEventListener('click', () => { lang = lang === 'ar' ? 'en' : 'ar'; store.set('lang', lang); applyLang(); if (state.card) showCard(state.card); else renderForm(); });
}

async function loadByKey(key) {
  $('#rw').innerHTML = shell(`<div class="grid h-60 place-items-center text-slate-400">${esc(t('checking'))}</div>`);
  try { const c = await api('loyaltyCard', { key }); store.set('rwKey', c.key); showCard(c); }
  catch (e) { if (e.code === 'API') store.del('rwKey'); renderForm(e.message); }
}

function confetti() {
  const box = document.createElement('div');
  box.style.cssText = 'position:fixed;inset:0;pointer-events:none;overflow:hidden;z-index:60';
  const colors = ['#f59e0b', '#fbbf24', '#10b981', '#38bdf8', '#f472b6', '#ffffff'];
  for (let i = 0; i < 70; i++) {
    const s = document.createElement('span');
    const size = 6 + Math.random() * 6;
    s.style.cssText = `position:absolute;top:-20px;left:${Math.random() * 100}%;width:${size}px;height:${size * 0.6}px;background:${colors[i % colors.length]};border-radius:2px;opacity:.95;transform:rotate(${Math.random() * 360}deg)`;
    s.animate([{ transform: `translateY(0) rotate(0deg)` }, { transform: `translateY(${innerHeight + 40}px) rotate(${360 + Math.random() * 360}deg)` }],
      { duration: 1800 + Math.random() * 1600, delay: Math.random() * 400, easing: 'cubic-bezier(.2,.6,.4,1)', fill: 'forwards' });
    box.appendChild(s);
  }
  document.body.appendChild(box);
  setTimeout(() => box.remove(), 4200);
}

/* ------------------------------ start ------------------------------ */
applyLang();
const hashKey = (() => { const m = location.hash.match(/[#&]k=([^&]+)/); return m ? decodeURIComponent(m[1]) : ''; })();
if (hashKey) history.replaceState(null, '', location.pathname + location.search);   // don't leave the key in the address bar
api('loyaltyProgram', {}).then((p) => {
  state.program = p; state.shop = p.shopName;
  if (state.card || !$('#f')) return;
  const keep = { ph: $('#ph').value, cd: $('#cd').value, err: $('#err').textContent, busy: $('#go').disabled };
  if (keep.busy) return;
  renderForm(keep.err); $('#ph').value = keep.ph; $('#cd').value = keep.cd;
}).catch(() => {});
window.addEventListener('hashchange', () => { if (/[#&]k=/.test(location.hash)) location.reload(); });
const key = hashKey || store.get('rwKey');
if (key) loadByKey(key); else renderForm();
})();
