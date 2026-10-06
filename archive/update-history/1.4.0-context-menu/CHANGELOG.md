# alpha 1.4.0 — Main menu context menu

- Added an offline, registry-driven right-click menu for empty space, packs, credits, the wordmark and settings gear, with a live pack/credits header.
- Added keyboard navigation, safe submenu intent, one spring highlight, reusable glass panels, quality/motion variants, viewport clamping and scrolling for short windows.
- Connected automatic three-second pack charging, settings controls, interface hide/fullscreen, collection counts, checked save export, tutorial replay with Undo, pack tier information, clipboard copy, logo replay and credits/licenses to existing game APIs.
- Guarded right-button input from left-click ripple, hold, cutting and tutorial actions. Added 2.5 s and 5 s idle choices while retaining the existing 15 s default.
- Made the visible credits chip receive pointer events so its context menu can identify the target; its existing idle/AFK hiding still applies.

No sound, network dependencies or Git commit. Animation uses transforms and opacity; the glass blur stays static. Wheel/scroll inside the menu is allowed for tall menus; wheel/scroll outside closes it. Repeated right-clicks on the eligible main menu relocate the menu, including outside its previous bounds.
