// Административная панель. Видимость пунктов зависит от роли, но КАЖДАЯ операция
// дополнительно проверяется на сервере (переключатель «Проверка прав» показывает это).
import { icon, logoMark } from './icons.js';

const root = document.getElementById('admin');
const A = { user: null, csrf: null, roles: {}, demoAll: false };
const esc = (s = '') => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const can = (p) => A.demoAll || A.user?.perms.includes(p);
const ST = { draft: 'Черновик', review: 'На проверке', rework: 'Требует доработки', approved: 'Одобрено', published: 'Опубликовано', archived: 'Архивировано' };
const FILE = { public: 'Публично', restricted: 'Ограничен', none: 'Нет копии', review: 'Требует проверки' };
const DESC = { public: 'Публично', hidden: 'Не публиковать', review: 'Требует проверки' };
const TYPES = { text: 'Текстовый', photo: 'Фото', map: 'Карта/план', org: 'Документ организации', personal: 'Личного происхождения', newspaper: 'Газета', audio: 'Аудио', video: 'Видео' };
const status = (s) => `<span class="status st-${s}">${ST[s] || s}</span>`;
const fmt = (iso) => (iso ? new Date(iso).toLocaleString('ru-RU', { dateStyle: 'short', timeStyle: 'short' }) : '—');

