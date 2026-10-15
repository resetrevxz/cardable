/* Cardable Market — online beta client configuration. DATA ONLY.
 * The online realm is off in a build until a verified deployment's HTTPS origin is written here (and into the page's
 * Content-Security-Policy connect-src) by `node cloudflare/scripts/deploy.cjs --apply-origin <origin>`. With an empty
 * apiBase the game never makes a network request and Global Market says so. */
(function (C) {
  'use strict';
  C.data = C.data || {};
  C.data.marketOnline = {
    apiBase: 'https://cardable-market-beta.resetrevxz.workers.dev',                         // e.g. 'https://cardable-market-beta.<account>.workers.dev' once deployed and verified
    apiVersion: 1,
    storageKey: 'cardable.market.online',
    timeoutMs: 15000,
    statusTtlMs: 30000,                  // how long a status read is reused before asking again
    importCap: 3000,                     // mirrors BETA_IMPORT_CAP on the server
    previewRows: 60,
    // Public origins the client will talk to. Anything else is refused before a request is made.
    allowedHosts: [/\.workers\.dev$/, /^localhost$/, /^127\.0\.0\.1$/]
  };
})(window.Cardable = window.Cardable || {});
