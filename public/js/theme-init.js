// Применяется до отрисовки: тема, размер шрифта и контраст без «мигания».
(function () {
  var d = document.documentElement, s = function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } };
  var t = s('theme') || (window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  d.setAttribute('data-theme', t);
  if (s('fs') === 'lg') d.setAttribute('data-fs', 'lg');
  if (s('contrast') === 'high') d.setAttribute('data-contrast', 'high');
})();
