// Применяется до отрисовки: тема и настройки доступности без «мигания».
(function () {
  var d = document.documentElement, s = function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } };
  var t = s('theme') || (window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  d.setAttribute('data-theme', t);
  var fs = s('fs'); if (fs === 'lg' || fs === 'xl') d.setAttribute('data-fs', fs);
  if (s('contrast') === 'high') d.setAttribute('data-contrast', 'high');
  if (s('reading') === 'on') d.setAttribute('data-reading', 'on');
  if (s('imgmode') === 'page' || (fs === 'xl' && s('imgmode') !== 'inline')) d.setAttribute('data-imgmode', 'page');
  if (s('ttsclick') === 'on') d.setAttribute('data-tts-click', 'on');
})();
