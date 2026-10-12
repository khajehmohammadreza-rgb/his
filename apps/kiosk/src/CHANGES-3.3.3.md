# Bastiyan Kiosk 3.3.3 — Windows Client + HQ Video

- Installed Windows clients now return to their own role/center login page after logout or session expiry; the legacy general login page is not shown.
- Professionalized Windows installer: hidden-console VBS entry, upgrade/reinstall detection, server preflight, Desktop/Start Menu choices, silent role-isolated launcher, Apps & Features metadata, install log, and clean uninstall.
- Installed app shortcuts run through a dedicated launcher/profile and keep Doctor/Secretary/Display/Super Admin sessions isolated.
- Video media rendering now uses a device-resolution, frame-accurate canvas renderer with `requestVideoFrameCallback` where available, high-quality image smoothing, exact aspect-ratio containment, black letterboxing, and no crop/zoom.
- Direct HTML video with `object-fit: contain` remains as a fallback if Canvas rendering is unavailable.
- Media files continue to be served byte-for-byte with HTTP Range; immutable caching/ETag/Last-Modified/inline headers were added.
