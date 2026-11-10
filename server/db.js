// Хранилище: встроенный SQLite (node:sqlite). Все запросы — подготовленные выражения
// с параметрами (защита от SQL-инъекций).
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, existsSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';
import * as S from './seed.js';
import { hashPassword } from './auth.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dataDir = join(root, 'data');
mkdirSync(dataDir, { recursive: true });
const file = join(dataDir, 'archive.sqlite');

export function openDb({ reset = false } = {}) {
  if (reset && existsSync(file)) for (const f of [file, file + '-wal', file + '-shm']) if (existsSync(f)) rmSync(f);
  const fresh = !existsSync(file);
  const db = new DatabaseSync(file);
  db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
  db.exec(SCHEMA);
  if (fresh) seed(db);
  return db;
}

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY, login TEXT UNIQUE NOT NULL, name TEXT NOT NULL, role TEXT NOT NULL,
  branch TEXT, salt TEXT NOT NULL, hash TEXT NOT NULL, active INTEGER DEFAULT 1,
  failed INTEGER DEFAULT 0, locked_until INTEGER DEFAULT 0, created_at TEXT);
CREATE TABLE IF NOT EXISTS branches (
  id INTEGER PRIMARY KEY, slug TEXT UNIQUE NOT NULL, data TEXT NOT NULL, visible INTEGER DEFAULT 1, updated_at TEXT);
CREATE TABLE IF NOT EXISTS records (
  id INTEGER PRIMARY KEY, uid TEXT UNIQUE NOT NULL, level TEXT NOT NULL CHECK(level IN ('fund','inventory','case','document')),
  parent_id INTEGER REFERENCES records(id) ON DELETE RESTRICT, branch TEXT NOT NULL,
  fund_no TEXT, inv_no TEXT, case_no TEXT, cipher TEXT, title TEXT NOT NULL, descr TEXT,
  date_from INTEGER, date_to INTEGER, date_uncertain INTEGER DEFAULT 0, doc_type TEXT, place TEXT, author TEXT,
  author_uncertain INTEGER DEFAULT 0, topics TEXT DEFAULT '[]', lang TEXT, sheets INTEGER, pages INTEGER DEFAULT 0,
  storage TEXT, fund_kind TEXT, desc_status TEXT NOT NULL DEFAULT 'review', file_status TEXT NOT NULL DEFAULT 'none',
  restriction TEXT, motif TEXT, wf_status TEXT NOT NULL DEFAULT 'draft', version INTEGER DEFAULT 1,
  created_by TEXT, approved_by TEXT, updated_at TEXT, master_checksum TEXT, provenance TEXT, demo INTEGER DEFAULT 1);
CREATE INDEX IF NOT EXISTS ix_records_parent ON records(parent_id);
CREATE TABLE IF NOT EXISTS content (
  id INTEGER PRIMARY KEY, type TEXT NOT NULL, slug TEXT, branch TEXT, wf_status TEXT NOT NULL DEFAULT 'draft',
  data TEXT NOT NULL, version INTEGER DEFAULT 1, sort INTEGER DEFAULT 0, created_by TEXT, approved_by TEXT,
  created_at TEXT, updated_at TEXT, UNIQUE(type, slug));
CREATE TABLE IF NOT EXISTS versions (
  id INTEGER PRIMARY KEY, entity TEXT, entity_id INTEGER, version INTEGER, status TEXT, data TEXT, author TEXT, at TEXT);
CREATE TABLE IF NOT EXISTS audit (
  id INTEGER PRIMARY KEY, at TEXT NOT NULL, user TEXT, op TEXT NOT NULL, object TEXT, result TEXT, details TEXT);
