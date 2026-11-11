// Снимки для четырёхсекционной нарезки (quad-split): ИИ-помощник с ответом, главная в режиме
// «очень крупный текст», выставки. Экранные снимки 1920×1080 @2x. Запуск: сайт включён.
import puppeteer from 'puppeteer';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(here, '..', 'public', 'textures', 'live');
const BASE = 'http://localhost:3000';
const HIDE = '.assist-fab,.d-rail,.d-corner,.scroll-progress,.to-top,.curtain,.curtain-fade,.toast{display:none!important}*{caret-color:transparent!important}';
const browser = await puppeteer.launch({ headless: true, executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe' });

async function open(url, prefs = {}) {
  const p = await browser.newPage();
  await p.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 2 });
  await p.evaluateOnNewDocument((pr) => { try { localStorage.clear(); localStorage.setItem('motion', 'off'); for (const [k, v] of Object.entries(pr)) localStorage.setItem(k, v); } catch {} }, prefs);
  await p.goto(BASE + url, { waitUntil: 'networkidle0', timeout: 60000 });
  await p.addStyleTag({ content: HIDE });
  await p.evaluate(() => document.fonts.ready);
  await new Promise((r) => setTimeout(r, 700));
  return p;
}

// 1. ИИ-помощник: вопрос и ответ на странице помощника
{
  const p = await open('/ru/assistant');
  const inp = await p.$('#app input, #app textarea');
  await inp.type('Где найти документы о деде, работавшем на свинцовом комбинате?');
  await p.keyboard.press('Enter');
  await new Promise((r) => setTimeout(r, 2500));
  await p.screenshot({ path: path.join(OUT, 'quad-assistant.png') });
  await p.close();
}
// 2. Главная в режиме «очень крупный текст» (+ фото отдельной страницей, как включает сайт)
{
  const p = await open('/ru/', { fs: 'xl' });
  await p.screenshot({ path: path.join(OUT, 'quad-xl.png') });
  await p.close();
}
// 3. Выставки
{
  const p = await open('/ru/exhibitions');
  await p.evaluate(() => window.scrollTo(0, 120));
  await new Promise((r) => setTimeout(r, 400));
  await p.screenshot({ path: path.join(OUT, 'quad-exhibitions.png') });
  await p.close();
}
await browser.close();
console.log('quad captures ok');
