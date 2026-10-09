; Small hooks for electron-builder's stock offline NSIS installer/uninstaller.
; Keep the stock identity, registry, extraction, shortcuts and upgrade machinery.

!macro customWelcomePage
  !define MUI_WELCOMEPAGE_TITLE "Install Cardable"
  !define MUI_WELCOMEPAGE_TEXT "Your collection. Ready when you are.$\r$\n$\r$\nChoose a folder on the next screen. Cardable installs for your Windows user and includes everything needed for offline play.$\r$\n$\r$\nKeep the suggested location unless you need another drive. Future updates reuse this folder. Your cards and settings live separately in your Windows profile.$\r$\n$\r$\nClose Cardable normally before continuing."
  !insertmacro skipPageIfUpdated
  !insertmacro MUI_PAGE_WELCOME
!macroend

!macro customInstallMode
  StrCpy $isForceCurrentInstall "1"
!macroend

; Assisted setup allows a new location on FIRST installation only. Check again
; after the folder page and before the old app is uninstalled or files extracted.
!macro customPageAfterChangeDir
  !define MUI_PAGE_HEADER_TEXT "Cardable is installing"
  !define MUI_PAGE_HEADER_SUBTEXT "Copying the game and creating your shortcuts."
!macroend

!macro cardableStop MESSAGE
  DetailPrint "${MESSAGE}"
  IfSilent +2
    MessageBox MB_OK|MB_ICONEXCLAMATION "${MESSAGE}"
  SetErrorLevel 2
  Quit
!macroend

!macro cardableAuditRegistryView VIEW
  SetRegView ${VIEW}
  ReadRegStr $R0 HKLM "${INSTALL_REGISTRY_KEY}" "InstallLocation"
  ReadRegStr $R1 HKLM "${UNINSTALL_REGISTRY_KEY}" "UninstallString"
  ${If} $R0 != ""
  ${OrIf} $R1 != ""
    !insertmacro cardableStop "An older all-users Cardable installation was found. Setup has stopped. Keep using its shortcut. Export your save and download Studio photos, then ask the supplier to review the existing installation before changing setup."
  ${EndIf}

  ReadRegStr $R0 HKCU "${INSTALL_REGISTRY_KEY}" "InstallLocation"
  ReadRegStr $R1 HKCU "${UNINSTALL_REGISTRY_KEY}" "UninstallString"
  ${If} $R0 == ""
  ${AndIf} $R1 != ""
    !insertmacro cardableStop "Cardable's older installation location could not be confirmed. Setup has stopped. Keep using the existing shortcut and ask the supplier to review the installation. Export your save and download Studio photos before changing setup."
  ${EndIf}
  ${If} $R0 != ""
  ${AndIf} $R0 != $INSTDIR
    !insertmacro cardableStop "Setup would change Cardable's existing location. Setup has stopped. Keep using its shortcut. Export your save and download Studio photos, then ask the supplier to review the installation before changing setup."
  ${EndIf}
!macroend

!macro cardableKeepAppData
  ${GetParameters} $R0
  ClearErrors
  ${GetOptions} $R0 "--delete-app-data" $R1
  ${IfNot} ${Errors}
    !insertmacro cardableStop "Cardable setup does not delete player data. Use the separately confirmed reset inside the game if you want to reset progress."
  ${EndIf}
  ClearErrors
!macroend

!macro customInit
  !insertmacro cardableKeepAppData
  ; Stock assisted init reuses the current 64-bit HKCU InstallLocation.
  ; Audit both views before extraction or executing any older uninstaller.
  !insertmacro cardableAuditRegistryView 32
  !insertmacro cardableAuditRegistryView 64
  ; Do not allow the stock /D override to move an existing file:// origin.
  !insertmacro GetDParameter $R0
  ${If} $R0 != ""
    ReadRegStr $R1 HKCU "${INSTALL_REGISTRY_KEY}" "InstallLocation"
    ${If} $R1 != ""
    ${AndIf} $R1 != $R0
      !insertmacro cardableStop "Cardable updates reuse your existing installation folder. Run setup without /D to keep your collection and Studio photo location."
    ${EndIf}
  ${EndIf}
!macroend

!macro customUnInit
  !insertmacro cardableKeepAppData
!macroend

!macro customCheckAppRunning
  !insertmacro cardableAuditRegistryView 32
  !insertmacro cardableAuditRegistryView 64
  ; Use the builder's already bundled process plugin, with no close/kill calls.
  ; Name-based detection intentionally also defers for an open local preview.
  StrCpy $R1 0
  ${Do}
    nsProcess::_FindProcess "${APP_EXECUTABLE_FILENAME}"
    Pop $R0
    ${If} $R0 == 603
      ${Break}
    ${EndIf}
    ${If} $R0 != 0
      !insertmacro cardableStop "Setup could not check whether Cardable is closed. Close Cardable normally and try setup again. No player data has been removed."
    ${EndIf}
    DetailPrint "Close Cardable normally before continuing setup."
    ${If} ${Silent}
      ; electron-updater starts NSIS just before the saved app quits. Wait only
      ; for that natural exit; never fall through to the stock kill-process path.
      ${If} ${isUpdated}
      ${AndIf} $R1 < 40
        Sleep 250
        IntOp $R1 $R1 + 1
        ${Continue}
      ${EndIf}
      SetErrorLevel 2
      Quit
    ${EndIf}
    MessageBox MB_RETRYCANCEL|MB_ICONEXCLAMATION "Cardable is open. Close all Cardable windows normally, including any Latest Build preview. If it is minimized to the tray, choose Quit from its tray menu. Then click Retry. Cancel leaves the current app in place." IDRETRY +2
      Quit
  ${Loop}
!macroend