async function api(url, opts = {}) {
  const res = await fetch(url, { ...opts, headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': A.csrf || '', ...(opts.headers || {}) }, body: opts.body && typeof opts.body !== 'string' ? JSON.stringify(opts.body) : opts.body });
  let data = null; try { data = await res.json(); } catch { /* */ }
  if (res.status === 401) { A.user = null; login(data?.message); throw new Error(data?.message || 'Требуется вход'); }
  if (!res.ok) { const e = new Error(data?.message || (data?.errors || []).join('; ') || res.statusText); e.data = data; e.status = res.status; throw e; }
  return data;
}
function toast(msg, bad) {
  document.querySelector('.toast')?.remove();
  const el = document.createElement('div'); el.className = 'toast'; el.setAttribute('role', 'status'); if (bad) el.style.background = 'var(--danger)';
  el.textContent = msg; document.body.append(el); setTimeout(() => el.remove(), 3500);
}
function modal(html, onMount) {
  const bg = document.createElement('div'); bg.className = 'modal-bg';
  bg.innerHTML = `<div class="modal" role="dialog" aria-modal="true">${html}</div>`;
  document.body.append(bg);
  const close = () => bg.remove();
  bg.addEventListener('click', (e) => { if (e.target === bg || e.target.closest('[data-close]')) close(); });
  bg.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
  onMount?.(bg.querySelector('.modal'), close);
  bg.querySelector('input,select,textarea,button')?.focus();
  return close;
}
// Подтверждение опасных действий
const confirmDanger = (title, text) => new Promise((ok) => modal(`<h2 style="font-size:1.3rem">${icon('alert').replace('<svg', '<svg style="width:22px;display:inline;vertical-align:-4px;color:var(--danger)"')} ${esc(title)}</h2><p>${esc(text)}</p><div class="row" style="justify-content:flex-end"><button class="btn" data-close>Отмена</button><button class="btn btn-danger" data-yes>Подтвердить</button></div>`, (m, close) => { m.querySelector('[data-yes]').onclick = () => { close(); ok(true); }; m.querySelector('[data-close]').addEventListener('click', () => ok(false)); }));

// ---------------------------------------------------------------- Вход
function login(msg) {
  root.innerHTML = `<div class="login"><form class="card stack" data-login novalidate>
    <div class="row" style="gap:12px"><span class="logo-mark">${logoMark}</span><div><b style="font-family:var(--serif);font-size:1.1rem">Госархив ВКО</b><div class="small muted">Вход для сотрудников</div></div></div>
    ${msg ? `<div class="notice warn" role="alert">${icon('alert')}<div>${esc(msg)}</div></div>` : ''}
    <div class="field"><label for="lg">Логин</label><input id="lg" class="input" name="login" autocomplete="username" required></div>
    <div class="field"><label for="pw">Пароль</label><input id="pw" class="input" name="password" type="password" autocomplete="current-password" required></div>
    <button class="btn btn-accent" style="width:100%">${icon('lock')}Войти</button>
    <p class="small muted" style="margin:0">Демо-стенд. Тестовые учётные записи — в файле docs/TEST_ACCOUNTS.md. После 5 неудачных попыток вход блокируется на 5 минут; сессия завершается после 15 минут бездействия.</p>
    <a class="small" href="/ru/">← На сайт</a></form></div>`;
  root.querySelector('[data-login]').onsubmit = async (e) => {
    e.preventDefault(); const f = e.target; const b = f.querySelector('button'); b.disabled = true;
    try {
      const r = await fetch('/api/admin/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ login: f.login.value, password: f.password.value }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.message);
      A.user = d.user; A.csrf = d.csrf; const me = await api('/api/admin/me'); A.roles = me.roles; shell();
    } catch (err) { login(err.message); }
  };
}

// ---------------------------------------------------------------- Каркас
const SECTIONS = [
  ['dash', 'chart', 'Обзор и аналитика', 'stats.view'], ['queue', 'inbox', 'Согласование', null], ['catalog', 'archive', 'Электронный каталог', null],
  ['import', 'upload', 'Импорт / экспорт', 'catalog.import'], ['ai', 'sparkle', 'ИИ-инструменты', 'ai.tools'], ['content', 'news', 'Публикации', null],
  ['comments', 'message', 'Комментарии', 'comments.moderate'], ['branches', 'pin', 'Филиалы', 'branches.edit'], ['users', 'users', 'Пользователи и роли', 'users.manage'], ['audit', 'history', 'Журнал действий', 'audit.view'], ['feedback', 'inbox', 'Отзывы о сайте', 'feedback.view'],
];
function shell() {
  const sec = location.hash.slice(1) || (can('stats.view') ? 'dash' : 'queue');
  root.innerHTML = `<div class="adm"><aside class="adm-side" data-side><div class="row" style="gap:10px;padding:6px 8px 16px"><span class="logo-mark" style="width:38px;height:38px">${logoMark}</span><b style="font-family:var(--serif)">Админ-панель</b></div>
    ${SECTIONS.filter(([, , , p]) => !p || can(p)).map(([k, ic, n]) => `<a href="#${k}" ${k === sec ? 'aria-current="page"' : ''}>${icon(ic)}${n}</a>`).join('')}
    <a href="/ru/" target="_blank" rel="noopener">${icon('ext')}Открыть сайт</a>
    <div class="who"><b>${esc(A.user.name)}</b><div style="opacity:.8">${esc(A.user.roleName)}${A.user.branch ? ' · ' + esc(A.user.branch) : ''}</div>
      <label class="row small" style="gap:6px;margin-top:10px;cursor:pointer" title="Показать все кнопки, чтобы убедиться, что сервер отклоняет запрещённые операции"><input type="checkbox" data-demoall ${A.demoAll ? 'checked' : ''}> Проверка прав (показать недоступное)</label>
      <button class="btn btn-sm" style="margin-top:10px;background:transparent;color:#E8DCC4;border-color:rgba(232,220,196,.3)" data-logout>${icon('logout')}Выйти</button></div></aside>
    <main class="adm-main" id="main"><div class="skeleton" style="height:300px"></div></main></div>`;
  root.querySelector('[data-logout]').onclick = async () => { await api('/api/admin/logout', { method: 'POST' }).catch(() => {}); A.user = null; login('Вы вышли из системы.'); };
  root.querySelector('[data-demoall]').onchange = (e) => { A.demoAll = e.target.checked; shell(); };
  const main = root.querySelector('#main');
  const page = { dash, queue, catalog, import: importPage, ai, content, comments, branches, users, audit, feedback }[sec] || queue;
  page(main).catch((e) => { main.innerHTML = `<div class="notice warn" role="alert">${icon('alert')}<div><b>Ошибка</b><p>${esc(e.message)}</p></div></div>`; });
}
window.addEventListener('hashchange', () => A.user && shell());
document.addEventListener('click', (e) => { if (e.target.closest('[data-admburger]')) document.querySelector('[data-side]')?.classList.toggle('open'); });
const head = (title, extra = '') => `<div class="adm-head"><div class="row"><button class="icon-btn adm-burger" data-admburger aria-label="Меню">${icon('menu')}</button><h1>${title}</h1></div><div class="row">${extra}</div></div>`;

// ---------------------------------------------------------------- Обзор + ИИ-аналитика качества
async function dash(main) {
  const d = await api('/api/admin/analytics');
  const T = d.totals; const maxV = Math.max(...d.pages.map((p) => p.views), 1);
  main.innerHTML = `${head('Обзор и аналитика')}
  <div class="kpi">${[['Комментарии на модерации', T.comments], ['Записей в каталоге', T.records], ['Опубликовано', T.published], ['Цифровых копий', T.digital], ['Ограниченный доступ', T.restricted], ['Ожидают проверки', T.review], ['Просмотров', T.views], ['Посетителей', T.visitors]].map(([n, v]) => `<div class="card"><b>${(v ?? 0).toLocaleString('ru-RU')}</b><span class="small muted">${n}</span></div>`).join('')}</div>
  <div class="ai-box" style="margin-top:22px"><span class="ai-label">${icon('sparkle')}Рекомендации ИИ по улучшению сайта</span>
    <ul style="margin:10px 0 0;padding-left:18px">${d.recommendations.map((r) => `<li style="margin-bottom:6px"><span class="tag ${r.level === 'high' ? 'tag-danger' : r.level === 'medium' ? 'tag-warn' : ''}">${{ high: 'высокий', medium: 'средний', low: 'низкий' }[r.level]}</span> ${esc(r.text)}</li>`).join('')}</ul>
    <p class="small muted" style="margin:8px 0 0">${esc(d.privacy)} Сформировано автоматически.</p></div>
  <div class="grid g2" style="margin-top:22px">
    <div class="card"><h2 style="font-size:1.15rem">Частые поисковые запросы</h2><table class="table"><tbody>${d.top.map((q) => `<tr><td>${esc(q.q)}</td><td style="text-align:right">${q.n}</td></tr>`).join('')}</tbody></table></div>
    <div class="card"><h2 style="font-size:1.15rem">Запросы без результатов</h2><table class="table"><tbody>${d.zero.map((q) => `<tr><td>${esc(q.q)}</td><td style="text-align:right"><span class="tag tag-danger">${q.zero}</span></td></tr>`).join('') || '<tr><td class="muted">Нет</td></tr>'}</tbody></table></div>
    <div class="card"><h2 style="font-size:1.15rem">Популярность разделов</h2>${d.pages.map((p) => `<div style="margin:8px 0"><div class="row small" style="justify-content:space-between"><span>${esc(p.page)}</span><span>${p.views}</span></div><div class="bar"><i style="width:${(p.views / maxV) * 100}%"></i></div></div>`).join('')}</div>
    <div class="card"><h2 style="font-size:1.15rem">Опрос посетителей</h2>${d.poll.map((p) => `<div class="row small" style="justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--line)"><span>${esc(p.option)}</span><b>${p.votes}</b></div>`).join('')}</div>
  </div>`;
}

// ---------------------------------------------------------------- Согласование публикаций
const NEXT = { draft: ['review'], rework: ['review'], review: ['approved', 'rework'], approved: ['published', 'rework'], published: ['archived', 'rework'], archived: ['draft'] };
const NEXT_LABEL = { review: 'Отправить на проверку', approved: 'Одобрить', rework: 'На доработку', published: 'Опубликовать', archived: 'В архив', draft: 'В черновики' };
async function queue(main) {
  const q = await api('/api/admin/queue');
  const row = (kind, id, title, st, by, at, area) => `<tr><td>${esc(kind)}</td><td>${esc(title)}</td><td>${status(st)}</td><td class="small">${esc(by || '')}<br>${fmt(at)}</td><td><div class="row" style="gap:6px">${(NEXT[st] || []).map((to) => `<button class="btn btn-sm ${to === 'published' || to === 'approved' ? 'btn-brand' : ''}" data-tr="${area}|${id}|${to}">${NEXT_LABEL[to]}</button>`).join('')}</div></td></tr>`;
  main.innerHTML = `${head('Согласование публикаций')}
  <div class="notice" style="margin-bottom:16px">${icon('info')}<div><p class="small">Процесс: сотрудник создаёт материал (Черновик) → «На проверке» → модератор одобряет или возвращает на доработку → публикация. Переходы, недоступные вашей роли, сервер отклоняет (403) и записывает в журнал.</p></div></div>
  <div class="table-wrap"><table class="table"><thead><tr><th>Тип</th><th>Материал</th><th>Статус</th><th>Автор / дата</th><th>Действия</th></tr></thead><tbody>
  ${q.records.map((r) => row('Каталог', r.id, `${r.cipher || ''} — ${r.title.ru}`, r.wf_status, r.created_by, r.updated_at, 'records')).join('')}
  ${q.content.map((c) => row({ news: 'Новость', exhibition: 'Выставка', faq: 'FAQ', collection: 'Коллекция' }[c.type] || c.type, c.id, c.data.title?.ru || c.data.q?.ru || c.slug, c.wf_status, c.created_by, c.updated_at, 'content/' + c.type)).join('')}
  ${!q.records.length && !q.content.length ? '<tr><td colspan="5" class="muted">Очередь пуста</td></tr>' : ''}</tbody></table></div>`;
  main.onclick = async (e) => {
    const b = e.target.closest('[data-tr]'); if (!b) return;
    const [area, id, to] = b.dataset.tr.split('|');
    if (to === 'published' && !(await confirmDanger('Опубликовать материал?', 'Материал станет доступен всем посетителям сайта и поисковым системам.'))) return;
    try { await api(`/api/admin/${area}/${id}/status`, { method: 'POST', body: { to } }); toast('Статус изменён'); queue(main); } catch (err) { toast(err.message, true); }
  };
}

// ---------------------------------------------------------------- Каталог
async function catalog(main, q = '') {
  const rows = await api('/api/admin/records?q=' + encodeURIComponent(q));
  main.innerHTML = `${head('Электронный каталог', `${can('catalog.edit') ? `<button class="btn btn-accent" data-new>${icon('plus')}Новая запись</button>` : ''}`)}
  <form class="searchbar" data-s style="margin-bottom:14px"><div class="sb">${icon('search')}<input class="input" name="q" value="${esc(q)}" placeholder="Название, шифр или идентификатор"></div><button class="btn">Найти</button></form>
  <div class="table-wrap"><table class="table"><thead><tr><th>ID / шифр</th><th>Заголовок</th><th>Уровень</th><th>Описание</th><th>Файл</th><th>Статус</th><th></th></tr></thead><tbody>
  ${rows.map((r) => `<tr><td><span class="mono small">${esc(r.uid)}</span><br><span class="cipher">${esc(r.cipher || '')}</span></td><td>${esc(r.title.ru)}<div class="small muted">${esc(r.branch)} · v${r.version}</div></td><td class="small">${esc(r.level)}</td><td class="small">${DESC[r.desc_status]}</td><td class="small">${FILE[r.file_status]}</td><td>${status(r.wf_status)}</td>
    <td><div class="row" style="gap:4px;flex-wrap:nowrap">${r.editable || A.demoAll ? `<button class="icon-btn" style="width:36px;height:36px" data-edit="${r.id}" aria-label="Изменить">${icon('edit')}</button><button class="icon-btn" style="width:36px;height:36px" data-del="${r.id}" aria-label="Удалить">${icon('trash')}</button>` : `<span class="small muted" title="Запись другого филиала или нет прав">${icon('lock').replace('<svg', '<svg style="width:16px"')}</span>`}${r.pages && can('ai.tools') ? `<button class="icon-btn" style="width:36px;height:36px" data-ocr="${r.id}" aria-label="OCR">${icon('sparkle')}</button>` : ''}</div></td></tr>`).join('')}</tbody></table></div>
  <p class="small muted">Показаны последние 300 записей. Все записи каталога — демонстрационные.</p>`;
  main.querySelector('[data-s]').onsubmit = (e) => { e.preventDefault(); catalog(main, e.target.q.value); };
  main.onclick = async (e) => {
    if (e.target.closest('[data-new]')) recordForm(main, null);
    const ed = e.target.closest('[data-edit]'); if (ed) recordForm(main, await api('/api/admin/records/' + ed.dataset.edit));
    const del = e.target.closest('[data-del]');
    if (del && (await confirmDanger('Удалить запись?', 'Удаление необратимо. Для опубликованных записей используйте статус «Архивировано». Записи с дочерними элементами удалить нельзя.'))) {
      try { await api('/api/admin/records/' + del.dataset.del, { method: 'DELETE' }); toast('Запись удалена'); catalog(main, q); } catch (err) { toast(err.message, true); }
    }
    const ocr = e.target.closest('[data-ocr]'); if (ocr) ocrModal(+ocr.dataset.ocr);
  };
}
function recordForm(main, r) {
  const v = (k, d = '') => esc(r?.[k] ?? d);
  modal(`<h2 style="font-size:1.35rem">${r ? 'Редактирование записи ' + esc(r.uid) : 'Новая запись каталога'}</h2>
  ${r ? `<p class="small muted">Версия ${r.version} · статус ${status(r.wf_status)} · история: ${(r.versions || []).slice(0, 4).map((x) => `v${x.version} ${ST[x.status] || x.status} (${esc(x.author)})`).join(', ')}</p>` : ''}
  <form class="form-grid" data-rf novalidate>
    <div class="field"><label>Уровень *</label><select class="input" name="level" ${r ? 'disabled' : ''}>${['document', 'case', 'inventory', 'fund'].map((l) => `<option ${r?.level === l ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
    <div class="field"><label>ID родительской записи (дело/опись/фонд)</label><input class="input" name="parent_id" type="number" value="${v('parent_id')}"></div>
    <div class="field full"><label>Заголовок (RU) *</label><input class="input" name="title_ru" value="${esc(r?.title?.ru || '')}" required></div>
    <div class="field"><label>Заголовок (KZ)</label><input class="input" name="title_kz" value="${esc(r?.title?.kz || '')}"></div>
    <div class="field"><label>Заголовок (EN)</label><input class="input" name="title_en" value="${esc(r?.title?.en || '')}"></div>
    <div class="field"><label>Архивный шифр *</label><input class="input" name="cipher" value="${v('cipher')}" placeholder="Ф.25. Оп.1. Д.7. Л.1"></div>
    <div class="field"><label>Филиал *</label><input class="input" name="branch" value="${v('branch', A.user.branch || 'main')}"></div>
    <div class="field"><label>Фонд №</label><input class="input" name="fund_no" value="${v('fund_no')}"></div><div class="field"><label>Дело №</label><input class="input" name="case_no" value="${v('case_no')}"></div>
    <div class="field"><label>Год начала *</label><input class="input" name="date_from" type="number" value="${v('date_from')}"></div><div class="field"><label>Год окончания</label><input class="input" name="date_to" type="number" value="${v('date_to')}"></div>
    <div class="field"><label>Тип документа *</label><select class="input" name="doc_type">${Object.entries(TYPES).map(([k, n]) => `<option value="${k}" ${r?.doc_type === k ? 'selected' : ''}>${n}</option>`).join('')}</select></div>
    <div class="field"><label>Населённый пункт</label><input class="input" name="place" value="${v('place')}"></div>
    <div class="field full"><label>Описание (RU)</label><textarea class="input" name="descr_ru">${esc(r?.descr?.ru || '')}</textarea></div>
    <div class="field"><label>Темы (через запятую)</label><input class="input" name="topics" value="${esc((r?.topics || []).join(', '))}"></div>
    <div class="field"><label>Листов</label><input class="input" name="sheets" type="number" value="${v('sheets')}"></div>
    <div class="field"><label>Статус описания</label><select class="input" name="desc_status">${Object.entries(DESC).map(([k, n]) => `<option value="${k}" ${(r?.desc_status || 'review') === k ? 'selected' : ''}>${n}</option>`).join('')}</select></div>
    <div class="field"><label>Доступ к цифровой копии</label><select class="input" name="file_status">${Object.entries(FILE).map(([k, n]) => `<option value="${k}" ${(r?.file_status || 'none') === k ? 'selected' : ''}>${n}</option>`).join('')}</select><span class="small muted">Открыть копию для публики может только модератор (проверяется на сервере).</span></div>
    <div class="field full"><label>Условия доступа / ограничение</label><input class="input" name="restriction" value="${v('restriction')}"></div>
    <label class="fopt"><input type="checkbox" name="date_uncertain" ${r?.date_uncertain ? 'checked' : ''}> Датировка не подтверждена</label><label class="fopt"><input type="checkbox" name="author_uncertain" ${r?.author_uncertain ? 'checked' : ''}> Авторство не подтверждено</label>
    <div class="full" data-errs></div>
    <div class="full row" style="justify-content:flex-end"><button type="button" class="btn" data-close>Отмена</button><button class="btn btn-accent">${icon('check')}Сохранить</button></div></form>`, (m, close) => {
    m.querySelector('[data-rf]').onsubmit = async (e) => {
      e.preventDefault(); const f = e.target; const errs = [];
      if (!f.title_ru.value.trim()) errs.push('Заполните заголовок (RU)');
      if ((f.level?.value || r?.level) === 'document' && !f.cipher.value.trim()) errs.push('Укажите архивный шифр');
      if ((f.level?.value || r?.level) === 'document' && !f.date_from.value) errs.push('Укажите год создания');
      if (errs.length) { m.querySelector('[data-errs]').innerHTML = `<ul class="err-list">${errs.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>`; return; }
      const body = { level: f.level?.value || r.level, parent_id: f.parent_id.value ? +f.parent_id.value : null, title: { ru: f.title_ru.value.trim(), ...(f.title_kz.value ? { kz: f.title_kz.value } : {}), ...(f.title_en.value ? { en: f.title_en.value } : {}) }, cipher: f.cipher.value.trim(), branch: f.branch.value.trim(), fund_no: f.fund_no.value.trim(), case_no: f.case_no.value.trim(), date_from: +f.date_from.value || null, date_to: +f.date_to.value || +f.date_from.value || null, doc_type: f.doc_type.value, place: f.place.value.trim(), descr: { ru: f.descr_ru.value.trim() }, topics: f.topics.value.split(',').map((s) => s.trim()).filter(Boolean), sheets: +f.sheets.value || null, desc_status: f.desc_status.value, file_status: f.file_status.value, restriction: f.restriction.value.trim() || null, date_uncertain: f.date_uncertain.checked ? 1 : 0, author_uncertain: f.author_uncertain.checked ? 1 : 0 };
      if (body.file_status === 'public' && r?.file_status !== 'public' && !(await confirmDanger('Открыть цифровую копию для всех?', 'Убедитесь, что документ прошёл экспертизу и не содержит персональных данных. Действие будет записано в журнал.'))) return;
      try {
        const out = r ? await api('/api/admin/records/' + r.id, { method: 'PUT', body }) : await api('/api/admin/records', { method: 'POST', body });
        close(); toast(r ? `Сохранено (v${out.version})${out.wf_status === 'review' ? ' — отправлено на проверку' : ''}` : `Создана запись ${out.uid} (черновик)`); catalog(main);
      } catch (err) { m.querySelector('[data-errs]').innerHTML = `<ul class="err-list">${(err.data?.errors || [err.message]).map((x) => `<li>${esc(x)}</li>`).join('')}</ul>`; }
    };
  });
}
async function ocrModal(id) {
  try {
    const d = await api('/api/admin/ai/ocr', { method: 'POST', body: { id } });
    modal(`<h2 style="font-size:1.3rem">${icon('sparkle').replace('<svg', '<svg style="width:20px;display:inline;vertical-align:-3px;color:var(--accent)"')} Распознавание текста</h2><div class="notice warn">${icon('alert')}<div><p class="small">${esc(d.note)}</p></div></div>
    <div class="field" style="margin-top:12px"><label>Распознанный текст (точность ${Math.round(d.confidence * 100)}%)</label><textarea class="input" style="min-height:150px">${esc(d.text)}</textarea></div>${metaHtml(d.meta)}<div class="row" style="justify-content:flex-end;margin-top:12px"><button class="btn" data-close>Закрыть</button></div>`);
  } catch (e) { toast(e.message, true); }
}

// ---------------------------------------------------------------- Импорт / экспорт
const SAMPLE = 'Фонд;Опись;Дело;Название;Год;Тип;Место;Автор;Описание;Темы\n25;1;201;Протокол сессии облсовета о благоустройстве набережной;1972;текст;Усть-Каменогорск;Облисполком ВКО;Решение о благоустройстве набережной Иртыша;город\nФД-1;1;77;Вид на Ульбинский мост;1968;фото;Усть-Каменогорск;;Фотодокумент;город\n999;1;5;Запись с несуществующим фондом;1950;текст;Зайсан;;;\n25;1;7;Дубликат существующего дела;1941;текст;;;;\n410;1;55;Строка без года;;текст;;;;\n';
async function importPage(main) {
  main.innerHTML = `${head('Импорт и экспорт', `${can('catalog.export') ? `<a class="btn" href="/api/admin/export.csv">${icon('download')}Экспорт CSV (только опубликованное)</a>` : ''}`)}
  <div class="card stack"><p class="small muted" style="margin:0">Формат CSV/XLSX→CSV (разделитель «;» или «,»). Шаги: загрузка → сопоставление полей → предварительный просмотр с протоколом ошибок → импорт. Импортированные записи получают статус «На проверке» и не публикуются автоматически. Ошибка в одной строке не затрагивает остальные.</p>
    <div class="row"><input type="file" accept=".csv,text/csv" data-file class="input" style="max-width:340px"><button class="btn btn-sm" data-sample>Вставить пример (с ошибками)</button></div>
    <textarea class="input mono" data-csv style="min-height:140px;font-size:.8rem" placeholder="Вставьте CSV"></textarea>
    <div class="row"><button class="btn btn-brand" data-preview>${icon('eye')}Предпросмотр</button></div></div>
  <div data-out style="margin-top:18px"></div>`;
  const ta = main.querySelector('[data-csv]'); let mapping = null;
  main.querySelector('[data-sample]').onclick = () => { ta.value = SAMPLE; };
  main.querySelector('[data-file]').onchange = async (e) => { const f = e.target.files[0]; if (!f) return; if (f.size > 1.5e6) return toast('Файл больше 1,5 МБ', true); ta.value = await f.text(); };
  const preview = async () => {
    try {
      const d = await api('/api/admin/import/preview', { method: 'POST', body: { csv: ta.value, mapping } });
      mapping = d.mapping;
      main.querySelector('[data-out]').innerHTML = `<div class="card"><h2 style="font-size:1.15rem">Сопоставление полей</h2><div class="form-grid" style="grid-template-columns:repeat(auto-fit,minmax(170px,1fr))">${d.fields.map((f) => `<div class="field"><label>${f}</label><select class="input" data-map="${f}"><option value="">—</option>${d.header.map((h, i) => `<option value="${i}" ${d.mapping[f] === i ? 'selected' : ''}>${esc(h)}</option>`).join('')}</select></div>`).join('')}</div></div>
      <div class="row" style="margin:16px 0"><span class="tag tag-ok">${d.ok} готово к импорту</span><span class="tag tag-danger">${d.bad} с ошибками</span><button class="btn btn-accent" data-commit ${d.ok ? '' : 'disabled'}>${icon('upload')}Импортировать ${d.ok} строк</button></div>
      <div class="table-wrap"><table class="table"><thead><tr><th>Строка</th><th>Шифр</th><th>Название</th><th>Год</th><th>Тип</th><th>Протокол проверки</th></tr></thead><tbody>${d.rows.map((r) => `<tr class="${r.errors.length ? 'row-bad' : 'row-ok'}"><td>${r.line}</td><td class="mono small">${esc(r.cipher)}</td><td>${esc(r.title)}</td><td>${r.date_from ?? '—'}</td><td>${esc(r.doc_type || '—')}</td><td class="small">${r.errors.length ? esc(r.errors.join('; ')) : 'OK'}</td></tr>`).join('')}</tbody></table></div>`;
      main.querySelectorAll('[data-map]').forEach((s) => { s.onchange = () => { mapping = { ...mapping }; if (s.value === '') delete mapping[s.dataset.map]; else mapping[s.dataset.map] = +s.value; preview(); }; });
      main.querySelector('[data-commit]').onclick = async () => {
        try { const r = await api('/api/admin/import/commit', { method: 'POST', body: { csv: ta.value, mapping } }); toast(`Импортировано ${r.imported} из ${r.total}`); main.querySelector('[data-out]').insertAdjacentHTML('afterbegin', `<div class="notice ok" style="margin-bottom:14px">${icon('check')}<div><b>Протокол импорта</b><ul class="small" style="margin:6px 0 0">${r.protocol.map((p) => `<li>Строка ${p.line}: ${p.result === 'imported' ? 'импортирована (ID ' + p.id + ', статус «На проверке»)' : 'пропущена — ' + esc((p.errors || []).join('; '))}</li>`).join('')}</ul></div></div>`); main.querySelector('[data-commit]').disabled = true; } catch (e) { toast(e.message, true); }
      };
    } catch (e) { toast(e.message, true); }
  };
  main.querySelector('[data-preview]').onclick = () => { mapping = null; preview(); };
}

// ---------------------------------------------------------------- ИИ-инструменты сотрудника
const metaHtml = (m) => `<div class="ai-box" style="margin-top:14px"><span class="ai-label">${icon('sparkle')}Извлечённые метаданные (требуют подтверждения)</span>
  <div class="kv small" style="margin-top:10px"><div>Даты</div><div>${esc(m.dates.join(', ') || '—')}</div><div>Персоны</div><div>${esc(m.persons.join(', ') || '—')}</div><div>Организации</div><div>${esc(m.orgs.join('; ') || '—')}</div><div>Геообъекты</div><div>${esc(m.geo.join(', ') || '—')}</div><div>Категории</div><div>${esc(m.categories.join(', ') || '—')}</div><div>Тип документа</div><div>${esc(TYPES[m.docType] || m.docType)}</div><div>Ключевые слова</div><div>${esc(m.keywords.join(', '))}</div><div>Черновик описания</div><div>${esc(m.draftDescription)}</div>
  <div>Возможные дубликаты</div><div>${m.duplicates.length ? m.duplicates.map((d) => `<span class="cipher">${esc(d.cipher)}</span> ${esc(d.title)} (${d.similarity}%)`).join('<br>') : 'не найдены'}</div></div><p class="small muted" style="margin:8px 0 0">${esc(m.note)}</p></div>`;
async function ai(main) {
  main.innerHTML = `${head('ИИ-инструменты сотрудника')}
  <div class="grid g2"><div class="card stack"><h2 style="font-size:1.15rem">Извлечение метаданных из текста</h2><p class="small muted" style="margin:0">Вставьте распознанный текст документа — система выделит даты, фамилии, организации, географические объекты, предложит категории, ключевые слова, краткое описание и проверит дубликаты в каталоге. Обработка выполняется локально на сервере.</p>
    <textarea class="input" data-t style="min-height:180px">Протокол № 14 заседания исполнительного комитета Усть-Каменогорского городского Совета от 12 мая 1962 года. Слушали: о строительстве набережной Иртыша и благоустройстве центральной улицы. Докладчик — председатель горисполкома И.П. Сидоров. Решили: поручить отделу коммунального хозяйства подготовить проект к 1963 году.</textarea>
    <button class="btn btn-accent" data-x>${icon('sparkle')}Анализировать</button></div><div data-o></div></div>
  <div class="card" style="margin-top:18px"><h2 style="font-size:1.15rem">OCR сканов</h2><p class="small muted" style="margin:0">Откройте «Электронный каталог» и нажмите ${icon('sparkle').replace('<svg', '<svg style="width:14px;display:inline"')} у записи с цифровой копией. В прототипе OCR имитируется для синтетических демо-сканов (это явно обозначено); в промышленной версии — Tesseract (kaz+rus) или согласованный OCR-сервис.</p></div>`;
  main.querySelector('[data-x]').onclick = async () => { try { main.querySelector('[data-o]').innerHTML = metaHtml(await api('/api/admin/ai/extract', { method: 'POST', body: { text: main.querySelector('[data-t]').value } })); } catch (e) { toast(e.message, true); } };
}

// ---------------------------------------------------------------- Публикации (новости, выставки, FAQ)
async function content(main, type = 'news') {
  const rows = await api('/api/admin/content/' + type);
  const TN = { news: 'Новости', exhibition: 'Выставки', faq: 'FAQ', collection: 'Коллекции', event: 'Хронология', person: 'Личности' };
  main.innerHTML = `${head('Публикации', can('content.edit') ? `<button class="btn btn-accent" data-new>${icon('plus')}Создать</button>` : '')}
  <div class="tabs">${Object.entries(TN).map(([k, n]) => `<button data-tab="${k}" aria-selected="${k === type}">${n}</button>`).join('')}</div>
  <div class="table-wrap"><table class="table"><thead><tr><th>Заголовок</th><th>Переводы</th><th>Статус</th><th>Версия / автор</th><th></th></tr></thead><tbody>
  ${rows.map((c) => { const ttl = c.data.title || c.data.q || c.data.name || {}; return `<tr><td>${esc(ttl.ru || c.slug)}${c.data.demo ? ' <span class="tag tag-demo">демо</span>' : ''}</td><td class="small">RU ${ttl.kz ? '· KZ' : '<span class="muted">· KZ —</span>'} ${ttl.en ? '· EN' : '<span class="muted">· EN —</span>'}</td><td>${status(c.wf_status)}</td><td class="small">v${c.version} · ${esc(c.created_by)}${c.approved_by ? '<br>согл.: ' + esc(c.approved_by) : ''}</td><td>${can('content.edit') && ['news', 'faq', 'exhibition'].includes(type) ? `<button class="icon-btn" style="width:36px;height:36px" data-ed="${c.id}" aria-label="Изменить">${icon('edit')}</button>` : ''}</td></tr>`; }).join('')}</tbody></table></div>`;
  main.querySelectorAll('[data-tab]').forEach((b) => { b.onclick = () => content(main, b.dataset.tab); });
  const form = (c) => {
    const d = c?.data || {}; const isFaq = type === 'faq'; const isEx = type === 'exhibition';
    const F = isFaq ? [['q', 'Вопрос'], ['a', 'Ответ']] : isEx ? [['title', 'Название'], ['intro', 'Вступление']] : [['title', 'Заголовок'], ['lead', 'Лид'], ['body', 'Текст']];
    modal(`<h2 style="font-size:1.3rem">${c ? 'Редактирование' : 'Новый материал'}</h2><form class="stack" data-cf>
      ${!c && !isFaq ? '<div class="field"><label>Адрес (slug, латиница)</label><input class="input" name="slug" pattern="[a-z0-9-]+" placeholder="my-news"></div>' : ''}
      ${type === 'news' ? `<div class="field"><label>Категория</label><select class="input" name="cat">${['official', 'events', 'exhibitions', 'research', 'branches', 'publications', 'anticorruption'].map((k) => `<option ${d.cat === k ? 'selected' : ''}>${k}</option>`).join('')}</select></div>` : ''}
      ${F.map(([k, n]) => ['ru', 'kz', 'en'].map((l) => `<div class="field"><label>${n} (${l.toUpperCase()})${l === 'ru' ? ' *' : ''}</label>${k === 'body' || k === 'a' || k === 'intro' ? `<textarea class="input" name="${k}_${l}">${esc(d[k]?.[l] || '')}</textarea>` : `<input class="input" name="${k}_${l}" value="${esc(d[k]?.[l] || '')}">`}</div>`).join('')).join('')}
      ${isFaq ? `<div class="field"><label>Группа</label><select class="input" name="group">${['catalog', 'visit', 'services', 'site'].map((g) => `<option ${d.group === g ? 'selected' : ''}>${g}</option>`).join('')}</select></div>` : ''}
      <p class="small muted">Автоперевод ИИ допустим как черновик; официальный текст проверяет ответственный сотрудник. Новый материал сохраняется как черновик и не публикуется без согласования.</p>
      <div data-errs></div><div class="row" style="justify-content:flex-end"><button type="button" class="btn" data-close>Отмена</button><button class="btn btn-accent">Сохранить</button></div></form>`, (m, close) => {
      m.querySelector('[data-cf]').onsubmit = async (e) => {
        e.preventDefault(); const f = e.target; const data = {};
        for (const [k] of F) { data[k] = {}; for (const l of ['ru', 'kz', 'en']) if (f[`${k}_${l}`].value.trim()) data[k][l] = f[`${k}_${l}`].value.trim(); }
        if (f.cat) data.cat = f.cat.value; if (f.group) data.group = f.group.value;
        try { if (c) await api(`/api/admin/content/${type}/${c.id}`, { method: 'PUT', body: { data } }); else await api('/api/admin/content/' + type, { method: 'POST', body: { slug: f.slug?.value, data } }); close(); toast('Сохранено. Отправьте материал на проверку в разделе «Согласование».'); content(main, type); }
        catch (err) { m.querySelector('[data-errs]').innerHTML = `<ul class="err-list">${(err.data?.errors || [err.message]).map((x) => `<li>${esc(x)}</li>`).join('')}</ul>`; }
      };
    });
  };
  main.querySelector('[data-new]')?.addEventListener('click', () => form(null));
  main.querySelectorAll('[data-ed]').forEach((b) => { b.onclick = () => form(rows.find((r) => r.id === +b.dataset.ed)); });
}

// ---------------------------------------------------------------- Филиалы
async function branches(main) {
  const rows = await api('/api/admin/branches');
  main.innerHTML = `${head('Филиалы')}<div class="notice" style="margin-bottom:14px">${icon('info')}<div><p class="small">Администратор филиала может изменять только сведения своего филиала. Включите «Проверка прав», чтобы попытаться изменить чужой филиал — сервер вернёт отказ, событие попадёт в журнал.</p></div></div>
  <div class="table-wrap"><table class="table"><thead><tr><th>Филиал</th><th>Адрес / контакты</th><th>Координаты</th><th>На карте</th><th></th></tr></thead><tbody>${rows.map((b) => `<tr><td><b>${esc(b.name.ru)}</b><div class="small muted">${esc(b.slug)}</div></td><td class="small">${esc(b.address)}<br>${esc(b.phone)} · ${esc(b.email)}</td><td class="mono small">${b.lat}, ${b.lng}</td><td>${b.visible ? '<span class="tag tag-ok">показан</span>' : '<span class="tag">скрыт</span>'}</td><td>${b.editable || A.demoAll ? `<button class="btn btn-sm" data-b="${b.slug}">${icon('edit')}Изменить</button>` : `<span class="small muted">нет прав</span>`}</td></tr>`).join('')}</tbody></table></div>`;
  main.onclick = (e) => {
    const btn = e.target.closest('[data-b]'); if (!btn) return; const b = rows.find((x) => x.slug === btn.dataset.b);
    modal(`<h2 style="font-size:1.3rem">${esc(b.name.ru)}</h2><form class="form-grid" data-bf>${[['address', 'Адрес'], ['phone', 'Телефон'], ['email', 'E-mail'], ['director', 'Руководитель'], ['hours', 'Режим работы'], ['lat', 'Широта'], ['lng', 'Долгота']].map(([k, n]) => `<div class="field ${k === 'address' ? 'full' : ''}"><label>${n}</label><input class="input" name="${k}" value="${esc(b[k] ?? '')}"></div>`).join('')}
      ${A.user.role !== 'branchadmin' ? `<label class="fopt"><input type="checkbox" name="visible" ${b.visible ? 'checked' : ''}> Показывать на карте</label>` : ''}<div class="full" data-errs></div><div class="full row" style="justify-content:flex-end"><button type="button" class="btn" data-close>Отмена</button><button class="btn btn-accent">Сохранить</button></div></form>`, (m, close) => {
      m.querySelector('[data-bf]').onsubmit = async (ev) => {
        ev.preventDefault(); const f = ev.target; const body = Object.fromEntries(['address', 'phone', 'email', 'director', 'hours', 'lat', 'lng'].map((k) => [k, f[k].value.trim()])); if (f.visible) body.visible = f.visible.checked;
        try { await api('/api/admin/branches/' + b.slug, { method: 'PUT', body }); close(); toast('Сведения филиала обновлены'); branches(main); } catch (err) { m.querySelector('[data-errs]').innerHTML = `<div class="notice warn">${icon('lock')}<div>${esc(err.message)}</div></div>`; }
      };
    });
  };
}

// ---------------------------------------------------------------- Пользователи
async function users(main) {
  const d = await api('/api/admin/users');
  main.innerHTML = `${head('Пользователи и роли', `<button class="btn btn-accent" data-new>${icon('plus')}Новый пользователь</button>`)}
  <div class="table-wrap"><table class="table"><thead><tr><th>Логин</th><th>Имя</th><th>Роль</th><th>Филиал</th><th>Активен</th></tr></thead><tbody>${d.users.map((u) => `<tr><td class="mono">${esc(u.login)}</td><td>${esc(u.name)}</td><td><select class="input" style="min-height:36px;padding:4px 8px" data-role="${u.id}">${Object.entries(d.roles).map(([k, n]) => `<option value="${k}" ${u.role === k ? 'selected' : ''}>${n}</option>`).join('')}</select></td><td class="small">${esc(u.branch || '—')}</td><td><input type="checkbox" data-act="${u.id}" ${u.active ? 'checked' : ''} aria-label="Активен"></td></tr>`).join('')}</tbody></table></div>
  <h2 style="font-size:1.15rem;margin-top:24px">Матрица прав (по ролям)</h2><div class="table-wrap"><table class="table small"><thead><tr><th>Роль</th><th>Полномочия</th></tr></thead><tbody>${Object.entries({ superadmin: 'Полный доступ ко всем модулям и настройкам', siteadmin: 'Страницы, пользователи (кроме главного администратора), контент, филиалы, журнал', editor: 'Создание и редактирование публикаций, публикация одобренных материалов', archivist: 'Электронный каталог своего подразделения, импорт/экспорт, ИИ-инструменты', branchadmin: 'Сведения только своего филиала', moderator: 'Проверка и согласование, открытие доступа к цифровым копиям', analyst: 'Статистика, аналитика, экспорт открытых данных' }).map(([k, v]) => `<tr><td>${esc(d.roles[k])}</td><td>${esc(v)}</td></tr>`).join('')}</tbody></table></div>`;
  main.onchange = async (e) => {
    const r = e.target.closest('[data-role]'), a = e.target.closest('[data-act]');
    try {
      if (r) { if (r.value === 'superadmin' && !(await confirmDanger('Назначить главного администратора?', 'Роль даёт полный доступ к системе.'))) return users(main); await api('/api/admin/users/' + r.dataset.role, { method: 'PUT', body: { role: r.value } }); toast('Роль изменена'); }
      if (a) { await api('/api/admin/users/' + a.dataset.act, { method: 'PUT', body: { active: a.checked } }); toast(a.checked ? 'Учётная запись активирована' : 'Учётная запись заблокирована'); }
    } catch (err) { toast(err.message, true); users(main); }
  };
  main.querySelector('[data-new]').onclick = () => modal(`<h2 style="font-size:1.3rem">Новый пользователь</h2><form class="form-grid" data-uf><div class="field"><label>Логин *</label><input class="input" name="login" pattern="[a-z0-9_.-]{3,30}"></div><div class="field"><label>Имя *</label><input class="input" name="name"></div><div class="field"><label>Роль *</label><select class="input" name="role">${Object.entries(d.roles).map(([k, n]) => `<option value="${k}">${n}</option>`).join('')}</select></div><div class="field"><label>Филиал (для адм. филиала)</label><input class="input" name="branch" placeholder="ridder"></div><div class="field full"><label>Временный пароль * (≥10 символов, буквы и цифры)</label><input class="input" name="password" type="password" autocomplete="new-password"></div><div class="full" data-errs></div><div class="full row" style="justify-content:flex-end"><button type="button" class="btn" data-close>Отмена</button><button class="btn btn-accent">Создать</button></div></form>`, (m, close) => {
    m.querySelector('[data-uf]').onsubmit = async (e) => { e.preventDefault(); const f = e.target; try { await api('/api/admin/users', { method: 'POST', body: Object.fromEntries(['login', 'name', 'role', 'branch', 'password'].map((k) => [k, f[k].value.trim()])) }); close(); toast('Пользователь создан'); users(main); } catch (err) { m.querySelector('[data-errs]').innerHTML = `<ul class="err-list">${(err.data?.errors || [err.message]).map((x) => `<li>${esc(x)}</li>`).join('')}</ul>`; } };
  });
}

// ---------------------------------------------------------------- Журнал и отзывы
async function audit(main, op = '') {
  const rows = await api('/api/admin/audit' + (op ? '?op=' + op : ''));
  const ops = ['', 'login', 'create', 'update', 'delete', 'status', 'import', 'export', 'access', 'user.create', 'user.update', 'csrf', 'ai.extract', 'ai.ocr'];
  main.innerHTML = `${head('Журнал действий', `<select class="input" data-op style="width:auto">${ops.map((o) => `<option value="${o}" ${o === op ? 'selected' : ''}>${o || 'Все операции'}</option>`).join('')}</select>`)}
  <div class="table-wrap"><table class="table"><thead><tr><th>Дата и время</th><th>Пользователь</th><th>Операция</th><th>Объект</th><th>Результат</th><th>Подробности</th></tr></thead><tbody>${rows.map((r) => `<tr><td class="small">${fmt(r.at)}</td><td class="mono small">${esc(r.user)}</td><td>${esc(r.op)}</td><td class="mono small">${esc(r.object)}</td><td><span class="tag ${r.result === 'ok' ? 'tag-ok' : r.result === 'denied' || r.result === 'fail' || r.result === 'blocked' ? 'tag-danger' : ''}">${esc(r.result)}</span></td><td class="small">${esc(r.details)}</td></tr>`).join('')}</tbody></table></div><p class="small muted">Пароли и секреты в журнал не записываются.</p>`;
  main.querySelector('[data-op]').onchange = (e) => audit(main, e.target.value);
}
async function feedback(main) {
  const rows = await api('/api/admin/feedback');
  main.innerHTML = `${head('Отзывы посетителей')}<div class="table-wrap"><table class="table"><thead><tr><th>Дата</th><th>Тип</th><th>Сообщение</th></tr></thead><tbody>${rows.map((r) => `<tr><td class="small">${fmt(r.at)}</td><td><span class="tag">${esc(r.kind)}</span></td><td>${esc(r.text)}</td></tr>`).join('') || '<tr><td colspan="3" class="muted">Отзывов пока нет</td></tr>'}</tbody></table></div>`;
}

// ---------------------------------------------------------------- Старт
(async () => {
  try { const me = await fetch('/api/admin/me').then((r) => (r.ok ? r.json() : null)); if (me) { A.user = me.user; A.csrf = me.csrf; A.roles = me.roles; shell(); } else login(); }
  catch { login(); }
})();

// ---------------------------------------------------------------- Модерация комментариев посетителей
const CST = { pending: 'На модерации', published: 'Опубликован', rejected: 'Отклонён' };
const TARGET = { record: (id) => `/ru/catalog/${id}`, exhibition: (id) => `/ru/exhibitions/${id}`, news: (id) => `/ru/news/${id}`, collection: (id) => `/ru/memory/collection/${id}`, person: (id) => `/ru/memory/person/${id}` };
async function comments(main, filter = 'pending') {
  const rows = await api('/api/admin/comments' + (filter ? '?status=' + filter : ''));
  main.innerHTML = `${head('Комментарии посетителей')}
  <div class="notice" style="margin-bottom:14px">${icon('info')}<div><p class="small">Премодерация: комментарий появляется на сайте только после одобрения. Телефоны, e-mail и ИИН в тексте маскируются автоматически при отправке. Ответ архива публикуется под комментарием.</p></div></div>
  <div class="tabs">${[['pending', 'На модерации'], ['published', 'Опубликованные'], ['rejected', 'Отклонённые'], ['', 'Все']].map(([k, n]) => `<button data-f="${k}" aria-selected="${k === filter}">${n}</button>`).join('')}</div>
  ${rows.length ? rows.map((c) => `<div class="card" style="margin-bottom:12px" data-c="${c.id}">
    <div class="row" style="justify-content:space-between"><div><b>${esc(c.name || 'Гость')}</b> <span class="small muted">${fmt(c.at)} · ${esc(c.lang || '')}</span> ${c.demo ? '<span class="tag tag-demo">демо</span>' : ''}</div><span class="status ${c.status === 'published' ? 'st-published' : c.status === 'rejected' ? 'st-rework' : 'st-review'}">${CST[c.status]}</span></div>
    <div class="small muted" style="margin:4px 0">К материалу: <a href="${TARGET[c.target_type]?.(c.target_id) || '#'}" target="_blank" rel="noopener">${esc(c.target_title || c.target_id)}</a></div>
    <p style="margin:8px 0">${esc(c.text)}</p>
    <div class="field"><label class="small">Ответ архива (необязательно)</label><textarea class="input" data-reply style="min-height:60px">${esc(c.reply || '')}</textarea></div>
    <div class="row" style="margin-top:10px">${c.status !== 'published' ? `<button class="btn btn-sm btn-brand" data-act="published">${icon('check')}Опубликовать</button>` : ''}${c.status !== 'rejected' ? `<button class="btn btn-sm" data-act="rejected">Отклонить</button>` : ''}<button class="btn btn-sm" data-act="reply">Сохранить ответ</button><button class="btn btn-sm btn-danger" data-act="delete">${icon('trash')}Удалить</button>${c.moderated_by ? `<span class="small muted">модератор: ${esc(c.moderated_by)}, ${fmt(c.moderated_at)}</span>` : ''}</div></div>`).join('') : '<p class="muted">Нет комментариев в этой категории.</p>'}`;
  main.querySelectorAll('[data-f]').forEach((b) => { b.onclick = () => comments(main, b.dataset.f); });
  main.onclick = async (e) => {
    const b = e.target.closest('[data-act]'); if (!b) return;
    const card = b.closest('[data-c]'); const id = card.dataset.c; const reply = card.querySelector('[data-reply]').value;
    try {
      if (b.dataset.act === 'delete') { if (!(await confirmDanger('Удалить комментарий?', 'Комментарий будет удалён без возможности восстановления.'))) return; await api('/api/admin/comments/' + id, { method: 'DELETE' }); }
      else await api('/api/admin/comments/' + id, { method: 'PUT', body: b.dataset.act === 'reply' ? { reply } : { status: b.dataset.act, reply } });
      toast('Готово'); comments(main, filter);
    } catch (err) { toast(err.message, true); }
  };
}
