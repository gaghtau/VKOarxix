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
  if (reset) for (const f of [file, file + '-wal', file + '-shm']) if (existsSync(f)) rmSync(f);
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
  created_by TEXT, approved_by TEXT, updated_at TEXT, master_checksum TEXT, provenance TEXT, demo INTEGER DEFAULT 1,
  images TEXT DEFAULT '[]', source_url TEXT, units INTEGER);
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
CREATE TABLE IF NOT EXISTS comments (
  id INTEGER PRIMARY KEY, at TEXT NOT NULL, target_type TEXT NOT NULL, target_id TEXT NOT NULL, target_title TEXT,
  name TEXT, text TEXT NOT NULL, lang TEXT, status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','published','rejected')),
  reply TEXT, moderated_by TEXT, moderated_at TEXT, demo INTEGER DEFAULT 0);
CREATE INDEX IF NOT EXISTS ix_comments_target ON comments(target_type, target_id, status);
CREATE TABLE IF NOT EXISTS searchlog (id INTEGER PRIMARY KEY, at TEXT, q TEXT, results INTEGER, source TEXT, lang TEXT);
CREATE TABLE IF NOT EXISTS stats (key TEXT PRIMARY KEY, value INTEGER DEFAULT 0);
CREATE TABLE IF NOT EXISTS poll (option TEXT PRIMARY KEY, votes INTEGER DEFAULT 0);
`;

const now = () => new Date().toISOString();
const J = (v) => JSON.stringify(v);

// ---------------------------------------------------------------- Разбор описаний личных фондов
const TOPIC_RULES = [
  ['ВОВ', /Великой Отечественной|фронт|ветеран войны|участник войны/i],
  ['промышленность', /комбинат|завод|энергет|ГЭС|гидроэлектро|горн|рудни|металлург|строител|трест|промышлен/i],
  ['образование', /учител|педагог|школ|институт|доцент|профессор|университет|преподава/i],
  ['наука', /наук|учен|учён|исследовател|академ|геолог|зоолог|краевед/i],
  ['культура', /писател|поэт|художник|театр|артист|литератур|композитор|музык|фотограф|фотокорреспондент/i],
  ['пресса', /журналист|газет|редактор|корреспондент/i],
  ['власть', /депутат|председател|исполком|министр|аким|Верховного Совета/i],
];
const PLACES = [['Усть-Каменогорск', /Усть-Каменогорск/], ['Риддер', /Риддер|Лениногорск/], ['Семипалатинск', /Семипалатинск/], ['Алтай', /Зыряновск/], ['Зайсан', /Зайсан/]];
const TR = { а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z', и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'kh', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'sch', ы: 'y', э: 'e', ю: 'yu', я: 'ya', ә: 'a', ғ: 'g', қ: 'k', ң: 'n', ө: 'o', ұ: 'u', ү: 'u', һ: 'h', і: 'i' };
const slugify = (s) => s.toLowerCase().split('').map((c) => TR[c] ?? (/[a-z0-9]/.test(c) ? c : '-')).join('').replace(/-+/g, '-').replace(/^-|-$/g, '');
function parsePerson(pf) {
  let text = pf.text || '';
  const short = pf.name.split(',')[0].trim().replace(/^(\S+)\s*/, (m, s) => s.charAt(0) + s.slice(1).toLowerCase() + ' ').replace(/\.?$/, '.').replace(/\s+/g, ' ');
  const sur = pf.name.split(/[\s,]/)[0]; const surname = sur.charAt(0) + sur.slice(1).toLowerCase();
  const re = new RegExp(surname + String.raw`(?:а|ова|ева)?\s+[А-ЯЁӘҚҰҮӨІ][а-яёәқұүөіңғһ]+(?:\s+[А-ЯЁӘҚҰҮӨІ][а-яёәқұүөіңғһ]+)?`);
  const m = text.match(re);
  const full = m ? m[0].trim() : short;
  if (m) text = text.slice(m.index);
  const life = text.match(/\(([^)]{4,60})\)/);
  const yrs = life ? (life[1].match(/1[89]\d\d|20[0-2]\d/g) || []) : [];
  const bio = text.replace(/\s+/g, ' ').slice(0, 900);
  const topics = ['личности', ...TOPIC_RULES.filter(([, re]) => re.test(text)).map(([t]) => t)];
  const place = (PLACES.find(([, re]) => re.test(text)) || [])[0] || null;
  return { full, short, years: yrs.length ? yrs.slice(0, 2).join('–') : '', bio, topics, place };
}

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
  const COLS = ['uid', 'level', 'parent_id', 'branch', 'fund_no', 'inv_no', 'case_no', 'cipher', 'title', 'descr', 'date_from', 'date_to', 'date_uncertain', 'doc_type', 'place', 'author', 'author_uncertain', 'topics', 'lang', 'sheets', 'pages', 'storage', 'fund_kind', 'desc_status', 'file_status', 'restriction', 'motif', 'wf_status', 'version', 'created_by', 'approved_by', 'updated_at', 'master_checksum', 'provenance', 'demo', 'images', 'source_url', 'units'];
  const insR = db.prepare(`INSERT INTO records (${COLS.join(',')}) VALUES (${COLS.map(() => '?').join(',')})`);
  let seq = 0;
  const add = (o) => {
    const uid = 'GAVKO-' + String(++seq).padStart(6, '0');
    const images = o.images || [];
    return Number(insR.run(uid, o.level, o.parent ?? null, o.branch, o.fund_no ?? null, o.inv_no ?? null, o.case_no ?? null, o.cipher ?? null,
      J(o.title), J(o.descr ?? {}), o.from ?? null, o.to ?? null, o.dateUncertain ? 1 : 0, o.type ?? null, o.place ?? null, o.author ?? null,
      o.authorUncertain ? 1 : 0, J(o.topics ?? []), o.lang ?? 'ru', o.sheets ?? null, images.length, o.storage ?? null, o.kind ?? null,
      o.desc_status ?? 'public', o.file_status ?? 'none', o.restriction ?? null, null, o.wf ?? 'published', 1, o.by ?? 'seed', o.by ? null : 'seed', now(),
      images.length ? crypto.createHash('sha256').update('master:' + images.join(',')).digest('hex') : null,
      o.provenance ?? 'Обезличенная демонстрационная запись, созданная командой для прототипа', o.demo ?? 1, J(images), o.sourceUrl ?? null, o.units ?? null).lastInsertRowid);
  };
  const storageOf = (b) => (S.branches.find((x) => x.slug === b)?.name.ru || b) + ', архивохранилище';

  // 1) Реальные личные фонды (описания и фото — официальный сайт архива)
  const byFund = {};
  for (const pf of S.personalFunds) (byFund[pf.fund_no] ||= []).push(pf);
  const refs = {}; // 'pf:ФАМИЛИЯ' → id документа (фото) или описи
  const personRows = [];
  for (const [no, list] of Object.entries(byFund)) {
    const people = list.map(parsePerson);
    const one = list.length === 1;
    const from = Math.min(...list.map((x) => x.from || 9999)), to = Math.max(...list.map((x) => x.to || 0));
    const fundId = add({ level: 'fund', branch: 'main', fund_no: no, cipher: `Ф.${no}`, kind: 'personal', type: 'personal', demo: 0,
      title: one ? { ru: `Личный фонд: ${people[0].full}`, kz: `Жеке қор: ${people[0].full}`, en: `Personal fonds: ${people[0].full}` } : { ru: `Фонд № ${no}: документы личного происхождения`, kz: `№ ${no} қор: жеке шығу тегі құжаттары`, en: `Fonds ${no}: personal papers` },
      descr: { ru: one ? people[0].bio : `Объединяет документы: ${people.map((p) => p.full).join(', ')}.` }, from: from < 9999 ? from : null, to: to || null,
      topics: [...new Set(people.flatMap((p) => p.topics))], place: one ? people[0].place : null, storage: storageOf('main'),
      provenance: 'Описание опубликовано на официальном сайте архива (раздел «Личные фонды»)', sourceUrl: list[0].page, units: one ? list[0].units : list.reduce((s, x) => s + (x.units || 0), 0) || null });
    list.forEach((pf, i) => {
      const p = people[i];
      const invId = add({ level: 'inventory', parent: fundId, branch: 'main', fund_no: no, inv_no: pf.inv, cipher: `Ф.${no}. Оп.${pf.inv}`, kind: 'personal', type: 'personal', demo: 0,
        title: { ru: `Опись № ${pf.inv}: документы ${p.full}`, kz: `№ ${pf.inv} тізімдеме: ${p.full} құжаттары`, en: `Inventory ${pf.inv}: papers of ${p.full}` },
        descr: { ru: p.bio }, from: pf.from, to: pf.to, topics: p.topics, place: p.place, storage: storageOf('main'), units: pf.units,
        provenance: 'Описание опубликовано на официальном сайте архива', sourceUrl: pf.page });
      let firstDoc = null;
      pf.images.forEach((im, k) => {
        const id = add({ level: 'document', parent: invId, branch: 'main', fund_no: no, inv_no: pf.inv, cipher: `Ф.${no}. Оп.${pf.inv}`, kind: 'personal', type: 'photo', demo: 0, lang: '—',
          title: { ru: `${k ? `Фотография ${k + 1}` : 'Фотопортрет'}: ${p.full}`, kz: `${k ? `Фотосурет ${k + 1}` : 'Фотопортрет'}: ${p.full}`, en: `${k ? `Photograph ${k + 1}` : 'Portrait'}: ${p.full}` },
          descr: { ru: `Фотография из фонда личного происхождения. ${p.bio.slice(0, 420)}` }, dateUncertain: true, topics: p.topics, place: p.place,
          storage: storageOf('main'), file_status: 'public', images: [im.key], author: p.full,
          provenance: `Фото и описание опубликованы на официальном сайте архива: ${pf.page}. Номер дела в публикации не указан.`, sourceUrl: pf.page });
        firstDoc ??= id;
      });
      refs[('pf:' + pf.name).toUpperCase()] = firstDoc ?? invId;
      if (pf.images.length) personRows.push({ slug: slugify(p.full), name: { ru: p.full }, years: p.years, bio: { ru: p.bio }, source: `Государственный архив ВКО, Ф.${no}. Оп.${pf.inv}`, sourceUrl: pf.page, docId: firstDoc, fundId, invId, topics: p.topics });
    });
  }

  // 2) Демонстрационные фонды учреждений — только описания, без «сгенерированных» копий
  const DEMO = S.funds.filter((f) => !['fd1', 'fl1', 'fl2'].includes(f.key));
  const invIds = {}, caseCounter = {};
  for (const f of DEMO) {
    const fid = add({ level: 'fund', branch: f.branch, fund_no: f.no, cipher: `Ф.${f.no}`, title: f.title, from: f.from, to: f.to, kind: f.kind, type: 'org',
      descr: { ru: `Фонд № ${f.no}. Крайние даты: ${f.from}–${f.to}. Демонстрационное описание: структура записи соответствует ТЗ, номер фонда условный.` }, storage: storageOf(f.branch) });
    invIds[f.key] = add({ level: 'inventory', parent: fid, branch: f.branch, fund_no: f.no, inv_no: '1', cipher: `Ф.${f.no}. Оп.1`, kind: f.kind,
      title: { ru: 'Опись № 1 дел постоянного хранения', kz: 'Тұрақты сақталатын істердің № 1 тізімдемесі', en: 'Inventory No. 1 (permanent files)' }, from: f.from, to: f.to, storage: storageOf(f.branch) });
    caseCounter[f.key] = 0;
  }
  S.documents.filter((d) => d.type !== 'photo' && invIds[d.fund]).forEach((d, i) => {
    const f = S.funds.find((x) => x.key === d.fund);
    const caseNo = String(++caseCounter[d.fund] * 3 + (i % 3));
    const cipher = `Ф.${f.no}. Оп.1. Д.${caseNo}`;
    const caseId = add({ level: 'case', parent: invIds[d.fund], branch: f.branch, fund_no: f.no, inv_no: '1', case_no: caseNo, cipher, kind: f.kind,
      title: { ru: `Дело № ${caseNo}: ${d.title.ru}`, ...(d.title.kz ? { kz: `№ ${caseNo} іс: ${d.title.kz}` } : {}), ...(d.title.en ? { en: `File ${caseNo}: ${d.title.en}` } : {}) },
      from: d.from, to: d.to, sheets: Math.max(d.pages, 1) + 2, storage: storageOf(f.branch), topics: d.topics, place: d.place });
    add({ level: 'document', parent: caseId, branch: f.branch, fund_no: f.no, inv_no: '1', case_no: caseNo, cipher: cipher + '. Л.1' + (d.pages > 1 ? `–${d.pages}` : ''),
      title: d.title, descr: { ru: d.desc + (d.file === 'public' ? ' Цифровая копия в прототипе не размещается.' : '') }, from: d.from, to: d.to, dateUncertain: d.dateUncertain, type: d.type, place: d.place,
      author: d.author ?? null, authorUncertain: d.authorUncertain, topics: d.topics, sheets: d.pages || null, storage: storageOf(f.branch), kind: f.kind,
      file_status: d.file === 'public' ? 'none' : d.file, restriction: d.restriction ?? null });
  });
  // Черновик, ожидающий проверки (не попадает в публичный поиск)
  const extra = add({ level: 'document', parent: invIds.f25, branch: 'main', fund_no: '25', inv_no: '1', case_no: '99', cipher: 'Ф.25. Оп.1. Д.99. Л.1',
    title: { ru: 'Черновик описания: протоколы сессий облсовета (не опубликовано)' }, descr: { ru: 'Запись в статусе «На проверке». Не видна посетителям и не индексируется.' },
    from: 1975, to: 1975, type: 'text', place: 'Усть-Каменогорск', topics: ['власть'], desc_status: 'review', file_status: 'review', wf: 'review', by: 'archivist' });
  void extra;

  // Контент
  const insC = db.prepare('INSERT INTO content (type,slug,wf_status,data,sort,created_by,approved_by,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?)');
  const c = (type, slug, data, sort = 0, status = 'published') => insC.run(type, slug, status, J(data), sort, 'seed', 'seed', now(), now());
  S.news.forEach((n) => c('news', n.slug, n));
  c('news', 'draft-reading-room', { slug: 'draft-reading-room', date: '2026-11-10', cat: 'events', demo: true,
    title: { ru: 'Черновик: изменение графика читального зала' }, lead: { ru: 'Материал ожидает согласования' }, body: { ru: 'Не опубликовано.' } }, 0, 'review');
  const resolve = (x) => (typeof x === 'string' ? { rec: Object.entries(refs).find(([k]) => k.startsWith(x.toUpperCase()))?.[1] } : x);
  S.exhibitions.forEach((e, i) => c('exhibition', e.slug, { ...e, exhibits: e.exhibits.map(resolve).filter((x) => x.rec || x.media) }, i));
  S.collections.forEach((x, i) => c('collection', x.slug, x, i));
  personRows.sort((a, b) => a.name.ru.localeCompare(b.name.ru, 'ru'));
  personRows.forEach((p, i) => c('person', p.slug + '-' + i, { ...p, slug: p.slug + '-' + i }, i));
  S.timeline.forEach((x, i) => c('event', 'e' + i, x, x.year));
  S.places.forEach((x, i) => c('place', 'p' + i, x, i));
  S.faq.forEach((x, i) => c('faq', 'q' + i, x, i));
  S.laws.forEach((x, i) => c('law', 'l' + i, x, i));

  // Комментарии посетителей (демо): опубликованные проходят модерацию
  const insCm = db.prepare('INSERT INTO comments (at,target_type,target_id,target_title,name,text,lang,status,reply,moderated_by,moderated_at,demo) VALUES (?,?,?,?,?,?,?,?,?,?,?,1)');
  const kul = refs[Object.keys(refs).find((k) => k.startsWith('PF:КУЛЕНОВ'))];
  insCm.run('2026-11-02T09:14:00Z', 'exhibition', 'honorary-citizens', 'Люди, изменившие историю региона', 'Айгерим', 'Очень нужная выставка! Показала детям портрет Куленова — дед работал на свинцово-цинковом комбинате при нём.', 'ru', 'published', 'Спасибо за отзыв! Документы фонда можно изучить в читальном зале.', 'moderator', '2026-11-02T11:00:00Z');
  insCm.run('2026-11-04T15:40:00Z', 'exhibition', 'travellers', 'Восточный Казахстан XVIII–XIX веков', 'Гость', 'Не знал, что есть фотографии Зайсана 1875 года. Добавьте, пожалуйста, ещё старых видов Усть-Каменогорска.', 'ru', 'published', null, 'moderator', '2026-11-04T16:10:00Z');
  if (kul) insCm.run('2026-11-06T08:05:00Z', 'record', String(kul), 'Фотопортрет: Куленов', 'Ерлан', 'Ахат Салемхатович — легендарный директор. Хорошо, что фонд описан онлайн.', 'ru', 'published', null, 'moderator', '2026-11-06T09:00:00Z');
  insCm.run('2026-11-09T19:22:00Z', 'news', 'calendar-2026', 'Календарь памятных дат 2026', 'Гость', 'А будет ли календарь на 2027 год на казахском языке?', 'ru', 'pending', null, null, null);

  const insS = db.prepare('INSERT INTO stats (key,value) VALUES (?,?)');
  for (const [k, v] of Object.entries({ views: 18240, visitors: 5310, 'page:catalog': 4210, 'page:home': 7120, 'page:branches': 1630, 'page:exhibitions': 1210, 'page:memory': 980, 'page:services': 1440, 'page:news': 870, 'page:faq': 410, 'page:assistant': 650 })) insS.run(k, v);
  const insP = db.prepare('INSERT INTO poll (option,votes) VALUES (?,?)');
  for (const [k, v] of Object.entries({ catalog: 41, memory: 23, exhibitions: 19, personal: 12, publications: 9, photos: 27 })) insP.run(k, v);
  const insQ = db.prepare('INSERT INTO searchlog (at,q,results,source,lang) VALUES (?,?,?,?,?)');
  const sample = [['фотографии усть-каменогорска', 6], ['метрические книги', 0], ['архивная справка о стаже', 0], ['куленов', 3], ['риддер', 5], ['ф.1466', 12], ['колхоз', 0], ['бухтарма', 2], ['почетные граждане', 4], ['метрические книги 1910', 0], ['стаж работы справка', 0], ['өскемен', 6]];
  for (const [q, r] of sample) for (let i = 0; i < 1 + (q.length % 4); i++) insQ.run(now(), q, r, 'catalog', 'ru');
  db.prepare('INSERT INTO audit (at,user,op,object,result,details) VALUES (?,?,?,?,?,?)').run(now(), 'system', 'seed', 'database', 'ok', `Загружено: ${seq} записей каталога (${S.personalFunds.length} личных фондов с официального сайта)`);
  db.exec('COMMIT');
}
