const firebaseMonitorConfig = {
    apiKey: "AIzaSyAlvmm6AqqqImUguxIelDuWKF7kSVIdpVg",
    authDomain: "akar-1a737.firebaseapp.com",
    projectId: "akar-1a737",
    storageBucket: "akar-1a737.firebasestorage.app",
    messagingSenderId: "789004210130",
    appId: "1:789004210130:web:7dac1c485f7507f633420b",
    measurementId: "G-4C7REV0B78"
};

// Initialize Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseMonitorConfig);
}
const db = firebase.firestore();
const auth = firebase.auth();

// Elements
const loader = document.getElementById('loader');
const dashboardContent = document.getElementById('dashboardContent');
const connectionStatus = document.getElementById('connectionStatus');
const loginOverlay = document.getElementById('loginOverlay');
const loginEmail = document.getElementById('loginEmail');
const loginPass = document.getElementById('loginPassword');
const loginBtn = document.getElementById('loginBtn');
const loginError = document.getElementById('loginError');
const logoutBtn = document.getElementById('logoutBtn');
const linkingView = document.getElementById('linkingView');
const linkBtn = document.getElementById('linkBtn');
const monitorKeyCode = document.getElementById('monitorKeyCode');
const linkError = document.getElementById('linkError');
const cafeListView = document.getElementById('cafeListView');
const cafesListContainer = document.getElementById('cafesListContainer');
const addNewCafeBtn = document.getElementById('addNewCafeBtn');
const switchCafeBtn = document.getElementById('switchCafeBtn');
const mainNav = document.getElementById('mainNav');

let currentUnsubscribe = null;
let lastSnapData = null; // Store for tab switching

// --- TAB SWITCHING ---
window.switchTab = function (tabName) {
    document.querySelectorAll('.nav-tab').forEach(tab => {
        tab.classList.toggle('active', tab.getAttribute('onclick').includes(`'${tabName}'`));
    });
    document.querySelectorAll('.dashboard-section').forEach(sec => {
        sec.classList.remove('active');
    });
    const target = document.getElementById(`section-${tabName}`);
    if (target) target.classList.add('active');

    if (lastSnapData) renderCurrentTab(tabName);
};

// --- Notifications ---
window.showToast = function (message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    let icon = 'fa-info-circle';
    if (type === 'success') icon = 'fa-check-circle';
    if (type === 'error') icon = 'fa-exclamation-circle';

    toast.innerHTML = `
        <i class="fa-solid ${icon}"></i>
        <div style="flex:1;">${message}</div>
    `;

    container.appendChild(toast);

    // Auto remove
    setTimeout(() => {
        toast.classList.add('toast-out');
        setTimeout(() => toast.remove(), 300);
    }, 4000);
};

// --- Custom Confirmation Modal ---
window.openConfirmModal = function (message, onConfirm) {
    const modal = document.getElementById('confirmModal');
    const title = document.getElementById('confirmTitle');
    const yesBtn = document.getElementById('confirmYesBtn');

    if (!modal || !title || !yesBtn) return;

    title.innerText = message;
    modal.style.display = 'flex';

    // Set up confirm action
    yesBtn.onclick = () => {
        onConfirm();
        closeConfirmModal();
    };
};

window.closeConfirmModal = function () {
    const modal = document.getElementById('confirmModal');
    if (modal) modal.style.display = 'none';
};

function renderCurrentTab(tabName) {
    if (!lastSnapData) return;
    switch (tabName) {
        case 'overview':
            renderDashboard(lastSnapData);
            break;
        case 'devices':
            renderDevicesFull(lastSnapData);
            break;
        case 'reports':
            renderReports(lastSnapData);
            break;
        case 'expenses':
            renderExpensesFull(lastSnapData);
            break;
        case 'users':
            renderUsers(lastSnapData);
            break;
        case 'shifts':
            renderShifts(lastSnapData);
            break;
        case 'logs':
            renderLogs(lastSnapData);
            break;
        case 'inventory':
            renderInventory(lastSnapData);
            break;
        case 'settings':
            renderSettings(lastSnapData);
            break;
    }
}

// --- Auth Handling ---
auth.onAuthStateChanged(user => {
    if (user) {
        if (loginOverlay) loginOverlay.style.display = 'none';
        if (logoutBtn) logoutBtn.style.display = 'block';
        checkUserLink(user.uid);
    } else {
        if (loginOverlay) loginOverlay.style.display = 'flex';
        if (dashboardContent) dashboardContent.style.display = 'none';
        if (mainNav) mainNav.style.display = 'none';
        if (linkingView) linkingView.style.display = 'none';
        if (cafeListView) cafeListView.style.display = 'none';
        if (logoutBtn) logoutBtn.style.display = 'none';
        if (switchCafeBtn) switchCafeBtn.style.display = 'none';
        if (connectionStatus) connectionStatus.style.display = 'none';
        if (loader) loader.style.display = 'none';
        if (currentUnsubscribe) currentUnsubscribe();
    }
});

// [NEW] Strict Signup & Mobile Logic
let isSignupMode = false;
const toggleSignupBtn = document.getElementById('toggleSignupBtn');
const signupCodeInput = document.getElementById('signupMonitorCode');

