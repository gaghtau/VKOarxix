// Аутентификация и разграничение прав.
// scrypt-хеширование, httpOnly-сессии с тайм-аутом неактивности, CSRF-токен,
// ограничение попыток входа, проверка прав НА СЕРВЕРЕ для каждой операции и объекта.
import crypto from 'node:crypto';

export function hashPassword(pw, salt = crypto.randomBytes(16).toString('hex')) {
  return { salt, hash: crypto.scryptSync(pw, salt, 64).toString('hex') };
}
export function verifyPassword(pw, salt, hash) {
  const h = crypto.scryptSync(pw, salt, 64);
  const ref = Buffer.from(hash, 'hex');
  return ref.length === h.length && crypto.timingSafeEqual(h, ref);
}

export const ROLES = {
  superadmin: 'Главный администратор',
  chiefeditor: 'Главный редактор',
  siteadmin: 'Администратор сайта',
  editor: 'Редактор',
  archivist: 'Сотрудник архива',
  branchadmin: 'Администратор филиала',
  moderator: 'Модератор',
  analyst: 'Аналитик',
};

// Матрица прав. Уровни доступа настраиваемые: матрицу можно вынести в БД.
const PERMS = {
  'users.manage': ['superadmin', 'siteadmin'],
  'audit.view': ['superadmin', 'siteadmin'],
  'settings.manage': ['superadmin'],
  'content.edit': ['superadmin', 'siteadmin', 'editor', 'chiefeditor'],
  'content.review': ['superadmin', 'siteadmin', 'moderator', 'chiefeditor'],
  'content.publish': ['superadmin', 'siteadmin', 'moderator', 'editor', 'chiefeditor'],
  'catalog.edit': ['superadmin', 'archivist'],
  'catalog.review': ['superadmin', 'moderator'],
  'catalog.openFile': ['superadmin', 'moderator'], // открыть цифровую копию для публики
  'catalog.import': ['superadmin', 'archivist'],
  'catalog.export': ['superadmin', 'archivist', 'analyst'],
  'branches.edit': ['superadmin', 'siteadmin', 'branchadmin'],
  'stats.view': ['superadmin', 'siteadmin', 'analyst', 'moderator', 'chiefeditor'],
  'feedback.view': ['superadmin', 'siteadmin', 'moderator', 'analyst', 'chiefeditor'],
  'comments.moderate': ['superadmin', 'siteadmin', 'moderator', 'editor', 'chiefeditor'],
  'ai.tools': ['superadmin', 'archivist', 'editor'],
};

export function can(user, perm, obj) {
  if (!user || !PERMS[perm]?.includes(user.role)) return false;
  // Объектная проверка: администратор филиала — только свой филиал
  if (user.role === 'branchadmin' && obj && obj.branch !== undefined) return obj.branch === user.branch;
  if (user.role === 'archivist' && perm.startsWith('catalog.') && obj && obj.branch !== undefined && user.branch && user.branch !== 'main')
    return obj.branch === user.branch;
  return true;
}
export const permsFor = (user) => Object.keys(PERMS).filter((p) => PERMS[p].includes(user.role));

// Переходы статусов публикации
export const WF = ['draft', 'review', 'rework', 'approved', 'published', 'archived'];
const TRANSITIONS = {
  draft: { review: 'edit' },
  rework: { review: 'edit', draft: 'edit' },
  review: { rework: 'review', approved: 'review' },
  approved: { published: 'publish', rework: 'review' },
  published: { archived: 'review', rework: 'review' },
  archived: { draft: 'edit' },
};
export function canTransition(user, from, to, area /* content|catalog */) {
  const need = TRANSITIONS[from]?.[to];
  if (!need) return false;
  if (area === 'catalog') return can(user, need === 'edit' ? 'catalog.edit' : 'catalog.review');
  return can(user, need === 'edit' ? 'content.edit' : need === 'review' ? 'content.review' : 'content.publish');
}

// ---- Сессии
const IDLE_MS = 15 * 60 * 1000;
const sessions = new Map();
export function createSession(user) {
  const sid = crypto.randomBytes(32).toString('hex');
  const csrf = crypto.randomBytes(24).toString('hex');
  sessions.set(sid, { userId: user.id, csrf, last: Date.now() });
  return { sid, csrf };
}
export function destroySession(sid) { sessions.delete(sid); }
export function getSession(sid) {
  const s = sid && sessions.get(sid);
  if (!s) return null;
  if (Date.now() - s.last > IDLE_MS) { sessions.delete(sid); return { expired: true }; }
  s.last = Date.now();
  return s;
}

// ---- Ограничение попыток входа (по логину и по IP)
const attempts = new Map();
export function loginThrottled(key) {
  const a = attempts.get(key);
  return a && a.until > Date.now() ? Math.ceil((a.until - Date.now()) / 1000) : 0;
}
export function loginFailed(key) {
  const a = attempts.get(key) || { n: 0, until: 0 };
  a.n += 1;
  if (a.n >= 5) { a.until = Date.now() + 5 * 60 * 1000; a.n = 0; }
  attempts.set(key, a);
}
export function loginOk(key) { attempts.delete(key); }

export function parseCookies(header = '') {
  return Object.fromEntries(header.split(';').map((c) => c.trim().split('=')).filter((p) => p[0]).map(([k, ...v]) => [k, decodeURIComponent(v.join('='))]));
}
