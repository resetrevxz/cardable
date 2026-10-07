# Play Cardable on Windows

Cardable **1.0.3** supports **Windows 10/11 x64**. The installer includes the complete game and Electron runtime. This community release is **unsigned**; Windows may show an unknown publisher. Verify that you downloaded it from the repository below before opening it.

1. Open [the Cardable download page](https://resetrevxz.github.io/cardable/) and select **Download for Windows**, or use [GitHub Releases](https://github.com/resetrevxz/cardable/releases/latest).
2. Run **Cardable-Setup-1.0.3.exe**. It installs for your Windows user and creates desktop/Start Menu shortcuts. Players need no terminal, Node.js, npm, account or Discord configuration.
3. Open **Cardable** and play offline. Your collection saves locally on this computer.

For the alternative full-folder download, get **Cardable-1.0.3-Windows-x64.zip** from that release, extract **all** of it, and run **Cardable.exe**. Keep its resources, DLLs and locales together. These folder builds use manual updates and can have a separate storage origin from installed/browser builds.

The full source is also available through the repository's **Code → Download ZIP**. That source folder is separate from the ready-to-run Electron ZIP; source browser play uses index.html directly.

Public numbering resets from the earlier 4.x series to **v1.0.3**. An old installation needs the new installer once because normal update checks do not downgrade. App identity and save schema remain unchanged. Close Cardable normally first, export important progress and download Studio photos separately. Actual setup/upgrade execution and live updater acceptance remain unverified in this pass.

Native saves/backups live under **%APPDATA%/Cardable/saves**; use **Settings → Open saves folder** rather than moving these files. The Chromium profile also holds local renderer/IndexedDB data. Do not delete AppData or change Windows users to troubleshoot a missing collection.

## Keep a backup

Open **Settings → Data → Export save** and keep the downloaded JSON somewhere
safe. To bring it back, use **Import save**, review the preview, then confirm
**Replace my save**. Import replaces the current collection only after your
confirmation. **Restore previous save** is available when a previous save exists.

Studio photos are stored separately and are **not in JSON save exports**.
Download photos you want to keep from the **Studio Album** separately, especially
before changing an installation directory, moving from browser to desktop, or
changing Windows users. Keep using the same shortcut and location when upgrading.

## Updating or uninstalling

When a public release source is configured, the installed app checks for updates
after startup and downloads them in the background. A ready update installs after
saving when you normally quit; Cardable stays closed. Settings → About offers
**Restart and update now** or **Skip update on this quit**. A failed save flush,
Windows shutdown or Safe-mode restart postpones installation. Latest Build preview
does not replace the installed app. Published installed builds use the public resetrevxz/cardable release provider.

Close Cardable normally before running a newer release installer. If it is in
the tray, choose **Quit** from the tray menu; close any **Latest Build** preview
too. If setup asks you to close Cardable, do so, then choose **Retry**. **Cancel**
leaves the current app in place. Setup does not force-close Cardable; a silent
upgrade stops if the app is still running. Do not end its process to bypass this.

The installer keeps the registered per-user installation location, including an
existing custom path. Updates and normal uninstall are configured to keep saves,
settings and photo storage. Uninstall removes the app and its normal shortcuts;
it is not a progress reset. The in-game **Reset save** action is separate and
requires confirmation. Back up important progress and photos before any upgrade.

### Older installations

An older **all-users** installation, conflicting registry locations, or an
unconfirmed older location stops this per-user installer before replacement.
Those installs are not automatically migrated. Keep using the old shortcut and
ask the supplier to review the existing installation. Export your save and
download Studio photos before an agreed change; do not uninstall the old app or
move its files to get past the check. Upgrading a protected custom path may still
need its existing permissions; the new installer does not grant them.

### If your collection appears missing

Close the new window and check that you used the same Windows user and original
Cardable shortcut. A browser, source copy, installed app and Latest Build preview
can have different storage locations. Do not reset progress, delete AppData, or
move the old installation. In desktop Settings, **Open saves folder** shows the
native save backups. Keep those files, and use **Settings → Data → Import save**
with a known exported save or **Restore previous save** when available. Get help
from the supplier if the original data is still unavailable; JSON recovery does
not restore Studio photo blobs.

Developer build commands are in [BUILDING](docs/BUILDING.md). Hosting, signing and
release procedures are in [RELEASING](docs/RELEASING.md).

## Help inside the game

Open **Settings → About → How to play** or **Desktop help**. You can also find
both in the **Ctrl/Cmd+K** command palette. Help is bundled and works offline;
browser play shows the relevant controls and saving guidance without desktop
folder or restart buttons. **F1** lists shortcuts.

If Cardable finds an unreadable save, it keeps the original and pauses saving and
pack opening. **Import backup** shows the normal preview/confirmation. You can
also restore a readable previous save or explicitly confirm a new collection
using the existing three-second Reset save hold. Download the original when
offered; do not delete it to get past recovery. Native recovery originals are
kept separately from rolling backups in the saves folder. Studio photos remain
separate from every JSON recovery/export.
