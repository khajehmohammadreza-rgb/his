# Bastiyan Kiosk 3.3.2 — Display UI / Media Quality Fix

- Media/display settings are no longer injected above the application header. They are integrated with the main display-settings area and use the same visual language as the rest of the system.
- Windows client package block is also anchored inside center settings instead of before the application root.
- Display controls (fullscreen / return / exit) are part of the header grid on both queue and media layouts; they no longer float over the clock.
- QR is moved to a dedicated left/right safe rail and the main content reserves space for it, preventing overlap with doctor cards/media.
- Image media uses a non-cropping, non-upscaling foreground (`max-width/max-height`, centered contain) with a subtle blurred backdrop, preventing point-zoom/crop and reducing pixelation of small source images.
- Video remains full-stage contain without crop.
- Version bumped to 3.3.2 with cache-busted assets.
