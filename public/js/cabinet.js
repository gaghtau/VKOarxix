// Кабинет редактора: вход по логину и паролю, все комментарии в одном окне,
// уведомления о новых комментариях, удаление и публикация, добавление новостей и событий.
import { icon, logoMark } from './icons.js';

const root = document.getElementById('cab');
const C = { user: null, csrf: null, tab: 'comments', filter: 'pending', lastSeen: Number(localStorage.getItem('cab-last') || 0), knownLast: 0, timer: null, fresh: new Set() };
const esc = (s = '') => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const fmt = (iso) => (iso ? new Date(iso).toLocaleString('ru-RU', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }) : '');
const LINK = { record: (id) => `/ru/catalog/${id}`, exhibition: (id) => `/ru/exhibitions/${id}`, news: (id) => `/ru/news/${id}`, collection: (id) => `/ru/memory/collection/${id}`, person: (id) => `/ru/memory/person/${id}` };

async function api(url, opts = {}) {
  const res = await fetch(url, { ...opts, headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': C.csrf || '' }, body: opts.body ? JSON.stringify(opts.body) : undefined });
  let d = null; try { d = await res.json(); } catch { /* */ }
  if (res.status === 401) { stopPolling(); login(d?.message || 'Сессия завершена. Войдите снова.'); throw new Error('auth'); }
  if (!res.ok) throw new Error(d?.message || (d?.errors || []).join('; ') || 'Ошибка');
  return d;
}
function toast(msg) {
  let st = document.querySelector('.toast-stack'); if (!st) { st = document.createElement('div'); st.className = 'toast-stack'; st.setAttribute('role', 'status'); document.body.append(st); }
  const t = document.createElement('div'); t.className = 't'; t.textContent = msg; st.append(t); setTimeout(() => t.remove(), 4500);
}

// ---------------------------------------------------------------- Вход
function login(msg = '') {
  stopPolling();
  root.innerHTML = `<div class="cab-login"><form novalidate>
    <div class="row" style="gap:12px"><span class="logo-mark">${logoMark}</span><div><h1>Кабинет редактора</h1><div class="small muted">Государственный архив ВКО</div></div></div>
    <div class="field"><label for="l">Логин</label><input id="l" class="input" name="login" autocomplete="username" required></div>
    <div class="field"><label for="p">Пароль</label><input id="p" class="input" name="password" type="password" autocomplete="current-password" required></div>
    <p class="err" role="alert">${esc(msg)}</p>
    <button class="btn btn-accent" style="min-height:52px;font-size:1.05rem">${icon('lock')}Войти</button>
    <a href="/ru/" class="small">← Вернуться на сайт</a></form></div>`;
  const f = root.querySelector('form'); f.login.focus();
  f.onsubmit = async (e) => {
    e.preventDefault();
    const err = root.querySelector('.err');
    if (!f.login.value.trim() || !f.password.value) { err.textContent = 'Введите логин и пароль.'; return; }
    const b = f.querySelector('button'); b.disabled = true;
    try {
      const r = await fetch('/api/admin/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ login: f.login.value, password: f.password.value }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.message);
      if (!d.user.perms.includes('comments.moderate')) throw new Error('У этой учётной записи нет доступа к кабинету редактора.');
      C.user = d.user; C.csrf = d.csrf; shell();
    } catch (ex) {
      err.textContent = ex.message || 'Неверный логин или пароль.';
      root.querySelector('.cab-login').classList.remove('shake'); void root.offsetWidth; root.querySelector('.cab-login').classList.add('shake');
      f.password.value = ''; f.password.focus();
    } finally { b.disabled = false; }
  };
}

// ---------------------------------------------------------------- Каркас кабинета
function shell() {
  root.innerHTML = `<header class="cab-top"><div class="wrap">
    <span class="logo-mark" style="width:38px;height:38px">${logoMark}</span><b>Кабинет редактора</b><span class="sp"></span>
    <button class="lnk bell" data-bell aria-label="Новые комментарии">${icon('message')}<span class="badge" data-badge hidden>0</span></button>
    <span class="hide-xs" style="opacity:.85">${esc(C.user.name)}</span>
    <a href="/ru/" target="_blank" rel="noopener">${icon('ext')}<span class="hide-xs">На сайт</span></a>
    <button class="lnk" data-out>${icon('logout')}<span class="hide-xs">Выйти</span></button></div></header>
  <main class="wrap" style="padding-bottom:60px">
    <nav class="cab-tabs" role="tablist">
      <button role="tab" data-tab="comments">Комментарии <span class="n" data-pn>0</span></button>
      <button role="tab" data-tab="add">Добавить на сайт</button>
      <button role="tab" data-tab="mine">Мои публикации</button>
    </nav>
    <section data-view></section></main>`;
  root.querySelector('[data-out]').onclick = async () => { await api('/api/admin/logout', { method: 'POST' }).catch(() => {}); C.user = null; login('Вы вышли из кабинета.'); };
  root.querySelector('[data-bell]').onclick = () => { C.filter = 'pending'; open('comments'); };
  root.querySelectorAll('[data-tab]').forEach((b) => { b.onclick = () => open(b.dataset.tab); });
  open('comments');
  startPolling();
}
function open(tab) {
  C.tab = tab;
  root.querySelectorAll('[data-tab]').forEach((b) => b.setAttribute('aria-selected', b.dataset.tab === tab));
  ({ comments, add, mine })[tab](root.querySelector('[data-view]'));
}

// ---------------------------------------------------------------- Уведомления о новых комментариях
async function poll(first = false) {
  try {
    const s = await api('/api/admin/comments/summary');
    const pending = s.pending || 0, last = s.lastId || 0;
    const badge = root.querySelector('[data-badge]'); const pn = root.querySelector('[data-pn]');
    if (badge) { badge.hidden = !pending; badge.textContent = pending; }
    if (pn) pn.textContent = pending;
    document.title = (pending ? `(${pending}) ` : '') + 'Кабинет редактора | Госархив ВКО';
    if (!first && last > C.knownLast) {
      const fresh = (await api('/api/admin/comments?status=pending')).filter((c) => c.id > C.knownLast);
      fresh.forEach((c) => {
        C.fresh.add(c.id);
        toast(`Новый комментарий от ${c.name || 'Гость'}: «${c.text.slice(0, 60)}»`);
        if ('Notification' in window && Notification.permission === 'granted') new Notification('Новый комментарий — Госархив ВКО', { body: `${c.name || 'Гость'}: ${c.text.slice(0, 120)}`, icon: '/img/favicon.svg', tag: 'cm-' + c.id });
      });
      const bell = root.querySelector('[data-bell]'); bell?.classList.remove('ring'); void bell?.offsetWidth; bell?.classList.add('ring');
      if (C.tab === 'comments') comments(root.querySelector('[data-view]'));
    }
    C.knownLast = Math.max(C.knownLast, last);
  } catch { /* сеть недоступна — попробуем позже */ }
}
function startPolling() { stopPolling(); poll(true); C.timer = setInterval(poll, 15000); }
function stopPolling() { clearInterval(C.timer); C.timer = null; }

// ---------------------------------------------------------------- Комментарии
async function comments(view) {
  const rows = await api('/api/admin/comments' + (C.filter === 'pending' ? '?status=pending' : ''));
  const notif = 'Notification' in window && Notification.permission === 'default';
  view.innerHTML = `<div class="row" style="justify-content:space-between;margin-bottom:16px">
      <div class="levels" role="group"><button data-f="pending" aria-pressed="${C.filter === 'pending'}">Ждут проверки</button><button data-f="all" aria-pressed="${C.filter === 'all'}">Все комментарии</button></div>
      ${notif ? '<button class="btn btn-sm" data-notify>' + icon('message') + 'Уведомлять на рабочем столе</button>' : ''}</div>
    ${rows.length ? rows.map(card).join('') : `<div class="empty-state">${icon('check').replace('<svg', '<svg style="width:48px;height:48px;margin:0 auto 10px"')}<p>${C.filter === 'pending' ? 'Новых комментариев нет. Как только посетитель напишет — придёт уведомление.' : 'Комментариев пока нет.'}</p></div>`}`;
  view.querySelectorAll('[data-f]').forEach((b) => { b.onclick = () => { C.filter = b.dataset.f; comments(view); }; });
  view.querySelector('[data-notify]')?.addEventListener('click', async () => { const p = await Notification.requestPermission(); toast(p === 'granted' ? 'Уведомления включены' : 'Уведомления не разрешены в браузере'); comments(view); });
  view.onclick = async (e) => {
    const b = e.target.closest('[data-act]'); if (!b) return;
    const el = b.closest('[data-id]'); const id = el.dataset.id;
    try {
      if (b.dataset.act === 'delete') {
        if (!confirm('Удалить комментарий? Это действие нельзя отменить.')) return;
        await api('/api/admin/comments/' + id, { method: 'DELETE' });
        el.classList.add('removing'); setTimeout(() => { el.remove(); }, 260); toast('Комментарий удалён'); poll(true); return;
      }
      if (b.dataset.act === 'reply') { el.querySelector('[data-reply-box]').hidden = !el.querySelector('[data-reply-box]').hidden; el.querySelector('textarea')?.focus(); return; }
      if (b.dataset.act === 'publish' || b.dataset.act === 'save-reply') {
        const reply = el.querySelector('textarea')?.value;
        await api('/api/admin/comments/' + id, { method: 'PUT', body: { status: 'published', reply } });
        toast(b.dataset.act === 'publish' ? 'Комментарий опубликован на сайте' : 'Ответ опубликован'); C.fresh.delete(Number(id)); comments(view); poll(true);
      }
      if (b.dataset.act === 'hide') { await api('/api/admin/comments/' + id, { method: 'PUT', body: { status: 'rejected' } }); toast('Комментарий скрыт с сайта'); comments(view); poll(true); }
    } catch (ex) { if (ex.message !== 'auth') toast(ex.message); }
  };
  C.lastSeen = C.knownLast; localStorage.setItem('cab-last', String(C.lastSeen));
}
const card = (c) => `<article class="cm-card ${c.status === 'pending' ? 'pending' : ''} ${C.fresh.has(c.id) ? 'fresh' : ''}" data-id="${c.id}">
  <div class="who"><span class="av">${esc((c.name || 'Г').charAt(0).toUpperCase())}</span><b>${esc(c.name || 'Гость')}</b><span class="small muted">${fmt(c.at)}</span>
    ${c.status === 'pending' ? '<span class="tag tag-accent">ждёт проверки</span>' : c.status === 'published' ? '<span class="tag tag-ok">на сайте</span>' : '<span class="tag">скрыт</span>'}${C.fresh.has(c.id) ? '<span class="tag tag-warn">новый</span>' : ''}</div>
  <div class="to">К материалу: <a href="${(LINK[c.target_type] || (() => '#'))(c.target_id)}" target="_blank" rel="noopener">${esc(c.target_title || c.target_id)}</a></div>
  <p>${esc(c.text)}</p>
  ${c.reply ? `<div class="cm-reply"><b>Ответ архива</b><p>${esc(c.reply)}</p></div>` : ''}
  <div data-reply-box hidden><textarea class="input" placeholder="Ответ от имени архива (будет виден под комментарием)">${esc(c.reply || '')}</textarea><button class="btn btn-sm btn-brand" style="margin-top:8px" data-act="save-reply">Опубликовать ответ</button></div>
  <div class="acts">${c.status !== 'published' ? `<button class="btn btn-sm btn-brand" data-act="publish">${icon('check')}Опубликовать</button>` : `<button class="btn btn-sm" data-act="hide">Скрыть</button>`}<button class="btn btn-sm" data-act="reply">${icon('message')}Ответить</button><button class="btn btn-sm btn-danger" data-act="delete">${icon('trash')}Удалить</button></div></article>`;

// ---------------------------------------------------------------- Добавление на сайт
const TOPICS = ['город', 'архив', 'промышленность', 'образование', 'культура', 'ВОВ', 'власть', 'история края'];
function add(view, kind = 'news') {
  view.innerHTML = `<div class="levels" role="group" style="margin-bottom:18px"><button data-k="news" aria-pressed="${kind === 'news'}">Новость</button><button data-k="event" aria-pressed="${kind === 'event'}">Событие в хронологию</button></div>
  <form class="add-form" novalidate>
    ${kind === 'news' ? `
      <div class="field"><label for="t">Заголовок *</label><input id="t" class="input" name="title" maxlength="160" required></div>
      <div class="field"><label for="ld">Коротко (одно-два предложения)</label><input id="ld" class="input" name="lead" maxlength="300"></div>
      <div class="field"><label for="bd">Текст новости *</label><textarea id="bd" class="input" name="body" style="min-height:200px" required></textarea></div>
      <div class="grid g2"><div class="field"><label for="dt">Дата</label><input id="dt" class="input" type="date" name="date" value="${new Date().toISOString().slice(0, 10)}"></div>
        <div class="field"><label for="ct">Рубрика</label><select id="ct" class="input" name="cat"><option value="events">Мероприятия</option><option value="exhibitions">Выставки</option><option value="research">Исследования</option><option value="official">Официально</option><option value="branches">Филиалы</option><option value="publications">Публикации</option></select></div></div>`
    : `
      <div class="grid g2"><div class="field"><label for="yr">Год *</label><input id="yr" class="input" name="year" type="number" min="1700" max="2100" required></div>
        <div class="field"><label for="tp">Тема</label><select id="tp" class="input" name="topic">${TOPICS.map((x) => `<option>${x}</option>`).join('')}</select></div></div>
      <div class="field"><label for="t">Что произошло *</label><input id="t" class="input" name="title" maxlength="200" required></div>
      <div class="field"><label for="src">Источник</label><input id="src" class="input" name="source" placeholder="например: Ф.25. Оп.1. Д.7 или «Календарь памятных дат»"></div>`}
    <div class="field"><span class="label">Фото (необязательно)</span><label class="photo-drop" data-drop>${icon('upload')}<span data-drop-t>Нажмите или перетащите фото (JPEG, PNG, до 3 МБ)</span><input type="file" accept="image/jpeg,image/png,image/webp" hidden data-file></label></div>
    <label class="fopt"><input type="checkbox" name="now" checked> Сразу показать на сайте</label>
    <p class="err" role="alert" style="color:var(--danger);margin:0"></p>
    <div class="row"><button class="btn btn-accent" style="min-height:52px">${icon('check')}${kind === 'news' ? 'Опубликовать новость' : 'Добавить событие'}</button></div>
  </form><div data-done style="margin-top:20px"></div>`;
  view.querySelectorAll('[data-k]').forEach((b) => { b.onclick = () => add(view, b.dataset.k); });
  let imageUrl = null;
  const drop = view.querySelector('[data-drop]'), file = view.querySelector('[data-file]');
  const upload = async (f) => {
    if (!f) return;
    if (f.size > 3 * 1024 * 1024) { toast('Файл больше 3 МБ'); return; }
    view.querySelector('[data-drop-t]').textContent = 'Загрузка…';
    const data = await new Promise((ok) => { const r = new FileReader(); r.onload = () => ok(r.result); r.readAsDataURL(f); });
    try { imageUrl = (await api('/api/admin/upload', { method: 'POST', body: { data } })).url; drop.querySelector('img')?.remove(); drop.insertAdjacentHTML('afterbegin', `<img src="${esc(imageUrl)}" alt="">`); view.querySelector('[data-drop-t]').textContent = 'Фото загружено. Нажмите, чтобы заменить.'; }
    catch (ex) { view.querySelector('[data-drop-t]').textContent = ex.message; }
  };
  file.onchange = () => upload(file.files[0]);
  drop.ondragover = (e) => { e.preventDefault(); drop.classList.add('over'); };
  drop.ondragleave = () => drop.classList.remove('over');
  drop.ondrop = (e) => { e.preventDefault(); drop.classList.remove('over'); upload(e.dataTransfer.files[0]); };
  view.querySelector('form').onsubmit = async (e) => {
    e.preventDefault(); const f = e.target; const err = view.querySelector('.err');
    const title = f.title.value.trim();
    if (!title || (kind === 'news' && !f.body.value.trim()) || (kind === 'event' && !f.year.value)) { err.textContent = 'Заполните поля, отмеченные звёздочкой.'; return; }
    err.textContent = '';
    const data = kind === 'news'
      ? { title: { ru: title }, lead: { ru: f.lead.value.trim() || title }, body: { ru: f.body.value.trim() }, date: f.date.value, cat: f.cat.value, ...(imageUrl ? { coverUrl: imageUrl } : {}) }
      : { year: Number(f.year.value), topic: f.topic.value, title: { ru: title }, source: f.source.value.trim() || 'Государственный архив ВКО', ...(imageUrl ? { imageUrl } : {}) };
    const slug = kind === 'news' ? 'n-' + Date.now().toString(36) : 'ev-' + Date.now().toString(36);
    try {
      const r = await api('/api/admin/content/' + kind, { method: 'POST', body: { slug, data, publishNow: f.now.checked } });
      const url = kind === 'news' ? `/ru/news/${r.slug}` : '/ru/memory/timeline';
      view.querySelector('[data-done]').innerHTML = `<div class="notice ok">${icon('check')}<div><b>${r.wf_status === 'published' ? 'Опубликовано на сайте.' : 'Сохранено как черновик.'}</b> ${r.wf_status === 'published' ? `<a href="${url}" target="_blank" rel="noopener">Посмотреть →</a>` : 'Его увидят после согласования.'}</div></div>`;
      f.reset(); imageUrl = null; drop.querySelector('img')?.remove(); view.querySelector('[data-drop-t]').textContent = 'Нажмите или перетащите фото (JPEG, PNG, до 3 МБ)';
      toast('Готово');
    } catch (ex) { if (ex.message !== 'auth') err.textContent = ex.message; }
  };
}

// ---------------------------------------------------------------- Мои публикации
async function mine(view) {
  const [news, events] = await Promise.all([api('/api/admin/content/news'), api('/api/admin/content/event')]);
  const rows = [...news.map((x) => ({ ...x, type: 'news' })), ...events.map((x) => ({ ...x, type: 'event' }))].filter((x) => x.created_by === C.user.login).sort((a, b) => (a.updated_at < b.updated_at ? 1 : -1));
  view.innerHTML = rows.length ? `<div class="table-wrap"><table class="table"><thead><tr><th>Что</th><th>Название</th><th>Статус</th><th></th></tr></thead><tbody>${rows.map((r) => `<tr><td>${r.type === 'news' ? 'Новость' : 'Событие ' + esc(r.data.year)}</td><td>${esc(r.data.title?.ru)}</td><td>${r.wf_status === 'published' ? '<span class="tag tag-ok">на сайте</span>' : r.wf_status === 'archived' ? '<span class="tag">снято</span>' : '<span class="tag tag-warn">черновик</span>'}</td><td><div class="row" style="gap:6px;flex-wrap:nowrap">${r.wf_status === 'published' ? `<a class="btn btn-sm" target="_blank" rel="noopener" href="${r.type === 'news' ? '/ru/news/' + r.slug : '/ru/memory/timeline'}">Открыть</a><button class="btn btn-sm btn-danger" data-arch="${r.type}|${r.id}">Снять с сайта</button>` : ''}</div></td></tr>`).join('')}</tbody></table></div>`
    : `<div class="empty-state"><p>Вы ещё ничего не добавляли.</p><button class="btn btn-brand" data-go>Добавить новость</button></div>`;
  view.querySelector('[data-go]')?.addEventListener('click', () => open('add'));
  view.onclick = async (e) => {
    const b = e.target.closest('[data-arch]'); if (!b) return;
    if (!confirm('Снять материал с сайта? Его можно будет вернуть через админ-панель.')) return;
    const [type, id] = b.dataset.arch.split('|');
    try { await api(`/api/admin/content/${type}/${id}/status`, { method: 'POST', body: { to: 'archived' } }); toast('Снято с сайта'); mine(view); } catch (ex) { toast(ex.message); }
  };
}

(async () => {
  try { const r = await fetch('/api/admin/me'); if (r.ok) { const d = await r.json(); if (d.user.perms.includes('comments.moderate')) { C.user = d.user; C.csrf = d.csrf; shell(); return; } } } catch { /* */ }
  login();
})();
