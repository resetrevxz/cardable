(function (C) {
  'use strict';
  C.settingsSchema.entries.achievementToasts = {
    key: 'achievementToasts', label: 'Achievement toasts', group: 'Controls',
    helper: 'Quiet unlock notices, held until you return to the menu.', defaultValue: true, control: 'switch',
    apply: function (value, api) { api.attribute(this.key, value); }
  };
})(window.Cardable);
