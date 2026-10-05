const path = require('path');

const isDev = process.argv.includes('--dev') || process.env.NODE_ENV === 'development';

const desktopConfig = {
  isDev,
  appId: 'com.cardable.game',
  appName: 'Cardable',
  defaultWidth: 1440,
  defaultHeight: 900,
  minWidth: 1100,
  minHeight: 680,
  backgroundColor: '#08080A', // Matches --bg from tokens.css
  icons: {
    png: path.join(__dirname, '../../assets/icons/icon.png'),
    ico: path.join(__dirname, '../../assets/icons/icon.ico')
  },
  storage: {
    backupFileName: 'cardable-desktop-save.json',
    windowStateFileName: 'window-state.json'
  }
};

module.exports = desktopConfig;
