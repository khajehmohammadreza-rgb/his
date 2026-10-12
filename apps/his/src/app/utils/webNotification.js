/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
class NotificationService {
    constructor() {
        this.listeners = [];
        this.history = [];
        this.soundEnabled = true;
        try {
            const saved = localStorage.getItem('clinic_notifications_history');
            if (saved) {
                this.history = JSON.parse(saved).slice(0, 50);
            }
            const soundPref = localStorage.getItem('clinic_sound_enabled');
            if (soundPref !== null) {
                this.soundEnabled = soundPref === 'true';
            }
        }
        catch (e) {
            console.error(e);
        }
    }
    isSupported() {
        return typeof window !== 'undefined' && 'Notification' in window;
    }
    isPermissionGranted() {
        return this.isSupported() && Notification.permission === 'granted';
    }
    getPermissionState() {
        if (!this.isSupported())
            return 'unsupported';
        return Notification.permission;
    }
    async requestPermission() {
        if (!this.isSupported()) {
            alert('مرورگر شما از اعلان‌های وب (Web Notifications) پشتیبانی نمی‌کند.');
            return false;
        }
        try {
            const permission = await Notification.requestPermission();
            return permission === 'granted';
        }
        catch (err) {
            console.error('Error requesting notification permission:', err);
            return false;
        }
    }
    setSoundEnabled(enabled) {
        this.soundEnabled = enabled;
        try {
            localStorage.setItem('clinic_sound_enabled', String(enabled));
        }
        catch (e) { }
    }
    isSoundEnabled() {
        return this.soundEnabled;
    }
    playChimeSound(type = 'system') {
        if (!this.soundEnabled)
            return;
        try {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (!AudioCtx)
                return;
            const ctx = new AudioCtx();
            const now = ctx.currentTime;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            if (type === 'patient') {
                // High pleasant double-chime for new patient (E5 -> G5)
                osc.frequency.setValueAtTime(659.25, now);
                osc.frequency.setValueAtTime(783.99, now + 0.12);
                gain.gain.setValueAtTime(0.15, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
            }
            else if (type === 'cartable') {
                // Success triple-chime for approval (C5 -> E5 -> G5)
                osc.frequency.setValueAtTime(523.25, now);
                osc.frequency.setValueAtTime(659.25, now + 0.1);
                osc.frequency.setValueAtTime(783.99, now + 0.2);
                gain.gain.setValueAtTime(0.18, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
            }
            else {
                // Gentle single chime
                osc.frequency.setValueAtTime(587.33, now);
                gain.gain.setValueAtTime(0.12, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
            }
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + 0.6);
        }
        catch (e) {
            console.warn('Audio chime fallback:', e);
        }
    }
    notify(title, body, type = 'system', linkTab) {
        const newNotif = {
            id: Date.now().toString() + Math.random().toString(36).substring(2, 5),
            title,
            body,
            timestamp: new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }),
            type,
            read: false,
            linkTab,
        };
        // 1. Save in history
        this.history = [newNotif, ...this.history].slice(0, 50);
        try {
            localStorage.setItem('clinic_notifications_history', JSON.stringify(this.history));
        }
        catch (e) { }
        // 2. Play Web Audio Chime Sound
        this.playChimeSound(type === 'patient' ? 'patient' : type === 'cartable' ? 'cartable' : 'system');
        // 3. Browser Web Notification (if permission granted)
        if (this.isPermissionGranted()) {
            try {
                const n = new Notification(title, {
                    body,
                    icon: '/bastiyan-logo.png',
                    dir: 'rtl',
                    lang: 'fa',
                    tag: newNotif.id,
                });
                n.onclick = () => {
                    window.focus();
                    n.close();
                };
            }
            catch (err) {
                console.warn('Web Notification send error:', err);
            }
        }
        // 4. Dispatch to UI Toast listeners
        this.listeners.forEach((fn) => fn(newNotif));
        return newNotif;
    }
    subscribe(listener) {
        this.listeners.push(listener);
        return () => {
            this.listeners = this.listeners.filter((l) => l !== listener);
        };
    }
    getHistory() {
        return this.history;
    }
    markAllAsRead() {
        this.history = this.history.map((h) => ({ ...h, read: true }));
        try {
            localStorage.setItem('clinic_notifications_history', JSON.stringify(this.history));
        }
        catch (e) { }
    }
    clearHistory() {
        this.history = [];
        try {
            localStorage.removeItem('clinic_notifications_history');
        }
        catch (e) { }
    }
}
export const notificationService = new NotificationService();
