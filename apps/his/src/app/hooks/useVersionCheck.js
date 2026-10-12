import { useEffect, useState, useCallback } from '../../client-vendor/react.js?b=r24-514-1405';
import { APP_VERSION } from '../utils/appVersion.js?b=r24-514-1405';
export const CURRENT_CLIENT_VERSION = APP_VERSION;
const STORAGE_KEY = 'bastian_client_version';
const ONE_HOUR_MS = 60 * 60 * 1000; // 1 hour interval
/**
 * Compare semantic version strings (e.g. "6.0.1" > "6.0.0")
 */
export function isVersionGreater(serverVer, clientVer) {
    if (!serverVer || !clientVer)
        return false;
    const parse = (v) => v.split('.').map((p) => parseInt(p, 10) || 0);
    const sParts = parse(serverVer);
    const cParts = parse(clientVer);
    const maxLength = Math.max(sParts.length, cParts.length);
    for (let i = 0; i < maxLength; i++) {
        const s = sParts[i] || 0;
        const c = cParts[i] || 0;
        if (s > c)
            return true;
        if (s < c)
            return false;
    }
    return false;
}
/**
 * Hook to periodically check version.json from the server root.
 * Triggers re-check:
 * 1. On initial mount
 * 2. Every 1 hour via timer
 * 3. On app resume (visibilitychange / focus)
 * 4. On network reconnection (online event)
 */
export function useVersionCheck() {
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [serverVersion, setServerVersion] = useState(null);
    const [updateRequired, setUpdateRequired] = useState(false);
    const [checking, setChecking] = useState(true);
    // Initialize client version in localStorage if not set
    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_KEY, CURRENT_CLIENT_VERSION);
        }
        catch (e) {
            console.warn('LocalStorage unavailable for client version tracking:', e);
        }
    }, []);
    const getClientVersion = useCallback(() => {
        try {
            return CURRENT_CLIENT_VERSION;
        }
        catch {
            return CURRENT_CLIENT_VERSION;
        }
    }, []);
    const checkVersion = useCallback(async () => {
        if (!navigator.onLine) {
            setIsOnline(false);
            setUpdateRequired(false);
            setChecking(false);
            return;
        }
        try {
            setIsOnline(true);
            setChecking(true);
            const res = await fetch(`./version.json?t=${Date.now()}`, { cache: 'no-store' });
            if (res.ok) {
                const data = await res.json();
                setServerVersion(data);
                // Trigger an update only when the server is newer than this running bundle.
                if (data && data.version) {
                    const isGreater = isVersionGreater(data.version, CURRENT_CLIENT_VERSION);
                    const isDifferentMandatory = data.version !== CURRENT_CLIENT_VERSION && data.mandatory !== false;
                    if (isGreater || isDifferentMandatory) {
                        setUpdateRequired(true);
                    }
                    else {
                        setUpdateRequired(false);
                    }
                }
            }
        }
        catch (err) {
            console.warn('Periodic version check failed or offline:', err);
            setIsOnline(false);
            setUpdateRequired(false);
        }
        finally {
            setChecking(false);
        }
    }, [getClientVersion]);
    useEffect(() => {
        // Initial check on mount
        checkVersion();
        // 1. Periodic check every 1 hour
        const intervalId = setInterval(() => {
            checkVersion();
        }, ONE_HOUR_MS);
        // 2. App resume & focus listener
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                checkVersion();
            }
        };
        const handleFocus = () => {
            checkVersion();
        };
        const handleOnline = () => {
            setIsOnline(true);
            checkVersion();
        };
        const handleOffline = () => {
            setIsOnline(false);
            setUpdateRequired(false);
        };
        window.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('focus', handleFocus);
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        return () => {
            clearInterval(intervalId);
            window.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('focus', handleFocus);
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, [checkVersion]);
    return {
        isOnline,
        serverVersion,
        updateRequired,
        checking,
        checkVersion,
        currentClientVersion: CURRENT_CLIENT_VERSION,
    };
}