if (toggleSignupBtn) {
    toggleSignupBtn.onclick = (e) => {
        e.preventDefault();
        isSignupMode = !isSignupMode;
        if (isSignupMode) {
            document.querySelector('#loginOverlay h3').innerText = 'إنشاء حساب جديد';
            loginBtn.innerText = 'تسجيل وتفعيل';
            toggleSignupBtn.innerText = 'لديك حساب بالفعل؟ تسجيل الدخول';
            if (signupCodeInput) signupCodeInput.style.display = 'block';
        } else {
            document.querySelector('#loginOverlay h3').innerText = 'دخول لوحة التحكم';
            loginBtn.innerText = 'دخول النظام';
            toggleSignupBtn.innerText = 'ليس لديك حساب؟ إنشاء حساب جديد';
            if (signupCodeInput) signupCodeInput.style.display = 'none';
        }
    };
}

if (loginBtn) {
    loginBtn.addEventListener('click', async () => {
        let inputVal = loginEmail.value.trim();
        const pass = loginPass.value.trim();
        const monitorCode = signupCodeInput ? signupCodeInput.value.trim().toUpperCase() : '';

        if (!inputVal || !pass) return;

        // Detect Email vs Phone
        const isPhone = /^[0-9]+$/.test(inputVal);
        let emailToUse = inputVal;
        let mobileToSave = null;

        if (isPhone) {
            emailToUse = `${inputVal}@as3g.local`;
            mobileToSave = inputVal;
        }

        if (isSignupMode) {
            if (!monitorCode) {
                if (loginError) { loginError.innerText = "يجب إدخال كود المتابعة لإنشاء الحساب."; loginError.style.display = 'block'; }
                return;
            }

            // Password Length Check
            if (pass.length < 8) {
                if (loginError) { loginError.innerText = "كلمة المرور يجب أن تكون 8 خانات على الأقل."; loginError.style.display = 'block'; }
                return;
            }
        }

        loginBtn.disabled = true;
        loginBtn.innerText = 'جاري التحقق...';
        if (loginError) loginError.style.display = 'none';

        try {
            if (isSignupMode) {
                // 1. VALIDATE CODE FIRST
                const codeDoc = await db.collection("monitor_access").doc(monitorCode).get();

                if (!codeDoc.exists) {
                    throw { code: 'custom/invalid-code', message: 'كود المتابعة غير صحيح. تأكد من البرنامج.' };
                }
                const codeData = codeDoc.data();
                if (codeData.linkedTo) {
                    throw { code: 'custom/code-used', message: 'هذا الكود مستخدم بالفعل بحساب آخر.' };
                }

                // 2. Create User
                const userCred = await auth.createUserWithEmailAndPassword(emailToUse, pass);
                const user = userCred.user;

                // 3. Auto-Link Immediately
                await db.collection("user_cafe_links").doc(`${user.uid}_${monitorCode}`).set({
                    uid: user.uid,
                    email: isPhone ? null : inputVal, // Store real email if provided, else null
                    mobile: mobileToSave, // Store mobile if provided
                    displayEmail: inputVal, // Store whatever they typed for display
                    licenseCode: codeData.licenseCode,
                    cafeName: codeData.cafeName || 'Unnamed Cafe',
                    monitorKey: monitorCode,
                    linkedAt: firebase.firestore.FieldValue.serverTimestamp()
                });

                await db.collection("monitor_access").doc(monitorCode).update({ linkedTo: user.uid });

                // Success
                showToast('تم إنشاء الحساب وربط المقهى بنجاح!', 'success');

            } else {
                await auth.signInWithEmailAndPassword(emailToUse, pass);
            }
        } catch (err) {
            console.error("Login/Signup Error:", err);
            let msg = "فشل العملية. تأكد من البيانات.";

            if (err.code === 'custom/invalid-code') msg = err.message;
            if (err.code === 'custom/code-used') msg = err.message;
            if (err.code === 'auth/email-already-in-use') msg = "هذا الرقم/البريد مسجل بالفعل.";
            if (err.code === 'auth/weak-password') msg = "كلمة المرور ضعيفة (يجب أن تكون 6 أحرف على الأقل).";
            if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') msg = "خطأ في الرقم/البريد أو كلمة المرور - (تأكد من اختيار +20 إذا كان رقم دولي).";
            if (err.code === 'auth/invalid-email') msg = "تنسيق البريد أو الرقم غير صحيح.";

            if (loginError) { loginError.innerText = msg; loginError.style.display = 'block'; }
        } finally { loginBtn.disabled = false; loginBtn.innerText = isSignupMode ? 'تسجيل وتفعيل' : 'دخول النظام'; }
    });
}

if (logoutBtn) { logoutBtn.onclick = () => auth.signOut(); }

async function checkUserLink(uid) {
    if (loader) loader.style.display = 'flex';
    try {
        const querySnapshot = await db.collection("user_cafe_links").where("uid", "==", uid).get();
        if (loader) loader.style.display = 'none';
        if (querySnapshot.empty) {
            if (linkingView) linkingView.style.display = 'flex';
        } else if (querySnapshot.size === 1) {
            startMonitoring(querySnapshot.docs[0].data().monitorKey);
        } else {
            renderCafesList(querySnapshot.docs);
        }
    } catch (err) {
        console.error("Error checking user link:", err);
        if (loader) loader.style.display = 'none';
    }
}

