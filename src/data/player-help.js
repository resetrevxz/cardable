(function (C) {
  'use strict';
  C.playerHelp = [
    {id:'play',title:'Open a pack. Keep a card.',lines:[
      'Hold Space, or press and hold the pack, to charge a ready pack. Follow the tear or unseal prompt, then flip the card. Touch controls stay visible for each step.',
      'Choose Keep to add the revealed card to your collection. Delete discards it after confirmation. Finish that decision before opening another pack; reserved reveals resume after reopening.',
      'Drag the sheet up, or press I, to open your inventory. Open a card and point at its rarity, serial, name or specs for details; the round buttons beside it inspect, favorite and flip. Achievements and your photo album are tabs in the inventory.'
    ]},
    {id:'keys',title:'Find your way',lines:[
      'S opens Settings. Ctrl/Cmd+K or / finds commands and collected cards. F1 or ? lists the registered shortcuts. Escape closes a panel or returns to the previous view.',
      'Use Tab and Shift+Tab to move focus, then Enter or Space to activate a button. Keyboard shortcuts depend on the current view; finish a reveal before switching tools.'
    ]},
    {id:'saves',title:'Saving, backups and photos',lines:[
      'Progress saves locally. Settings → Data → Export save downloads a JSON backup. Import save shows a preview and asks you to confirm before replacing the current collection.',
      'Restore previous save is available when a readable previous save exists. Desktop also keeps native save backups; Open saves folder shows those files. Keep originals if recovery fails.',
      'Album photos (Inventory → Album) are separate from JSON exports. Download photos from the Album before changing file locations, installation paths or Windows users. Browser, installed app and Latest Build preview may use different storage locations.',
      'If your collection appears missing, return to the same shortcut and Windows user first. Do not reset or delete AppData. Export what you can and import a known save, or get help with the original backups.'
    ]},
    {id:'quality',title:'Choose the graphics that suit you',lines:[
      'Very Low minimizes decoration; Low keeps lighter materials; Medium balances detail and speed; High enables full effects; Very High adds more on capable hardware. Every preset keeps the reveal, the Keep decision and card details clear.',
      'Settings also covers frame rate, background behavior and reduced motion, with a live preview of what each option does. Your choices are saved. Battery saver can reduce effects temporarily.',
      'Desktop Safe mode restarts with hardware acceleration off and Low effects for one session. It keeps your saved graphics choices; restart normally to return to them. Browser users can choose Very Low or Low and reduced motion in Settings.'
    ]},
    {id:'desktop',title:'Install, update and recover',desktop:true,lines:[
      'Run the supplied Cardable-Setup installer for Windows x64. It is configured for per-user setup, normal desktop/Start Menu shortcuts and launch after setup. Players need no Node.js, terminal or account.',
      'Export a save and download Studio photos before upgrading. Close Cardable normally, including any tray or Latest Build preview, then run setup. Retry after closing it; Cancel keeps the current app. Older all-users or uncertain paths stop for review.',
      'When a public release source is configured, the installed app checks for updates and downloads them in the background. A ready update installs after saving when you normally quit. Settings → About offers Restart and update now or Skip update on this quit. Preview builds never replace the installed app.',
      'Normal uninstall keeps player data and is separate from Reset save. A local unsigned build may show an unknown-publisher warning. Verify its supplier; do not disable security software.',
      'Use Open logs folder and Copy diagnostics for troubleshooting. Diagnostics omit save contents. Share them yourself with the supplier; help does not submit anything automatically.'
    ]}
  ];
})(window.Cardable);
