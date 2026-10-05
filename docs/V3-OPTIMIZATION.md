# Optimization work history

This work began under the v3.0.0 milestone name. The graphics changes were subsequently integrated into the repository, which advanced through Electron 4.0.0 and desktop 4.1.0. The owner selected **4.1.1** for the final optimization update. Current delivery and acceptance: [OPTIMIZATION-4.1.1.md](OPTIMIZATION-4.1.1.md).

Historical evidence folders retain their original names; `outputs/v3-optimization` is not a request to downgrade the current app.

Integrated changes include four presets, independent graphics controls, inventory virtualization/static thumbnails, shaded Settings, bounded cinematic resolution, texture-storage reuse, separable bloom and cached Ascendant fog. Controlled software-renderer samples showed approximately 41% higher Secret cadence and 4.6 times Ascendant cadence. Twenty composite cases, twenty Ascendant frames and changing Secret source/mask/resize cases passed pixel tolerances (up to three byte-level brightness steps), with no WebGL errors. Forty-eight complete browser journeys passed with no application errors or HTTP requests.

The 4.1.1 pass adds native Electron measurements, removes the desktop layout feedback loop and redundant IPC/taskbar work, and applies independent Mini graphics controls. Historical software-renderer gains are not universal hardware FPS guarantees.
