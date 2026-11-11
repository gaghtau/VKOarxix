#!/usr/bin/env node
// Управление сайтом из терминала: включить / выключить / перезапустить / состояние.
//   npm run on        — запустить в фоне (терминал можно закрыть)
//   npm run off       — остановить
//   npm run restart   — перезапустить (после правок в коде)
//   npm run status    — работает ли сайт и по какому адресу
//   npm run logs      — последние строки журнала сервера
// На Windows то же самое: .\on  .\off  .\restart  .\status  (файлы *.cmd в корне проекта).
import { spawn, execSync } from 'node:child_process';
import { existsSync, mkdirSync, openSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import net from 'node:net';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const runDir = join(root, '.run');
const pidFile = join(runDir, 'server.pid');
const logFile = join(runDir, 'server.log');
const PORT = Number(process.env.PORT || 3000);
const URL = `http://localhost:${PORT}/ru/`;
const isWin = process.platform === 'win32';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const portBusy = () => new Promise((resolve) => {
  const s = net.connect({ port: PORT, host: '127.0.0.1' });
  s.once('connect', () => { s.destroy(); resolve(true); });
  s.once('error', () => resolve(false));
});
const alive = (pid) => { try { process.kill(pid, 0); return true; } catch { return false; } };
const savedPid = () => { try { const p = Number(readFileSync(pidFile, 'utf8')); return p && alive(p) ? p : null; } catch { return null; } };

// PID процесса, который слушает порт (если сайт запущен не через этот скрипт)
function pidOnPort() {
  try {
    if (isWin) {
      const out = execSync(`netstat -ano -p tcp`, { encoding: 'utf8' });
      const line = out.split(/\r?\n/).find((l) => /LISTENING/.test(l) && new RegExp(`[:.]${PORT}\\s`).test(l));
      return line ? Number(line.trim().split(/\s+/).pop()) : null;
    }
    const out = execSync(`lsof -ti tcp:${PORT} -sTCP:LISTEN`, { encoding: 'utf8' }).trim();
    return out ? Number(out.split('\n')[0]) : null;
  } catch { return null; }
}

function kill(pid) {
  try {
    if (isWin) execSync(`taskkill /PID ${pid} /T /F`, { stdio: 'ignore' });
    else process.kill(pid, 'SIGTERM');
  } catch { /* уже остановлен */ }
}

async function start() {
  if (await portBusy()) {
    console.log(`Сайт уже работает: ${URL}`);
    return;
  }
  if (!existsSync(join(root, 'node_modules', 'express'))) {
    console.log('Первый запуск: устанавливаю зависимости (npm install)…');
    execSync('npm install --no-audit --no-fund', { cwd: root, stdio: 'inherit' });
  }
  mkdirSync(runDir, { recursive: true });
  const log = openSync(logFile, 'a');
  const child = spawn(process.execPath, ['--no-warnings', 'server/index.js'], {
    cwd: root, detached: true, windowsHide: true, stdio: ['ignore', log, log], env: process.env,
  });
  child.unref();
  writeFileSync(pidFile, String(child.pid));
  process.stdout.write('Запускаю');
  for (let i = 0; i < 60; i++) {
    await sleep(500);
    if (await portBusy()) { console.log(`\nГотово ✓  Сайт: ${URL}\n         Кабинет редактора: http://localhost:${PORT}/cabinet\n         Выключить: npm run off`); return; }
    if (!alive(child.pid)) break;
    process.stdout.write('.');
  }
  console.log(`\nНе удалось запустить. Последние строки журнала (${logFile}):\n`);
  logs(20);
  process.exitCode = 1;
}

async function stop() {
  const pid = savedPid() || pidOnPort();
  if (!pid && !(await portBusy())) { console.log('Сайт и так выключен.'); rmSync(pidFile, { force: true }); return; }
  if (pid) kill(pid);
  for (let i = 0; i < 20 && (await portBusy()); i++) await sleep(250);
  rmSync(pidFile, { force: true });
  if (await portBusy()) { console.log(`Порт ${PORT} всё ещё занят другим процессом — закройте его вручную.`); process.exitCode = 1; }
  else console.log('Сайт выключен ✓');
}

async function status() {
  if (await portBusy()) {
    const pid = savedPid() || pidOnPort();
    console.log(`Работает ✓  ${URL}${pid ? `  (процесс ${pid})` : ''}`);
  } else console.log('Выключен.  Включить: npm run on');
}

function logs(n = 40) {
  if (!existsSync(logFile)) { console.log('Журнала пока нет — сайт ещё не запускался этим скриптом.'); return; }
  console.log(readFileSync(logFile, 'utf8').split(/\r?\n/).slice(-n - 1).join('\n'));
}

const cmd = (process.argv[2] || 'status').toLowerCase();
const actions = {
  on: start, start, вкл: start,
  off: stop, stop, выкл: stop,
  restart: async () => { await stop(); await start(); },
  status, logs: () => logs(),
};
if (!actions[cmd]) { console.log('Команды: on | off | restart | status | logs'); process.exitCode = 1; }
else await actions[cmd]();
