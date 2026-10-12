# Bastiyan Kiosk 3.3.1 — Display Mode Sync Fix

- Fixed display mode persistence: `displaySettings` is now patched over current settings instead of resetting unknown/new fields to defaults.
- Older settings panels can no longer silently revert `mode=media` back to `mode=queue`.
- Display sync now treats *any* center-version mismatch (higher or lower) as a resync condition, covering deploy/restore version rollback.
- `sync/poll` always exposes the authoritative `displayMode` so a running TV can detect layout drift.
- TV renders the full current state immediately on entry instead of discarding the first `/state` response.
- TV periodically verifies the authoritative display mode and reloads full state if the visible layout differs from the server setting.
- Media settings now verify the saved mode by reading it back from the server.
- Added “اعمال و باز کردن نمایشگر” to the media/display manager for one-step save/verification/open workflow.
