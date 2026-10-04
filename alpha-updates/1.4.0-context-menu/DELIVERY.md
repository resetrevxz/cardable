# Main menu context menu

The shell is `src/ui/context-menu.js`; built-in feature registrations are in `src/ui/context-menu-items.js`. Register more builders with `Cardable.contextMenu.register({target, build(ctx)})` without editing the shell. Items support action, toggle, radio, submenu, readout, separator and group types. Submenus use an `items` array or builder. The shell emits `contextmenu:open`, `contextmenu:close` and `contextmenu:select` with the selected item ID.

The lazy host is reused. Its scheduler subscription exists only while open. Status changes use the existing timer/save/settings events and rolling digit renderer. The main-menu eligibility check blocks opening, inventory, preferences, tutorial, developer panels and modal notices; editable elements and Shift-right-click in developer mode keep the native menu.

Open pack calls the existing input charge action without releasing it, preserving the same fixed three-second fill, Escape cancellation and durable reveal reservation. No opening rules or save format were added. The settings schema accepts the requested short idle delays; its current 15-second default remains unchanged.

Design resolution: no animated blur because the requested architecture and Designs.MD limit animation to transform/opacity. Internal scrolling remains available for tall menus; page wheel/scroll closes. Repeated valid main-menu right-clicks relocate, resolving the conflicting outside-right-click close instruction in favor of the explicit repeat-click behavior. Mute remains absent while audio is flagged off.

Testing: one isolated file:// browser smoke passed empty-space menu, toggle and radio with no console errors; the credits target exposed inherited pointer-events suppression (fixed afterward), so pack/action checks were not reached and no second run was made. No old tests, new test files, screenshots or profiling.
