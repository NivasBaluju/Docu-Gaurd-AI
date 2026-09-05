// Deciva — Background script
// The dark particle canvas has been replaced by a clean CSS dot-grid background.
// This file intentionally disables the canvas animation.
(function () {
  const canvas = document.getElementById('bg-canvas');
  if (canvas) {
    canvas.style.display = 'none';
    canvas.setAttribute('aria-hidden', 'true');
  }
})();
