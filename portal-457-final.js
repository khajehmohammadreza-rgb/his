const $ = (s, root = document) => root.querySelector(s);
const esc = (v = '') => String(v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[c]));
const ADMIN_TOKEN_KEY = 'bastiyan_superadmin_token', CENTER_TOKEN_KEY = 'bastiyan_center_token';
let adminToken = sessionStorage.getItem(ADMIN_TOKEN_KEY) || '';
let adminCenters = [];
let localStorageOriginalSet = localStorage.setItem.bind(localStorage);
let localStorageOriginalGet = localStorage.getItem.bind(localStorage);
let syncTimer = null, pullTimer = null, stateRevision = 0;
const nativeFetch = window.fetch.bind(window);
let LOCAL_MODE = false;
let APP_META = { version: '5.0.1', buildNumber: 501 };
async function loadAppMeta() {
    try {
        const r = await nativeFetch(`./version.json?t=${Date.now()}`, { cache: 'no-store' });
        if (r.ok) {
            const d = await r.json();
            if (d === null || d === void 0 ? void 0 : d.version)
                APP_META = d;
        }
    }
    catch (_a) { }
    return APP_META;
}
// لوگو پایه برای استفاده در HTML
const LOGO_IMG = '<img src="./logo.png" alt="Bastiyan" style="width:44px;height:44px;border-radius:14px;object-fit:cover">';
async function api(path, options = {}, token = '') {
    const headers = { ...(options.headers || {}) };
    if (token) {
        headers.Authorization = `Bearer ${token}`;
        headers['X-Bastiyan-Token'] = token;
    }
    if (options.body && !headers['Content-Type'])
        headers['Content-Type'] = 'application/json';
    const res = await nativeFetch(path, { credentials: 'same-origin', ...options, headers });
    let data = {};
    try {
        data = await res.json();
    }
    catch (_a) {
        data = { error: `HTTP ${res.status}` };
    }
    if (!res.ok)
        throw Object.assign(new Error(data.error || `HTTP ${res.status}`), { status: res.status, data });
    return data;
}
function modal(title, body, wide = false) {
    const el = document.createElement('div');
    el.className = 'bp-modal';
    el.innerHTML = `<div class="bp-modal-box ${wide ? 'wide' : ''}"><div class="bp-modal-head"><h2>${title}</h2><button class="bp-x">×</button></div><div class="modal-content">${body}</div></div>`;
    document.body.appendChild(el);
    $('.bp-x', el).onclick = () => el.remove();
    el.addEventListener('click', e => {
        if (e.target === el)
            el.remove();
    });
    return el;
}
function showError(box, msg) {
    var _a;
    let e = $('.bp-error', box);
    if (!e) {
        e = document.createElement('div');
        e.className = 'bp-error';
        (_a = $('.modal-content', box)) === null || _a === void 0 ? void 0 : _a.prepend(e);
    }
    e.textContent = msg;
}
function renderLanding() {
    document.body.innerHTML = `<div class="bp-shell"><nav class="bp-nav"><div class="bp-brand"><div class="bp-logo">${LOGO_IMG}</div><div><b>سامانه جامع پزشکی باستیان</b><small>Bastiyan HIS Professional • Web + Offline</small></div></div><span class="badge ok">نسخه پایدار ${esc(APP_META.version)}</span></nav><main class="bp-main"><section class="bp-hero"><div><span class="bp-kicker">مدیریت ایزوله و امن مراکز درمانی</span><h1 class="bp-title">ورود به سامانه باستیان</h1><p class="bp-sub">دو مسیر کاملاً جدا: مدیریت مرکزی شرکت برای کنترل مراکز و اعتبارها، و ورود کاربران مراکز برای استفاده روزمره از HIS. اطلاعات هر مرکز در MySQL با فضای مستقل، نسخه‌بندی و بکاپ چندلایه نگهداری می‌شود.</p><div class="bp-grid2"><div class="bp-card"><div>🛡️</div><h3>مدیریت کل باستیان</h3><p>افزودن/ویرایش مرکز، اعتبار، کاربران، آمار بکاپ و ورود Super Admin؛ بدون نمایش رمزهای ذخیره‌شده.</p><button id="adminLoginBtn" class="bp-btn" style="margin-top:16px;width:100%">ورود مدیریت کل</button></div><div class="bp-card"><div>🏥</div><h3>ورود مراکز و کاربران</h3><p>ورود با نام کاربری و رمز مرکز یا کاربر تعریف‌شده؛ سطح دسترسی مطابق نقش کاربر اعمال می‌شود.</p><button id="centerLoginBtn" class="bp-btn secondary" style="margin-top:16px;width:100%">ورود به مرکز</button></div></div></div><div class="bp-panel"><h3 style="margin-top:0">نسخه نصب روی سیستم / حالت قطعی اینترنت</h3><p class="bp-sub" style="font-size:12px">Mother PC یک سرور PHP کوچک روی شبکه داخلی ایجاد می‌کند، داده‌ها را محلی نگه می‌دارد و در اتصال اینترنت با فضای همان مرکز روی هاست همگام می‌کند.</p><div class="bp-note">بسته‌های Mother PC و Client LAN باید همراه نصب‌کنندهٔ اختصاصی شبکهٔ مرکز تحویل شوند. نسخهٔ وب حاضر مستقل و آمادهٔ نصب روی نت‌افراز است.</div></div></section></main></div>`;
    $('#adminLoginBtn').onclick = openAdminLogin;
    $('#centerLoginBtn').onclick = openCenterLogin;
}
function renderLocalLanding() {
    document.body.innerHTML = `<div class="bp-shell"><nav class="bp-nav"><div class="bp-brand"><div class="bp-logo">${LOGO_IMG}</div><div><b>باستیان HIS • سرور داخلی مرکز</b><small>Local Mother PC • Offline Mode</small></div></div><span class="badge ok">سرور داخلی فعال</span></nav><main class="bp-main"><section class="bp-hero"><div><span class="bp-kicker">کار در شبکه داخلی حتی هنگام قطع اینترنت</span><h1 class="bp-title">ورود به مرکز</h1><p class="bp-sub">اطلاعات ابتدا روی Mother PC ذخیره می‌شود و هر زمان اینترنت در دسترس باشد با فضای اختصاصی همین مرکز روی هاست همگام خواهد شد.</p><div class="bp-card"><h3>🏥 ورود کاربر مرکز</h3><p>با همان نام کاربری و رمز مرکز یا کاربری که مدیریت برای شما ساخته است وارد شوید.</p><button id="localCenterLogin" class="bp-btn secondary" style="width:100%">ورود به نرم‌افزار</button><div class="bp-note">اگر اینترنت قطع باشد، امکانات محلی فعال می‌مانند. سرویس‌های بیرونی مانند بیمه، پیامک و هوش مصنوعی تا بازگشت اینترنت در دسترس نخواهند بود.</div></div></div><div class="bp-panel"><h3>وضعیت سرور داخلی</h3><div id="localStatusBox" class="bp-note">در حال بررسی...</div><p class="bp-sub" style="font-size:12px">برای سیستم‌های دیگر شبکه، آدرس Mother PC را که هنگام نصب روی Desktop ایجاد شده است باز کنید.</p></div></section></main></div>`;
    $('#localCenterLogin').onclick = openCenterLogin;
    nativeFetch('./api/local/status').then(r => r.json()).then(d => {
        const b = $('#localStatusBox');
        if (b)
            b.innerHTML = `مرکز: <b>${esc(d.centerName || '-')}</b><br>ذخیره محلی: فعال • نسخه ${Number(d.localRevision || 0).toLocaleString('fa-IR')}<br>نسخه ابری: ${Number(d.cloudRevision || 0).toLocaleString('fa-IR')}<br>همگام‌سازی ابری: ${d.cloudReachable ? 'متصل' : 'در انتظار اینترنت'}`;
    }).catch(() => { });
}
function openAdminLogin() {
    const m = modal('ورود مدیریت کل باستیان', `<div class="bp-error" style="display:none"></div><form id="adminForm"><div class="bp-field"><label>نام کاربری مدیریت</label><input name="username" value="admin" required></div><div class="bp-field"><label>کلمه عبور</label><input type="password" name="password" autocomplete="current-password" required></div><button class="bp-btn" style="width:100%">ورود به پنل مرکزی</button></form><div class="bp-note">اگر اولین نصب روی هاست است، ابتدا <a href="./api/setup.php" style="color:#5eead4">راه‌اندازی اولیه امن</a> را یک‌بار انجام دهید.</div>`);
    const err = $('.bp-error', m);
    $('#adminForm', m).onsubmit = async (e) => {
        e.preventDefault();
        err.style.display = 'none';
        const f = new FormData(e.target);
        try {
            const d = await api('./api/bastian/admin/login', { method: 'POST', body: JSON.stringify({ username: f.get('username'), password: f.get('password') }) });
            adminToken = d.token;
            sessionStorage.setItem(ADMIN_TOKEN_KEY, adminToken);
            m.remove();
            await renderAdmin();
        }
        catch (x) {
            err.textContent = x.message;
            err.style.display = 'block';
        }
    };
}
function openCenterLogin() {
    const m = modal('ورود مرکز / کاربر مرکز', `<div class="bp-error" style="display:none"></div><form id="centerForm"><div class="bp-field"><label>نام کاربری</label><input name="username" autocomplete="username" required></div><div class="bp-field"><label>کلمه عبور</label><input type="password" name="password" autocomplete="current-password" required></div><button class="bp-btn" style="width:100%">ورود به مرکز</button></form><div class="bp-note">اعتبار مرکز ابتدا روی سرور مرکزی کنترل می‌شود. در نسخه Mother PC، آخرین مجوز و داده محلی برای حالت قطعی اینترنت نگهداری می‌شود.</div>`);
    const err = $('.bp-error', m);
    $('#centerForm', m).onsubmit = async (e) => {
        var _a;
        e.preventDefault();
        err.style.display = 'none';
        const f = new FormData(e.target);
        try {
            const d = await api('./api/bastian/license/validate', { method: 'POST', body: JSON.stringify({ username: f.get('username'), password: f.get('password'), deviceRegistration: LOCAL_MODE, deviceName: LOCAL_MODE ? 'Mother PC' : 'Web' }) });
            if ((_a = d.center) === null || _a === void 0 ? void 0 : _a.isExpired)
                throw new Error(`اعتبار مرکز «${d.center.name}» پایان یافته یا غیرفعال است. تاریخ: ${d.center.endDate || '-'}`);
            m.remove();
            await enterCenter(d.center, d.token, d.user, false);
        }
        catch (x) {
            err.textContent = x.message;
            err.style.display = 'block';
        }
    };
}
async function loadCenters() { const d = await api('./api/bastian/centers', {}, adminToken); adminCenters = d.centers || []; return adminCenters; }
function centerCard(c) { return `<div class="center-card"><div class="center-head"><div><div class="center-name">${esc(c.name)}</div><div class="center-meta">${esc(c.city || '-')} • ${esc(c.code || '-')}</div></div><span class="badge ${c.active && !c.archived ? 'ok' : 'off'}">${c.archived ? 'آرشیو' : c.active ? 'فعال' : 'غیرفعال'}</span></div><div class="center-details"><div>اعتبار تا: <b>${esc(c.endDate || '-')}</b></div><div>کاربر اصلی: <b>${esc(c.adminUsername || '-')}</b></div><div>کاربران فعال: <b>${Number(c.usersCount || 0).toLocaleString('fa-IR')}</b></div><div>بکاپ‌ها: <b>${Number(c.backupCount || 0).toLocaleString('fa-IR')}</b></div><div>نسخه داده: <b>${Number(c.stateRevision || 0).toLocaleString('fa-IR')}</b></div><div>آخرین همگام‌سازی: ${c.lastSync ? new Date(c.lastSync).toLocaleString('fa-IR') : '-'}</div></div><div class="bp-actions"><button class="bp-btn small" data-act="enter" data-id="${esc(c.id)}">ورود Super Admin</button><button class="bp-btn secondary small" data-act="edit" data-id="${esc(c.id)}">اصلاح تنظیمات</button><button class="bp-btn secondary small" data-act="users" data-id="${esc(c.id)}">کاربران</button><button class="bp-btn secondary small" data-act="backup" data-id="${esc(c.id)}">بکاپ فوری</button><button class="bp-btn secondary small" data-act="backups" data-id="${esc(c.id)}">نسخه‌های بکاپ</button>${!c.archived ? `<button class="bp-btn danger small" data-act="archive" data-id="${esc(c.id)}">آرشیو</button>` : ''}</div></div>`; }
async function renderAdmin() {
    try {
        await loadCenters();
    }
    catch (x) {
        if (x.status === 401) {
            adminToken = '';
            sessionStorage.removeItem(ADMIN_TOKEN_KEY);
            renderLanding();
            openAdminLogin();
            return;
        }
        throw x;
    }
    const active = adminCenters.filter(c => c.active && !c.archived).length, archived = adminCenters.filter(c => c.archived).length;
    document.body.innerHTML = `<div class="admin-shell"><div class="admin-nav"><div class="bp-brand"><div class="bp-logo">${LOGO_IMG}</div><div><b>پنل مدیریت مرکزی باستیان</b><small>MySQL • مراکز، اعتبار، کاربران، نسخه داده و بکاپ‌ها</small></div></div><div class="bp-actions"><button id="systemRecovery" class="bp-btn secondary small">ایمنی و بازیابی</button><a class="bp-btn secondary small" href="./api/backup">بکاپ کامل</a><a class="bp-btn secondary small" href="./api/client/download/windows">دانلود نرم‌افزار</a><button id="adminLogout" class="bp-btn secondary small">خروج</button></div></div><div class="admin-wrap"><div class="admin-stats"><div class="stat"><b>${adminCenters.length}</b><span>کل مراکز</span></div><div class="stat"><b>${active}</b><span>فعال</span></div><div class="stat"><b>${adminCenters.length - active - archived}</b><span>غیرفعال</span></div><div class="stat"><b>${archived}</b><span>آرشیو بدون حذف داده</span></div></div><div class="admin-toolbar"><div><h2 style="margin:0">مراکز تحت پوشش</h2><div class="muted">اطلاعات مراکز در MySQL ایزوله است؛ رمزها فقط به‌صورت Hash و داده‌ها با Revision ذخیره می‌شوند.</div></div><button id="addCenter" class="bp-btn">+ افزودن مرکز جدید</button></div><div id="centerList" class="center-list">${adminCenters.map(centerCard).join('') || '<div class="center-card">هنوز مرکزی تعریف نشده است.</div>'}</div></div></div>`;
    $('#adminLogout').onclick = async () => {
        try {
            await api('./api/bastian/logout', { method: 'POST' }, adminToken);
        }
        catch (_a) { }
        sessionStorage.removeItem(ADMIN_TOKEN_KEY);
        adminToken = '';
        renderLanding();
    };
    $('#systemRecovery').onclick = openSystemRecovery;
    $('#addCenter').onclick = () => openCenterEditor(null);
    $('#centerList').onclick = async (e) => {
        const b = e.target.closest('[data-act]');
        if (!b)
            return;
        const c = adminCenters.find(x => x.id === b.dataset.id);
        if (!c)
            return;
        try {
            if (b.dataset.act === 'edit')
                openCenterEditor(c);
            if (b.dataset.act === 'users')
                openUsers(c);
            if (b.dataset.act === 'backup') {
                const d = await api(`./api/bastian/centers/${encodeURIComponent(c.id)}/backup`, { method: 'POST' }, adminToken);
                alert(`بکاپ مرکز ثبت شد. تعداد نسخه‌های موجود: ${d.backupCount || 0}`);
            }
            if (b.dataset.act === 'backups') {
                await openBackups(c);
            }
            if (b.dataset.act === 'archive') {
                if (confirm('مرکز آرشیو شود؟ هیچ داده یا بکاپی حذف نخواهد شد.')) {
                    await api(`./api/bastian/centers/${encodeURIComponent(c.id)}`, { method: 'DELETE' }, adminToken);
                    await renderAdmin();
                }
            }
            if (b.dataset.act === 'enter') {
                const d = await api('./api/bastian/remote-login', { method: 'POST', body: JSON.stringify({ centerId: c.id }) }, adminToken);
                await enterCenter(d.center || c, d.token, { id: 'bastiyan-superadmin', name: 'مدیریت کل باستیان', username: 'bastiyan_superadmin', role: 'admin', status: 'active', active: true }, true);
            }
        }
        catch (x) {
            alert(x.message);
        }
    };
}
async function openSystemRecovery() {
    let data;
    try {
        data = await api('./api/bastian/system/recovery', {}, adminToken);
    }
    catch (x) {
        alert(x.message);
        return;
    }
    const rows = data.snapshots || [];
    const reasonLabel = { before_update: 'قبل از بروزرسانی', manual: 'دستی', before_restore: 'قبل از بازیابی', scheduled: 'زمان‌بندی‌شده', legacy_updater_backup: 'پشتیبان آپدیتر قبلی' };
    const fmtBytes = n => {
        n = Number(n || 0);
        if (n < 1024)
            return `${n} B`;
        if (n < 1024 * 1024)
            return `${(n / 1024).toFixed(1)} KB`;
        return `${(n / 1024 / 1024).toFixed(1)} MB`;
    };
    const m = modal('ایمنی، بکاپ و بازیابی سیستم', `<div class="bp-note"><b>حفاظت چندلایه فعال است.</b><br>از نسخه ۴.۱.۰ قبل از هر بروزرسانی، Snapshot کامل فایل‌های برنامه و دیتابیس ساخته و صحت‌سنجی می‌شود. اگر Snapshot کامل نشود، نصب بروزرسانی اصلاً شروع نمی‌شود.<br><br><b>بازیابی اضطراری بدون ورود به نرم‌افزار:</b> در File Manager فایل BASTIYAN_RECOVERY_UNLOCK_TEMPLATE.txt را Copy و با نام BASTIYAN_RECOVERY_UNLOCK.txt ذخیره کنید؛ سپس /bastiyan-recovery.php را باز کنید.</div><div class="bp-actions" style="margin:14px 0"><button id="createRecoverySnapshot" class="bp-btn">ساخت Snapshot کامل الآن</button></div><div class="backup-list">${rows.map(r => `<div class="user-row"><div><b>نسخه ${esc(r.version || r.fromVersion || '-')}</b><div class="muted">${r.createdAt ? new Date(r.createdAt).toLocaleString('fa-IR') : '-'} • ${esc(reasonLabel[r.reason] || r.type || '-')} ${r.runtimeBytes ? `• ${fmtBytes(r.runtimeBytes)}` : ''}${r.databaseIncluded ? ' • دارای بکاپ دیتابیس' : ''}</div></div><div class="bp-actions"><button class="bp-btn secondary small" data-recovery-restore="${esc(r.id)}" data-type="${esc(r.type || 'disaster-snapshot')}">بازیابی فایل‌های برنامه</button>${r.databaseIncluded ? `<button class="bp-btn danger small" data-recovery-full="${esc(r.id)}" data-type="${esc(r.type || 'disaster-snapshot')}">فایل‌ها + دیتابیس</button>` : ''}</div></div>`).join('') || '<div class="bp-note">هنوز Snapshot جدیدی ثبت نشده است. پشتیبان کامل ۴.۰.۰ که هنگام نصب این نسخه توسط آپدیتر قدیمی ساخته می‌شود نیز پس از نصب در همین فهرست قابل بازیابی است.</div>'}</div>`, true);
    $('#createRecoverySnapshot', m).onclick = async (e) => {
        const b = e.currentTarget;
        b.disabled = true;
        b.textContent = 'در حال ساخت Snapshot...';
        try {
            await api('./api/bastian/system/recovery', { method: 'POST', body: JSON.stringify({ action: 'create', markStable: true }) }, adminToken);
            m.remove();
            await openSystemRecovery();
        }
        catch (x) {
            alert(x.message);
            b.disabled = false;
            b.textContent = 'ساخت Snapshot کامل الآن';
        }
    };
    m.addEventListener('click', async (e) => {
        const runtime = e.target.closest('[data-recovery-restore]'), full = e.target.closest('[data-recovery-full]');
        const b = runtime || full;
        if (!b)
            return;
        const withDatabase = !!full;
        const warning = withDatabase ? 'فایل‌های برنامه و دیتابیس فعلی با این Snapshot جایگزین شوند؟' : 'فقط فایل‌های برنامه به این نسخه برگردند؟ دیتابیس فعلی دست‌نخورده می‌ماند.';
        if (!confirm(warning))
            return;
        b.disabled = true;
        try {
            const r = await api('./api/bastian/system/recovery', { method: 'POST', body: JSON.stringify({ action: 'restore', id: b.dataset.recoveryRestore || b.dataset.recoveryFull, type: b.dataset.type, withDatabase }) }, adminToken);
            alert(`بازیابی انجام شد. نسخه: ${r.restoredVersion || '-'}\nصفحه دوباره بارگذاری می‌شود.`);
            location.reload();
        }
        catch (x) {
            alert(x.message);
            b.disabled = false;
        }
    });
}
async function openBackups(c) {
    let d;
    try {
        d = await api(`./api/bastian/centers/${encodeURIComponent(c.id)}/backups?limit=80`, {}, adminToken);
    }
    catch (x) {
        alert(x.message);
        return;
    }
    const rows = d.backups || [];
    const reasonLabel = { automatic: 'خودکار', manual: 'دستی', before_archive: 'قبل از آرشیو', before_restore: 'قبل از بازیابی' };
    const m = modal(`نسخه‌های بکاپ: ${esc(c.name)}`, `<div class="bp-note">بازیابی، نسخه فعلی را حذف نمی‌کند؛ قبل از بازیابی یک بکاپ محافظ ساخته می‌شود و داده بازیابی‌شده با Revision جدید ثبت خواهد شد.</div><div class="backup-list">${rows.map(b => `<div class="user-row"><div><b>نسخه ${Number(b.revision).toLocaleString('fa-IR')}</b><div class="muted">${new Date(b.createdAt).toLocaleString('fa-IR')} • ${esc(reasonLabel[b.reason] || b.reason || '-')}</div></div><button class="bp-btn secondary small" data-restore="${b.id}">بازیابی این نسخه</button></div>`).join('') || '<div class="bp-note">هنوز نسخه بکاپی ثبت نشده است.</div>'}</div>`, true);
    m.onclick = async (e) => {
        const b = e.target.closest('[data-restore]');
        if (!b)
            return;
        const item = rows.find(x => String(x.id) === String(b.dataset.restore));
        if (!item)
            return;
        if (!confirm(`نسخه ${item.revision} بازیابی شود؟ قبل از بازیابی از وضعیت فعلی بکاپ محافظ گرفته می‌شود.`))
            return;
        b.disabled = true;
        try {
            const r = await api(`./api/bastian/centers/${encodeURIComponent(c.id)}/backups/${item.id}/restore`, { method: 'POST' }, adminToken);
            alert(`بازیابی انجام شد. Revision جدید: ${r.revision}`);
            m.remove();
            await renderAdmin();
        }
        catch (x) {
            alert(x.message);
            b.disabled = false;
        }
    };
}
function openCenterEditor(c) {
    const isEdit = !!c;
    const m = modal(isEdit ? 'اصلاح تنظیمات مرکز' : 'افزودن مرکز جدید', `<div class="bp-error" style="display:none"></div><form id="centerEdit"><div class="bp-form-grid"><div class="bp-field"><label>نام مرکز</label><input name="name" value="${esc((c === null || c === void 0 ? void 0 : c.name) || '')}" required></div><div class="bp-field"><label>شهر / استان</label><input name="city" value="${esc((c === null || c === void 0 ? void 0 : c.city) || '')}"></div><div class="bp-field"><label>شماره تماس</label><input name="phone" value="${esc((c === null || c === void 0 ? void 0 : c.phone) || '')}"></div><div class="bp-field"><label>کد مرکز</label><input name="code" value="${esc((c === null || c === void 0 ? void 0 : c.code) || '')}" ${isEdit ? '' : 'placeholder="خودکار در صورت خالی بودن"'}></div><div class="bp-field"><label>نام کاربری اصلی مرکز</label><input name="adminUsername" value="${esc((c === null || c === void 0 ? void 0 : c.adminUsername) || '')}" required></div><div class="bp-field"><label>${isEdit ? 'رمز جدید (در صورت نیاز)' : 'رمز مرکز'}</label><input type="password" name="adminPassword" minlength="8" ${isEdit ? '' : 'required'}></div><div class="bp-field"><label>تاریخ شروع</label><input name="startDate" value="${esc((c === null || c === void 0 ? void 0 : c.startDate) || '')}"></div><div class="bp-field"><label>تاریخ پایان اعتبار</label><input name="endDate" value="${esc((c === null || c === void 0 ? void 0 : c.endDate) || '1406/12/29')}" required></div><div class="bp-field"><label>نوع کاربری مرکز</label><select name="centerType"><option ${(c === null || c === void 0 ? void 0 : c.centerType) === 'clinic' ? 'selected' : ''} value="clinic">درمانگاه / کلینیک</option><option ${(c === null || c === void 0 ? void 0 : c.centerType) === 'surgery' ? 'selected' : ''} value="surgery">مرکز جراحی محدود</option><option ${(c === null || c === void 0 ? void 0 : c.centerType) === 'office' ? 'selected' : ''} value="office">مطب</option></select></div><div class="bp-field"><label>پلن</label><select name="planName"><option value="standard">استاندارد</option><option ${(c === null || c === void 0 ? void 0 : c.planName) === 'enterprise' ? 'selected' : ''} value="enterprise">Enterprise</option></select></div></div><div class="bp-field"><label><input type="checkbox" name="active" ${(c === null || c === void 0 ? void 0 : c.active) !== false ? 'checked' : ''} style="width:auto"> مرکز فعال باشد</label></div><div class="bp-field"><label>یادداشت مدیریت</label><textarea name="notes" rows="3">${esc((c === null || c === void 0 ? void 0 : c.notes) || '')}</textarea></div><button class="bp-btn" style="width:100%">ذخیره تنظیمات مرکز</button></form>`);
    const err = $('.bp-error', m);
    const submitBtn = m.querySelector('.bp-btn[style*="width:100%"]');
    $('#centerEdit', m).onsubmit = async (e) => {
        e.preventDefault();
        err.style.display = 'none';
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = 'در حال ذخیره...';
        }
        const f = new FormData(e.target), o = Object.fromEntries(f.entries());
        o.active = f.get('active') === 'on';
        if (isEdit)
            o.id = c.id;
        if (!o.adminPassword || o.adminPassword === '')
            delete o.adminPassword;
        o._bastiyanToken = adminToken;
        try {
            const result = await api('./api/bastian/centers', { method: 'POST', body: JSON.stringify(o) }, adminToken);
            if (!result.success) {
                const msg = result.error || 'خطای ناشناخته در ثبت مرکز';
                err.textContent = msg;
                err.style.display = 'block';
                alert('خطا: ' + msg);
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.textContent = 'ذخیره تنظیمات مرکز';
                }
                return;
            }
            m.remove();
            await renderAdmin();
        }
        catch (x) {
            const msg = x.message || 'خطا در ارتباط با سرور';
            err.textContent = msg;
            err.style.display = 'block';
            alert('خطا در ثبت مرکز:\n' + msg);
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = 'ذخیره تنظیمات مرکز';
            }
        }
    };
}
async function openUsers(c) {
    let d;
    try {
        d = await api(`./api/bastian/centers/${encodeURIComponent(c.id)}/users`, {}, adminToken);
    }
    catch (x) {
        alert(x.message);
        return;
    }
    let users = d.users || [];
    const m = modal(`کاربران مرکز: ${esc(c.name)}`, `<div class="bp-note">رمزهای کاربران هرگز قابل مشاهده نیستند. هنگام ویرایش، فیلد رمز را فقط در صورت نیاز به تغییر پر کنید.</div><div id="usersList"></div><hr style="border-color:#334155;margin:18px 0"><h3>افزودن / ویرایش کاربر</h3><form id="userForm"><input type="hidden" name="id"><div class="bp-form-grid"><div class="bp-field"><label>نام و نام خانوادگی</label><input name="name" required></div><div class="bp-field"><label>نام کاربری یکتا</label><input name="username" required></div><div class="bp-field"><label>رمز جدید</label><input type="password" name="password" minlength="6" placeholder="برای ویرایش می‌تواند خالی باشد"></div><div class="bp-field"><label>نقش اصلی</label><select name="role"><option value="doctor">پزشک</option><option value="nurse">پرستار / دستیار</option><option value="cashier">پذیرش / صندوق</option><option value="inventory_manager">انبار</option><option value="accountant">حسابدار</option><option value="purchaser">خرید</option><option value="operating_room_supervisor">اتاق عمل</option><option value="inspector">ناظر</option><option value="admin">ادمین مرکز</option></select></div><div class="bp-field"><label>بخش</label><input name="department"></div><div class="bp-field" style="grid-column:1/-1"><label>نقش‌های همزمان</label><div class="bp-role-grid">${[['doctor','پزشک'],['nurse','پرستار / دستیار'],['cashier','پذیرش / صندوق'],['inventory_manager','انبار'],['accountant','حسابدار'],['purchaser','خرید'],['operating_room_supervisor','اتاق عمل'],['inspector','ناظر'],['admin','ادمین مرکز']].map(([v,l])=>`<label class="bp-role-check"><input type="checkbox" name="roles" value="${v}"> <span>${l}</span></label>`).join('')}</div></div><div class="bp-field" style="grid-column:1/-1"><label>دسترسی‌های اختصاصی</label><div class="bp-role-grid">${[['workflow_return','بازگشت بین مراحل'],['patient_edit','ویرایش پرونده'],['service_entry','ثبت خدمت و کالا'],['discharge','ترخیص و تسویه'],['inventory','انبار'],['reports','گزارش‌ها'],['appointments','رزرو نوبت'],['consent_upload','رضایت‌نامه و مستندات'],['sms','پیامک']].map(([v,l])=>`<label class="bp-role-check"><input type="checkbox" name="permissions" value="${v}"> <span>${l}</span></label>`).join('')}</div></div></div><label class="muted"><input type="checkbox" name="active" checked> فعال</label><button class="bp-btn" style="width:100%;margin-top:12px">ذخیره کاربر</button></form>`, true);
    const list = () => { $('#usersList', m).innerHTML = users.map(u => `<div class="user-row"><div><b>${esc(u.name)}</b><div class="muted">${esc(u.username)} • ${esc((u.roles || [u.role]).join(' + '))} ${u.isPrimaryAdmin ? '• مدیر اصلی' : ''}</div></div><div class="bp-actions">${u.isPrimaryAdmin ? '<span class="badge ok">از تنظیمات مرکز ویرایش می‌شود</span>' : `<button class="bp-btn secondary small" data-u-edit="${esc(u.id)}">ویرایش</button><button class="bp-btn danger small" data-u-del="${esc(u.id)}">غیرفعال</button>`}</div></div>`).join('') || '<div class="bp-note">کاربری ثبت نشده است.</div>'; };
    list();
    $('#usersList', m).onclick = async (e) => {
        const ed = e.target.closest('[data-u-edit]'), del = e.target.closest('[data-u-del]');
        if (ed) {
            const u = users.find(x => x.id === ed.dataset.uEdit), f = $('#userForm', m);
            ['id', 'name', 'username', 'role', 'department'].forEach(k => f.elements[k].value = (u === null || u === void 0 ? void 0 : u[k]) || '');
            f.elements.password.value = '';
            f.elements.active.checked = (u === null || u === void 0 ? void 0 : u.active) !== false;
            Array.from(f.querySelectorAll('input[name="roles"]')).forEach(x => x.checked = Array.isArray(u?.roles) ? u.roles.includes(x.value) : x.value === u?.role);
            Array.from(f.querySelectorAll('input[name="permissions"]')).forEach(x => x.checked = Boolean(u?.permissions?.[x.value]));
        }
        if (del && confirm('این کاربر غیرفعال شود؟ اطلاعات تاریخی او حذف نخواهد شد.')) {
            const r = await api(`./api/bastian/centers/${encodeURIComponent(c.id)}/users/${encodeURIComponent(del.dataset.uDel)}`, { method: 'DELETE' }, adminToken);
            users = r.users || [];
            list();
        }
    };
    $('#userForm', m).onsubmit = async (e) => {
        e.preventDefault();
        const f = new FormData(e.target);
        const u = {
            id: f.get('id') || `u-${Date.now()}`,
            name: f.get('name'), username: f.get('username'),
            password: f.get('password'), role: f.get('role'),
            roles: Array.from(e.target.querySelectorAll('input[name="roles"]:checked')).map(x => x.value),
            permissions: Object.fromEntries(Array.from(e.target.querySelectorAll('input[name="permissions"]')).map(x => [x.value, x.checked])),
            department: f.get('department'), status: 'active',
            active: f.get('active') === 'on'
        };
        if (u.id && !u.id.startsWith('u-') && (u.password === '' || u.password == null))
            delete u.password;
        const saveBtn = m.querySelector('#userForm .bp-btn');
        if (saveBtn) {
            saveBtn.disabled = true;
            saveBtn.textContent = 'در حال ذخیره...';
        }
        try {
            const r = await api(`./api/bastian/centers/${encodeURIComponent(c.id)}/users`, { method: 'POST', body: JSON.stringify({ user: u }) }, adminToken);
            users = r.users || [];
            list();
            e.target.reset();
            e.target.elements.active.checked = true;
        }
        catch (x) {
            alert('خطا در ذخیره کاربر:\n' + (x.message || 'خطای ناشناخته'));
        }
        finally {
            if (saveBtn) {
                saveBtn.disabled = false;
                saveBtn.textContent = 'ذخیره کاربر';
            }
        }
    };
}
async function ensureBastiyanRuntime() {
    try {
        const [b, r] = await Promise.all([nativeFetch(`./app/bastiyan-app.bundle.js?runtime=${encodeURIComponent(APP_META.version)}`, { method: 'GET', cache: 'no-store' }), nativeFetch(`./app/main453.js?runtime=${encodeURIComponent(APP_META.version)}&stable=2`, { method: 'GET', cache: 'no-store' })]);
        if (!b.ok || !r.ok)
            throw new Error('runtime missing');
        return true;
    }
    catch (e) {
        const msg = LOCAL_MODE ? 'پیش‌نیازهای رابط کاربری روی Mother PC کامل نشده‌اند. نصب‌کننده را یک بار در حالت آنلاین با دسترسی Administrator اجرا کنید.' : 'Runtime مرورگر هنوز آماده نشده است. یک‌بار api/setup.php را باز کنید تا پیش‌نیازها به‌صورت خودکار روی هاست ذخیره شوند.';
        document.body.innerHTML = `<div class="bp-shell"><main class="bp-main"><div class="bp-card" style="max-width:680px;margin:8vh auto"><h2>تکمیل راه‌اندازی لازم است</h2><p>${msg}</p><a class="bp-btn" href="${LOCAL_MODE ? './' : './api/setup.php'}">${LOCAL_MODE ? 'بازگشت' : 'اجرای Setup'}</a></div></main></div>`;
        return false;
    }
}
function safeLocalJson(key, fallback = null) {
    try {
        const raw = localStorageOriginalGet(key);
        if (!raw)
            return fallback;
        const parsed = JSON.parse(raw);
        return parsed !== null && parsed !== void 0 ? parsed : fallback;
    }
    catch (_a) {
        return fallback;
    }
}
function recoverCenterRuntimeFromBrowser(center) {
    const cid = String((center === null || center === void 0 ? void 0 : center.id) || '');
    const isolated = safeLocalJson(`bastiyan_center_isolated_${cid}`, null)
        || safeLocalJson(`bastian_center_isolated_${cid}`, null)
        || {};
    const runtime = (isolated && typeof isolated === 'object' && !Array.isArray(isolated)) ? JSON.parse(JSON.stringify(isolated)) : {};
    const legacy = {
        users: `bastian_center_${cid}_users`,
        medicalServices: `bastian_center_${cid}_medical_services`,
        products: `bastian_center_${cid}_products`,
        categories: `bastian_center_${cid}_categories`,
        serviceCategories: `bastian_center_${cid}_service_categories`,
        warehouses: `bastian_center_${cid}_warehouses`,
        patients: `bastian_center_${cid}_patients`,
        visitQueue: `bastian_center_${cid}_visit_queue`,
        appointments: `bastian_center_${cid}_appointments`,
        treatmentPlans: `bastian_center_${cid}_treatment_plans`,
    };
    for (const [key, storageKey] of Object.entries(legacy)) {
        const existing = runtime[key];
        if (Array.isArray(existing) && existing.length)
            continue;
        const old = safeLocalJson(storageKey, null);
        if (Array.isArray(old) && old.length)
            runtime[key] = old;
    }
    runtime.currentCenterId = cid;
    runtime.medicalCenters = [center];
    runtime.settings = { ...(runtime.settings || {}), clinicName: (center === null || center === void 0 ? void 0 : center.name) || '', phone: (center === null || center === void 0 ? void 0 : center.phone) || '', address: (center === null || center === void 0 ? void 0 : center.address) || '', city: (center === null || center === void 0 ? void 0 : center.city) || '', centerCode: (center === null || center === void 0 ? void 0 : center.code) || '', centerType: (center === null || center === void 0 ? void 0 : center.centerType) || 'clinic', licensePlanName: (center === null || center === void 0 ? void 0 : center.planName) || 'standard', licenseEndDate: (center === null || center === void 0 ? void 0 : center.endDate) || '', licenseStatus: (center === null || center === void 0 ? void 0 : center.active) === false || (center === null || center === void 0 ? void 0 : center.archived) ? 'suspended' : 'active' };
    for (const key of ['users', 'medicalServices', 'products', 'categories', 'serviceCategories', 'warehouses', 'patients', 'visitQueue', 'appointments', 'treatmentPlans']) {
        if (!Array.isArray(runtime[key]))
            runtime[key] = [];
    }
    return runtime;
}
function clinicalRoleCount(users, kind) {
    const terms = kind === 'doctor' ? ['doctor', 'physician', 'پزشک', 'دکتر'] : ['nurse', 'assistant', 'nursing', 'پرستار', 'دستیار'];
    return (Array.isArray(users) ? users : []).filter(u => {
        if (!u || u.active === false || u.status === 'disabled' || u.status === 'inactive')
            return false;
        const vals = [u.role, u.roleName, u.roleTitle, ...(Array.isArray(u.roles) ? u.roles : []), ...(Array.isArray(u.assignedRoles) ? u.assignedRoles : [])];
        const hay = vals.filter(Boolean).join(' ').toLowerCase().replace(/ي/g, 'ی').replace(/ك/g, 'ک');
        if (kind === 'doctor' && (hay.includes('دستیار') || hay.includes('پرستار') || hay.includes('منشی') || /\b(assistant|nurse|nursing|secretary)\b/.test(hay)))
            return false;
        return terms.some(t => hay.includes(t));
    }).length;
}
async function fetchOnlineCenterData(center, token) {
    return api(`./api/bastian/centers/${encodeURIComponent(center.id)}/online-data`, {}, token);
}
function onlineDataSummary() {
    return 'اتصال به دیتابیس آنلاین مرکز برقرار است';
}
function onlineRecoveryPayload(browserRuntime, onlineState) {
    const payload = {};
    if (!browserRuntime || typeof browserRuntime !== 'object')
        return payload;
    const server = onlineState && typeof onlineState === 'object' ? onlineState : {};
    const keys = ['users', 'medicalServices', 'products', 'categories', 'serviceCategories', 'warehouses', 'patients', 'visitQueue', 'appointments', 'treatmentPlans', 'signedConsents', 'expenses', 'smsLogs', 'stockMovements', 'salesInvoices', 'purchaseInvoices', 'supplyRequests', 'internalConsumptions', 'wastageRecords', 'auditLogs', 'customReports', 'shifts', 'attendanceRecords', 'attendanceRequests', 'payrolls', 'staffAccounts'];
    for (const key of keys) {
        const local = browserRuntime[key];
        const remote = server[key];
        if (!Array.isArray(local) || local.length === 0)
            continue;
        if (key === 'users') {
            const remoteUsers = Array.isArray(remote) ? remote : [];
            const remoteIndex = new Set(remoteUsers.flatMap(u => [String((u === null || u === void 0 ? void 0 : u.id) || ''), String((u === null || u === void 0 ? void 0 : u.username) || '').toLowerCase(), String((u === null || u === void 0 ? void 0 : u.name) || '').trim()].filter(Boolean)));
            const missing = local.filter(u => u && ![String(u.id || ''), String(u.username || '').toLowerCase(), String(u.name || '').trim()].filter(Boolean).some(x => remoteIndex.has(x)));
            if (missing.length)
                payload.users = local;
            continue;
        }
        if (!Array.isArray(remote) || remote.length === 0)
            payload[key] = local;
    }
    return payload;
}
function renderOnlineDatabaseFailure(center, error) {
    var _a, _b;
    const code = ((_a = error === null || error === void 0 ? void 0 : error.data) === null || _a === void 0 ? void 0 : _a.diagnosticCode) || 'ONLINE_DATA';
    const detail = ((_b = error === null || error === void 0 ? void 0 : error.data) === null || _b === void 0 ? void 0 : _b.detail) || (error === null || error === void 0 ? void 0 : error.message) || `HTTP ${(error === null || error === void 0 ? void 0 : error.status) || 500}`;
    document.body.innerHTML = `<div class="bp-shell"><main class="bp-main"><div class="bp-card" style="max-width:760px;margin:7vh auto;border-color:#7f1d1d">
    <div style="display:flex;align-items:center;gap:12px"><div class="bp-logo">${LOGO_IMG}</div><div><h2 style="margin:0">اتصال دیتابیس آنلاین مرکز کامل نشد</h2><div class="muted">${esc((center === null || center === void 0 ? void 0 : center.name) || 'مرکز')}</div></div></div>
    <div class="bp-error" style="display:block;margin-top:18px">کد تشخیص: ${esc(code)} • ${esc(detail)}</div>
    <p class="bp-sub">برای جلوگیری از نمایش اطلاعات ناقص، نرم‌افزار وارد حالت آفلاین نمی‌شود. ورود و فرم‌های مرکز فقط پس از اتصال مستقیم MySQL فعال می‌شوند.</p>
    <div class="bp-actions"><button id="retryOnlineDb" class="bp-btn">تلاش مجدد برای اتصال</button><button id="backOnlineDb" class="bp-btn secondary">بازگشت به درگاه</button></div>
  </div></main></div>`;
    const retry = $('#retryOnlineDb');
    if (retry)
        retry.onclick = () => location.reload();
    const back = $('#backOnlineDb');
    if (back)
        back.onclick = () => { clearCenterSession(); location.reload(); };
}
function installAppointmentDeskAlarm(center, token, user, initialState) {
    const roles = [user?.role, ...(user?.roles || [])].filter(Boolean).map(x => String(x).toLowerCase());
    const isDesk = roles.some(r => ['cashier','receptionist','secretary','front_desk','پذیرش','منشی','صندوق'].some(x => r.includes(x)));
    if (!isDesk) return;
    let lastSignature = '';
    const closeExisting = () => document.getElementById('bastiyan-appointment-alarm')?.remove();
    const show = (state) => {
        const now = Date.now(); const rows=[];
        for (const a of (state?.appointments || [])) {
            const raw = a?.dateTime || a?.appointmentAt || a?.scheduledAt || a?.startAt || '';
            let ts = raw ? new Date(raw).getTime() : NaN;
            if (!Number.isFinite(ts) && a?.date) {
                ts = new Date(`${a.date}T${a.time || a.timeSlot || '00:00'}:00`).getTime();
            }
            if (!Number.isFinite(ts) || ts <= now || ts-now > 48*3600*1000) continue;
            const hours = (ts-now)/3600000; const bucket = hours <= 24 ? 'فردا / کمتر از ۲۴ ساعت' : 'پس‌فردا / تا ۴۸ ساعت';
            rows.push({a,ts,bucket,hours});
        }
        if(!rows.length){ closeExisting(); return; }
        rows.sort((x,y)=>x.ts-y.ts);
        const signature=rows.map(x=>`${x.a.id||x.ts}:${x.bucket}`).join('|');
        if(signature===lastSignature && document.getElementById('bastiyan-appointment-alarm')) return;
        lastSignature=signature; closeExisting();
        const el=document.createElement('div'); el.id='bastiyan-appointment-alarm'; el.className='bp-appointment-alarm';
        el.innerHTML=`<div class="bp-appointment-alarm-head"><div><strong>⏰ هشدار نوبت‌های نزدیک</strong><span>${rows.length.toLocaleString('fa-IR')} نوبت در ۴۸ ساعت آینده</span></div><button type="button" class="bp-appointment-alarm-close">×</button></div><div class="bp-appointment-alarm-list">${rows.slice(0,12).map(x=>{const a=x.a;const title=esc(a.serviceName||a.title||a.serviceTitle||a.type||'خدمت / عمل');const patient=esc(a.patientName||'بیمار');const dateValue=a.jalaliDate||a.date||'';let date=dateValue;try{if(a.date){date=new Intl.DateTimeFormat('fa-IR-u-ca-persian',{year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(`${a.date}T12:00:00`));}}catch(_){} const dateEsc=esc(date);const time=esc(a.timeSlot||a.time||'');return `<div class="bp-appointment-alarm-row"><b>${patient}</b><span>${title}</span><span>${dateEsc}${time?' • '+time:''}</span><em>${x.bucket}</em></div>`}).join('')}</div>`;
        document.body.appendChild(el); el.querySelector('.bp-appointment-alarm-close').onclick=closeExisting;
        try{ const C=window.AudioContext||window.webkitAudioContext; if(C){const c=new C(),o=c.createOscillator(),g=c.createGain();o.frequency.value=880;g.gain.value=.035;o.connect(g);g.connect(c.destination);o.start();o.stop(c.currentTime+.18);}}catch(_){}
    };
    show(initialState);
    const timer=setInterval(async()=>{try{const online=await fetchOnlineCenterData(center,token);show(online?.state||{});}catch(_){show(initialState);}},5*60*1000);
    window.addEventListener('beforeunload',()=>clearInterval(timer),{once:true});
}

