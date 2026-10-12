# Bastiyan Kiosk 3.2.2 — Recovery + Media UI Fix

- Restores the real default center from the 3.0.0 reference profile when production persistent JSON has lost it.
- Restores all nine configured doctors and the configured secretary without deleting unrelated live centers, queues, media, or runtime state.
- Protects the default center, default doctor, and default secretary.
- Adds an always-visible “رسانه‌های نمایشگر / آپلود” entry for super-admin on `/admin`, `/center-settings`, and the admin root.
- Media manager can select the active center itself, so it does not depend on a fragile route transition.
- Supports both display types: legacy queue/doctor display and comprehensive media+queue display.
- Supports multi-file upload of image/video/audio/PDF/PPT/PPTX/ODP, playlist ordering, duration, active state, and deletion.
- Existing media playlist and chosen display mode are preserved by the bootstrap migration.
