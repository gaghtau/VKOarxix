import express from 'express';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync, createReadStream, existsSync } from 'node:fs';
import { openDb } from './db.js';
import * as A from './auth.js';
import * as AI from './ai.js';
import { restrictedSvg } from './scan.js';
import { org, departments, calendar, media as M } from './seed.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const reset = process.argv.includes('--reset') || process.argv.includes('--reset-only');
const db = openDb({ reset });
if (process.argv.includes('--reset-only')) { console.log('База пересоздана с демо-данными.'); process.exit(0); }

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 'loopback');
const PORT = Number(process.env.PORT || 3000);
const LANGS = ['ru', 'kz', 'en'];
const now = () => new Date().toISOString();
const P = (v, d = null) => { try { return v == null ? d : JSON.parse(v); } catch { return d; } };

// ---------------------------------------------------------------- Безопасность: заголовки
app.use((req, res, next) => {
  res.setHeader('Content-Security-Policy', [
    "default-src 'self'", "script-src 'self'", "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com", "img-src 'self' data: https://*.tile.openstreetmap.org",
    "connect-src 'self' https://api.open-meteo.com", "frame-ancestors 'none'", "base-uri 'self'", "form-action 'self'", "object-src 'none'",
  ].join('; '));
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Permissions-Policy', 'geolocation=(self), camera=(), microphone=()');
  if (req.secure) res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  next();
});
app.use(express.json({ limit: '2mb' }));

// Простое ограничение частоты для публичных POST (отзывы, опрос, помощник)
const buckets = new Map();
const limit = (n, ms) => (req, res, next) => {
  const k = req.path + '|' + req.ip; const b = buckets.get(k) || { c: 0, t: Date.now() };
  if (Date.now() - b.t > ms) { b.c = 0; b.t = Date.now(); }
  if (++b.c > n) return res.status(429).json({ error: 'too_many', message: 'Слишком много запросов. Повторите позже.' });
  buckets.set(k, b); next();
};

// ---------------------------------------------------------------- Доступ к данным
const recRow = (r) => r && ({ ...r, title: P(r.title, {}), descr: P(r.descr, {}), topics: P(r.topics, []), images: P(r.images, []) });
// Публично доступно только опубликованное описание
const PUBLIC_WHERE = "wf_status='published' AND desc_status='public'";
const publicRecords = (level = 'document') => db.prepare(`SELECT * FROM records WHERE ${PUBLIC_WHERE} AND level=?`).all(level).map(recRow);
const fileAllowed = (r) => r && r.wf_status === 'published' && r.desc_status === 'public' && r.file_status === 'public' && r.pages > 0;
const branchesAll = (all = false) => db.prepare(`SELECT * FROM branches ${all ? '' : 'WHERE visible=1'} ORDER BY id`).all().map((b) => ({ ...P(b.data), id: b.id, slug: b.slug, visible: b.visible, updated_at: b.updated_at }));
const contentRows = (type, all = false) => db.prepare(`SELECT * FROM content WHERE type=? ${all ? '' : "AND wf_status='published'"} ORDER BY sort, id`).all(type).map((c) => ({ ...c, data: P(c.data, {}) }));
const audit = (user, op, object, result, details = '') => db.prepare('INSERT INTO audit (at,user,op,object,result,details) VALUES (?,?,?,?,?,?)').run(now(), user || 'anonymous', op, object, result, String(details).slice(0, 500));
const bump = (k, n = 1) => db.prepare('INSERT INTO stats (key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=value+?').run(k, n, n);

function publicCard(r, lang) {
  const allowed = fileAllowed(r);
  return {
    id: r.id, uid: r.uid, level: r.level, cipher: r.cipher, fund_no: r.fund_no, inv_no: r.inv_no, case_no: r.case_no,
    title: r.title, descr: r.descr, date_from: r.date_from, date_to: r.date_to, date_uncertain: !!r.date_uncertain,
    doc_type: r.doc_type, place: r.place, author: r.author, author_uncertain: !!r.author_uncertain, topics: r.topics, lang: r.lang,
    sheets: r.sheets, storage: r.storage, branch: r.branch, fund_kind: r.fund_kind, demo: !!r.demo, provenance: r.provenance,
    access: { description: r.desc_status, file: r.file_status, digital: allowed, pages: allowed ? r.pages : 0, restriction: r.restriction, masterRegistered: !!r.master_checksum },
    units: r.units, sourceUrl: r.source_url,
    translated: { kz: !!r.title.kz, en: !!r.title.en },
  };
}

// ---------------------------------------------------------------- Публичный API
app.get('/api/meta', (req, res) => {
  const stats = Object.fromEntries(db.prepare("SELECT key,value FROM stats WHERE key IN ('views','visitors')").all().map((s) => [s.key, s.value]));
  const counts = db.prepare(`SELECT level, COUNT(*) n FROM records WHERE ${PUBLIC_WHERE} GROUP BY level`).all();
  const digital = db.prepare(`SELECT COUNT(*) n FROM records WHERE ${PUBLIC_WHERE} AND file_status='public' AND pages>0`).get().n;
  const poll = db.prepare('SELECT option, votes FROM poll').all();
  res.set('Cache-Control', 'public, max-age=60');
  res.json({ org, departments, media: M, branches: branchesAll(), stats, counts: Object.fromEntries(counts.map((c) => [c.level, c.n])), digital, poll });
});

app.post('/api/hit', limit(120, 60000), (req, res) => {
  const page = String(req.body?.page || '').replace(/[^a-z-]/g, '').slice(0, 20);
  bump('views'); if (req.body?.first) bump('visitors');
  if (page) bump('page:' + page);
  res.json({ ok: true });
});

const TYPE_ORDER = ['text', 'photo', 'map', 'org', 'personal', 'newspaper', 'audio', 'video'];
app.get('/api/catalog/search', (req, res) => {
  const lang = LANGS.includes(req.query.lang) ? req.query.lang : 'ru';
  const q = String(req.query.q || '').slice(0, 200).trim();
  const level = ['fund', 'inventory', 'case', 'document', 'all'].includes(req.query.level) ? req.query.level : 'all';
  let rows = (level === 'all' ? db.prepare(`SELECT * FROM records WHERE ${PUBLIC_WHERE}`).all().map(recRow) : publicRecords(level));
  let understood = null, suggestions = [], scores = null;
  if (q) {
    const u = AI.understand(q);
    const ranked = AI.rank(rows, u);
    understood = { period: u.period, types: u.types, places: u.places, topics: u.topics, cipher: u.cipher };
    suggestions = AI.suggestions(u, lang);
    scores = new Map(ranked.map((x) => [x.r.id, x.s]));
    rows = ranked.map((x) => x.r);
  }
  // Фильтры
  const f = req.query;
  const list = (v) => (v ? String(v).split(',').filter(Boolean) : []);
  if (list(f.type).length) rows = rows.filter((r) => list(f.type).includes(r.doc_type));
  if (list(f.branch).length) rows = rows.filter((r) => list(f.branch).includes(r.branch));
  if (list(f.place).length) rows = rows.filter((r) => list(f.place).includes(r.place));
  if (list(f.topic).length) rows = rows.filter((r) => r.topics.some((t) => list(f.topic).includes(t)));
  if (list(f.kind).length) rows = rows.filter((r) => list(f.kind).includes(r.fund_kind));
  if (f.from) rows = rows.filter((r) => (r.date_to ?? r.date_from) >= Number(f.from));
  if (f.to) rows = rows.filter((r) => r.date_from <= Number(f.to));
  if (f.digital === '1') rows = rows.filter(fileAllowed);
  if (f.fund) rows = rows.filter((r) => (r.fund_no || '').toUpperCase() === String(f.fund).toUpperCase());
  if (f.inv) rows = rows.filter((r) => r.inv_no === String(f.inv));
  if (f.case) rows = rows.filter((r) => r.case_no === String(f.case));
  if (f.author) rows = rows.filter((r) => AI.norm(r.author || '').includes(AI.norm(f.author)));
  // Фасеты по текущей выдаче
  const facet = (fn) => { const m = {}; for (const r of rows) for (const v of [].concat(fn(r)).filter(Boolean)) m[v] = (m[v] || 0) + 1; return m; };
  const facets = { type: facet((r) => r.doc_type), place: facet((r) => r.place), branch: facet((r) => r.branch), topic: facet((r) => r.topics), kind: facet((r) => r.fund_kind),
    decade: facet((r) => (r.date_from ? Math.floor(r.date_from / 10) * 10 : null)) };
  const sort = f.sort || (q ? 'relevance' : 'date');
  const S = { relevance: (a, b) => (scores?.get(b.id) || 0) - (scores?.get(a.id) || 0), date: (a, b) => (a.date_from || 0) - (b.date_from || 0), '-date': (a, b) => (b.date_from || 0) - (a.date_from || 0), title: (a, b) => (a.title[lang] || a.title.ru).localeCompare(b.title[lang] || b.title.ru, lang), cipher: (a, b) => (a.cipher || '').localeCompare(b.cipher || '', 'ru', { numeric: true }) };
  rows.sort(S[sort] || S.date);
  const per = Math.min(48, Math.max(6, Number(f.per) || 12));
  const total = rows.length, pages = Math.max(1, Math.ceil(total / per)), page = Math.min(pages, Math.max(1, Number(f.page) || 1));
  if (q) db.prepare('INSERT INTO searchlog (at,q,results,source,lang) VALUES (?,?,?,?,?)').run(now(), q.toLowerCase(), total, 'catalog', lang);
  res.json({ total, page, pages, per, sort, items: rows.slice((page - 1) * per, page * per).map((r) => publicCard(r, lang)), facets, understood, suggestions });
});

