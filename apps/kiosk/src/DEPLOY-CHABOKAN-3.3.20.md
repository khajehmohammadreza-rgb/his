# Deployment — 3.3.20

1. Backup current 3.3.19 and persistent data on hosting.
2. Deploy this ZIP without overwriting the center's persistent `data/`, sessions, package signature secret, or local configuration.
3. Publish `windows-runtime/version.json` together with the exact `Bastiyan-Windows-Installer-x64.exe`; verify matching SHA256.
4. Existing installed launchers 3.3.12+ can update on launch if they can access the configured HTTPS origin. Older runtimes require a one-time reinstall of the doctor package.
5. Log in on Windows 10/11 using a doctor package; test both F8 and Ctrl+F8 and repeat/next/end-visit against a sandbox queue before production.
6. Verify Chrome/Edge, Firefox fallback, two monitors, shortcut conflicts, logout, offline failures, and preservation of the full doctor UI.
7. Check queue and announcement sync from the existing hall TV after any call.
8. No live deployment has been performed by this package build.
