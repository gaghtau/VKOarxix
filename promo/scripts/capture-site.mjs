// Съёмка сайта Госархива ВКО для промо-ролика (по образцу assets/scripts/capture-template.mjs).
// Три вида материала: страницы/фрагменты в 2x, вырезанные элементы (2x или 4x) и live-layout.json
// с координатами элементов в CSS px той же системы, что и фрагмент.
// Запуск: сайт включён (npm run on в D:\hachaton), затем `node scripts/capture-site.mjs`.
// Все данные на страницах — публичные материалы архива; анимации сайта выключены («Без анимации»),
// чтобы кадр был в итоговом состоянии.
import puppeteer from 'puppeteer';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const BASE = 'http://localhost:3000';
const OUT = path.join(here, '..', 'public', 'textures', 'live');
const LAYOUT = path.join(here, '..', 'src', 'aifl', 'live-layout.json');
const SITE_IMG = path.join(here, '..', '..', 'public', 'img', 'site');
fs.mkdirSync(OUT, { recursive: true });

const HIDE = `.assist-fab,.assist,.d-rail,.d-corner,.scroll-progress,.to-top,.curtain,.curtain-fade,.toast{display:none!important}
*{caret-color:transparent!important}`;
const layout = { pageW: 1920 };

// Браузер системы (Chrome), чтобы не скачивать отдельный; можно задать CHROME_PATH
const browser = await puppeteer.launch({ headless: true, executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', args: ['--font-render-hinting=none'] });

async function open(url, { dsf = 2, w = 1920, h = 1080 } = {}) {
  const page = await browser.newPage();
  await page.setViewport({ width: w, height: h, deviceScaleFactor: dsf });
  await page.evaluateOnNewDocument(() => {
    try { localStorage.setItem('motion', 'off'); localStorage.removeItem('site-theme'); localStorage.removeItem('fs'); localStorage.removeItem('assist-log'); } catch {}
  });
  await page.goto(BASE + url, { waitUntil: 'networkidle0', timeout: 60000 });
  await page.addStyleTag({ content: HIDE });
  await page.evaluate(() => document.fonts.ready);
  await new Promise((r) => setTimeout(r, 800));
  return page;
}
const box = (page, sel, all = false) => page.evaluate((s, a) => {
  const pick = (e) => { const r = e.getBoundingClientRect(); return { x: r.x + scrollX, y: r.y + scrollY, w: r.width, h: r.height, text: (e.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 60) }; };
  return a ? [...document.querySelectorAll(s)].map(pick) : (document.querySelector(s) ? pick(document.querySelector(s)) : null);
}, sel, all);
const shot = (page, file, clip, extra = {}) => page.screenshot({ path: path.join(OUT, file), clip, captureBeyondViewport: true, ...extra });
const rel = (b, top) => ({ x: Math.round(b.x), y: Math.round(b.y - top), w: Math.round(b.w), h: Math.round(b.h) });

// ---------- 1. Главная: «стол» с записками (сцены 1 и финал) ----------
{
  const p = await open('/ru/');
  const ch2 = await box(p, '#ch2');
  const top = ch2.y - 40, H = Math.round(ch2.h + 60);
  await shot(p, 'home-desk.png', { x: 0, y: top, width: 1920, height: H });
  const notes = await box(p, '[data-board] .note', true);
  layout.home = { pageH: H, notes: notes.map((n, i) => ({ file: `note${i + 1}.png`, ...rel(n, top), title: n.text })) };
  for (const [i, n] of notes.entries()) await shot(p, `note${i + 1}.png`, { x: n.x, y: n.y, width: n.w, height: n.h });
  const nav = await box(p, 'header.header');
  await shot(p, 'nav.png', { x: 0, y: nav.y, width: 1920, height: nav.h });
  layout.nav = { w: 1920, h: Math.round(nav.h) };
  const crt = await box(p, '[data-crt]');
  await shot(p, 'crt.png', { x: crt.x, y: crt.y, width: crt.w, height: crt.h }, { omitBackground: true });
  layout.crt = { w: Math.round(crt.w), h: Math.round(crt.h) };
  await p.close();
  // 4x-копия главной записки для крупного плана
  const p4 = await open('/ru/', { dsf: 4 });
  const hero = (await box(p4, '[data-board] .note', true))[1];
  await shot(p4, 'note-hero-4x.png', { x: hero.x, y: hero.y, width: hero.w, height: hero.h });
  await p4.close();
}

// ---------- 2. «Большой архив памяти»: поиск + сетка личностей (раздача, поиск) ----------
{
  const p = await open('/ru/memory');
  // показываем только поиск и сетку личностей: коллекции и хронологию на время съёмки скрываем
  await p.evaluate(() => {
    const grids = [...document.querySelectorAll('#app .grid')];
    grids.slice(0, 2).forEach((g) => { g.style.display = 'none'; const h = g.previousElementSibling; if (h && /^H2$/.test(h.tagName)) h.style.display = 'none'; });
    document.querySelectorAll('#app h2').forEach((h) => { if (/Тематические/.test(h.textContent)) h.style.display = 'none'; });
    const persons = grids[2]; [...persons.children].slice(24).forEach((c) => (c.style.display = 'none'));
  });
  await new Promise((r) => setTimeout(r, 400));
  const H = await p.evaluate(() => document.querySelector('#app').getBoundingClientRect().bottom + scrollY);
  const cards = await p.evaluate(() => [...[...document.querySelectorAll('#app .grid')][2].children].slice(0, 24).map((e) => { const r = e.getBoundingClientRect(); return { x: r.x + scrollX, y: r.y + scrollY, w: r.width, h: r.height, title: e.textContent.trim().replace(/\s+/g, ' ').slice(0, 60) }; }));
  const search = await box(p, '#app form.adv input');
  const pageH = Math.round(H + 40);
  await shot(p, 'memory-full.png', { x: 0, y: 0, width: 1920, height: pageH });
  for (const [i, c] of cards.entries()) await shot(p, `person${i + 1}.png`, { x: c.x, y: c.y, width: c.w, height: c.h });
  const field = await box(p, '#app form.adv');
  await shot(p, 'float-search.png', { x: search.x, y: search.y, width: search.w, height: search.h });
  await p.evaluate(() => { [...document.querySelectorAll('#app .grid')][2].style.visibility = 'hidden'; });
  await shot(p, 'memory-empty.png', { x: 0, y: 0, width: 1920, height: pageH });
  layout.memory = { pageH, cards: cards.map((c, i) => ({ file: `person${i + 1}.png`, ...rel(c, 0), title: c.title })), search: rel(search, 0), form: rel(field, 0) };
  await p.close();
}

// ---------- 3. Страница личности: строки справки встраиваются (row-embed) ----------
{
  const p = await open('/ru/memory/person/kulenov-akhat-salemkhatovich-15');
  const H = await p.evaluate(() => document.querySelector('section.comments')?.getBoundingClientRect().top + scrollY || document.documentElement.scrollHeight);
  const pageH = Math.round(H - 10);
  await shot(p, 'person-full.png', { x: 0, y: 0, width: 1920, height: pageH });
  const rows = await p.evaluate(() => {
    const h2 = [...document.querySelectorAll('#app h2')].find((h) => /Биографическая/.test(h.textContent));
    const scope = h2.parentElement;
    return [...scope.querySelectorAll('p, .card, .tags, .row')].filter((e) => e.getBoundingClientRect().height > 18).slice(0, 6).map((e) => { const r = e.getBoundingClientRect(); return { x: r.x + scrollX, y: r.y + scrollY, w: r.width, h: r.height }; });
  });
  layout.person = { pageH, rows: rows.map((r) => rel(r, 0)) };
  await p.close();
}

// ---------- 4. Карта филиалов с построенным маршрутом ----------
{
  const p = await open('/ru/branches?b=main');
  await new Promise((r) => setTimeout(r, 1500));
  // маршрут: от городского филиала по личному составу до главного здания
  await p.evaluate(() => { const s = document.querySelector('.bcard [data-fromb]'); s.value = 'ust-kamenogorsk-ls'; s.dispatchEvent(new Event('change')); });
  await p.waitForSelector('.rt-sum', { timeout: 20000 }).catch(() => null);
  // ФИО руководителя в ролике не нужно: прячем строку «Руководитель» карточки (подпись и значение)
  await p.evaluate(() => document.querySelectorAll('.bcard .kv > div').forEach((d) => { if (/^(Руководитель|Басшы|Head)$/.test(d.textContent.trim())) { d.style.display = 'none'; d.nextElementSibling.style.display = 'none'; } }));
  await new Promise((r) => setTimeout(r, 3500));
  await p.evaluate(() => { const s = document.querySelector('.rt-sum'); if (s) s.style.visibility = 'hidden'; });
  const mapB = await box(p, '#map');
  const top = mapB.y - 140, pageH = Math.round(mapB.h + 200);
  await shot(p, 'branches-route.png', { x: 0, y: top, width: 1920, height: pageH });
  const card = await box(p, '.bcard');
  // та же карта без маршрута — для «прорисовки» линии
  await p.evaluate(() => document.querySelectorAll('.leaflet-overlay-pane svg path, .rt-pin').forEach((e) => (e.style.visibility = 'hidden')));
  await new Promise((r) => setTimeout(r, 300));
  await shot(p, 'branches-noroute.png', { x: 0, y: top, width: 1920, height: pageH });
  const routePts = await p.evaluate((t) => {
    const path = [...document.querySelectorAll('.leaflet-overlay-pane svg path')].pop();
    if (!path) return [];
    const L = path.getTotalLength(), m = path.getScreenCTM();
    const pts = [];
    for (let i = 0; i <= 60; i++) { const q = path.getPointAtLength((L * i) / 60); const s = new DOMPoint(q.x, q.y).matrixTransform(m); pts.push([Math.round(s.x + scrollX), Math.round(s.y + scrollY - t)]); }
    return pts;
  }, top);
  // плашка итога лежит ниже видимой части прокручиваемой карточки: раскрываем карточку на всю высоту
  // (после снимков страницы), снимаем плашку и только её
  await p.evaluate(() => { const c = document.querySelector('.bcard'); c.style.maxHeight = 'none'; c.style.overflow = 'visible'; const s = document.querySelector('.rt-sum'); if (s) s.style.visibility = 'visible'; });
  await new Promise((r) => setTimeout(r, 300));
  const sum = await box(p, '.rt-sum');
  if (sum) await shot(p, 'route-sum.png', { x: sum.x, y: sum.y, width: sum.w, height: sum.h });
  layout.branches = { pageH, map: rel(mapB, top), card: card ? rel(card, top) : null, sum: sum ? rel(sum, top) : null, route: routePts };
  await p.close();
}

// ---------- 5. Платные услуги: разделы прейскуранта (стопка) ----------
{
  const p = await open('/ru/services/paid');
  await p.evaluate(() => document.querySelectorAll('.pl-sec').forEach((d) => (d.open = false)));
  await new Promise((r) => setTimeout(r, 300));
  const secs = await box(p, '.pl-sec', true);
  const head = await box(p, '.pl-sections');
  const top = Math.max(0, head.y - 360), pageH = Math.round(secs[secs.length - 1].y + secs[secs.length - 1].h - top + 120);
  await shot(p, 'paid-full.png', { x: 0, y: top, width: 1920, height: pageH });
  for (const [i, s] of secs.slice(0, 8).entries()) await shot(p, `price${i + 1}.png`, { x: s.x, y: s.y, width: s.w, height: s.h });
  const tile = (await box(p, '.pl-tile', true))[1];
  await shot(p, 'price-tile.png', { x: tile.x, y: tile.y, width: tile.w, height: tile.h });
  layout.paid = { pageH, cards: secs.slice(0, 8).map((s) => rel(s, top)), tile: { w: Math.round(tile.w), h: Math.round(tile.h) } };
  await p.close();
}

// ---------- 6. «Тогда и сейчас»: исходные изображения сайта ----------
for (const f of ['uk-1891.jpg', 'uk-irtysh.jpg', 'uk-panorama.jpg']) fs.copyFileSync(path.join(SITE_IMG, f), path.join(OUT, f));

fs.writeFileSync(LAYOUT, JSON.stringify(layout, null, 2) + '\n');
await browser.close();
console.log('captured →', OUT);
console.log(JSON.stringify({ home: layout.home.pageH, memory: layout.memory.pageH, cards: layout.memory.cards.length, person: layout.person.rows.length, branches: !!layout.branches.sum, route: layout.branches.route.length, paid: layout.paid.cards.length }));
