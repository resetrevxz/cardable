(function (C, root) {
  'use strict';
  var stage = root.document.getElementById('cardable-startup'), ready = false;
  C.setup = {
    preview: function () {
      var panel = C.ui.create('panel', {className:'cb-startup-panel'}), node = C.packMarkup.node;
      node('div', 'cb-startup-mark', panel).setAttribute('aria-hidden', 'true');
      node('span', 'cb-setup-eyebrow', panel, 'CARDABLE');
      node('h2', '', panel, 'Getting Cardable ready');
      node('p', 'cb-small', panel, 'Checking your saved collection…');
      node('div', 'cb-startup-track', panel).setAttribute('aria-hidden', 'true');
      return panel;
    },
    status: function (text) { if (stage) stage.querySelector('[data-startup-status]').textContent = text; },
    finish: function () { if (stage) stage.remove(); ready = true; },
    welcome: function () {
      var info = C.desktop && C.desktop.info;
      if (!ready || !info || C.bootFailure || C.state.recovery && C.state.recovery.pending) return;
      var seen; try { seen = root.localStorage.getItem('cardable.desktop.welcome') || root.localStorage.getItem('cardable.qol.welcomeSeen'); } catch (_) { return; }
      if (seen) return;
      var node = C.packMarkup.node, dialog = C.ui.create('dialog', {label: 'Cardable is ready', className: 'cb-setup-welcome'});
      node('span', 'cb-setup-eyebrow', dialog, 'WELCOME TO YOUR COLLECTION');
      node('h2', '', dialog, 'Cardable is ready');
      node('p', 'cb-small', dialog, 'The game is ready for offline play. Keep its files together in this folder.');
      node('p', 'cb-setup-path', dialog, info.installDirectory);
      node('p', 'cb-small', dialog, 'Your cards and settings save in your Windows profile. Settings → Data has export and recovery tools. Studio photos need their own download.');
      node('p', 'cb-small', dialog, info.installed ? 'Updates download in the background. When one is ready, Cardable offers a restart and waits until you finish playing. Choose Later to keep this session open.' : 'This folder build stays offline. Run the installer for guided setup and background updates.');
      var presentation, actions = node('div', 'cb-setup-actions', dialog);
      actions.appendChild(C.ui.create('button', {label: 'Open saves folder', onClick: function () { C.desktop.openSaveDirectory().then(function(ok){if(!ok)C.qol.toast('Could not open the saves folder. Try Settings → About.');}).catch(function(){C.qol.toast('Could not open the saves folder. Try Settings → About.');}); }}));
      actions.appendChild(C.ui.create('button', {label: 'Start collecting', variant: 'primary', onClick: function () { presentation.close(); }}));
      presentation = C.ui.present(dialog, {onClose: function () { try { root.localStorage.setItem('cardable.desktop.welcome', '1'); root.localStorage.setItem('cardable.qol.welcomeSeen','1'); } catch (_) {} }});
    }
  };
})(window.Cardable, window);
