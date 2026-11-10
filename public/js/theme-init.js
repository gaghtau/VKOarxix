// Применяется до отрисовки: тема и настройки доступности без «мигания».
// Основная тема — светлая бежевая; тёмная включается только по выбору посетителя.
(function () {
  var d = document.documentElement, s = function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } };
  var t = s('site-theme') === 'dark' ? 'dark' : 'light'; // новый ключ: прежний выбор тёмной темы сброшен, бежевая — основная
  d.setAttribute('data-theme', t);
  var fs = s('fs'); if (fs === 'lg' || fs === 'xl') d.setAttribute('data-fs', fs);
  if (s('contrast') === 'high') d.setAttribute('data-contrast', 'high');
  if (s('reading') === 'on') d.setAttribute('data-reading', 'on');
  if (s('imgmode') === 'page' || (fs === 'xl' && s('imgmode') !== 'inline')) d.setAttribute('data-imgmode', 'page');
  if (s('motion') === 'off') d.setAttribute('data-motion', 'off');
  if (s('ttsclick') === 'on') d.setAttribute('data-tts-click', 'on');
})();