async function enterCenter(center, token, user, fromSuperAdmin) {
    var _a, _b;
    if (!(await ensureBastiyanRuntime()))
        return;
    sessionStorage.setItem(CENTER_TOKEN_KEY, token);
    sessionStorage.setItem('bastiyan_center_session', JSON.stringify(center));
    sessionStorage.setItem('bastiyan_center_user', JSON.stringify(user || {}));
    if (fromSuperAdmin)
        sessionStorage.setItem('bastiyan_superadmin_override', '1');
    else
        sessionStorage.removeItem('bastiyan_superadmin_override');
    localStorageOriginalSet('bastiyan_current_center_id', center.id);
    window.__BASTIYAN_PORTAL_SESSION__ = { center, token, user: user || null, fromSuperAdmin: !!fromSuperAdmin };
    const browserRuntime = recoverCenterRuntimeFromBrowser(center);
    let online;
    try {
        online = await fetchOnlineCenterData(center, token);
        if (online.needsClientSeed) {
            online = await api(`./api/bastian/centers/${encodeURIComponent(center.id)}/online-data`, { method: 'POST', body: JSON.stringify({ state: browserRuntime, mode: 'seed', baseRevision: Number(online.revision || 0) }) }, token);
        }
        else {
            const recovery = onlineRecoveryPayload(browserRuntime, online.state || {});
            if (Object.keys(recovery).length) {
                try {
                    online = await api(`./api/bastian/centers/${encodeURIComponent(center.id)}/online-data`, { method: 'POST', body: JSON.stringify({ state: recovery, mode: 'recovery', baseRevision: Number(online.revision || 0) }) }, token);
                }
                catch (recoveryError) {
                    if (recoveryError.status === 409)
                        online = await fetchOnlineCenterData(center, token);
                    else
                        console.warn('[Bastiyan] one-time online recovery skipped', recoveryError);
                }
            }
        }
    }
    catch (x) {
        if (x.status === 401) {
            clearCenterSession();
            throw x;
        }
        console.error('[Bastiyan] authoritative online database unavailable', x);
        renderOnlineDatabaseFailure(center, x);
        return;
    }
    center = online.center || center;
    stateRevision = Number(online.revision || 0);
    sessionStorage.setItem('bastiyan_center_session', JSON.stringify(center));
    window.__BASTIYAN_PORTAL_SESSION__.center = center;
    const runtime = online.state && typeof online.state === 'object' ? JSON.parse(JSON.stringify(online.state)) : recoverCenterRuntimeFromBrowser(center);
    runtime.currentCenterId = center.id;
    runtime.medicalCenters = [center];
    runtime.settings = { ...(runtime.settings || {}), clinicName: center.name || '', phone: center.phone || '', address: center.address || '', city: center.city || '', centerCode: center.code || '', centerType: center.centerType || 'clinic', licensePlanName: center.planName || 'standard', licenseEndDate: center.endDate || '', licenseStatus: center.active === false || center.archived ? 'suspended' : 'active' };
    installAppointmentDeskAlarm(center, token, user, runtime);
    localStorageOriginalSet(`bastiyan_center_isolated_${center.id}`, JSON.stringify(runtime));
    installOnlineMirror(center, token, user, online);
    window.fetch = (input, init = {}) => {
        try {
            const raw = typeof input === 'string' ? input : input.url;
            const u = new URL(raw, location.href);
            if (u.origin === location.origin && u.pathname.includes('/api/')) {
                const h = new Headers(init.headers || (typeof input !== 'string' ? input.headers : undefined) || {});
                if (!h.has('Authorization'))
                    h.set('Authorization', `Bearer ${token}`);
                if (!h.has('X-Bastiyan-Token'))
                    h.set('X-Bastiyan-Token', token);
                init = { ...init, headers: h };
            }
        }
        catch (_a) { }
        return nativeFetch(input, init);
    };
    document.body.innerHTML = `<div id="root"></div><div id="bastiyanCloudStatus" class="offline-status">${esc(onlineDataSummary(online))}</div><button id="backPortal" class="back-portal">بازگشت به درگاه</button>`;
    $('#backPortal').onclick = () => { clearCenterSession(); location.reload(); };
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = `./assets/index.css?v=${encodeURIComponent(APP_META.version)}`;
    document.head.appendChild(link);
    const root = document.getElementById('root');
    try {
        try {
            if (!globalThis.__BASTIYAN_VENDOR_READY__) {
                await new Promise((resolve, reject) => {
                    const script = document.createElement('script');
                    script.src = `./app/bastiyan-recovery-404.js?vendor=${encodeURIComponent(APP_META.version)}`;
                    script.async = false;
                    script.onload = resolve;
                    script.onerror = () => reject(new Error('Local vendor runtime failed to load.'));
                    document.head.appendChild(script);
                });
            }
            await import(`./app/bastiyan-app.bundle.js?vendor=${encodeURIComponent(APP_META.version)}`);
            if (!globalThis.__BASTIYAN_VENDOR_READY__ || !((_a = globalThis.__BASTIYAN_VENDOR__) === null || _a === void 0 ? void 0 : _a.jsxRuntime))
                throw new Error('Bastiyan local vendor runtime did not initialize.');
            await import(`./app/main457-final.js?boot=${encodeURIComponent(APP_META.version)}&b457=1&build=457&stable=4`);
        }
        catch (firstError) {
            try {
                if ('caches' in window) {
                    const keys = await caches.keys();
                    await Promise.all(keys.filter(k => k.includes('bastiyan-his')).map(k => caches.delete(k)));
                }
            }
            catch (_c) { }
            await import(`./app/bastiyan-app.bundle.js?vendor=${encodeURIComponent(APP_META.version)}&retry=${Date.now()}`);
            if (!globalThis.__BASTIYAN_VENDOR_READY__ || !((_b = globalThis.__BASTIYAN_VENDOR__) === null || _b === void 0 ? void 0 : _b.jsxRuntime))
                throw firstError;
            await import(`./app/main457-final.js?boot=${encodeURIComponent(APP_META.version)}&b457=1&build=457&stable=4&retry=${Date.now()}`).catch(() => { throw firstError; });
        }
    }
    catch (err) {
        console.error('[Bastiyan HIS boot error]', err);
        const message = String((err === null || err === void 0 ? void 0 : err.message) || err || 'خطای ناشناخته در بارگذاری ماژول');
        if (root)
            root.innerHTML = `<div style="min-height:100vh;display:grid;place-items:center;padding:24px;background:#020617;color:#e2e8f0;font-family:'B Nazanin',Tahoma,sans-serif;direction:rtl"><div style="width:min(760px,96vw);background:#0f172a;border:1px solid #334155;border-radius:22px;padding:24px;box-shadow:0 24px 80px #0008"><div style="display:flex;align-items:center;gap:12px;margin-bottom:16px"><img src="./logo.png" style="width:40px;height:40px;border-radius:12px;object-fit:cover"><h2 style="margin:0;color:#fff">خطا در بارگذاری Bastiyan HIS</h2></div><p style="line-height:2;color:#94a3b8">اتصال دیتابیس آنلاین برقرار است، اما یکی از فایل‌های رابط کاربری بارگذاری نشده است.</p><pre style="white-space:pre-wrap;word-break:break-word;background:#020617;border:1px solid #334155;border-radius:14px;padding:14px;color:#fda4af;direction:ltr;text-align:left">${esc(message)}</pre><div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:16px"><button id="bastiyanRetryBoot" class="bp-btn">پاک‌سازی کش و تلاش مجدد</button><button id="bastiyanBackBoot" class="bp-btn secondary">بازگشت به درگاه</button></div></div></div>`;
        const retry = document.getElementById('bastiyanRetryBoot');
        if (retry)
            retry.onclick = async () => {
                try {
                    if ('serviceWorker' in navigator) {
                        const regs = await navigator.serviceWorker.getRegistrations();
                        await Promise.all(regs.map(r => r.unregister()));
                    }
                    if ('caches' in window) {
                        const keys = await caches.keys();
                        await Promise.all(keys.filter(k => k.includes('bastiyan-his')).map(k => caches.delete(k)));
                    }
                }
                catch (_a) { }
                location.reload();
            };
        const back = document.getElementById('bastiyanBackBoot');
        if (back)
            back.onclick = () => { clearCenterSession(); location.reload(); };
        return;
    }
    hideCentralManagementInsideCenter(user, fromSuperAdmin);
    if (fromSuperAdmin)
        setTimeout(() => {
            const st = $('#bastiyanCloudStatus');
            if (st)
                st.textContent = `ورود Super Admin • ${onlineDataSummary(online)}`;
        }, 800);
}
function installOnlineMirror(center, token, user, initialOnline) {
    const key = `bastiyan_center_isolated_${center.id}`;
    let lastServerState = JSON.parse(JSON.stringify((initialOnline === null || initialOnline === void 0 ? void 0 : initialOnline.state) || {}));
    let lastChecksum = String((initialOnline === null || initialOnline === void 0 ? void 0 : initialOnline.checksum) || '');
    let posting = false;
    let disposed = false;
    const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
    const status = (text, off = false) => {
        const st = $('#bastiyanCloudStatus');
        if (st) {
            st.textContent = text;
            st.classList.toggle('off', !!off);
        }
    };
    const applyServer = (d) => {
        if (!(d === null || d === void 0 ? void 0 : d.state) || disposed)
            return;
        stateRevision = Number(d.revision || stateRevision);
        lastChecksum = String(d.checksum || lastChecksum || '');
        lastServerState = JSON.parse(JSON.stringify(d.state));
        const runtime = JSON.parse(JSON.stringify(d.state));
        runtime.currentCenterId = center.id;
        runtime.medicalCenters = [d.center || center];
        localStorageOriginalSet(key, JSON.stringify(runtime));
        try {
            window.dispatchEvent(new CustomEvent('bastiyan:server-state', { detail: { centerId: center.id, state: runtime, revision: stateRevision, checksum: lastChecksum, online: true } }));
        }
        catch (_a) { }
        status(onlineDataSummary(d));
    };
    const buildPatch = (base, next) => {
        const patch = {};
        const keys = new Set([...Object.keys(base || {}), ...Object.keys(next || {})]);
        keys.delete('users');
        for (const k of keys)
            if (!same(base === null || base === void 0 ? void 0 : base[k], next === null || next === void 0 ? void 0 : next[k]))
                patch[k] = next === null || next === void 0 ? void 0 : next[k];
        return patch;
    };
    const applyPatch = (current, patch) => {
        const merged = JSON.parse(JSON.stringify(current || {}));
        for (const [k, v] of Object.entries(patch || {})) {
            if (k === 'settings' && v && typeof v === 'object' && !Array.isArray(v)) {
                merged.settings = { ...(merged.settings || {}), ...v };
                continue;
            }
            if (Array.isArray(v) && Array.isArray(merged[k])) {
                const recordArray = [...v, ...merged[k]].every(x => !x || typeof x !== 'object' || Array.isArray(x) || Object.prototype.hasOwnProperty.call(x, 'id'));
                if (recordArray) {
                    const map = new Map(merged[k].filter(x => (x === null || x === void 0 ? void 0 : x.id) != null).map(x => [String(x.id), x]));
                    for (const row of v) {
                        if ((row === null || row === void 0 ? void 0 : row.id) != null)
                            map.set(String(row.id), row);
                    }
                    merged[k] = Array.from(map.values());
                    continue;
                }
            }
            merged[k] = v;
        }
        return merged;
    };
    async function pullServer(force = false) {
        if (disposed || posting || syncTimer)
            return;
        if (!force && document.visibilityState === 'hidden')
            return;
        try {
            const d = await fetchOnlineCenterData(center, token);
            const rev = Number(d.revision || 0), checksum = String(d.checksum || '');
            if (rev > stateRevision || (checksum && checksum !== lastChecksum))
                applyServer(d);
            else
                status(onlineDataSummary(d));
        }
        catch (e) {
            if (e.status === 401) {
                disposed = true;
                clearCenterSession();
                return;
            }
            status('دیتابیس آنلاین مرکز موقتاً در دسترس نیست • ذخیره جدید متوقف شد', true);
            console.error('[Bastiyan] online pull failed', e);
        }
    }
    let pendingSerialized = null;
    let retryTimer = null;
    let flushPromise = null;
    async function flushPendingSave() {
        if (disposed || flushPromise || !pendingSerialized) return;
        const serialized = pendingSerialized;
        pendingSerialized = null;
        flushPromise = (async () => {
            let state;
            try { state = JSON.parse(serialized); } catch (_) { return; }
            const patch = buildPatch(lastServerState || {}, state);
            if (Object.keys(patch).length === 0) return;
            posting = true;
            try {
                let saved = await api(`./api/bastian/centers/${encodeURIComponent(center.id)}/online-data`, { method: 'POST', body: JSON.stringify({ state: patch, mode: 'patch', baseRevision: stateRevision }) }, token);
                if (saved.conflict && saved.current) throw Object.assign(new Error('conflict'), { status: 409, data: { conflict: true, current: saved.current } });
                applyServer(saved);
                status(`ثبت با موفقیت انجام شد • نسخه ${Number(saved.revision || 0).toLocaleString('fa-IR')}`);
            } catch (e) {
                if (e.status === 409 && e.data?.current?.state) {
                    try {
                        const fresh = e.data.current;
                        const merged = applyPatch(fresh.state, patch);
                        const retryPatch = buildPatch(fresh.state || {}, merged);
                        const retry = await api(`./api/bastian/centers/${encodeURIComponent(center.id)}/online-data`, { method: 'POST', body: JSON.stringify({ state: retryPatch, mode: 'patch', baseRevision: Number(fresh.revision || 0) }) }, token);
                        applyServer(retry);
                        status(`ثبت همزمان ادغام و ذخیره شد • نسخه ${Number(retry.revision || 0).toLocaleString('fa-IR')}`);
                    } catch (retryErr) {
                        pendingSerialized = serialized;
                        status('ذخیره موقتاً ناموفق بود؛ اطلاعات روی صفحه حفظ شد و خودکار دوباره تلاش می‌شود', true);
                        console.error('[Bastiyan] online retry failed', retryErr);
                    }
                } else {
                    pendingSerialized = serialized;
                    status('ذخیره آنلاین موقتاً ناموفق بود؛ اطلاعات روی صفحه حفظ شد و خودکار دوباره تلاش می‌شود', true);
                    console.error('[Bastiyan] online save failed', e);
                }
            } finally {
                posting = false;
                flushPromise = null;
                if (pendingSerialized) {
                    clearTimeout(syncTimer);
                    syncTimer = setTimeout(() => { syncTimer = null; flushPendingSave(); }, 650);
                }
                setTimeout(() => pullServer(true), 350);
            }
        })();
        return flushPromise;
    }
    localStorage.setItem = function (k, v) {
        try { localStorageOriginalSet(k, v); } catch (e) { console.warn('Local cache unavailable; online save continues.', e); }
        if (k !== key) return;
        pendingSerialized = String(v);
        clearTimeout(syncTimer);
        status('تغییرات در حال ثبت امن در MySQL مرکز...');
        syncTimer = setTimeout(() => { syncTimer = null; flushPendingSave(); }, 500);
    };
    clearInterval(pullTimer);
    pullTimer = setInterval(() => pullServer(false), 3000);
    window.addEventListener('focus', () => pullServer(true));
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible')
            pullServer(true);
    });
    setTimeout(() => pullServer(true), 700);
}
function hideCentralManagementInsideCenter(user, fromSuperAdmin) {
    const hide = () => {
        document.querySelectorAll('button,a,div,span').forEach(el => {
            var _a, _b, _c;
            const t = (el.textContent || '').trim();
            if (t === 'مدیریت مراکز تحت پوشش و شعب' || t === 'مدیریت مراکز و شعب' || t === 'مدیریت پرسنل و دسترسی‌ها')
                (_a = el.closest('button,a')) === null || _a === void 0 ? void 0 : _a.style.setProperty('display', 'none', 'important');
            if (t === 'تغییر رمز عبور')
                (_b = el.closest('button')) === null || _b === void 0 ? void 0 : _b.style.setProperty('display', 'none', 'important');
            if (!fromSuperAdmin && t.includes('بازگشت به مدیر کل سیستم'))
                (_c = el.closest('button')) === null || _c === void 0 ? void 0 : _c.style.setProperty('display', 'none', 'important');
        });
        if ((user === null || user === void 0 ? void 0 : user.role) !== 'admin') {
            document.querySelectorAll('[title="تعویض سریع کاربر و نقش"]').forEach(el => el.style.setProperty('display', 'none', 'important'));
        }
    };
    const o = new MutationObserver(hide);
    o.observe(document.body, { subtree: true, childList: true });
    setTimeout(hide, 500);
    document.addEventListener('click', e => {
        var _a, _b;
        const btn = (_b = (_a = e.target).closest) === null || _b === void 0 ? void 0 : _b.call(_a, 'button');
        if (!btn)
            return;
        const title = btn.getAttribute('title') || '';
        const text = (btn.textContent || '').trim();
        if (title === 'خروج از سیستم' || text.includes('خروج کامل از حساب کاربری')) {
            e.preventDefault();
            e.stopImmediatePropagation();
            clearCenterSession();
            location.reload();
        }
    }, true);
}
function clearCenterSession() {
    [CENTER_TOKEN_KEY, 'bastiyan_center_session', 'bastiyan_center_user', 'bastiyan_superadmin_override'].forEach(k => sessionStorage.removeItem(k));
}
async function boot() {
    await loadAppMeta();
    // 4.1.0: force prior UI caches out before the safety/recovery modules load.
    // Center data keys are never cleared here; only disposable web-asset caches.
    try {
        const buildKey = 'bastiyan_web_asset_build';
        const currentBuild = String(APP_META.buildNumber || 453);
        const previousBuild = localStorageOriginalGet(buildKey) || '';
        if (previousBuild !== currentBuild) {
            if ('caches' in window) {
                const keys = await caches.keys();
                await Promise.all(keys.filter(k => k.includes('bastiyan-his')).map(k => caches.delete(k)));
            }
            localStorageOriginalSet(buildKey, currentBuild);
        }
    }
    catch (cacheError) {
        console.warn('[Bastiyan] cache refresh skipped', cacheError);
    }
    // Service Worker registration is intentionally disabled in this stable web build.
    try {
        const r = await nativeFetch('./api/local/status', { cache: 'no-store' });
        if (r.ok) {
            const d = await r.json();
            if (d.localMode) {
                LOCAL_MODE = true;
                renderLocalLanding();
                return;
            }
        }
    }
    catch (_b) { }
    const centerToken = sessionStorage.getItem(CENTER_TOKEN_KEY) || '';
    if (centerToken) {
        try {
            const center = JSON.parse(sessionStorage.getItem('bastiyan_center_session') || 'null');
            const user = JSON.parse(sessionStorage.getItem('bastiyan_center_user') || 'null');
            if (center === null || center === void 0 ? void 0 : center.id) {
                await enterCenter(center, centerToken, user, sessionStorage.getItem('bastiyan_superadmin_override') === '1');
                return;
            }
        }
        catch (e) {
            console.warn('Center session resume failed.', e);
        }
        clearCenterSession();
    }
    if (adminToken) {
        renderAdmin().catch(() => renderLanding());
    }
    else
        renderLanding();
}
boot();