function renderCafesList(docs) {
    if (!cafesListContainer) return;
    if (cafeListView) cafeListView.style.display = 'flex';
    if (linkingView) linkingView.style.display = 'none';
    cafesListContainer.innerHTML = docs.map(doc => {
        const data = doc.data();
        return `<div class="glass-card" style="margin-bottom: 0.8rem; cursor: pointer; padding: 1.2rem; display:flex; align-items:center; gap:1rem;" onclick="startMonitoring('${data.monitorKey}')">
                <i class="fa-solid fa-store" style="color:var(--accent); font-size:1.5rem;"></i>
                <div style="flex:1; text-align:right;">
                    <div style="font-weight:bold;">${data.cafeName || 'مقهى غير مسمى'}</div>
                    <div style="font-size:0.8rem; color:var(--text-secondary);">كود: ${data.monitorKey}</div>
                </div>
                <i class="fa-solid fa-chevron-left"></i>
            </div>`;
    }).join('');
}

if (addNewCafeBtn) { addNewCafeBtn.onclick = () => { cafeListView.style.display = 'none'; linkingView.style.display = 'flex'; }; }
if (switchCafeBtn) { switchCafeBtn.onclick = () => checkUserLink(auth.currentUser.uid); }

if (linkBtn) {
    linkBtn.addEventListener('click', async () => {
        const code = monitorKeyCode.value.trim().toUpperCase();
        if (!code) return;
        linkBtn.disabled = true;
        if (linkError) linkError.style.display = 'none';
        try {
            const accessDoc = await db.collection("monitor_access").doc(code).get();
            if (accessDoc.exists) {
                const accessData = accessDoc.data();
                const user = auth.currentUser;
                if (accessData.linkedTo && accessData.linkedTo !== user.uid) {
                    // Check if user is in allowedUsers whitelist
                    const allowed = accessData.allowedUsers || [];
                    const userEmail = user.email;
                    const userMobile = user.mobile || (user.email && user.email.includes('@as3g.local') ? user.email.split('@')[0] : null);

                    const isWhitelisted = allowed.includes(userEmail) || (userMobile && allowed.includes(userMobile));

                    if (!isWhitelisted) {
                        linkError.innerText = "هذا الكود مرتبط بحساب آخر، وليس لديك تصريح دخول.";
                        linkError.style.display = 'block';
                        return;
                    }
                }
                const licenseCode = accessData.licenseCode;
                await db.collection("monitor_access").doc(code).update({ linkedTo: user.uid, linkedAt: firebase.firestore.FieldValue.serverTimestamp() });
                await db.collection("user_cafe_links").doc(`${user.uid}_${code}`).set({
                    uid: user.uid, email: user.email, licenseCode: licenseCode,
                    cafeName: accessData.cafeName || 'Unnamed Cafe', monitorKey: code, linkedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
                startMonitoring(code);
            } else { linkError.innerText = "الكود غير صحيح."; linkError.style.display = 'block'; }
        } catch (err) { linkError.innerText = "حدث خطأ أثناء الربط."; linkError.style.display = 'block'; }
        finally { linkBtn.disabled = false; }
    });
}

function startMonitoring(monitorKey) {
    if (currentUnsubscribe) currentUnsubscribe();
    if (cafeListView) cafeListView.style.display = 'none';
    if (linkingView) linkingView.style.display = 'none';
    if (loader) loader.style.display = 'flex';
    localStorage.setItem('last_monitored_code', monitorKey);

    currentUnsubscribe = db.collection("cafe_snapshots").doc(monitorKey)
        .onSnapshot((doc) => {
            if (loader) loader.style.display = 'none';
            if (doc.exists) {
                lastSnapData = doc.data();
                const activeTabEl = document.querySelector('.nav-tab.active');
                if (activeTabEl) {
                    const activeTab = activeTabEl.getAttribute('onclick').match(/'([^']+)'/)[1];
                    renderCurrentTab(activeTab);
                }
                if (dashboardContent) dashboardContent.style.display = 'block';
                if (mainNav) mainNav.style.display = 'flex';
                if (connectionStatus) connectionStatus.style.display = 'flex';
                if (switchCafeBtn) switchCafeBtn.style.display = 'flex';
            }
        }, (err) => { if (loader) loader.style.display = 'none'; console.error("Monitor Error:", err); });
}

// --- RENDER FUNCTIONS ---

function renderDashboard(data) {
    document.getElementById('monitorCafeName').innerText = data.cafeName || 'Unnamed Cafe';
    document.getElementById('monitorLicenseCode').innerText = `ID: ${data.licenseCode} | Key: ${data.monitorKey}`;
    const stats = data.stats || {};
    document.getElementById('statActiveDevices').innerText = `${stats.totalDevices || 0} / ${stats.activeSessions || 0}`;
    document.getElementById('statTodayRevenue').innerText = `${stats.todayRevenue || 0} ج.م`;
    const netProfit = (stats.todayRevenue || 0) - (stats.todayExpenses || 0);
    const netEl = document.getElementById('statNetProfit');
    netEl.innerText = `${netProfit} ج.م`;
    netEl.style.color = netProfit >= 0 ? 'var(--success)' : 'var(--danger)';
    if (data.lastSync) document.getElementById('overviewSyncTime').innerText = `Synced at: ${data.lastSync.toDate().toLocaleTimeString()}`;

    // Sidebar: Expenses
    const expList = document.getElementById('todayExpensesList');
    const today = new Date().toISOString().slice(0, 10);
    const todayExps = (data.expenses || []).filter(e => e.date === today);
    if (todayExps.length === 0) expList.innerHTML = '<p style="font-size:0.8rem; color:var(--text-secondary);">لا توجد مصروفات</p>';
    else expList.innerHTML = todayExps.map(e => `<div style="display:flex; justify-content:space-between; font-size:0.9rem; border-bottom:1px solid rgba(255,255,255,0.02); padding:5px 0;"><span>${e.title}</span><span style="color:var(--danger); font-weight:800;">${e.amount} ج.م</span></div>`).join('');
    const shiftSum = document.getElementById('shiftsSummary');
    const latestShift = (data.shifts || []).sort((a, b) => b.id - a.id)[0];
    if (!latestShift) shiftSum.innerHTML = '<p style="font-size:0.8rem; color:var(--text-secondary);">لا ورديات</p>';
    else shiftSum.innerHTML = `<div style="font-size:0.9rem;"><div>الموظف: <b>${latestShift.userName}</b></div><div>التحصيل: <span style="color:var(--success); font-weight:800;">${latestShift.transactions ? latestShift.transactions.sessionsRevenue : 0} ج.م</span></div></div>`;

    renderSubscriptionInfo(data);
}

function renderDevicesFull(data) {
    const list = document.getElementById('devicesFullList');
    list.innerHTML = (data.devices || []).map(device => {
        const isBusy = device.status === 'busy';
        const typeIcon = device.type === 'ps5' ? 'fa-playstation' : (device.type === 'pc' ? 'fa-desktop' : 'fa-gamepad');
        return `<div class="glass-card" style="padding:1.5rem;">
                <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:1rem;">
                    <div class="device-icon ${isBusy ? 'busy' : ''}"><i class="fa-solid ${typeIcon}"></i></div>
                    <div style="text-align:left;">
                        <button onclick="editDeviceModal(${device.id}, '${device.name}', '${device.type}', ${device.hourlyRate})" style="background:none; border:none; color:var(--text-secondary); cursor:pointer; margin-left:10px;"><i class="fa-solid fa-pen"></i></button>
                        <button onclick="deleteDeviceRemote(${device.id})" style="background:none; border:none; color:var(--danger); cursor:pointer;"><i class="fa-solid fa-trash"></i></button>
                    </div>
                </div>
                <div style="margin-bottom:1rem;"><div class="device-name">${device.name}</div><div class="session-amount" style="font-size:0.9rem; color:var(--text-secondary);">${device.hourlyRate} ج.م / ساعة</div></div>
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <span class="status-pill" style="background:${isBusy ? 'rgba(139,92,246,0.1)' : 'rgba(16,185,129,0.1)'}; color:${isBusy ? 'var(--accent)' : 'var(--success)'}; border:none;">${isBusy ? 'في جلسة' : 'متاح حالياً'}</span>
                </div>
            </div>`;
    }).join('');
}

function renderExpensesFull(data) {
    const container = document.getElementById('expensesTableBody');
    if (!container) return;
    const expenses = (data.expenses || []).sort((a, b) => (b.id || 0) - (a.id || 0));
    if (expenses.length === 0) {
        container.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:2rem; color:var(--text-secondary);">لا توجد مصروفات مسجلة</td></tr>';
        return;
    }
    container.innerHTML = expenses.map(e => `<tr><td class="en-font">${e.date}</td><td style="font-weight:700;">${e.title}</td><td class="en-font" style="color:var(--danger); font-weight:800;">${e.amount} ج.م</td><td>${e.details || ''}</td></tr>`).join('');
}

function renderReports(data) {
    const container = document.getElementById('reportsTableBody');
    if (!container) return;
    const sessions = (data.sessions || []).sort((a, b) => (b.id || 0) - (a.id || 0));
    if (sessions.length === 0) {
        container.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:2rem; color:var(--text-secondary);">لا توجد جلسات في السجل</td></tr>';
        return;
    }
    container.innerHTML = sessions.map(s => {
        const device = (data.devices || []).find(d => d.id === s.deviceId) || { name: 'جهاز محذوف' };
        const startTime = s.startTime ? new Date(s.startTime).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) : '--';
        const endTime = s.endTime ? new Date(s.endTime).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) : (s.status === 'active' ? 'نشط' : '--');
        return `<tr><td style="font-weight:700;">${device.name}</td><td class="en-font">${startTime}</td><td class="en-font">${endTime}</td><td>${s.type === 'open' ? 'مفتوح' : 'وقت محدد'}</td><td class="en-font" style="color:var(--success); font-weight:800;">${s.totalCost || 0} ج.م</td><td>${s.userName || 'النظام'}</td></tr>`;
    }).join('');
}