CREATE TABLE IF NOT EXISTS feedback (id INTEGER PRIMARY KEY, at TEXT, kind TEXT, page TEXT, text TEXT, status TEXT DEFAULT 'new');
CREATE TABLE IF NOT EXISTS searchlog (id INTEGER PRIMARY KEY, at TEXT, q TEXT, results INTEGER, source TEXT, lang TEXT);
CREATE TABLE IF NOT EXISTS stats (key TEXT PRIMARY KEY, value INTEGER DEFAULT 0);
CREATE TABLE IF NOT EXISTS poll (option TEXT PRIMARY KEY, votes INTEGER DEFAULT 0);
`;

const now = () => new Date().toISOString();
const J = (v) => JSON.stringify(v);

function seed(db) {
  db.exec('BEGIN');
  // Тестовые пользователи (пароли — в docs/TEST_ACCOUNTS.md, только для демо-стенда)
  const users = [
    ['superadmin', 'Главный администратор (демо)', 'superadmin', null],
    ['siteadmin', 'Администратор сайта (демо)', 'siteadmin', null],
    ['editor', 'Редактор (демо)', 'editor', null],
    ['archivist', 'Сотрудник архива (демо)', 'archivist', 'main'],
    ['ridder', 'Администратор Риддерского филиала (демо)', 'branchadmin', 'ridder'],
    ['moderator', 'Модератор (демо)', 'moderator', null],
    ['analyst', 'Аналитик (демо)', 'analyst', null],
  ];
  const insU = db.prepare('INSERT INTO users (login,name,role,branch,salt,hash,created_at) VALUES (?,?,?,?,?,?,?)');
  for (const [login, name, role, branch] of users) {
    const { salt, hash } = hashPassword(process.env.DEMO_PASSWORD || 'Arhiv#2026');
    insU.run(login, name, role, branch, salt, hash, now());
  }

  const insB = db.prepare('INSERT INTO branches (slug,data,visible,updated_at) VALUES (?,?,?,?)');
  for (const b of S.branches) insB.run(b.slug, J(b), b.visible, now());

  // Каталог: фонд → опись → дело → документ
  const insR = db.prepare(`INSERT INTO records (uid,level,parent_id,branch,fund_no,inv_no,case_no,cipher,title,descr,date_from,date_to,
    date_uncertain,doc_type,place,author,author_uncertain,topics,lang,sheets,pages,storage,fund_kind,desc_status,file_status,restriction,motif,
    wf_status,version,created_by,approved_by,updated_at,master_checksum,provenance,demo) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);
  let seq = 0;
  const uid = () => 'GAVKO-' + String(++seq).padStart(6, '0');
  const fundIds = {}, invIds = {}, caseCounter = {};
  const add = (o) => Number(insR.run(uid(), o.level, o.parent ?? null, o.branch, o.fund_no ?? null, o.inv_no ?? null, o.case_no ?? null, o.cipher ?? null,
    J(o.title), J(o.descr ?? {}), o.from ?? null, o.to ?? null, o.dateUncertain ? 1 : 0, o.type ?? null, o.place ?? null, o.author ?? null,
    o.authorUncertain ? 1 : 0, J(o.topics ?? []), o.lang ?? 'ru', o.sheets ?? null, o.pages ?? 0, o.storage ?? null, o.kind ?? null,
    o.desc_status ?? 'public', o.file_status ?? 'none', o.restriction ?? null, o.motif ?? null, 'published', 1, 'seed', 'seed', now(),
    o.pages ? crypto.createHash('sha256').update('master:' + seq).digest('hex') : null,
    'Обезличенная демонстрационная запись, созданная командой для прототипа', 1).lastInsertRowid);

  const storageOf = (b) => (S.branches.find((x) => x.slug === b)?.name.ru || b) + ', архивохранилище';
  for (const f of S.funds) {
    const fid = add({ level: 'fund', branch: f.branch, fund_no: f.no, cipher: `Ф.${f.no}`, title: f.title, from: f.from, to: f.to, kind: f.kind,
      type: f.kind === 'personal' ? 'personal' : 'org', descr: { ru: `Фонд № ${f.no}. Крайние даты: ${f.from}–${f.to}. Тип фонда: ${({ state: 'фонд учреждения', party: 'партийный фонд', personal: 'личный фонд' })[f.kind]}.` },
      storage: storageOf(f.branch) });
    fundIds[f.key] = fid;
    invIds[f.key] = add({ level: 'inventory', parent: fid, branch: f.branch, fund_no: f.no, inv_no: '1', cipher: `Ф.${f.no}. Оп.1`, kind: f.kind,
      title: { ru: `Опись № 1 дел постоянного хранения`, kz: `Тұрақты сақталатын істердің № 1 тізімдемесі`, en: `Inventory No. 1 (permanent files)` }, from: f.from, to: f.to, storage: storageOf(f.branch) });
    caseCounter[f.key] = 0;
  }
  S.documents.forEach((d, i) => {
    const f = S.funds.find((x) => x.key === d.fund);
    const caseNo = String(++caseCounter[d.fund] * 3 + (i % 3));
    const cipher = `Ф.${f.no}. Оп.1. Д.${caseNo}`;
    const caseId = add({ level: 'case', parent: invIds[d.fund], branch: f.branch, fund_no: f.no, inv_no: '1', case_no: caseNo, cipher, kind: f.kind,
      title: { ru: `Дело № ${caseNo}: ${d.title.ru}`, ...(d.title.kz ? { kz: `№ ${caseNo} іс: ${d.title.kz}` } : {}), ...(d.title.en ? { en: `File ${caseNo}: ${d.title.en}` } : {}) },
      from: d.from, to: d.to, sheets: Math.max(d.pages, 1) + 2, storage: storageOf(f.branch), topics: d.topics, place: d.place,
      desc_status: 'public', file_status: 'none' });
    add({ level: 'document', parent: caseId, branch: f.branch, fund_no: f.no, inv_no: '1', case_no: caseNo, cipher: cipher + '. Л.1' + (d.pages > 1 ? `–${d.pages}` : ''),
      title: d.title, descr: { ru: d.desc }, from: d.from, to: d.to, dateUncertain: d.dateUncertain, type: d.type, place: d.place,
      author: d.author ?? null, authorUncertain: d.authorUncertain, topics: d.topics, lang: d.type === 'photo' ? '—' : 'ru',
      sheets: d.pages || null, pages: d.file === 'none' ? 0 : (d.pages || 1), storage: storageOf(f.branch), kind: f.kind,
      desc_status: 'public', file_status: d.file, restriction: d.restriction ?? null, motif: d.motif ?? (d.type === 'map' ? 'map' : 'text') });
  });
  // Черновик, ожидающий проверки (демонстрирует, что непроверенное не попадает в публичный поиск)
  const extra = add({ level: 'document', parent: invIds.f25, branch: 'main', fund_no: '25', inv_no: '1', case_no: '99', cipher: 'Ф.25. Оп.1. Д.99. Л.1',
    title: { ru: 'Черновик описания: протоколы сессий облсовета (не опубликовано)' }, descr: { ru: 'Запись в статусе «На проверке». Не видна посетителям и не индексируется.' },
    from: 1975, to: 1975, type: 'text', place: 'Усть-Каменогорск', topics: ['власть'], desc_status: 'review', file_status: 'review', pages: 1 });
  db.prepare(`UPDATE records SET wf_status='review', created_by='archivist' WHERE id=?`).run(extra);

  // Контент
  const insC = db.prepare('INSERT INTO content (type,slug,wf_status,data,sort,created_by,approved_by,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?)');
  const c = (type, slug, data, sort = 0, status = 'published') => insC.run(type, slug, status, J(data), sort, 'seed', 'seed', now(), now());
  S.news.forEach((n) => c('news', n.slug, n));
  c('news', 'draft-reading-room', { slug: 'draft-reading-room', date: '2026-11-10', cat: 'events', demo: true,
    title: { ru: 'Черновик: изменение графика читального зала' }, lead: { ru: 'Материал ожидает согласования' }, body: { ru: 'Не опубликовано.' } }, 0, 'review');
  S.exhibitions.forEach((e, i) => c('exhibition', e.slug, e, i));
  S.collections.forEach((x, i) => c('collection', x.slug, x, i));
  S.persons.forEach((x, i) => c('person', x.slug, x, i));
  S.timeline.forEach((x, i) => c('event', 'e' + i, x, x.year));
  S.places.forEach((x, i) => c('place', 'p' + i, x, i));
  S.faq.forEach((x, i) => c('faq', 'q' + i, x, i));
  S.laws.forEach((x, i) => c('law', 'l' + i, x, i));

  const insS = db.prepare('INSERT INTO stats (key,value) VALUES (?,?)');
  for (const [k, v] of Object.entries({ views: 18240, visitors: 5310, 'page:catalog': 4210, 'page:home': 7120, 'page:branches': 1630, 'page:exhibitions': 1210, 'page:memory': 980, 'page:services': 1440, 'page:news': 870, 'page:faq': 410, 'page:assistant': 650 })) insS.run(k, v);
  const insP = db.prepare('INSERT INTO poll (option,votes) VALUES (?,?)');
  for (const [k, v] of Object.entries({ catalog: 41, memory: 23, exhibitions: 19, personal: 12, publications: 9, photos: 27 })) insP.run(k, v);
  const insQ = db.prepare('INSERT INTO searchlog (at,q,results,source,lang) VALUES (?,?,?,?,?)');
  const sample = [['фотографии усть-каменогорска', 6], ['метрические книги', 0], ['архивная справка о стаже', 0], ['вов письма', 3], ['риддер', 5], ['ф.25', 12], ['колхоз', 0], ['бухтарма', 2], ['зайсан школа', 1], ['метрические книги 1910', 0], ['стаж работы справка', 0], ['өскемен', 6]];
  for (const [q, r] of sample) for (let i = 0; i < 1 + (q.length % 4); i++) insQ.run(now(), q, r, 'catalog', 'ru');
  db.prepare('INSERT INTO audit (at,user,op,object,result,details) VALUES (?,?,?,?,?,?)').run(now(), 'system', 'seed', 'database', 'ok', 'Загружен демонстрационный набор данных');
  db.exec('COMMIT');
}
