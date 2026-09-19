function initCatRunner() {
  new Runner('.interstitial-wrapper');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initCatRunner);
} else {
  initCatRunner();
}
