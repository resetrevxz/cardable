const path = require('path');

const isDev = process.argv.includes('--dev') || process.env.NODE_ENV === 'development';

const desktopConfig = {
  isDev,
  appId: 'com.cardable.game',
  appName: 'Cardable',
  version: '4.0.0',
  defaultWidth: 1440,
  defaultHeight: 900,
  minWidth: 960,
  minHeight: 640,
  backgroundColor: '#08080A', // Matches --bg from tokens.css
  icons: {
    png: path.join(__dirname, '../../assets/icons/icon.png'),
    ico: path.join(__dirname, '../../assets/icons/icon.ico')
  },
  urls: {
    githubRepo: 'https://github.com/Cardable/Cardable',
    releases: 'https://github.com/Cardable/Cardable/releases',
    discordAppId: null // Explicitly deferred as per spec exception
  },
  storage: {
    backupFileName: 'cardable-desktop-save.json',
    windowStateFileName: 'window-state.json'
  }
};

module.exports = desktopConfig;
