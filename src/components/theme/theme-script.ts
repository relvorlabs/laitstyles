export const themeBootScript = `
(function () {
  try {
    var preference = localStorage.getItem('laitstyle-theme') || 'system';
    var dark = preference === 'dark' || (preference === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
    var root = document.documentElement;
    root.classList.toggle('dark', dark);
    root.dataset.theme = dark ? 'dark' : 'light';
    root.style.colorScheme = dark ? 'dark' : 'light';
  } catch (_) {}
})();`;
