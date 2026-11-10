// Заглушка, которая отдаётся вместо закрытого или отсутствующего файла (сам файл не выдаётся).
const esc = (s = '') => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

export function restrictedSvg(msg) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 500"><rect width="800" height="500" fill="#1F3D2B"/><text x="400" y="230" text-anchor="middle" font-family="Arial" font-size="30" fill="#E8DCC4">Доступ ограничен</text><text x="400" y="275" text-anchor="middle" font-family="Arial" font-size="18" fill="#E8DCC4" opacity=".8">${esc(msg)}</text></svg>`;
}
