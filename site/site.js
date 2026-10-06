(function () {
  'use strict';
  var release = window.CARDABLE_RELEASE;
  if (release) {
    document.querySelectorAll('[data-version]').forEach(function (node) { node.textContent = 'V' + release.version; });
    document.querySelectorAll('[data-download]').forEach(function (node) { node.href = node.dataset.download === 'folder' ? release.folder : release.installer; });
    var status = document.querySelector('[data-release-status]');
    if (status) status.textContent = 'Windows installer · v' + release.version + (release.installerBytes ? ' · ' + Math.round(release.installerBytes / 1048576) + ' MB' : '');
  }
  var descriptions = {
    'very-low': 'Very Low · Static materials and calm scenes for the lightest experience.',
    low: 'Low · Simple finishes and fewer effects, with collectible identity intact.',
    medium: 'Medium · Balanced materials and motion for everyday play.',
    high: 'High · Full focused finishes, reflections and cinematic detail.'
  };
  var buttons = document.querySelectorAll('[data-quality]');
  buttons.forEach(function (button) {
    button.setAttribute('aria-pressed', button.dataset.quality === 'medium' ? 'true' : 'false');
    button.addEventListener('click', function () {
      buttons.forEach(function (other) { other.setAttribute('aria-pressed', other === button ? 'true' : 'false'); });
      document.querySelector('[data-quality-preview]').dataset.qualityPreview = button.dataset.quality;
      document.querySelector('[data-quality-label]').textContent = descriptions[button.dataset.quality];
    });
  });
})();