app.get('/api/catalog/:id', (req, res) => {
  const r = recRow(db.prepare('SELECT * FROM records WHERE id=?').get(Number(req.params.id)));
  if (!r) return res.status(404).json({ error: 'not_found' });
  if (r.wf_status !== 'published' || r.desc_status !== 'public') return res.status(403).json({ error: 'unavailable', message: 'Материал недоступен: описание не опубликовано.' });
  const chain = []; let p = r.parent_id;
  while (p) { const x = recRow(db.prepare('SELECT * FROM records WHERE id=?').get(p)); if (!x) break; chain.unshift({ id: x.id, level: x.level, cipher: x.cipher, title: x.title }); p = x.parent_id; }
  const children = db.prepare(`SELECT * FROM records WHERE parent_id=? AND ${PUBLIC_WHERE} ORDER BY id`).all(r.id).map(recRow).map((c) => ({ id: c.id, level: c.level, cipher: c.cipher, title: c.title, date_from: c.date_from, date_to: c.date_to, doc_type: c.doc_type, file: c.file_status }));
  // для дела — сразу документы; для фонда — количество документов
  const docCount = r.level === 'fund' ? db.prepare(`SELECT COUNT(*) n FROM records WHERE level='document' AND fund_no=? AND ${PUBLIC_WHERE}`).get(r.fund_no).n : null;
  const ann = r.level === 'document' ? AI.annotate(r, publicRecords('document')) : null;
  const exhibitions = contentRows('exhibition').filter((e) => e.data.exhibits?.some((x) => x.rec === r.id)).map((e) => ({ slug: e.slug, title: e.data.title }));
  const comments = db.prepare("SELECT COUNT(*) n FROM comments WHERE target_type='record' AND target_id=? AND status='published'").get(String(r.id)).n;
  res.json({ ...publicCard(r), chain, children, docCount, annotation: ann, exhibitions, comments });
});

// Цифровая копия: право доступа проверяется НА СЕРВЕРЕ, в т. ч. для прямой ссылки.
// Файлы лежат вне публичной папки (storage/catalog) и выдаются только после проверки.
const STORAGE = join(root, 'storage', 'catalog');
app.get('/api/files/:id/:page', (req, res) => {
  const r = recRow(db.prepare('SELECT * FROM records WHERE id=?').get(Number(req.params.id)));
  const page = Math.max(1, Number(req.params.page) || 1);
  const key = r?.images?.[page - 1];
  const path = key && /^[\w-]+$/.test(key) ? join(STORAGE, key + (req.query.s === 't' ? '_t' : '') + '.jpg') : null;
  if (!fileAllowed(r) || !path || !existsSync(path)) {
    res.set('Cache-Control', 'no-store'); res.set('X-Robots-Tag', 'noindex'); res.type('image/svg+xml');
    return res.status(r ? 403 : 404).send(restrictedSvg(r?.restriction ? 'Цифровая копия не выдаётся' : 'Файл недоступен'));
  }
  res.set('Cache-Control', 'public, max-age=86400'); res.type('image/jpeg');
  createReadStream(path).pipe(res);
});

// Карточка записи для ссылок из выставок, хронологии, личностей
const recRef = (id) => { const r = id && recRow(db.prepare('SELECT * FROM records WHERE id=?').get(id)); return r && r.wf_status === 'published' && r.desc_status === 'public' ? publicCard(r) : null; };
const mediaRef = (key) => (key && M[key] ? { key, ...M[key] } : null);
const exItem = (x) => (x.rec ? (recRef(x.rec) ? { kind: 'record', ...recRef(x.rec) } : { unavailable: true }) : x.media ? { kind: 'media', media: mediaRef(x.media), descr: x.descr } : { unavailable: true });
const coverOf = (x) => (!x ? null : x.media ? { url: M[x.media]?.thumb } : recRef(x.rec)?.access.digital ? { url: `/api/files/${x.rec}/1?s=t` } : null);
const commentCount = (type, id) => db.prepare("SELECT COUNT(*) n FROM comments WHERE target_type=? AND target_id=? AND status='published'").get(type, String(id)).n;

const CONTENT_TYPES = ['news', 'exhibition', 'collection', 'person', 'event', 'place', 'faq', 'law'];
app.get('/api/content/:type', (req, res) => {
  const { type } = req.params;
  if (!CONTENT_TYPES.includes(type)) return res.status(404).json({ error: 'not_found' });
  let items = contentRows(type).map((c) => ({ slug: c.slug, ...c.data, updated_at: c.updated_at }));
  if (type === 'news') {
    const q = AI.norm(String(req.query.q || ''));
    if (req.query.cat) items = items.filter((n) => n.cat === req.query.cat);
    if (q) items = items.filter((n) => AI.norm(Object.values(n.title).join(' ') + ' ' + Object.values(n.lead || {}).join(' ') + ' ' + Object.values(n.body || {}).join(' ')).includes(q));
    items.sort((a, b) => (req.query.sort === 'asc' ? (a.date > b.date ? 1 : -1) : (a.date < b.date ? 1 : -1)));
    items = items.map((n) => ({ ...n, coverMedia: mediaRef(n.cover) }));
  }
  if (type === 'exhibition') items = items.map((e) => ({ ...e, cover: coverOf(e.exhibits[0]), count: e.exhibits.length, comments: commentCount('exhibition', e.slug) }));
  if (type === 'event' || type === 'place') items = items.map((e) => ({ ...e, mediaRef: mediaRef(e.media), docRef: e.doc ? recRef(e.doc) : null }));
  if (type === 'person') items = items.map((p) => ({ ...p, photo: p.docId ? `/api/files/${p.docId}/1?s=t` : null }));
  if (type === 'collection') {
    const docs = db.prepare(`SELECT * FROM records WHERE ${PUBLIC_WHERE} AND level IN ('document','inventory')`).all().map(recRow);
    const used = new Set(); items = items.map((c) => { const m = docs.filter((d) => d.topics.some((t) => c.topics.includes(t))); const cands = m.filter((d) => d.level === 'document' && fileAllowed(d)); const cov = cands.find((d) => !used.has(d.id)) || cands[0]; if (cov) used.add(cov.id); return { ...c, count: m.length, cover: cov ? `/api/files/${cov.id}/1?s=t` : null }; });
  }
  res.set('Cache-Control', 'public, max-age=30');
  res.json(items);
});
app.get('/api/content/:type/:slug', (req, res) => {
  const { type, slug } = req.params;
  const c = db.prepare("SELECT * FROM content WHERE type=? AND slug=? AND wf_status='published'").get(type, slug);
  if (!c) return res.status(404).json({ error: 'not_found' });
  const d = { slug, ...P(c.data), updated_at: c.updated_at };
  if (type === 'exhibition') d.items = d.exhibits.map(exItem);
  if (type === 'collection') d.items = db.prepare(`SELECT * FROM records WHERE ${PUBLIC_WHERE} AND level IN ('document','inventory')`).all().map(recRow).filter((r) => r.topics.some((t) => d.topics.includes(t))).map((r) => publicCard(r));
  if (type === 'person') { d.photo = d.docId ? `/api/files/${d.docId}/1` : null; d.doc = recRef(d.docId); d.fund = recRef(d.fundId); }
  if (type === 'news') { d.coverMedia = mediaRef(d.cover); d.related = contentRows('news').filter((n) => n.slug !== slug && n.data.cat === d.cat).slice(0, 3).map((n) => ({ slug: n.slug, ...n.data, coverMedia: mediaRef(n.data.cover) })); }
  res.json(d);
});

