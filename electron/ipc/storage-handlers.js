const { app, shell } = require('electron');
const fs = require('fs');
const path = require('path');
const { IPC_CHANNELS } = require('./channels');
const desktopConfig = require('../config/desktop-config');
const logger = require('../logging/logger');
const { registerSecureHandler } = require('./security');

function registerStorageHandlers() {
  const saveDir = path.join(app.getPath('userData'), 'saves');
  const saveFile = path.join(saveDir, desktopConfig.storage.backupFileName);
  let recoveryOriginal = null;
  let recoveryReadFailed = false;
  function preserveOriginal(bytes) {
    const recoveryDir = path.join(saveDir, 'recovery');
    fs.mkdirSync(recoveryDir, {recursive:true});
    const digest = require('crypto').createHash('sha256').update(bytes).digest('hex');
    const original = path.join(recoveryDir, `original-${digest}.json`);
    try { fs.writeFileSync(original, bytes, {flag:'wx'}); }
    catch (error) { if (error.code !== 'EEXIST' || !fs.readFileSync(original).equals(bytes)) throw error; }
  }

  if (!fs.existsSync(saveDir)) {
    try {
      fs.mkdirSync(saveDir, { recursive: true });
    } catch (e) {
      logger.error('Failed to create saves directory:', e.message);
    }
  }

  registerSecureHandler(IPC_CHANNELS.STORAGE_BACKUP_SAVE, async (event, saveJson) => {
    if (typeof saveJson !== 'string' || saveJson.length === 0) {
      return { success: false, error: 'Invalid save payload' };
    }
    // Limit save size to 16MB to prevent abuse
    if (saveJson.length > 16 * 1024 * 1024) {
      return { success: false, error: 'Save payload exceeds maximum size' };
    }

    try {
      // Validate that it is valid JSON
      const parsed = JSON.parse(saveJson);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed) || !Array.isArray(parsed.inventory) || !Number.isInteger(parsed.schemaVersion)) {
        return { success: false, error: 'Not a Cardable save' };
      }

      // Write atomically via temporary file
      if (recoveryReadFailed && fs.existsSync(saveFile)) recoveryOriginal = fs.readFileSync(saveFile);
      if (recoveryOriginal) { preserveOriginal(recoveryOriginal); recoveryOriginal = null; }
      recoveryReadFailed = false;
      const tempFile = saveFile + '.tmp';
      fs.writeFileSync(tempFile, saveJson, 'utf8');
      fs.renameSync(tempFile, saveFile);

      // Also maintain a periodic rolling backup (up to 3 backups)
      try {
        const backupTime = new Date().toISOString().replace(/[:.]/g, '-');
        const historyDir = path.join(saveDir, 'backups');
        if (!fs.existsSync(historyDir)) fs.mkdirSync(historyDir, { recursive: true });
        
        // Keep at most 5 historical backups
        const files = fs.readdirSync(historyDir).filter(f => f.startsWith('cardable-backup-')).sort();
        if (files.length >= 5) {
          try { fs.unlinkSync(path.join(historyDir, files[0])); } catch (_) {}
        }
        fs.copyFileSync(saveFile, path.join(historyDir, `cardable-backup-${backupTime}.json`));
      } catch (_) {}

      return { success: true, path: saveFile };
    } catch (e) {
      logger.error('Failed to backup save to userData:', e.message);
      return { success: false, error: e.message };
    }
  });

  registerSecureHandler(IPC_CHANNELS.STORAGE_GET_BACKUP, async () => {
    try {
      if (fs.existsSync(saveFile)) {
        const bytes = fs.readFileSync(saveFile), content = bytes.toString('utf8'); recoveryReadFailed = false;
        // Retain the bytes consulted for recovery before renderer validation or
        // later writes can replace the mirror. Hash naming deduplicates reads;
        // these originals are separate from the rolling backup pruning policy.
        try {
          recoveryOriginal = bytes; preserveOriginal(bytes); recoveryOriginal = null;
          return { exists: true, data: content, originalPreserved: true };
        } catch (error) { return {exists:true,data:content,originalPreserved:false,error:'Could not preserve the recovery original.'}; }
      }
      return { exists: false, data: null };
    } catch (e) {
      recoveryReadFailed = true;
      logger.error('Failed to read save backup from userData:', e.message);
      return { exists: false, error: e.message };
    }
  });

  registerSecureHandler(IPC_CHANNELS.STORAGE_OPEN_SAVE_DIR, async () => {
    try {
      if (fs.existsSync(saveDir)) {
        return !(await shell.openPath(saveDir));
      }
      return false;
    } catch (e) {
      logger.error('Failed to open save directory:', e.message);
      return false;
    }
  });
}

module.exports = { registerStorageHandlers };
