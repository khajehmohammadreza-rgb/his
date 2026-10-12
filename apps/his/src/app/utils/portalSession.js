export const BASTIYAN_SUPERADMIN_USER = Object.freeze({
    id: 'bastiyan-superadmin',
    name: 'مدیریت کل باستیان',
    username: 'bastiyan_superadmin',
    role: 'admin',
    status: 'active',
    active: true,
});

export function resolvePortalSessionUser(appUsers = [], portalSession, storage) {
    const session = portalSession ?? (typeof window !== 'undefined' ? window.__BASTIYAN_PORTAL_SESSION__ : null);
    const sessionStorageRef = storage ?? (typeof sessionStorage !== 'undefined' ? sessionStorage : null);
    let storedUser = null;
    let storedSuperAdmin = false;
    try {
        // The secure portal has historically used the correct product prefix
        // `bastiyan`, while older application builds used `bastian`. Read both
        // during migration so an already-authenticated center never loses its
        // identity when the application bundle starts.
        const raw = sessionStorageRef?.getItem('bastiyan_center_user')
            || sessionStorageRef?.getItem('bastian_center_user');
        storedUser = raw ? JSON.parse(raw) : null;
        storedSuperAdmin = sessionStorageRef?.getItem('bastiyan_superadmin_override') === '1'
            || sessionStorageRef?.getItem('bastian_superadmin_override') === '1';
    }
    catch { }
    const authenticatedUser = session?.user || storedUser;
    if (authenticatedUser?.id && authenticatedUser?.role) {
        return appUsers.find((user) => user.id === authenticatedUser.id || user.username === authenticatedUser.username) || authenticatedUser;
    }
    if (session?.fromSuperAdmin || storedSuperAdmin) return { ...BASTIYAN_SUPERADMIN_USER };
    return null;
}

export function resolvePortalCenterState(state, portalSession, storage) {
    const source = state && typeof state === 'object' ? state : {};
    const session = portalSession ?? (typeof window !== 'undefined' ? window.__BASTIYAN_PORTAL_SESSION__ : null);
    const sessionStorageRef = storage ?? (typeof sessionStorage !== 'undefined' ? sessionStorage : null);
    let storedCenter = null;
    try {
        const raw = sessionStorageRef?.getItem('bastiyan_center_session')
            || sessionStorageRef?.getItem('bastian_center_session');
        storedCenter = raw ? JSON.parse(raw) : null;
    }
    catch { }
    const center = session?.center || storedCenter;
    if (!center?.id) return source;
    return {
        ...source,
        currentCenterId: center.id,
        medicalCenters: [{ ...center }],
        settings: {
            ...(source.settings || {}),
            clinicName: center.name || '',
            phone: center.phone || '',
            address: center.address || '',
            city: center.city || '',
            centerCode: center.code || '',
            centerType: center.centerType || 'clinic',
            licensePlanName: center.planName || 'standard',
            licenseEndDate: center.endDate || '',
            licenseStatus: center.active === false || center.archived ? 'suspended' : 'active',
        },
    };
}