function renderShifts(data) {
    const container = document.getElementById('shiftsTableBody');
    if (!container) return;
    const shifts = (data.shifts || []).sort((a, b) => (b.id || 0) - (a.id || 0));
    if (shifts.length === 0) {
        container.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:2rem; color:var(--text-secondary);">لا توجد ورديات مسجلة</td></tr>';
        return;
    }
    container.innerHTML = shifts.map(sh => {
        const start = new Date(sh.startTime).toLocaleString('ar-EG', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' });
        const end = sh.endTime ? new Date(sh.endTime).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) : 'نشطة';
        const rev = sh.transactions ? sh.transactions.sessionsRevenue : 0;
        const exp = sh.transactions ? sh.transactions.expenses : 0;
        return `<tr><td style="font-weight:700;">${sh.userName}</td><td class="en-font">${start}</td><td class="en-font">${end}</td><td class="en-font">${rev}</td><td class="en-font" style="color:var(--danger);">${exp}</td><td class="en-font" style="background:rgba(16,185,129,0.1); font-weight:800; border-radius:8px;">${rev - exp} ج.م</td></tr>`;
    }).join('');
}

function renderLogs(data) {
    const container = document.getElementById('logsTableBody');
    if (!container) return;
    const logs = (data.logs || []).sort((a, b) => (b.timestamp || b.id || 0) - (a.timestamp || a.id || 0)).slice(0, 100);
    if (logs.length === 0) {
        container.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:2rem; color:var(--text-secondary);">لا توجد عمليات مسجلة</td></tr>';
        return;
    }
    container.innerHTML = logs.map(l => {
        const time = new Date(l.timestamp || l.id).toLocaleString('ar-EG', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        return `<tr>
            <td class="en-font">${time}</td>
            <td style="font-weight:700; color:var(--accent);">${l.type || 'عملية'}</td>
            <td>${l.details || ''}</td>
            <td>${l.user || 'النظام'}</td>
        </tr>`;
    }).join('');
}

function renderUsers(data) {
    const container = document.getElementById('usersTableBody');
    if (!container) return;
    const users = data.users || [];
    if (users.length === 0) {
        container.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:2rem; color:var(--text-secondary);">لا يوجد مستخدمون حالياً</td></tr>';
        return;
    }
    container.innerHTML = users.map(u => `<tr>
        <td style="font-weight:700;">${u.name || u.username}</td>
        <td class="en-font">${u.username}</td>
        <td><span class="status-pill" style="background:rgba(255,255,255,0.05); color:var(--text-primary); border:none;">${u.role === 'admin' ? 'مدير' : 'كاشير'}</span></td>
        <td><button onclick="deleteUserRemote(${u.id})" style="background:none; border:none; color:var(--danger); cursor:pointer;"><i class="fa-solid fa-user-minus"></i> حذف</button></td>
    </tr>`).join('');
}

function renderSubscriptionInfo(data) {
    const container = document.getElementById('subscriptionInfo');
    if (!container) return;
    const ad = data.activationData || {};
    const whatsappLink = "https://wa.me/201200140134?text=" + encodeURIComponent(`مرحباً AS3G، أود تجديد اشتراكي لمقهى: ${data.cafeName || 'غير مسمى'}\nكود المتابعة: ${data.monitorKey || '---'}`);

    if (!ad.expiry) {
        container.innerHTML = `
            <div style="color:var(--success); font-weight:bold; margin-bottom:1rem;"><i class="fa-solid fa-infinity"></i> اشتراك دائم (مدى الحياة)</div>
            <a href="${whatsappLink}" target="_blank" class="action-btn" style="width:100%; text-decoration:none; background:rgba(37,211,102,0.15); color:#25D366; border:1px solid rgba(37,211,102,0.3); justify-content:center;">
                <i class="fa-brands fa-whatsapp"></i> تواصل للدعم
            </a>`;
        return;
    }
    const expiryMs = (ad.expiry && ad.expiry.seconds) ? ad.expiry.seconds * 1000 : ad.expiry;
    const now = Date.now();
    const diff = expiryMs - now;
    const dateStr = new Date(expiryMs).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' });

    if (diff > 0) {
        const days = Math.floor(diff / (24 * 3600 * 1000));
        let statusColor = 'var(--success)';
        let statusBg = 'rgba(16,185,129,0.1)';
        if (days < 7) { statusColor = 'var(--warning)'; statusBg = 'rgba(245,158,11,0.1)'; }

        container.innerHTML = `
            <div style="font-size:0.9rem; margin-bottom:1rem;">
                <div style="color:var(--text-secondary); margin-bottom:8px;">ينتهي في: <b class="en-font" style="color:var(--text-primary);">${dateStr}</b></div>
                <div class="status-pill" style="background:${statusBg}; color:${statusColor}; border:none; font-size:0.85rem; padding:6px 12px; font-weight:700;">
                    <i class="fa-solid fa-clock"></i> متبقي ${days} يوم
                </div>
            </div>
            <a href="${whatsappLink}" target="_blank" class="action-btn" style="width:100%; text-decoration:none; background:rgba(37,211,102,0.1); color:#25D366; border:1px solid rgba(37,211,102,0.2); justify-content:center;">
                <i class="fa-brands fa-whatsapp"></i> تجديد الاشتراك
            </a>`;
    } else {
        container.innerHTML = `
            <div style="color:var(--danger); font-weight:bold; margin-bottom:1rem;"><i class="fa-solid fa-circle-exclamation"></i> الاشتراك منتهي! (${dateStr})</div>
            <a href="${whatsappLink}" target="_blank" class="action-btn" style="width:100%; text-decoration:none; background:var(--danger); color:white; border:none; justify-content:center;">
                <i class="fa-brands fa-whatsapp"></i> تجديد الآن
            </a>`;
    }
}

// --- REMOTE ACTIONS ---
async function sendRemoteCommand(type, payload) {
    const user = auth.currentUser; if (!user) return;
    const mKey = localStorage.getItem('last_monitored_code'); if (!mKey) return;
    if (loader) loader.style.display = 'flex';
    const sanitized = {};
    if (payload) { Object.keys(payload).forEach(k => { if (payload[k] !== undefined && payload[k] !== null) sanitized[k] = payload[k]; }); }
    try {
        const docRef = await db.collection("commands").add({
            monitorKey: mKey, senderUid: user.uid, type, payload: sanitized, status: 'pending', timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });

        console.log(`Remote Command Sent: ${type} (ID: ${docRef.id})`);

        // Listen for execution
        const unsub = docRef.onSnapshot(doc => {
            if (doc.exists && doc.data().status === 'executed') {
                unsub();
                if (loader) loader.style.display = 'none';
                console.log(`Command ${type} executed locally.`);
                // We don't alert here as individual actions often have their own alerts or UI updates
            }
        });

        // Timeout fallback for loader
        setTimeout(() => {
            unsub();
            if (loader) loader.style.display = 'none';
        }, 8000);

    } catch (err) { alert("خطأ في الاتصال بالسحاب."); if (loader) loader.style.display = 'none'; }
}

window.remoteStopSession = (sessionId, deviceId) => { if (confirm('إنهاء الجلسة؟')) sendRemoteCommand('stop_session', { sessionId, deviceId }); };
window.remoteStartSession = (deviceId, deviceName) => {
    const h = prompt(`فتح ${deviceName}\nعدد الساعات (اتركه خالياً للمفتوح):`, "");
    if (h === null) return;
    sendRemoteCommand('start_session', { deviceId, type: h ? 'limit' : 'open', limitHours: h ? parseFloat(h) : 0 });
};

window.openDeviceModal = () => {
    document.getElementById('modalTitle').innerHTML = '<i class="fa-solid fa-plus-circle"></i> إضافة جهاز جديد';
    document.getElementById('editDeviceId').value = ''; document.getElementById('deviceName').value = ''; document.getElementById('deviceRate').value = '';
    document.getElementById('deviceModal').style.display = 'flex';
};
window.editDeviceModal = (id, n, t, r) => {
    document.getElementById('modalTitle').innerHTML = '<i class="fa-solid fa-pen"></i> تعديل بيانات الجهاز';
    document.getElementById('editDeviceId').value = id; document.getElementById('deviceName').value = n; document.getElementById('deviceType').value = t; document.getElementById('deviceRate').value = r;
    document.getElementById('deviceModal').style.display = 'flex';
};
window.closeDeviceModal = () => { document.getElementById('deviceModal').style.display = 'none'; };
window.saveDeviceRemote = () => {
    const id = document.getElementById('editDeviceId').value;
    const n = document.getElementById('deviceName').value.trim();
    const t = document.getElementById('deviceType').value;
    const r = document.getElementById('deviceRate').value;
    if (!n || !r) return alert('أدخل كل البيانات');
    const cmd = id ? 'update_device' : 'add_device';
    const payload = id ? { id: parseInt(id), name: n, type: t, hourlyRate: parseFloat(r) } : { name: n, type: t, hourlyRate: parseFloat(r) };
    sendRemoteCommand(cmd, payload);
    closeDeviceModal();
    alert('تم إرسال طلب تحديث الأجهزة للمحل... سيظهر التعديل فور تنفيذه.');
};
window.deleteDeviceRemote = (id) => {
    openConfirmModal('حذف الجهاز نهائياً؟', () => {
        sendRemoteCommand('delete_device', { deviceId: id });
        showToast('تم إرسال طلب الحذف... سيختفي الجهاز فور المزامنة.', 'info');
    });
};
window.filterReports = () => {
    const term = document.getElementById('reportSearch').value.toLowerCase();
    document.querySelectorAll('#reportsTableBody tr').forEach(row => {
        if (row.cells.length > 1) row.style.display = row.innerText.toLowerCase().includes(term) ? '' : 'none';
    });
};

window.openUserModal = () => {
    document.getElementById('newUsername').value = '';
    document.getElementById('newUserPass').value = '';
    document.getElementById('userRole').value = 'cashier';
    document.querySelectorAll('.perm-check').forEach(c => {
        // Reset to defaults: devices, sessions, shifts are usually checked for cashiers
        c.checked = ['devices.html', 'sessions.html', 'shifts.html'].includes(c.value);
    });
    togglePermissionsUI();
    document.getElementById('userModal').style.display = 'flex';
};
window.closeUserModal = () => { document.getElementById('userModal').style.display = 'none'; };
window.togglePermissionsUI = () => {
    const role = document.getElementById('userRole').value;
    document.getElementById('permissionsSection').style.display = (role === 'admin') ? 'none' : 'block';
};
window.saveUserRemote = () => {
    const username = document.getElementById('newUsername').value.trim();
    const pass = document.getElementById('newUserPass').value;
    const role = document.getElementById('userRole').value;
    if (!username || !pass) return showToast('أدخل كل البيانات', 'error');

    let perms = [];
    if (role === 'admin') {
        perms = ['*'];
    } else {
        document.querySelectorAll('.perm-check:checked').forEach(c => perms.push(c.value));
        if (perms.length === 0) return showToast('يجب تحديد صلاحية واحدة على الأقل للكاشير', 'error');
    }

    sendRemoteCommand('add_user', { username, password: pass, role, permissions: perms });
    closeUserModal();
    showToast('تم إرسال طلب إضافة الموظف للمحل...', 'success');
};
window.deleteUserRemote = (userId) => {
    openConfirmModal('حذف هذا الموظف نهائياً؟', () => {
        sendRemoteCommand('delete_user', { userId });
        showToast('تم إرسال طلب حذف الموظف...', 'info');
    });
};
window.filterExpenses = () => {
    const term = document.getElementById('expenseSearch').value.toLowerCase();
    document.querySelectorAll('#expensesTableBody tr').forEach(row => {
        if (row.cells.length > 1) row.style.display = row.innerText.toLowerCase().includes(term) ? '' : 'none';
    });
};

// --- Inventory Functions ---
function renderInventory(data) {
    const tableBody = document.getElementById('inventoryTableBody');
    if (!tableBody) return;
    const products = data.products || [];
    tableBody.innerHTML = products.map(p => `
        <tr>
            <td class="en-font">${p.name}</td>
            <td>${p.category === 'drink' ? 'مشروبات' : p.category === 'snack' ? 'سناكس' : 'أخرى'}</td>
            <td class="en-font">${p.price} ج.م</td>
            <td class="en-font" style="color: ${p.stock < 10 ? 'var(--danger)' : 'inherit'}">${p.stock}</td>
            <td class="table-actions">
                <button class="action-btn-small" onclick="editProductModal('${p.id}', '${p.name}', '${p.price}', '${p.stock}', '${p.category}')" title="تعديل">
                    <i class="fa-solid fa-pen-to-square"></i>
                </button>
                <button class="action-btn-small danger" onclick="deleteProductRemote('${p.id}')" title="حذف">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('') || `<tr><td colspan="5" style="text-align:center; padding:3rem;"><div style="color:var(--text-secondary);"><i class="fa-solid fa-box-open" style="font-size:3rem; margin-bottom:1rem; opacity:0.3;"></i><h3 style="margin-bottom:0.5rem; color:white;">لا يوجد منتجات في المخزون</h3><p style="font-size:0.9rem; margin-bottom:1rem;">يمكنك إضافة منتجات جديدة من هنا أو انتظر حتى يتم فتح النظام المحلي لأول مرة</p><button onclick="openProductModal()" class="action-btn" style="margin:0 auto;"><i class="fa-solid fa-plus-circle"></i> إضافة منتج الآن</button></div></td></tr>`;
}

window.openProductModal = () => {
    document.getElementById('productModalTitle').innerHTML = '<i class="fa-solid fa-box-open"></i> إضافة منتج جديد';
    document.getElementById('editProductId').value = '';
    document.getElementById('prodName').value = '';
    document.getElementById('prodPrice').value = '';
    document.getElementById('prodStock').value = '';
    document.getElementById('productModal').style.display = 'flex';
};

window.editProductModal = (id, name, price, stock, cat) => {
    document.getElementById('productModalTitle').innerHTML = '<i class="fa-solid fa-pen"></i> تعديل المنتج';
    document.getElementById('editProductId').value = id;
    document.getElementById('prodName').value = name;
    document.getElementById('prodPrice').value = price;
    document.getElementById('prodStock').value = stock;
    document.getElementById('prodCategory').value = cat;
    document.getElementById('productModal').style.display = 'flex';
};

window.closeProductModal = () => { document.getElementById('productModal').style.display = 'none'; };

window.saveProductRemote = () => {
    const id = document.getElementById('editProductId').value;
    const name = document.getElementById('prodName').value.trim();
    const price = document.getElementById('prodPrice').value;
    const stock = document.getElementById('prodStock').value;
    const category = document.getElementById('prodCategory').value;

    if (!name || !price || !stock) return showToast('أدخل كل البيانات', 'error');

    const cmd = id ? 'update_product' : 'add_product';
    const payload = {
        name,
        price: parseFloat(price),
        stock: parseInt(stock),
        category
    };
    if (id) payload.id = parseInt(id);

    sendRemoteCommand(cmd, payload);
    closeProductModal();
    showToast('تم إرسال طلب تحديث المخزون للمحل...', 'success');
};

window.deleteProductRemote = (id) => {
    openConfirmModal('حذف المنتج نهائياً من المخزون؟', () => {
        sendRemoteCommand('delete_product', { productId: id });
        showToast('تم إرسال طلب الحذف...', 'info');
    });
};


// --- SETTINGS & CLOUD ACCESS ---
function renderSettings(data) {
    // 1. Render Local Users Table
    renderUsers(data);

    // 2. Fetch & Render Cloud Allowed Users
    const mKey = data.monitorKey;
    const listContainer = document.getElementById('cloudUsersList');
    if (!listContainer || !mKey) return;

    db.collection("monitor_access").doc(mKey).get().then(doc => {
        if (!doc.exists) return;
        const accessData = doc.data();
        const allowed = accessData.allowedUsers || [];

        if (allowed.length === 0) {
            listContainer.innerHTML = '<div style="font-size:0.9rem; color:var(--text-secondary); text-align:center; padding:1rem;">لا يوجد مستخدمين إضافيين مسموح لهم بالدخول.</div>';
        } else {
            listContainer.innerHTML = allowed.map(u => `
                <div style="background:rgba(255,255,255,0.03); padding:0.8rem; border-radius:8px; display:flex; justify-content:space-between; align-items:center;">
                    <div style="font-weight:bold; font-size:0.9rem;">${u}</div>
                    <button onclick="deleteCloudUserRemote('${u}')" style="background:rgba(239,68,68,0.1); color:var(--danger); border:none; padding:5px 10px; border-radius:6px; cursor:pointer; font-size:0.8rem;">
                        <i class="fa-solid fa-trash"></i> حذف
                    </button>
                </div>
            `).join('');
        }
    }).catch(err => console.error("Error fetching access settings:", err));
}

window.openCloudUserModal = () => {
    document.getElementById('cloudUserEmail').value = '';
    document.getElementById('cloudUserPass').value = '';
    document.getElementById('cloudUserModal').style.display = 'flex';
};
window.closeCloudUserModal = () => { document.getElementById('cloudUserModal').style.display = 'none'; };

window.saveCloudUserRemote = async () => {
    const input = document.getElementById('cloudUserEmail').value.trim();
    const pass = document.getElementById('cloudUserPass').value.trim();
    if (!input || !pass) return showToast('برجاء إدخال البيانات كاملة (الرقم وكلمة السر)', 'error');
    if (pass.length < 8) return showToast('كلمة السر يجب أن تكون 8 أرقام على الأقل', 'error');

    const mKey = localStorage.getItem('last_monitored_code');
    if (!mKey) return;

    // Detect Email vs Phone for the new user
    const isPhone = /^[0-9]+$/.test(input);
    const emailToCreate = isPhone ? `${input}@as3g.local` : input;

    if (loader) loader.style.display = 'flex';
    let secondaryApp = null;

    try {
        // 1. Create User via Secondary App to avoid logging out OWNER
        const secAppName = "TempSignUp_" + Date.now();
        secondaryApp = firebase.initializeApp(firebaseMonitorConfig, secAppName);
        const secAuth = secondaryApp.auth();
        const userCred = await secAuth.createUserWithEmailAndPassword(emailToCreate, pass);
        const newUid = userCred.user.uid;

        // 2. Setup link for the new user
        const monitorDoc = await db.collection("monitor_access").doc(mKey).get();
        const monitorData = monitorDoc.data();

        await db.collection("user_cafe_links").doc(`${newUid}_${mKey}`).set({
            uid: newUid,
            email: isPhone ? null : input,
            mobile: isPhone ? input : null,
            displayEmail: input,
            licenseCode: monitorData.licenseCode,
            cafeName: monitorData.cafeName || 'Unnamed Cafe',
            monitorKey: mKey,
            linkedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        // 3. Add to allowedUsers whitelist
        await db.collection("monitor_access").doc(mKey).update({
            allowedUsers: firebase.firestore.FieldValue.arrayUnion(input)
        });

        showToast('تم إنشاء الحساب الإضافي بنجاح!', 'success');
        closeCloudUserModal();
        if (lastSnapData) renderSettings({ ...lastSnapData, monitorKey: mKey });

        // Final cleanup
        await secAuth.signOut();

    } catch (err) {
        console.error(err);
        let msg = 'حدث خطأ أثناء الحفظ.';
        if (err.code === 'auth/email-already-in-use') msg = 'هذا الرقم أو البريد مستخدم بالفعل لمستخدم آخر.';
        showToast(msg, 'error');
    } finally {
        if (secondaryApp) await secondaryApp.delete();
        if (loader) loader.style.display = 'none';
    }
};

window.deleteCloudUserRemote = async (userVal) => {
    const mKey = localStorage.getItem('last_monitored_code');
    if (!mKey) return;

    if (!confirm(`حذف الصلاحية عن ${userVal} ؟ لن يتمكن من الدخول المرة القادمة.`)) return;

    if (loader) loader.style.display = 'flex';
    try {
        await db.collection("monitor_access").doc(mKey).update({
            allowedUsers: firebase.firestore.FieldValue.arrayRemove(userVal)
        });
        showToast('تم حذف الصلاحية.', 'info');
        if (lastSnapData) renderSettings({ ...lastSnapData, monitorKey: mKey });
    } catch (err) {
        console.error(err);
        showToast('حدث خطأ أثناء الحذف.', 'error');
    } finally {
        if (loader) loader.style.display = 'none';
    }
};