// ---------------------------------------------------------------- Комментарии посетителей (с премодерацией)
const COMMENT_TARGETS = { record: (id) => recRef(Number(id)) && tr0(recRef(Number(id)).title), exhibition: (id) => cTitle('exhibition', id), news: (id) => cTitle('news', id), collection: (id) => cTitle('collection', id), person: (id) => { const x = db.prepare("SELECT data FROM content WHERE type='person' AND slug=? AND wf_status='published'").get(id); return x && P(x.data).name?.ru; } };
const tr0 = (o) => o?.ru || Object.values(o || {})[0];
const cTitle = (type, slug) => { const x = db.prepare("SELECT data FROM content WHERE type=? AND slug=? AND wf_status='published'").get(type, slug); return x && tr0(P(x.data).title); };
// Маскируем персональные данные, которые посетитель мог случайно оставить
const maskPII = (t) => t.replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, '[e-mail скрыт]').replace(/(\+?\d[\d\s()-]{8,}\d)/g, '[телефон скрыт]').replace(/\b\d{12}\b/g, '[ИИН скрыт]');
app.get('/api/comments', (req, res) => {
  const type = String(req.query.type || ''), id = String(req.query.id || '').slice(0, 80);
  if (!COMMENT_TARGETS[type]) return res.status(400).json({ error: 'invalid' });
  res.set('Cache-Control', 'no-store');
  res.json(db.prepare("SELECT id,at,name,text,reply,demo FROM comments WHERE target_type=? AND target_id=? AND status='published' ORDER BY id").all(type, id));
});
app.post('/api/comments', limit(5, 10 * 60000), (req, res) => {
  const type = String(req.body?.type || ''), id = String(req.body?.id || '').slice(0, 80);
  if (req.body?.website) return res.json({ ok: true, status: 'pending' }); // honeypot
  const title = COMMENT_TARGETS[type]?.(id);
  if (!title) return res.status(404).json({ error: 'not_found', message: 'Материал не найден или не опубликован.' });
  const name = String(req.body?.name || '').replace(/[<>]/g, '').trim().slice(0, 40) || 'Гость';
  let text = String(req.body?.text || '').replace(/\s+/g, ' ').trim();
  if (text.length < 5 || text.length > 1000) return res.status(400).json({ error: 'invalid', message: 'Комментарий: от 5 до 1000 символов.' });
  if ((text.match(/https?:\/\//g) || []).length > 1) return res.status(400).json({ error: 'invalid', message: 'Слишком много ссылок в комментарии.' });
  text = maskPII(text);
  const lang = ['ru', 'kz', 'en'].includes(req.body?.lang) ? req.body.lang : 'ru';
  db.prepare('INSERT INTO comments (at,target_type,target_id,target_title,name,text,lang,status) VALUES (?,?,?,?,?,?,?,?)').run(now(), type, id, String(title).slice(0, 200), name, text, lang, 'pending');
  res.json({ ok: true, status: 'pending' });
});

app.get('/api/calendar', (req, res) => res.json(calendar));

app.post('/api/assistant', limit(30, 60000), (req, res) => {
  const q = String(req.body?.q || '').slice(0, 400).trim();
  const lang = LANGS.includes(req.body?.lang) ? req.body.lang : 'ru';
  if (!q) return res.status(400).json({ error: 'empty' });
  const restricted = db.prepare(`SELECT * FROM records WHERE ${PUBLIC_WHERE} AND level IN ('document') AND file_status IN ('restricted','review')`).all().map(recRow);
  const out = AI.assistant({ q, lang, records: db.prepare(`SELECT * FROM records WHERE ${PUBLIC_WHERE} AND level IN ('document','inventory')`).all().map(recRow), restrictedRecords: restricted, branches: branchesAll(), org });
  db.prepare('INSERT INTO searchlog (at,q,results,source,lang) VALUES (?,?,?,?,?)').run(now(), q.toLowerCase(), out.kind === 'found' ? out.results.length : out.kind === 'info' ? 1 : 0, 'assistant', lang);
  bump('page:assistant');
  res.json(out);
});

app.post('/api/feedback', limit(5, 10 * 60000), (req, res) => {
  const kind = ['review', 'suggestion', 'wish', 'error'].includes(req.body?.kind) ? req.body.kind : 'review';
  const text = String(req.body?.text || '').trim();
  if (text.length < 10 || text.length > 2000) return res.status(400).json({ error: 'invalid', message: 'Текст отзыва: от 10 до 2000 символов.' });
  if (req.body?.website) return res.json({ ok: true }); // honeypot
  db.prepare('INSERT INTO feedback (at,kind,page,text) VALUES (?,?,?,?)').run(now(), kind, String(req.body?.page || '').slice(0, 120), text);
  res.json({ ok: true });
});

app.post('/api/poll', limit(3, 60 * 60000), (req, res) => {
  const opt = String(req.body?.option || '');
  const r = db.prepare('UPDATE poll SET votes=votes+1 WHERE option=?').run(opt);
  if (!r.changes) return res.status(400).json({ error: 'invalid' });
  res.json({ ok: true, poll: db.prepare('SELECT option, votes FROM poll').all() });
});

// ---------------------------------------------------------------- Админ-панель: сессии
function currentUser(req) {
  const sid = A.parseCookies(req.headers.cookie).sid;
  const s = A.getSession(sid);
  if (!s || s.expired) return { expired: s?.expired };
  const u = db.prepare('SELECT id,login,name,role,branch,active FROM users WHERE id=?').get(s.userId);
  if (!u || !u.active) return {};
  return { user: u, session: s };
}
const auth = (req, res, next) => {
  const { user, session, expired } = currentUser(req);
  if (!user) return res.status(401).json({ error: expired ? 'expired' : 'unauthorized', message: expired ? 'Сессия завершена из-за неактивности.' : 'Требуется вход.' });
  if (req.method !== 'GET' && req.get('X-CSRF-Token') !== session.csrf) { audit(user.login, 'csrf', req.path, 'denied'); return res.status(403).json({ error: 'csrf', message: 'Неверный CSRF-токен.' }); }
  req.user = user; next();
};
const need = (perm) => (req, res, next) => {
  if (!A.can(req.user, perm)) { audit(req.user.login, 'access', `${req.method} ${req.path}`, 'denied', perm); return res.status(403).json({ error: 'forbidden', message: 'Недостаточно прав для этой операции.' }); }
  next();
};
const cookie = (req, v, maxAge) => `sid=${v}; Path=/; HttpOnly; SameSite=Strict${req.secure ? '; Secure' : ''}${maxAge != null ? '; Max-Age=' + maxAge : ''}`;

app.post('/api/admin/login', limit(20, 60000), (req, res) => {
  const login = String(req.body?.login || '').trim().toLowerCase().slice(0, 50);
  const pw = String(req.body?.password || '');
  const wait = Math.max(A.loginThrottled('u:' + login), A.loginThrottled('ip:' + req.ip));
  if (wait) { audit(login, 'login', 'auth', 'blocked'); return res.status(429).json({ error: 'locked', message: `Слишком много попыток. Повторите через ${wait} с.` }); }
  const u = db.prepare('SELECT * FROM users WHERE login=?').get(login);
  if (!u || !u.active || !A.verifyPassword(pw, u.salt, u.hash)) {
    A.loginFailed('u:' + login); A.loginFailed('ip:' + req.ip);
    audit(login || '—', 'login', 'auth', 'fail'); // пароль в журнал не пишется
    return res.status(401).json({ error: 'bad_credentials', message: 'Неверный логин или пароль.' });
  }
  A.loginOk('u:' + login);
  const { sid, csrf } = A.createSession(u);
  res.setHeader('Set-Cookie', cookie(req, sid));
  audit(u.login, 'login', 'auth', 'ok');
  res.json({ user: { login: u.login, name: u.name, role: u.role, roleName: A.ROLES[u.role], branch: u.branch, perms: A.permsFor(u) }, csrf });
});
app.post('/api/admin/logout', auth, (req, res) => {
  A.destroySession(A.parseCookies(req.headers.cookie).sid);
  res.setHeader('Set-Cookie', cookie(req, '', 0)); audit(req.user.login, 'logout', 'auth', 'ok'); res.json({ ok: true });
});
app.get('/api/admin/me', auth, (req, res) => {
  const { session } = currentUser(req);
  res.json({ user: { ...req.user, roleName: A.ROLES[req.user.role], perms: A.permsFor(req.user) }, csrf: session.csrf, roles: A.ROLES });
});

// ---------------------------------------------------------------- Админ: каталог
const REQUIRED = { fund: ['fund_no', 'title', 'branch'], inventory: ['parent_id', 'inv_no', 'title'], case: ['parent_id', 'case_no', 'title'], document: ['parent_id', 'title', 'cipher', 'date_from', 'doc_type', 'branch'] };
function validateRecord(o) {
  const errs = [];
  if (!REQUIRED[o.level]) errs.push('Уровень записи: fund | inventory | case | document');
  for (const k of REQUIRED[o.level] || []) { const v = k === 'title' ? o.title?.ru : o[k]; if (v === undefined || v === null || String(v).trim() === '') errs.push(`Обязательное поле не заполнено: ${k}`); }
  if (o.date_from && (o.date_from < 1600 || o.date_from > 2100)) errs.push('Год создания вне допустимого диапазона');
  if (o.date_to && o.date_from && o.date_to < o.date_from) errs.push('Дата окончания раньше даты начала');
  if (o.file_status && !['public', 'restricted', 'none', 'review'].includes(o.file_status)) errs.push('Недопустимый статус файла');
  if (o.desc_status && !['public', 'hidden', 'review'].includes(o.desc_status)) errs.push('Недопустимый статус описания');
  return errs;
}
const EDITABLE = ['parent_id', 'branch', 'fund_no', 'inv_no', 'case_no', 'cipher', 'title', 'descr', 'date_from', 'date_to', 'date_uncertain', 'doc_type', 'place', 'author', 'author_uncertain', 'topics', 'lang', 'sheets', 'pages', 'storage', 'fund_kind', 'desc_status', 'file_status', 'restriction', 'motif'];
const JSON_FIELDS = ['title', 'descr', 'topics'];
function saveVersion(entity, id, version, status, data, author) {
  db.prepare('INSERT INTO versions (entity,entity_id,version,status,data,author,at) VALUES (?,?,?,?,?,?,?)').run(entity, id, version, status, JSON.stringify(data), author, now());
}

app.get('/api/admin/records', auth, (req, res) => {
  const q = AI.norm(String(req.query.q || ''));
  let rows = db.prepare('SELECT * FROM records ORDER BY id DESC').all().map(recRow);
  if (req.query.level) rows = rows.filter((r) => r.level === req.query.level);
  if (req.query.status) rows = rows.filter((r) => r.wf_status === req.query.status);
  if (q) rows = rows.filter((r) => AI.norm(`${r.title.ru} ${r.cipher} ${r.uid}`).includes(q));
  res.json(rows.slice(0, 300).map((r) => ({ ...r, editable: A.can(req.user, 'catalog.edit', r) })));
});
app.get('/api/admin/records/:id', auth, (req, res) => {
  const r = recRow(db.prepare('SELECT * FROM records WHERE id=?').get(Number(req.params.id)));
  if (!r) return res.status(404).json({ error: 'not_found' });
  const versions = db.prepare("SELECT version,status,author,at FROM versions WHERE entity='record' AND entity_id=? ORDER BY id DESC").all(r.id);
  res.json({ ...r, versions, editable: A.can(req.user, 'catalog.edit', r) });
});
app.post('/api/admin/records', auth, need('catalog.edit'), (req, res) => {
  const o = { level: req.body.level, ...Object.fromEntries(EDITABLE.map((k) => [k, req.body[k]])) };
  if (o.parent_id) { const p = db.prepare('SELECT * FROM records WHERE id=?').get(Number(o.parent_id)); if (!p) return res.status(400).json({ error: 'invalid', errors: ['Родительская запись не найдена'] }); o.branch ||= p.branch; o.fund_no ||= p.fund_no; o.inv_no ||= p.inv_no; }
  const errs = validateRecord(o);
  if (errs.length) return res.status(400).json({ error: 'invalid', errors: errs });
  if (!A.can(req.user, 'catalog.edit', o)) return res.status(403).json({ error: 'forbidden', message: 'Нельзя создавать записи другого филиала.' });
  if (o.file_status === 'public' && !A.can(req.user, 'catalog.openFile')) o.file_status = 'review';
  if (o.desc_status === 'public' && !A.can(req.user, 'catalog.review')) o.desc_status = 'review';
  const uid = 'GAVKO-' + String((db.prepare('SELECT MAX(id) m FROM records').get().m || 0) + 1).padStart(6, '0');
  const id = Number(db.prepare(`INSERT INTO records (uid,level,${EDITABLE.join(',')},wf_status,created_by,updated_at,demo,provenance) VALUES (?,?,${EDITABLE.map(() => '?').join(',')},'draft',?,?,1,?)`)
    .run(uid, o.level, ...EDITABLE.map((k) => (JSON_FIELDS.includes(k) ? JSON.stringify(o[k] ?? (k === 'topics' ? [] : {})) : o[k] ?? null)), req.user.login, now(), 'Создано в админ-панели').lastInsertRowid);
  saveVersion('record', id, 1, 'draft', o, req.user.login);
  audit(req.user.login, 'create', `record:${id}`, 'ok', o.cipher || '');
  res.json({ id, uid });
});
app.put('/api/admin/records/:id', auth, need('catalog.edit'), (req, res) => {
  const r = recRow(db.prepare('SELECT * FROM records WHERE id=?').get(Number(req.params.id)));
  if (!r) return res.status(404).json({ error: 'not_found' });
  if (!A.can(req.user, 'catalog.edit', r)) { audit(req.user.login, 'update', `record:${r.id}`, 'denied', 'чужой филиал'); return res.status(403).json({ error: 'forbidden', message: 'Запись принадлежит другому филиалу.' }); }
  const o = { ...r, ...Object.fromEntries(EDITABLE.filter((k) => k in req.body).map((k) => [k, req.body[k]])) };
  const errs = validateRecord(o);
  if (errs.length) return res.status(400).json({ error: 'invalid', errors: errs });
  // Открыть цифровую копию для публики может только модератор/главный администратор
  if (o.file_status === 'public' && r.file_status !== 'public' && !A.can(req.user, 'catalog.openFile')) { audit(req.user.login, 'update', `record:${r.id}`, 'denied', 'открытие файла'); return res.status(403).json({ error: 'forbidden', message: 'Открыть доступ к цифровой копии может только модератор после проверки.' }); }
  if (o.desc_status === 'public' && r.desc_status !== 'public' && !A.can(req.user, 'catalog.review')) o.desc_status = 'review';
  const version = r.version + 1;
  // Правка опубликованной записи сотрудником возвращает её на проверку
  const wf = r.wf_status === 'published' && !A.can(req.user, 'catalog.review') ? 'review' : r.wf_status;
  db.prepare(`UPDATE records SET ${EDITABLE.map((k) => k + '=?').join(',')}, version=?, wf_status=?, updated_at=? WHERE id=?`)
    .run(...EDITABLE.map((k) => (JSON_FIELDS.includes(k) ? JSON.stringify(o[k] ?? null) : o[k] ?? null)), version, wf, now(), r.id);
  saveVersion('record', r.id, version, wf, o, req.user.login);
  audit(req.user.login, 'update', `record:${r.id}`, 'ok', `v${version}${wf !== r.wf_status ? ', отправлено на проверку' : ''}`);
  res.json({ ok: true, version, wf_status: wf });
});
app.delete('/api/admin/records/:id', auth, need('catalog.edit'), (req, res) => {
  const r = recRow(db.prepare('SELECT * FROM records WHERE id=?').get(Number(req.params.id)));
  if (!r) return res.status(404).json({ error: 'not_found' });
  if (!A.can(req.user, 'catalog.edit', r)) return res.status(403).json({ error: 'forbidden' });
  if (db.prepare('SELECT COUNT(*) n FROM records WHERE parent_id=?').get(r.id).n) return res.status(409).json({ error: 'has_children', message: 'Нельзя удалить запись, у которой есть дочерние элементы (иерархия учёта).' });
  if (r.wf_status === 'published' && req.user.role !== 'superadmin') return res.status(403).json({ error: 'forbidden', message: 'Опубликованную запись может удалить только главный администратор. Используйте статус «Архивировано».' });
  db.prepare('DELETE FROM records WHERE id=?').run(r.id);
  audit(req.user.login, 'delete', `record:${r.id}`, 'ok', r.cipher || '');
  res.json({ ok: true });
});
app.post('/api/admin/records/:id/status', auth, (req, res) => {
  const r = recRow(db.prepare('SELECT * FROM records WHERE id=?').get(Number(req.params.id)));
  if (!r) return res.status(404).json({ error: 'not_found' });
  const to = String(req.body?.to || '');
  if (!A.canTransition(req.user, r.wf_status, to, 'catalog') || (req.user.role === 'archivist' && !A.can(req.user, 'catalog.edit', r))) {
    audit(req.user.login, 'status', `record:${r.id}`, 'denied', `${r.wf_status}→${to}`);
    return res.status(403).json({ error: 'forbidden', message: `Переход «${r.wf_status} → ${to}» недоступен для вашей роли.` });
  }
  const descStatus = to === 'published' || to === 'approved' ? (r.desc_status === 'hidden' ? 'hidden' : 'public') : r.desc_status;
  db.prepare('UPDATE records SET wf_status=?, desc_status=?, approved_by=?, updated_at=? WHERE id=?').run(to, descStatus, ['approved', 'published'].includes(to) ? req.user.login : r.approved_by, now(), r.id);
  saveVersion('record', r.id, r.version, to, { comment: req.body?.comment || '' }, req.user.login);
  audit(req.user.login, 'status', `record:${r.id}`, 'ok', `${r.wf_status}→${to}`);
  res.json({ ok: true });
});

// Импорт CSV: сопоставление полей, предпросмотр, протокол ошибок, дубликаты по шифру, построчная фиксация
function parseCSV(text) {
  const rows = []; let row = [], cell = '', q = false;
  const sep = (text.split('\n')[0].match(/;/g) || []).length > (text.split('\n')[0].match(/,/g) || []).length ? ';' : ',';
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; } else if (c === '"') q = false; else cell += c; }
    else if (c === '"') q = true; else if (c === sep) { row.push(cell); cell = ''; } else if (c === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; } else if (c !== '\r') cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows.filter((r) => r.some((c) => c.trim()));
}
const IMPORT_FIELDS = { fund_no: ['фонд', 'fund', 'номер фонда', 'ф'], inv_no: ['опись', 'inventory', 'оп'], case_no: ['дело', 'case', 'file', 'д'], title: ['название', 'заголовок', 'title', 'наименование'], date_from: ['год', 'год начала', 'дата', 'year', 'date_from'], date_to: ['год окончания', 'date_to'], doc_type: ['тип', 'type', 'вид'], place: ['место', 'населенный пункт', 'населённый пункт', 'place'], author: ['автор', 'организация', 'author'], descr: ['описание', 'description', 'аннотация'], topics: ['темы', 'тематика', 'topics'] };
function autoMap(header) {
  const m = {};
  header.forEach((h, i) => { const n = AI.norm(h); for (const [f, al] of Object.entries(IMPORT_FIELDS)) if (!(f in m) && al.some((a) => n === AI.norm(a))) m[f] = i; });
  return m;
}
function importRows(csv, mapping) {
  const rows = parseCSV(String(csv || ''));
  if (rows.length < 2) return { error: 'В файле нет строк данных' };
  const header = rows[0]; const map = mapping && Object.keys(mapping).length ? mapping : autoMap(header);
  const TYPES = { 'фото': 'photo', 'фотография': 'photo', 'photo': 'photo', 'карта': 'map', 'map': 'map', 'текст': 'text', 'документ': 'text', 'text': 'text', 'личный': 'personal', 'personal': 'personal', 'аудио': 'audio', 'видео': 'video', 'газета': 'newspaper', 'org': 'org', 'организация': 'org' };
  return { header, mapping: map, rows: rows.slice(1).map((r, i) => {
    const g = (f) => (map[f] !== undefined ? String(r[map[f]] ?? '').trim() : '');
    const errors = [];
    const o = { line: i + 2, fund_no: g('fund_no'), inv_no: g('inv_no') || '1', case_no: g('case_no'), title: g('title'), date_from: Number(g('date_from')) || null, date_to: Number(g('date_to')) || null, doc_type: TYPES[AI.norm(g('doc_type'))] || (g('doc_type') ? null : 'text'), place: g('place'), author: g('author'), descr: g('descr'), topics: g('topics').split(/[,;|]/).map((s) => s.trim()).filter(Boolean) };
    if (!o.fund_no) errors.push('нет номера фонда'); if (!o.case_no) errors.push('нет номера дела'); if (!o.title) errors.push('нет названия');
    if (!o.date_from) errors.push('нет года'); else if (o.date_from < 1600 || o.date_from > 2100) errors.push('год вне диапазона');
    if (!o.doc_type) errors.push(`неизвестный тип «${g('doc_type')}»`);
    o.cipher = `Ф.${o.fund_no}. Оп.${o.inv_no}. Д.${o.case_no}`;
    const fund = o.fund_no && db.prepare("SELECT * FROM records WHERE level='fund' AND UPPER(fund_no)=UPPER(?)").get(o.fund_no);
    if (o.fund_no && !fund) errors.push(`фонд ${o.fund_no} не найден в каталоге`);
    o.fundId = fund?.id; o.branch = fund?.branch;
    o.duplicate = !!db.prepare("SELECT 1 FROM records WHERE level='document' AND cipher LIKE ?").get(o.cipher + '%');
    if (o.duplicate) errors.push('дубликат: запись с таким шифром уже есть');
    return { ...o, errors };
  }) };
}
app.post('/api/admin/import/preview', auth, need('catalog.import'), (req, res) => {
  const out = importRows(req.body?.csv, req.body?.mapping);
  if (out.error) return res.status(400).json(out);
  res.json({ ...out, fields: Object.keys(IMPORT_FIELDS), ok: out.rows.filter((r) => !r.errors.length).length, bad: out.rows.filter((r) => r.errors.length).length });
});
app.post('/api/admin/import/commit', auth, need('catalog.import'), (req, res) => {
  const out = importRows(req.body?.csv, req.body?.mapping);
  if (out.error) return res.status(400).json(out);
  const protocol = [];
  for (const o of out.rows) {
    if (o.errors.length) { protocol.push({ line: o.line, result: 'skipped', errors: o.errors }); continue; }
    if (!A.can(req.user, 'catalog.edit', { branch: o.branch })) { protocol.push({ line: o.line, result: 'skipped', errors: ['нет прав на фонд другого филиала'] }); continue; }
    db.exec('SAVEPOINT row');
    try {
      let inv = db.prepare("SELECT id FROM records WHERE level='inventory' AND parent_id=? AND inv_no=?").get(o.fundId, o.inv_no)?.id;
      const ins = db.prepare(`INSERT INTO records (uid,level,parent_id,branch,fund_no,inv_no,case_no,cipher,title,descr,date_from,date_to,doc_type,place,author,topics,desc_status,file_status,wf_status,created_by,updated_at,provenance,demo) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,'review','none','review',?,?,?,1)`);
      const nextUid = () => 'GAVKO-' + String((db.prepare('SELECT MAX(id) m FROM records').get().m || 0) + 1).padStart(6, '0');
      if (!inv) inv = Number(ins.run(nextUid(), 'inventory', o.fundId, o.branch, o.fund_no, o.inv_no, null, `Ф.${o.fund_no}. Оп.${o.inv_no}`, JSON.stringify({ ru: `Опись № ${o.inv_no}` }), '{}', null, null, null, null, null, '[]', req.user.login, now(), 'Импорт CSV').lastInsertRowid);
      const cs = Number(ins.run(nextUid(), 'case', inv, o.branch, o.fund_no, o.inv_no, o.case_no, o.cipher, JSON.stringify({ ru: `Дело № ${o.case_no}: ${o.title}` }), '{}', o.date_from, o.date_to || o.date_from, null, o.place, null, JSON.stringify(o.topics), req.user.login, now(), 'Импорт CSV').lastInsertRowid);
      const id = Number(ins.run(nextUid(), 'document', cs, o.branch, o.fund_no, o.inv_no, o.case_no, o.cipher, JSON.stringify({ ru: o.title }), JSON.stringify({ ru: o.descr }), o.date_from, o.date_to || o.date_from, o.doc_type, o.place, o.author, JSON.stringify(o.topics), req.user.login, now(), 'Импорт CSV').lastInsertRowid);
      db.exec('RELEASE row');
      protocol.push({ line: o.line, result: 'imported', id });
    } catch (e) {
      db.exec('ROLLBACK TO row'); db.exec('RELEASE row');
      protocol.push({ line: o.line, result: 'error', errors: ['ошибка записи в БД'] });
    }
  }
  const imported = protocol.filter((p) => p.result === 'imported').length;
  audit(req.user.login, 'import', 'records', imported ? 'ok' : 'fail', `импортировано ${imported} из ${out.rows.length}; статус «На проверке»`);
  res.json({ imported, total: out.rows.length, protocol });
});
// Экспорт — только разрешённые (опубликованные) данные
app.get('/api/admin/export.csv', auth, need('catalog.export'), (req, res) => {
  const rows = db.prepare(`SELECT * FROM records WHERE ${PUBLIC_WHERE} ORDER BY id`).all().map(recRow);
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const csv = ['uid;level;cipher;fund;inventory;case;title;date_from;date_to;type;place;file_access'].concat(rows.map((r) => [r.uid, r.level, r.cipher, r.fund_no, r.inv_no, r.case_no, r.title.ru, r.date_from, r.date_to, r.doc_type, r.place, r.file_status].map(esc).join(';'))).join('\r\n');
  audit(req.user.login, 'export', 'records', 'ok', `${rows.length} записей`);
  res.type('text/csv; charset=utf-8').set('Content-Disposition', 'attachment; filename="catalog-export.csv"').send('\uFEFF' + csv);
});

// ---------------------------------------------------------------- Админ: контент и согласование
app.get('/api/admin/content/:type', auth, (req, res) => {
  if (!CONTENT_TYPES.includes(req.params.type)) return res.status(404).json({ error: 'not_found' });
  res.json(contentRows(req.params.type, true).map((c) => ({ id: c.id, slug: c.slug, wf_status: c.wf_status, version: c.version, created_by: c.created_by, approved_by: c.approved_by, updated_at: c.updated_at, data: c.data })));
});
app.post('/api/admin/content/:type', auth, need('content.edit'), (req, res) => {
  const { type } = req.params;
  if (!CONTENT_TYPES.includes(type)) return res.status(404).json({ error: 'not_found' });
  const data = req.body?.data || {};
  if (!data.title?.ru && !data.q?.ru) return res.status(400).json({ error: 'invalid', errors: ['Заполните заголовок (RU)'] });
  const slug = (req.body.slug || ('item-' + Date.now())).toLowerCase().replace(/[^a-z0-9-]/g, '-').slice(0, 60);
  if (type === 'news') data.date ||= now().slice(0, 10);
  try {
    const id = Number(db.prepare("INSERT INTO content (type,slug,wf_status,data,created_by,created_at,updated_at) VALUES (?,?,'draft',?,?,?,?)").run(type, slug, JSON.stringify(data), req.user.login, now(), now()).lastInsertRowid);
    saveVersion(type, id, 1, 'draft', data, req.user.login);
    audit(req.user.login, 'create', `${type}:${id}`, 'ok', data.title?.ru || '');
    res.json({ id, slug });
  } catch { res.status(409).json({ error: 'duplicate', message: 'Материал с таким адресом (slug) уже существует.' }); }
});
app.put('/api/admin/content/:type/:id', auth, need('content.edit'), (req, res) => {
  const c = db.prepare('SELECT * FROM content WHERE id=? AND type=?').get(Number(req.params.id), req.params.type);
  if (!c) return res.status(404).json({ error: 'not_found' });
  const data = { ...P(c.data), ...(req.body?.data || {}) };
  const wf = c.wf_status === 'published' && !A.can(req.user, 'content.review') ? 'review' : c.wf_status;
  db.prepare('UPDATE content SET data=?, version=version+1, wf_status=?, updated_at=? WHERE id=?').run(JSON.stringify(data), wf, now(), c.id);
  saveVersion(c.type, c.id, c.version + 1, wf, data, req.user.login);
  audit(req.user.login, 'update', `${c.type}:${c.id}`, 'ok', `v${c.version + 1}`);
  res.json({ ok: true, wf_status: wf });
});
app.post('/api/admin/content/:type/:id/status', auth, (req, res) => {
  const c = db.prepare('SELECT * FROM content WHERE id=? AND type=?').get(Number(req.params.id), req.params.type);
  if (!c) return res.status(404).json({ error: 'not_found' });
  const to = String(req.body?.to || '');
  if (!A.canTransition(req.user, c.wf_status, to, 'content')) { audit(req.user.login, 'status', `${c.type}:${c.id}`, 'denied', `${c.wf_status}→${to}`); return res.status(403).json({ error: 'forbidden', message: `Переход «${c.wf_status} → ${to}» недоступен для вашей роли.` }); }
  db.prepare('UPDATE content SET wf_status=?, approved_by=?, updated_at=? WHERE id=?').run(to, ['approved', 'published'].includes(to) ? req.user.login : c.approved_by, now(), c.id);
  saveVersion(c.type, c.id, c.version, to, { comment: req.body?.comment || '' }, req.user.login);
  audit(req.user.login, 'status', `${c.type}:${c.id}`, 'ok', `${c.wf_status}→${to}`);
  res.json({ ok: true });
});
app.get('/api/admin/queue', auth, (req, res) => {
  res.json({
    records: db.prepare("SELECT id,uid,cipher,title,wf_status,created_by,updated_at FROM records WHERE wf_status IN ('review','rework','approved','draft') ORDER BY updated_at DESC").all().map(recRow),
    content: db.prepare("SELECT id,type,slug,wf_status,data,created_by,updated_at FROM content WHERE wf_status IN ('review','rework','approved','draft') ORDER BY updated_at DESC").all().map((c) => ({ ...c, data: P(c.data) })),
  });
});

// ---------------------------------------------------------------- Админ: филиалы
app.get('/api/admin/branches', auth, (req, res) => res.json(branchesAll(true).map((b) => ({ ...b, editable: A.can(req.user, 'branches.edit', { branch: b.slug }) }))));
app.put('/api/admin/branches/:slug', auth, need('branches.edit'), (req, res) => {
  const b = db.prepare('SELECT * FROM branches WHERE slug=?').get(req.params.slug);
  if (!b) return res.status(404).json({ error: 'not_found' });
  if (!A.can(req.user, 'branches.edit', { branch: b.slug })) { audit(req.user.login, 'update', `branch:${b.slug}`, 'denied', 'чужой филиал'); return res.status(403).json({ error: 'forbidden', message: 'Вы можете изменять только сведения своего филиала.' }); }
  const allowed = ['address', 'phone', 'email', 'hours', 'director', 'lat', 'lng', 'about'];
  const d = { ...P(b.data) };
  for (const k of allowed) if (k in (req.body || {})) d[k] = k === 'lat' || k === 'lng' ? Number(req.body[k]) : req.body[k];
  if (d.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(d.email)) return res.status(400).json({ error: 'invalid', errors: ['Некорректный e-mail'] });
  const visible = 'visible' in (req.body || {}) && req.user.role !== 'branchadmin' ? (req.body.visible ? 1 : 0) : b.visible;
  db.prepare('UPDATE branches SET data=?, visible=?, updated_at=? WHERE id=?').run(JSON.stringify(d), visible, now(), b.id);
  audit(req.user.login, 'update', `branch:${b.slug}`, 'ok', Object.keys(req.body || {}).join(','));
  res.json({ ok: true });
});

// ---------------------------------------------------------------- Админ: пользователи, журнал, аналитика, отзывы
app.get('/api/admin/users', auth, need('users.manage'), (req, res) => res.json({ users: db.prepare('SELECT id,login,name,role,branch,active,created_at FROM users').all(), roles: A.ROLES }));
app.post('/api/admin/users', auth, need('users.manage'), (req, res) => {
  const { login, name, role, branch, password } = req.body || {};
  if (!/^[a-z0-9_.-]{3,30}$/.test(login || '') || !name || !A.ROLES[role]) return res.status(400).json({ error: 'invalid', errors: ['Проверьте логин (латиница, 3–30 символов), имя и роль'] });
  if (role === 'superadmin' && req.user.role !== 'superadmin') return res.status(403).json({ error: 'forbidden', message: 'Назначить главного администратора может только главный администратор.' });
  if (!password || password.length < 10 || !/\d/.test(password) || !/[A-Za-zА-Яа-я]/.test(password)) return res.status(400).json({ error: 'invalid', errors: ['Пароль: не менее 10 символов, буквы и цифры'] });
  const { salt, hash } = A.hashPassword(password);
  try { db.prepare('INSERT INTO users (login,name,role,branch,salt,hash,created_at) VALUES (?,?,?,?,?,?,?)').run(login, name, role, branch || null, salt, hash, now()); }
  catch { return res.status(409).json({ error: 'duplicate', message: 'Такой логин уже существует.' }); }
  audit(req.user.login, 'user.create', `user:${login}`, 'ok', `роль ${role}`);
  res.json({ ok: true });
});
app.put('/api/admin/users/:id', auth, need('users.manage'), (req, res) => {
  const u = db.prepare('SELECT * FROM users WHERE id=?').get(Number(req.params.id));
  if (!u) return res.status(404).json({ error: 'not_found' });
  if ((u.role === 'superadmin' || req.body.role === 'superadmin') && req.user.role !== 'superadmin') return res.status(403).json({ error: 'forbidden', message: 'Изменять главного администратора может только главный администратор.' });
  if (u.id === req.user.id && 'active' in req.body && !req.body.active) return res.status(400).json({ error: 'invalid', errors: ['Нельзя заблокировать собственную учётную запись'] });
  const role = A.ROLES[req.body.role] ? req.body.role : u.role;
  const active = 'active' in req.body ? (req.body.active ? 1 : 0) : u.active;
  const branch = 'branch' in req.body ? req.body.branch || null : u.branch;
  db.prepare('UPDATE users SET role=?, active=?, branch=? WHERE id=?').run(role, active, branch, u.id);
  audit(req.user.login, 'user.update', `user:${u.login}`, 'ok', `роль ${u.role}→${role}, активен ${active}`);
  res.json({ ok: true });
});
app.get('/api/admin/audit', auth, need('audit.view'), (req, res) => {
  let rows = db.prepare('SELECT * FROM audit ORDER BY id DESC LIMIT 500').all();
  if (req.query.op) rows = rows.filter((r) => r.op === req.query.op);
  if (req.query.user) rows = rows.filter((r) => r.user === req.query.user);
  res.json(rows);
});
app.get('/api/admin/analytics', auth, need('stats.view'), (req, res) => {
  const stats = Object.fromEntries(db.prepare('SELECT key,value FROM stats').all().map((s) => [s.key, s.value]));
  const out = AI.analytics({ searchlog: db.prepare('SELECT q,results FROM searchlog').all(), stats, content: db.prepare('SELECT type,wf_status,data FROM content').all().map((c) => ({ ...c, data: P(c.data) })), feedback: db.prepare('SELECT id FROM feedback').all() });
  const totals = { records: db.prepare('SELECT COUNT(*) n FROM records').get().n, published: db.prepare(`SELECT COUNT(*) n FROM records WHERE ${PUBLIC_WHERE}`).get().n, digital: db.prepare(`SELECT COUNT(*) n FROM records WHERE ${PUBLIC_WHERE} AND file_status='public'`).get().n, restricted: db.prepare("SELECT COUNT(*) n FROM records WHERE file_status IN ('restricted','review')").get().n, review: db.prepare("SELECT COUNT(*) n FROM records WHERE wf_status='review'").get().n + db.prepare("SELECT COUNT(*) n FROM content WHERE wf_status='review'").get().n, views: stats.views, visitors: stats.visitors, comments: db.prepare("SELECT COUNT(*) n FROM comments WHERE status='pending'").get().n };
  res.json({ ...out, totals, poll: db.prepare('SELECT option, votes FROM poll').all() });
});
app.get('/api/admin/comments', auth, need('comments.moderate'), (req, res) => {
  const st = ['pending', 'published', 'rejected'].includes(req.query.status) ? req.query.status : null;
  res.json(db.prepare(`SELECT * FROM comments ${st ? 'WHERE status=?' : ''} ORDER BY CASE status WHEN 'pending' THEN 0 ELSE 1 END, id DESC LIMIT 300`).all(...(st ? [st] : [])));
});
app.put('/api/admin/comments/:id', auth, need('comments.moderate'), (req, res) => {
  const c = db.prepare('SELECT * FROM comments WHERE id=?').get(Number(req.params.id));
  if (!c) return res.status(404).json({ error: 'not_found' });
  const status = ['pending', 'published', 'rejected'].includes(req.body?.status) ? req.body.status : c.status;
  const reply = 'reply' in (req.body || {}) ? String(req.body.reply || '').trim().slice(0, 1000) || null : c.reply;
  db.prepare('UPDATE comments SET status=?, reply=?, moderated_by=?, moderated_at=? WHERE id=?').run(status, reply, req.user.login, now(), c.id);
  audit(req.user.login, 'comment.' + (status !== c.status ? status : 'reply'), `comment:${c.id}`, 'ok', `${c.target_type}:${c.target_id}`);
  res.json({ ok: true });
});
app.delete('/api/admin/comments/:id', auth, need('comments.moderate'), (req, res) => {
  const r = db.prepare('DELETE FROM comments WHERE id=?').run(Number(req.params.id));
  audit(req.user.login, 'comment.delete', `comment:${req.params.id}`, r.changes ? 'ok' : 'fail');
  res.json({ ok: !!r.changes });
});
app.get('/api/admin/feedback', auth, need('feedback.view'), (req, res) => res.json(db.prepare('SELECT * FROM feedback ORDER BY id DESC LIMIT 200').all()));

// ИИ-инструменты для сотрудников
app.post('/api/admin/ai/extract', auth, need('ai.tools'), (req, res) => {
  const text = String(req.body?.text || '').slice(0, 20000);
  if (text.trim().length < 20) return res.status(400).json({ error: 'invalid', errors: ['Вставьте текст документа (от 20 символов)'] });
  audit(req.user.login, 'ai.extract', 'text', 'ok', `${text.length} символов`);
  res.json(AI.extractMetadata(text, db.prepare("SELECT * FROM records WHERE level='document'").all().map(recRow)));
});
app.post('/api/admin/ai/ocr', auth, need('ai.tools'), (req, res) => {
  const r = recRow(db.prepare('SELECT * FROM records WHERE id=?').get(Number(req.body?.id)));
  if (!r || !r.pages) return res.status(400).json({ error: 'invalid', errors: ['У записи нет цифровой копии'] });
  const text = `${r.author ? r.author.toUpperCase() + '\n' : ''}${r.title.ru.toUpperCase()}\n${r.date_from || ''} г.\n\n${r.title.ru}. ${r.descr?.ru || ''}`;
  audit(req.user.login, 'ai.ocr', `record:${r.id}`, 'ok');
  res.json({ text, confidence: 0.93, simulated: true, note: 'ИМИТАЦИЯ OCR: для демонстрационных сканов текст восстанавливается из слоя генерации. В промышленной версии — Tesseract (kaz+rus) / облачный OCR по согласованию.', meta: AI.extractMetadata(text, db.prepare("SELECT * FROM records WHERE level='document'").all().map(recRow).filter((x) => x.id !== r.id)) });
});

// ---------------------------------------------------------------- SEO: robots, sitemap
const BASE = process.env.PUBLIC_URL || `http://localhost:${PORT}`;
app.get('/robots.txt', (req, res) => res.type('text/plain').send(`User-agent: *\nDisallow: /admin\nDisallow: /api/\nAllow: /api/files/\nSitemap: ${BASE}/sitemap.xml\n`));
app.get('/sitemap.xml', (req, res) => {
  const paths = ['', 'about', 'catalog', 'guide', 'services', 'services/paid', 'reading-room', 'laws', 'anticorruption', 'memory', 'exhibitions', 'news', 'branches', 'faq', 'calendar', 'symbols', 'links', 'publications', 'contacts', 'feedback', 'assistant'];
  for (const r of publicRecords('document')) paths.push('catalog/' + r.id);
  for (const n of contentRows('news')) paths.push('news/' + n.slug);
  for (const e of contentRows('exhibition')) paths.push('exhibitions/' + e.slug);
  const urls = paths.map((p) => `<url><loc>${BASE}/ru/${p}</loc>${LANGS.map((l) => `<xhtml:link rel="alternate" hreflang="${l === 'kz' ? 'kk' : l}" href="${BASE}/${l}/${p}"/>`).join('')}</url>`).join('\n');
  res.type('application/xml').send(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${urls}\n</urlset>`);
});

// ---------------------------------------------------------------- Статика и SPA с серверными мета-тегами
app.use('/vendor/leaflet', express.static(join(root, 'node_modules', 'leaflet', 'dist'), { maxAge: '7d' }));
app.use(express.static(join(root, 'public'), { index: false, maxAge: 0, setHeaders: (res, p) => { if (/.(pdf|svg|png|jpg|webp)$/.test(p)) res.setHeader('Cache-Control', 'public, max-age=86400'); } }));
const shell = readFileSync(join(root, 'public', 'index.html'), 'utf8');
const adminShell = readFileSync(join(root, 'public', 'admin.html'), 'utf8');
const escH = (s = '') => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const SECTION = { sources: ['Источники изображений', 'Суреттер дереккөздері', 'Image sources'], persons: ['Личности', 'Тұлғалар', 'People'], '': ['Главная', 'Басты бет', 'Home'], about: ['Об архиве', 'Архив туралы', 'About'], catalog: ['Электронный каталог', 'Электрондық каталог', 'E-catalogue'], exhibitions: ['Онлайн-выставки', 'Онлайн-көрмелер', 'Online exhibitions'], memory: ['Большой архив памяти', 'Үлкен жад архиві', 'Memory archive'], news: ['Новости', 'Жаңалықтар', 'News'], branches: ['Филиалы и карта', 'Филиалдар', 'Branches'], services: ['Государственная услуга', 'Мемлекеттік қызмет', 'State service'], faq: ['Вопросы и ответы', 'Сұрақ-жауап', 'FAQ'] };

app.get('/admin*', (req, res) => { res.set('X-Robots-Tag', 'noindex, nofollow'); res.type('html').send(adminShell); });
app.get(['/', '/:lang', '/:lang/*'], (req, res, next) => {
  if (req.path === '/') return res.redirect(302, '/ru/');
  const lang = req.params.lang;
  if (!LANGS.includes(lang)) return next();
  const rest = (req.params[0] || '').replace(/\/$/, '');
  const [sec, id] = rest.split('/');
  const li = LANGS.indexOf(lang);
  let title = (SECTION[sec] || SECTION[''])[li], desc = org.name[lang] + ' — ' + ['официальный информационный сайт: электронный каталог, онлайн-выставки, история региона, филиалы.', 'ресми ақпараттық сайт.', 'official information website: e-catalogue, exhibitions, regional history, branches.'][li];
  let robots = 'index, follow', status = 200, ld = { '@context': 'https://schema.org', '@type': 'ArchiveOrganization', name: org.name[lang], address: org.address[lang], telephone: org.phoneReception, email: org.email };
  if (sec === 'catalog' && id) {
    const r = recRow(db.prepare('SELECT * FROM records WHERE id=?').get(Number(id)));
    if (r && r.wf_status === 'published' && r.desc_status === 'public') { title = `${r.title[lang] || r.title.ru} — ${r.cipher}`; desc = r.descr?.[lang] || r.descr?.ru || desc; ld = { '@context': 'https://schema.org', '@type': 'ArchiveComponent', name: r.title[lang] || r.title.ru, identifier: r.cipher, dateCreated: String(r.date_from || ''), holdingArchive: { '@type': 'ArchiveOrganization', name: org.name[lang] } }; if (r.file_status !== 'public') robots = 'index, nofollow'; }
    else { robots = 'noindex'; status = r ? 403 : 404; title = r ? 'Материал недоступен' : 'Страница не найдена'; }
  }
  if (sec === 'news' && id) { const n = db.prepare("SELECT data FROM content WHERE type='news' AND slug=? AND wf_status='published'").get(id); if (n) { const d = P(n.data); title = d.title[lang] || d.title.ru; desc = d.lead?.[lang] || d.lead?.ru || desc; } else { status = 404; robots = 'noindex'; } }
  if (sec === 'exhibitions' && id) { const e = db.prepare("SELECT data FROM content WHERE type='exhibition' AND slug=? AND wf_status='published'").get(id); if (e) { const d = P(e.data); title = d.title[lang] || d.title.ru; desc = d.intro?.[lang] || d.intro?.ru || desc; } }
  const full = `${title} | ${['Госархив ВКО', 'ШҚО мемархиві', 'State Archive of EKR'][li]}`;
  const head = `<title>${escH(full)}</title>
<meta name="description" content="${escH(desc.slice(0, 180))}">
<meta name="robots" content="${robots}">
<meta property="og:type" content="website"><meta property="og:title" content="${escH(full)}"><meta property="og:description" content="${escH(desc.slice(0, 180))}">
<meta property="og:url" content="${BASE}${req.path}"><meta property="og:image" content="${BASE}/img/og.svg"><meta property="og:locale" content="${['ru_RU', 'kk_KZ', 'en_US'][li]}">
<link rel="canonical" href="${BASE}${req.path}">
${LANGS.map((l) => `<link rel="alternate" hreflang="${l === 'kz' ? 'kk' : l}" href="${BASE}/${l}/${rest}">`).join('\n')}
<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, '\\u003c')}</script>`;
  res.status(status).type('html').send(shell.replace('<!--HEAD-->', head).replace('<html lang="ru"', `<html lang="${lang === 'kz' ? 'kk' : lang}"`));
});
app.use('/api', (req, res) => res.status(404).json({ error: 'not_found' }));
app.use((req, res) => res.status(404).type('html').send(shell.replace('<!--HEAD-->', '<title>Страница не найдена | Госархив ВКО</title><meta name="robots" content="noindex">')));
// Ошибки: без стека и секретов в ответе
app.use((err, req, res, next) => {
  console.error(`[${now()}] ${req.method} ${req.path}: ${err.type || err.name}`);
  res.status(err.status || 500).json({ error: 'server_error', message: err.type === 'entity.too.large' ? 'Слишком большой файл.' : 'Внутренняя ошибка сервера.' });
});

app.listen(PORT, () => console.log(`Госархив ВКО — прототип запущен: http://localhost:${PORT}/ru/  (админ-панель: /admin)`));
