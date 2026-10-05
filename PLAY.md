# Play Cardable on Windows

Cardable **4.1.1** supports **Windows x64**. The current locally built offline
installer is approximately **324 MB** (about **309 MiB**); size varies by build.
The supplied local build is **unsigned**, with no verified publisher. A public
download site and live updates are not configured yet.

1. Get **Cardable-Setup-4.1.1.exe** from the person who supplied Cardable. There is
   no official public download URL to use yet. Check that the file came from your
   expected supplier before opening it.
2. Run the installer. It installs for your Windows user, creates **Cardable**
   desktop and Start Menu shortcuts, and is configured to open Cardable when
   setup finishes. No unzip, terminal, Node.js, npm, account or Discord setup is
   needed. Ordinary fresh per-user setup does not request administrator rights.
3. Play offline. Progress saves locally on this computer. Use the **Cardable**
   shortcut to return to your collection.

Windows may show an unknown-publisher or SmartScreen warning for this unsigned
build. Cancel if you cannot verify its source; ask the supplier to confirm the
file. Do not disable security software to install it. Actual installation and
upgrade execution have not been verified for this delivery.

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

Close Cardable normally before running a newer supplied installer. If it is in
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
