// ==========================================================================
// TG-BOT WEB PORTAL & ADMIN DASHBOARD APP LOGIC
// ==========================================================================

document.addEventListener('DOMContentLoaded', () => {
    initTelegramUser();
    checkAdminAuth();
    initNavigation();
    initClock();
    loadStatus();
    loadUserPortal();
    loadDashboard();
    loadAccountsTable();
    loadMenusManager();
    loadHistoryTable();
    loadSummarizeClaimedReport();
    loadBotController();
    initExcelDropZone();

    // Auto refresh status and terminal output every 3 seconds
    setInterval(() => {
        loadStatus();
        pollBotLogs();
    }, 3000);
});

// Navigation Tabs
function initNavigation() {
    const tabs = document.querySelectorAll('.nav-tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
            
            tab.classList.add('active');
            const target = tab.dataset.tab;
            document.getElementById(`tab-${target}`).classList.add('active');

            // Refresh data on tab click
            if (target === 'user-portal') loadUserPortal();
            if (target === 'dashboard') loadDashboard();
            if (target === 'accounts') loadAccountsTable();
            if (target === 'menus') loadMenusManager();
            if (target === 'history') loadHistoryTable();
            if (target === 'summarize') loadSummarizeClaimedReport();
        });
    });
}

// Phnom Penh Time Clock (UTC+7)
function initClock() {
    function updateClock() {
        const now = new Date();
        const utc7 = new Date(now.getTime() + (7 * 60 * 60 * 1000));
        const str = utc7.toISOString().replace('T', ' ').substring(0, 19);
        const clockEl = document.getElementById('dash-clock');
        if (clockEl) clockEl.innerText = str;
    }
    updateClock();
    setInterval(updateClock, 1000);
}

// Global System Status
async function loadStatus() {
    try {
        const res = await fetch('/api/status');
        const data = await res.json();

        // System pill
        const pillText = document.getElementById('global-status-text');
        if (pillText) pillText.innerText = data.bot_running ? 'Bot & Server Active' : 'Server Online';

        // Sync Token
        if (data.token) {
            const botTokenInput = document.getElementById('bot-token-input');
            const portalTokenInput = document.getElementById('portal-token-input');
            const modalTokenInput = document.getElementById('modal-token-input');
            if (botTokenInput && !botTokenInput.value) botTokenInput.value = data.token;
            if (portalTokenInput && !portalTokenInput.value) portalTokenInput.value = data.token;
            if (modalTokenInput && !modalTokenInput.value) modalTokenInput.value = data.token;
        }

        const portalBotStatus = document.getElementById('portal-bot-status');
        if (portalBotStatus) {
            if (data.bot_running) {
                portalBotStatus.className = 'badge green-badge';
                portalBotStatus.innerHTML = '<i class="fa-solid fa-circle"></i> Bot Active';
            } else {
                portalBotStatus.className = 'badge red-badge';
                portalBotStatus.innerHTML = '<i class="fa-solid fa-circle"></i> Bot Stopped';
            }
        }

        // Dashboard stats
        document.getElementById('stat-total-accounts').innerText = data.total_accounts || 0;
        const todayClaimed = data.today_claimed || 0;
        const totalClaimed = data.total_claimed || 0;
        document.getElementById('stat-total-claimed').innerText = `${todayClaimed} / ${totalClaimed}`;
        document.getElementById('stat-main-menus').innerText = data.total_main_menus || 0;
        document.getElementById('stat-sub-menus').innerText = data.total_sub_menus || 0;

        // Bot badge in dashboard
        const botBadge = document.getElementById('dash-bot-badge');
        if (botBadge) {
            if (data.bot_running) {
                botBadge.className = 'badge green-badge';
                botBadge.innerHTML = '<i class="fa-solid fa-circle"></i> Running';
            } else {
                botBadge.className = 'badge red-badge';
                botBadge.innerHTML = '<i class="fa-solid fa-circle"></i> Stopped';
            }
        }
    } catch (e) {
        console.error('Status fetch error:', e);
    }
}


// ================= 1. USER PORTAL =================
const CATEGORY_TAB_ICONS = {
    "ALL": "🌟",
    "SB": "📁",
    "Ball": "⚽",
    "F88": "💳",
    "Makav": "💰",
    "CK9999": "🎮",
    "Wa855": "🎲",
    "M99": "🏆",
    "Betwos": "💎",
    "Joker": "🃏"
};

const SUB_MENU_EMOJIS = ['⚡', '🔥', '🎮', '🎯', '💎', '🚀', '🌟', '👑', '🎲', '🏆', '⚽', '💫', '💥', '✨', '🎁', '🔮', '🕹️', '🛡️', '🎉'];

function getSubMenuEmoji(subName) {
    if (subName.endsWith('_CH_KH')) return '🌟';
    if (subName.endsWith('_V_KH')) return '✨';
    if (subName.endsWith('_PK_KH')) return '🍀';
    if (subName.endsWith('_TH_KH')) return '🎯';
    if (subName.endsWith('_KH')) return '⭐';
    if (subName.includes('_CH')) return '🔥';
    if (subName.includes('_V')) return '👑';
    if (subName.includes('_TH')) return '💎';
    if (subName.includes('_PK')) return '🛡️';
    if (subName.includes('_KL')) return '🏆';
    if (subName.includes('Joker')) return '🃏';
    if (subName.includes('BK')) return '👑';
    if (subName.includes('MB')) return '💎';
    if (subName.startsWith('Ball')) return '⚽';
    if (subName.startsWith('F88')) return '🔥';
    if (subName.startsWith('Makav')) return '💰';
    if (subName.startsWith('Wa855')) return '🎲';
    if (subName.startsWith('M99')) return '🏆';
    if (subName.startsWith('Betwos')) return '💎';
    if (subName.startsWith('SB')) return '⚡';
    if (subName.startsWith('CK99')) return '🎮';
    return '🔹';
}

let activeUserPortalCategory = 'CK9999';
let portalViewMode = 'card';

function setPortalViewMode(mode) {
    portalViewMode = 'card';
    const container = document.getElementById('user-portal-categories');
    if (container) {
        container.className = `categories-container view-card`;
    }
}

async function loadUserPortal() {
    const container = document.getElementById('user-portal-categories');
    const categorySelect = document.getElementById('portal-category-select');
    const stockSummary = document.getElementById('category-stock-summary');
    if (!container) return;

    if (container) {
        container.className = `categories-container view-card`;
    }

    try {
        const res = await fetch('/api/menus');
        const data = await res.json();
        const mainMenus = data.main_menus || {};

        // Build ordered categories: CK9999 first, followed by other categories
        const rawCategories = Object.keys(mainMenus);
        const orderedCategories = [];
        const defaultCat = rawCategories.includes('CK9999') ? 'CK9999' : (rawCategories.includes('CK99') ? 'CK99' : (rawCategories[0] || 'CK9999'));
        
        if (rawCategories.includes(defaultCat)) orderedCategories.push(defaultCat);
        rawCategories.forEach(cat => {
            if (cat !== defaultCat) orderedCategories.push(cat);
        });

        if (!activeUserPortalCategory || (activeUserPortalCategory !== 'ALL' && !rawCategories.includes(activeUserPortalCategory))) {
            activeUserPortalCategory = defaultCat;
        }

        // 1. Render Category Selection Dropdown
        if (categorySelect) {
            let optionsHTML = '';

            orderedCategories.forEach(mainCat => {
                const icon = CATEGORY_TAB_ICONS[mainCat] || '📁';
                const isSelected = activeUserPortalCategory === mainCat ? 'selected' : '';
                optionsHTML += `<option value="${mainCat}" ${isSelected}>${icon} ${mainCat}</option>`;
            });

            const isAllSelected = activeUserPortalCategory === 'ALL' ? 'selected' : '';
            optionsHTML += `<option value="ALL" ${isAllSelected}>🌟 ALL</option>`;

            categorySelect.innerHTML = optionsHTML;
        }

        // 2. Render Sub-Menus Grid based on active category tab
        container.innerHTML = '';

        const catsToDisplay = activeUserPortalCategory === 'ALL' ? orderedCategories : [activeUserPortalCategory];

        catsToDisplay.forEach(mainCat => {
            const subMenus = mainMenus[mainCat];
            if (!subMenus) return;

            const catStock = subMenus.reduce((sum, s) => sum + (s.count || 0), 0);
            const icon = CATEGORY_TAB_ICONS[mainCat] || '📁';
            const mainCard = document.createElement('div');
            mainCard.className = 'main-cat-card';

            let subCardsHTML = '';
            subMenus.forEach(sub => {
                const hasStock = sub.count > 0;

                subCardsHTML += `
                    <div class="sub-menu-card-item">
                        <button type="button" 
                                class="sub-menu-telegram-btn ${hasStock ? 'has-stock' : 'no-stock'}" 
                                ${hasStock ? '' : 'disabled'} 
                                onclick="claimAccount('${sub.name}')">
                            <span class="btn-content-row">
                                <span class="btn-name">${sub.name}</span>
                                <span class="stock-num">(${sub.count || 0})</span>
                            </span>
                        </button>
                    </div>
                `;
            });

            mainCard.innerHTML = `
                <div class="main-cat-header">
                    <h3>${icon} ${mainCat}</h3>
                    <span class="badge blue-badge" style="font-size: 14px; padding: 6px 14px; font-weight: 700;">${catStock}</span>
                </div>
                <div class="sub-menus-grid">
                    ${subCardsHTML || '<div class="text-muted" style="padding: 16px;">គ្មាន Sub-Menu ឡើយ</div>'}
                </div>
            `;

            container.appendChild(mainCard);
        });

        if (container.children.length === 0) {
            container.innerHTML = `<div class="toast info" style="margin: 20px auto;">🔍 មិនមានទិន្នន័យ Sub-Menu ឡើយ</div>`;
        }

    } catch (e) {
        container.innerHTML = `<div class="toast error">⚠️ បរាជ័យក្នុងការទាញយកទិន្នន័យ៖ ${e.message}</div>`;
    }
}

function initTelegramUser() {
    try {
        // 1. Check Telegram WebApp Mini App object
        if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initDataUnsafe && window.Telegram.WebApp.initDataUnsafe.user) {
            const u = window.Telegram.WebApp.initDataUnsafe.user;
            const name = (u.first_name + ' ' + (u.last_name || '')).trim() || u.username || 'Telegram User';
            const username = u.username ? `@${u.username}` : (u.id ? `id_${u.id}` : 'tg_user');
            sessionStorage.setItem('tg_user_name', name);
            sessionStorage.setItem('tg_user_username', username);
            if (u.id) sessionStorage.setItem('tg_user_id', u.id);
        }

        // 2. Check URL parameters e.g. ?name=Noui&username=noui_tg or ?user=Noui
        const urlParams = new URLSearchParams(window.location.search);
        const paramName = urlParams.get('name') || urlParams.get('tg_name') || urlParams.get('user');
        const paramUsername = urlParams.get('username') || urlParams.get('tg_username');
        const paramUserId = urlParams.get('user_id') || urlParams.get('tg_user_id') || urlParams.get('id') || urlParams.get('chat_id');

        if (paramName) {
            const name = decodeURIComponent(paramName).trim();
            const username = paramUsername ? (paramUsername.startsWith('@') ? paramUsername : `@${paramUsername}`) : name;
            sessionStorage.setItem('tg_user_name', name);
            sessionStorage.setItem('tg_user_username', username);
        }
        if (paramUserId) {
            sessionStorage.setItem('tg_user_id', paramUserId);
        }
    } catch (e) {
        console.error('Error initializing Telegram user:', e);
    }
}

function selectPortalCategory(catName) {
    activeUserPortalCategory = catName;
    loadUserPortal();
}

// Search input listener in User Portal
document.getElementById('portal-search')?.addEventListener('input', loadUserPortal);

let currentClaimedData = null;
let isAccountCopied = false;

// Claim Account Action
async function claimAccount(menuName) {
    let tgName = sessionStorage.getItem('tg_user_name');
    let tgUsername = sessionStorage.getItem('tg_user_username');

    if (!tgName && window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initDataUnsafe && window.Telegram.WebApp.initDataUnsafe.user) {
        const u = window.Telegram.WebApp.initDataUnsafe.user;
        tgName = (u.first_name + ' ' + (u.last_name || '')).trim() || u.username || 'Telegram User';
        tgUsername = u.username ? `@${u.username}` : (u.id ? `id_${u.id}` : 'tg_user');
        sessionStorage.setItem('tg_user_name', tgName);
        sessionStorage.setItem('tg_user_username', tgUsername);
        if (u.id) sessionStorage.setItem('tg_user_id', u.id);
    }

    const finalUserName = tgName || 'Web User';
    const finalTgUsername = tgUsername || 'web_user';

    try {
        const res = await fetch('/api/claim', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                menu_name: menuName, 
                user_name: finalUserName,
                tg_username: finalTgUsername
            })
        });
        const data = await res.json();

        if (res.ok && data.success) {
            currentClaimedData = {
                menu_name: data.menu_name,
                username: data.account.username,
                password: data.account.password,
                history_id: data.history_id
            };
            isAccountCopied = false;

            document.getElementById('claim-res-category').innerText = data.menu_name;
            document.getElementById('claim-res-user').innerText = data.account.username;
            document.getElementById('claim-res-pass').innerText = data.account.password;

            openModal('modal-claim-result');
            showToast(`✅ បានទាញយកគណនី ${data.menu_name} ដោយជោគជ័យ!`, 'success');

            // Refresh lists
            loadUserPortal();
            loadDashboard();
        } else {
            showToast(`❌ ${data.error || 'មានបញ្ហាក្នុងការទាញយកគណនី'}`, 'error');
        }
    } catch (e) {
        showToast(`❌ ${e.message}`, 'error');
    }
}

// Copy Both Username & Password Handler
async function copyBothUserAndPass() {
    const user = document.getElementById('claim-res-user')?.innerText || (currentClaimedData ? currentClaimedData.username : '');
    const pass = document.getElementById('claim-res-pass')?.innerText || (currentClaimedData ? currentClaimedData.password : '');
    if (!user || !pass) return;

    const combinedText = `${user}\n${pass}`;
    try {
        await navigator.clipboard.writeText(combinedText);
    } catch (err) {
        const textArea = document.createElement("textarea");
        textArea.value = combinedText;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
    }

    showToast(`📋 បានចម្លង Username & Password!`, 'success');
    isAccountCopied = true;

    // Send Telegram message to user's chat (NO DUPLICATE HISTORY)
    const tgUserId = sessionStorage.getItem('tg_user_id') || 
                     (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initDataUnsafe && window.Telegram.WebApp.initDataUnsafe.user && window.Telegram.WebApp.initDataUnsafe.user.id);

    if (tgUserId && currentClaimedData) {
        try {
            await fetch('/api/send-telegram-msg', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: tgUserId,
                    menu_name: currentClaimedData.menu_name,
                    username: currentClaimedData.username,
                    password: currentClaimedData.password
                })
            });
        } catch (e) {
            console.error('Error sending Telegram chat message:', e);
        }
    }

    if (window.Telegram && window.Telegram.WebApp) {
        try {
            window.Telegram.WebApp.sendData(JSON.stringify({
                action: 'copied_credentials',
                menu_name: currentClaimedData ? currentClaimedData.menu_name : '',
                username: user,
                password: pass
            }));
        } catch (e) {}

        try {
            window.Telegram.WebApp.close();
        } catch (e) {}
    }

    closeModal('modal-claim-result');
}

document.getElementById('btn-copy-both-footer')?.addEventListener('click', copyBothUserAndPass);
document.getElementById('btn-copy-both-card')?.addEventListener('click', copyBothUserAndPass);




// ================= 2. DASHBOARD =================
async function loadDashboard() {
    try {
        const res = await fetch('/api/menus');
        const data = await res.json();
        const stockList = document.getElementById('dashboard-stock-list');
        if (!stockList) return;

        stockList.innerHTML = '';
        const counts = data.counts || {};

        // Sort sub-menus by account count ascending (from lowest to highest)
        const sortedEntries = Object.entries(counts).sort((a, b) => a[1] - b[1]);

        sortedEntries.forEach(([menu, count]) => {
            const item = document.createElement('div');
            item.className = 'stock-item';
            item.innerHTML = `
                <span><strong>${menu}</strong></span>
                <span class="${count > 0 ? 'green-text' : 'red-text'}">${count} Accounts</span>
            `;
            stockList.appendChild(item);
        });
    } catch (e) {
        console.error(e);
    }
}

document.getElementById('btn-refresh-dashboard')?.addEventListener('click', loadDashboard);


// ================= 3. ACCOUNTS MANAGEMENT =================
let accCurrentPage = 1;

async function loadAccountsTable() {
    const tableBody = document.getElementById('accounts-table-body');
    if (!tableBody) return;

    const searchVal = document.getElementById('acc-search-input').value.trim();
    const menuVal = document.getElementById('acc-menu-filter').value;

    try {
        const res = await fetch(`/api/accounts?page=${accCurrentPage}&limit=15&q=${encodeURIComponent(searchVal)}&menu=${encodeURIComponent(menuVal)}`);
        const data = await res.json();

        tableBody.innerHTML = '';
        if (data.accounts.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="5" class="text-center text-muted" style="padding: 24px;">គ្មានទិន្នន័យគណនីឡើយ (No Accounts Found)</td></tr>`;
        } else {
            data.accounts.forEach(acc => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td data-label="ID">#${acc.id}</td>
                    <td data-label="MENU NAME"><span class="badge blue-badge">${acc.menu_name}</span></td>
                    <td data-label="USERNAME"><code>${acc.username}</code></td>
                    <td data-label="PASSWORD"><code>${acc.password}</code></td>
                    <td data-label="ACTIONS" class="text-center">
                        <button class="btn btn-secondary btn-sm" onclick="openEditAccModal(${acc.id}, '${acc.menu_name}', '${acc.username}', '${acc.password}')"><i class="fa-solid fa-pen"></i></button>
                        <button class="btn btn-danger btn-sm" onclick="deleteAccount(${acc.id})"><i class="fa-solid fa-trash"></i></button>
                    </td>
                `;
                tableBody.appendChild(tr);
            });
        }

        // Pagination
        document.getElementById('acc-page-info').innerText = `Showing page ${data.page} of ${data.totalPages || 1} (${data.total} total accounts)`;
        document.getElementById('acc-current-page').innerText = data.page;
        document.getElementById('acc-prev-btn').disabled = data.page <= 1;
        document.getElementById('acc-next-btn').disabled = data.page >= data.totalPages;

        // Populate Menu Select Dropdowns
        populateMenuDropdowns();

    } catch (e) {
        console.error(e);
    }
}

async function populateMenuDropdowns() {
    try {
        const res = await fetch('/api/menus');
        const data = await res.json();
        const allMenus = data.all_menus || [];

        const filterSelect = document.getElementById('acc-menu-filter');
        const addSelect = document.getElementById('add-acc-menu');
        const editSelect = document.getElementById('edit-acc-menu');

        const currentFilterVal = filterSelect.value;
        filterSelect.innerHTML = '<option value="all">-- ទាំងអស់ (All Menus) --</option>';

        let optsHTML = '';
        allMenus.forEach(m => {
            optsHTML += `<option value="${m}">${m}</option>`;
            filterSelect.innerHTML += `<option value="${m}">${m}</option>`;
        });

        filterSelect.value = currentFilterVal;
        if (addSelect) addSelect.innerHTML = optsHTML;
        if (editSelect) editSelect.innerHTML = optsHTML;

    } catch (e) {}
}

document.getElementById('acc-search-input')?.addEventListener('input', () => { accCurrentPage = 1; loadAccountsTable(); });
document.getElementById('acc-menu-filter')?.addEventListener('change', () => { accCurrentPage = 1; loadAccountsTable(); });
document.getElementById('acc-prev-btn')?.addEventListener('click', () => { if (accCurrentPage > 1) { accCurrentPage--; loadAccountsTable(); } });
document.getElementById('acc-next-btn')?.addEventListener('click', () => { accCurrentPage++; loadAccountsTable(); });

// Add Single Account
document.getElementById('btn-open-add-modal')?.addEventListener('click', () => openModal('modal-add-acc'));
document.getElementById('btn-save-new-acc')?.addEventListener('click', async () => {
    const menu = document.getElementById('add-acc-menu').value;
    const user = document.getElementById('add-acc-user').value.trim();
    const pass = document.getElementById('add-acc-pass').value.trim();

    if (!menu || !user || !pass) {
        showToast('❌ សូមបំពេញព័ត៌មានឱ្យបានគ្រប់គ្រាន់', 'error');
        return;
    }

    try {
        const res = await fetch('/api/accounts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ menu_name: menu, username: user, password: pass })
        });
        if (res.ok) {
            closeModal('modal-add-acc');
            showToast('✅ បានបន្ថែមគណនីថ្មីដោយជោគជ័យ!', 'success');
            document.getElementById('add-acc-user').value = '';
            document.getElementById('add-acc-pass').value = '';
            loadAccountsTable();
            loadDashboard();
            loadUserPortal();
        }
    } catch (e) {
        showToast(`❌ ${e.message}`, 'error');
    }
});

// ================= BACKUP & RESTORE ACCOUNTS =================

// 1. Backup Accounts Handler
document.getElementById('btn-backup-accounts')?.addEventListener('click', async () => {
    try {
        const res = await fetch('/api/accounts?all=true');
        const data = await res.json();

        const accounts = data.accounts || [];
        if (accounts.length === 0) {
            showToast('⚠️ គ្មានទិន្នន័យគណនីសម្រាប់ Backup ឡើយ', 'error');
            return;
        }

        const backupData = {
            app: "TelegramBot_Web_App",
            type: "accounts_backup",
            exported_at: new Date().toISOString(),
            total_accounts: accounts.length,
            accounts: accounts.map(a => ({
                menu_name: a.menu_name,
                username: a.username,
                password: a.password
            }))
        };

        const jsonStr = JSON.stringify(backupData, null, 2);
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const dateStr = new Date().toISOString().slice(0, 10);
        const a = document.createElement('a');
        a.href = url;
        a.download = `accounts_backup_${dateStr}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        showToast(`📦 បានទាញយកឯកសារ Backup គណនីចំនួន ${accounts.length} ដោយជោគជ័យ!`, 'success');
    } catch (e) {
        showToast(`❌ បរាជ័យក្នុងការ Backup គណនី: ${e.message}`, 'error');
    }
});

// 2. Trigger Restore File Picker
document.getElementById('btn-restore-accounts')?.addEventListener('click', () => {
    document.getElementById('restore-acc-file-input')?.click();
});

// 3. Handle Restore File Upload (.json or .xlsx)
document.getElementById('restore-acc-file-input')?.addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!await confirmAdminPasswordPrompt(`ស្តារគណនីឡើងវិញពីឯកសារ "${file.name}"`)) {
        e.target.value = '';
        return;
    }

    const isReplace = confirm(`តើអ្នកចង់លុបទិន្នន័យគណនីចាស់ទាំងអស់ចេញ មុននឹង Restore ឬទេ?\n\n- ចុច [OK] ដើមី្ប Replace លុបទិន្នន័យចាស់ទាំងអស់ រួចបញ្ចូលថ្មី\n- ចុច [Cancel] ដើមី្ប Append បន្ថែមលើទិន្នន័យដែលមានស្រាប់`);

    try {
        let accountsToInsert = [];

        if (file.name.endsWith('.json')) {
            const text = await file.text();
            const json = JSON.parse(text);
            if (Array.isArray(json)) {
                accountsToInsert = json;
            } else if (json.accounts && Array.isArray(json.accounts)) {
                accountsToInsert = json.accounts;
            }
        } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
            const dataBuffer = await file.arrayBuffer();
            const workbook = XLSX.read(dataBuffer, { type: 'array' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const rawRows = XLSX.utils.sheet_to_json(worksheet);

            accountsToInsert = rawRows.map(r => ({
                menu_name: r.menu_name || r.menu || r.Category || r['MENU NAME'] || r['Menu'] || 'SB_CH',
                username: r.username || r.user || r['USERNAME'] || r['Username'] || '',
                password: r.password || r.pass || r['PASSWORD'] || r['Password'] || ''
            })).filter(a => a.username && a.password);
        }

        if (!accountsToInsert || accountsToInsert.length === 0) {
            showToast('❌ រកមិនឃើញទិន្នន័យគណនីត្រឹមត្រូវក្នុងឯកសារនេះឡើយ', 'error');
            e.target.value = '';
            return;
        }

        if (isReplace) {
            await fetch('/api/accounts', { method: 'DELETE' });
        }

        const res = await fetch('/api/accounts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(accountsToInsert)
        });

        const resData = await res.json();
        if (res.ok && resData.success) {
            const count = resData.count !== undefined ? resData.count : accountsToInsert.length;
            const skippedMsg = resData.skipped ? ` (រំលងស្ទួន ${resData.skipped})` : '';
            showToast(`✅ បានស្តារគណនីចំនួន ${count} ដោយជោគជ័យ!${skippedMsg}`, 'success');

            loadAccountsTable();
            loadDashboard();
            loadUserPortal();
        } else {
            showToast(`❌ ${resData.error || 'បរាជ័យក្នុងការស្តារគណនី'}`, 'error');
        }

    } catch (err) {
        showToast(`❌ មានបញ្ហាក្នុងការអានឯកសារ Restore: ${err.message}`, 'error');
    } finally {
        e.target.value = '';
    }
});

// Edit Account
function openEditAccModal(id, menu, user, pass) {
    document.getElementById('edit-acc-id').value = id;
    document.getElementById('edit-acc-menu').value = menu;
    document.getElementById('edit-acc-user').value = user;
    document.getElementById('edit-acc-pass').value = pass;
    openModal('modal-edit-acc');
}

document.getElementById('btn-save-edit-acc')?.addEventListener('click', async () => {
    const id = document.getElementById('edit-acc-id').value;
    const menu = document.getElementById('edit-acc-menu').value;
    const user = document.getElementById('edit-acc-user').value.trim();
    const pass = document.getElementById('edit-acc-pass').value.trim();

    try {
        const res = await fetch(`/api/accounts/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ menu_name: menu, username: user, password: pass })
        });
        if (res.ok) {
            closeModal('modal-edit-acc');
            showToast('✅ បានកែប្រែគណនីដោយជោគជ័យ!', 'success');
            loadAccountsTable();
        }
    } catch (e) {
        showToast(`❌ ${e.message}`, 'error');
    }
});

async function confirmAdminPasswordPrompt(actionTitle = "លុបទិន្នន័យ") {
    const pwd = prompt(`🔒 ដើម្បី${actionTitle} សូមបញ្ចូលពាក្យសម្ងាត់ Admin ដើម្បីផ្ទៀងផ្ទាត់៖`);
    if (!pwd || !pwd.trim()) return false;

    try {
        const res = await fetch('/api/admin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'login', password: pwd.trim() })
        });
        const data = await res.json();
        if (res.ok && data.success) {
            return true;
        } else {
            showToast(`❌ ${data.error || 'ពាក្យសម្ងាត់ Admin មិនត្រឹមត្រូវឡើយ!'}`, 'error');
            return false;
        }
    } catch (e) {
        showToast('❌ មានបញ្ហាក្នុងការផ្ទៀងផ្ទាត់ពាក្យសម្ងាត់ Admin', 'error');
        return false;
    }
}

// Delete Account
async function deleteAccount(id) {
    if (!confirm('តើអ្នកពិតជាចង់លុបគណនីនេះមែនទេ?')) return;
    if (!await confirmAdminPasswordPrompt('លុបគណនីនេះ')) return;

    try {
        const res = await fetch(`/api/accounts?id=${id}`, { method: 'DELETE' });
        if (res.ok) {
            showToast('✅ បានលុបគណនីរួចរាល់', 'success');
            loadAccountsTable();
            loadDashboard();
            loadUserPortal();
        } else {
            showToast('❌ បរាជ័យក្នុងការលុបគណនី', 'error');
        }
    } catch (e) {
        showToast(`❌ ${e.message}`, 'error');
    }
}

// Delete All Accounts
document.getElementById('btn-delete-all-acc')?.addEventListener('click', async () => {
    if (!confirm('⚠️ តើអ្នកពិតជាចង់លុបគណនីទាំងអស់ចេញពី Database មែនទេ? សកម្មភាពនេះមិនអាចសើរើបានឡើយ!')) return;
    if (!await confirmAdminPasswordPrompt('លុបគណនីទាំងអស់')) return;

    try {
        const res = await fetch('/api/accounts', { method: 'DELETE' });
        if (res.ok) {
            showToast('✅ បានលុបគណនីទាំងអស់ចេញពីប្រព័ន្ធដោយជោគជ័យ!', 'success');
            loadAccountsTable();
            loadDashboard();
            loadUserPortal();
        } else {
            showToast('❌ បរាជ័យក្នុងការលុបគណនីទាំងអស់', 'error');
        }
    } catch (e) {
        showToast(`❌ ${e.message}`, 'error');
    }
});


// ================= 4. EXCEL IMPORT (Client-Side SheetJS Parsing) =================
function initExcelDropZone() {
    const dropZone = document.getElementById('excel-drop-zone');
    const fileInput = document.getElementById('excel-file-input');
    const fileNameDiv = document.getElementById('excel-file-name');
    const uploadBtn = document.getElementById('btn-upload-excel');

    if (!dropZone || !fileInput) return;

    // Drag & Drop event handlers
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('dragover');
    });

    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('dragover');
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('dragover');
        if (e.dataTransfer.files.length > 0) {
            fileInput.files = e.dataTransfer.files;
            fileNameDiv.innerText = `📄 Selected: ${e.dataTransfer.files[0].name}`;
            if (uploadBtn) uploadBtn.disabled = false;
        }
    });

    dropZone.addEventListener('click', (e) => {
        if (e.target !== fileInput) {
            fileInput.click();
        }
    });

    fileInput.addEventListener('change', () => {
        if (fileInput.files.length > 0) {
            fileNameDiv.innerText = `📄 Selected: ${fileInput.files[0].name}`;
            if (uploadBtn) uploadBtn.disabled = false;
        }
    });

    if (uploadBtn) {
        uploadBtn.addEventListener('click', async () => {
            const file = fileInput.files[0];
            if (!file) {
                showToast('⚠️ សូមជ្រើសរើសឯកសារ Excel (.xlsx) ជាមុនសិន!', 'error');
                return;
            }

            uploadBtn.disabled = true;
            uploadBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> កំពុងអាន និងបញ្ចូលទិន្នន័យ...';

            try {
                const reader = new FileReader();
                reader.onload = async (e) => {
                    try {
                        const data = new Uint8Array(e.target.result);
                        const workbook = XLSX.read(data, { type: 'array', cellText: true, raw: false });

                        let rawRows = [];
                        // 1. Search across all sheets for valid rows
                        for (const sName of workbook.SheetNames) {
                            const sheet = workbook.Sheets[sName];
                            if (!sheet) continue;
                            const rows = XLSX.utils.sheet_to_json(sheet, { raw: false, defval: '' });
                            if (rows && rows.length > 0) {
                                const sampleRow = rows[0];
                                const sampleKeys = Object.keys(sampleRow).map(k => String(k).toLowerCase().trim().replace(/[^a-z0-9_]/g, ''));
                                if (sampleKeys.some(k => k.includes('user') || k.includes('pass') || k.includes('menu') || k.includes('cat'))) {
                                    rawRows = rows;
                                    break;
                                }
                            }
                        }

                        // Fallback to first sheet if loop didn't find specific keys
                        if ((!rawRows || rawRows.length === 0) && workbook.SheetNames.length > 0) {
                            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                            rawRows = XLSX.utils.sheet_to_json(firstSheet, { raw: false, defval: '' });
                        }

                        if (!rawRows || rawRows.length === 0) {
                            showToast('❌ មិនមានទិន្នន័យក្នុងឯកសារ Excel ឡើយ!', 'error');
                            uploadBtn.disabled = false;
                            uploadBtn.innerHTML = '<i class="fa-solid fa-upload"></i> Upload & Import Excel';
                            return;
                        }

                        // 2. Ultra flexible Column Header matching
                        const accountsToImport = rawRows.map(r => {
                            let menu_name = 'SB_CH';
                            let username = '';
                            let password = '';

                            for (const [key, value] of Object.entries(r)) {
                                const cleanKey = String(key).toLowerCase().trim().replace(/[^a-z0-9_]/g, '');
                                const valStr = String(value !== undefined && value !== null ? value : '').trim();

                                if (cleanKey.includes('menu') || cleanKey.includes('cat')) {
                                    if (valStr) menu_name = valStr;
                                } else if (cleanKey.includes('user') || cleanKey.includes('acc')) {
                                    if (valStr) username = valStr;
                                } else if (cleanKey.includes('pass') || cleanKey.includes('pwd')) {
                                    if (valStr) password = valStr;
                                }
                            }

                            return { menu_name, username, password };
                        }).filter(a => a.username && a.password);

                        if (accountsToImport.length === 0) {
                            showToast('❌ មិនមានទិន្នន័យត្រឹមត្រូវ (ត្រូវមាន Column: menu_name, username, password) ឡើយ!', 'error');
                            uploadBtn.disabled = false;
                            uploadBtn.innerHTML = '<i class="fa-solid fa-upload"></i> Upload & Import Excel';
                            return;
                        }

                        const res = await fetch('/api/accounts', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(accountsToImport)
                        });

                        const resData = await res.json();

                        if (res.ok && resData.success) {
                            const added = resData.count || 0;
                            const skipped = resData.skipped || 0;
                            let msg = `✅ បានបញ្ចូលគណនីថ្មីចំនួន ${added} គណនីពី Excel ដោយជោគជ័យ!`;
                            if (skipped > 0) {
                                msg += ` (បានរំលង ${skipped} គណនីដែលជាន់គ្នា)`;
                            }
                            showToast(msg, 'success');
                            fileNameDiv.innerText = '';
                            fileInput.value = '';
                            loadAccountsTable();
                            loadDashboard();
                            loadUserPortal();
                        } else {
                            showToast(`❌ ${resData.error || 'បរាជ័យក្នុងការបញ្ចូលទិន្នន័យ'}`, 'error');
                        }
                    } catch (err) {
                        showToast(`❌ មានបញ្ហាក្នុងការអានឯកសារ Excel: ${err.message}`, 'error');
                    } finally {
                        uploadBtn.disabled = false;
                        uploadBtn.innerHTML = '<i class="fa-solid fa-upload"></i> Upload & Import Excel';
                    }
                };

                reader.readAsArrayBuffer(file);

            } catch (err) {
                showToast(`❌ ${err.message}`, 'error');
                uploadBtn.disabled = false;
                uploadBtn.innerHTML = '<i class="fa-solid fa-upload"></i> Upload & Import Excel';
            }
        });
    }
}

// Download Sample Import Template (.xlsx)
function exportTemplateExcel() {
    const sampleRows = [
        { menu_name: "SB_CH", username: "user123", password: "pass123" },
        { menu_name: "SB_CH_KH", username: "user456", password: "pass456" },
        { menu_name: "CK99_CH", username: "user789", password: "pass789" }
    ];
    const workbook = XLSX.utils.book_new();
    const sheet = XLSX.utils.json_to_sheet(sampleRows);
    XLSX.utils.book_append_sheet(workbook, sheet, "Data_Entry");
    XLSX.writeFile(workbook, "Sample_Accounts_Template.xlsx");
    showToast('✅ ទាញយកឯកសារគំរូ Excel រួចរាល់!', 'success');
}

// Export ONLY Live Available Stock Accounts - SINGLE FILE (.xlsx)
async function exportAllDataExcel() {
    try {
        showToast('⏳ កំពុងរៀបចំទាញយកស្តុកដែលនៅសល់ទាំងអស់... សូមរង់ចាំមួយភ្លែត', 'info');

        const res = await fetch('/api/accounts?all=true&export=true&limit=100000');
        const data = await res.json();
        const accounts = data.accounts || [];

        if (!accounts || accounts.length === 0) {
            showToast('⚠️ គ្មានស្តុកគណនីនៅសល់សម្រាប់ Export ឡើយ!', 'error');
            return;
        }

        // Export ONLY live available accounts in stock (menu_name, username, password)
        const allAccountRows = accounts.map(a => ({
            "menu_name": a.menu_name,
            "username": a.username,
            "password": a.password
        }));

        const workbook = XLSX.utils.book_new();
        const sheet = XLSX.utils.json_to_sheet(allAccountRows);
        XLSX.utils.book_append_sheet(workbook, sheet, "All Data");

        const todayStr = new Date().toISOString().slice(0, 10);
        const filename = `All_Available_Stock_${todayStr}.xlsx`;

        // 1. Single File Download to Browser
        XLSX.writeFile(workbook, filename);
        showToast(`✅ បានទាញយកស្តុកនៅសល់សរុប ${accounts.length} គណនី ដោយជោគជ័យ!`, 'success');

        // 2. Telegram Mini App Auto Send to Telegram Chat
        let userId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id;
        if (!userId) {
            const urlParams = new URLSearchParams(window.location.search);
            userId = urlParams.get('user_id') || urlParams.get('tg_id') || urlParams.get('id');
        }

        if (userId) {
            try {
                const wbBase64 = XLSX.write(workbook, { bookType: 'xlsx', type: 'base64' });
                const sendRes = await fetch('/api/send-excel-telegram', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        user_id: userId,
                        filename: filename,
                        file_base64: wbBase64
                    })
                });
                const sendData = await sendRes.json();
                if (sendData.success) {
                    showToast('📨 បានផ្ញើឯកសារស្តុក Excel ចូល Telegram Chat របស់អ្នករួចរាល់!', 'success');
                } else {
                    console.warn('Telegram Excel send API response:', sendData);
                }
            } catch (err) {
                console.error('Failed to send Excel to Telegram chat:', err);
            }
        }

    } catch (err) {
        showToast(`❌ បរាជ័យក្នុងការ Export ស្តុក Excel: ${err.message}`, 'error');
    }
}

document.getElementById('btn-export-excel-template')?.addEventListener('click', exportTemplateExcel);
document.getElementById('btn-export-all-stock')?.addEventListener('click', exportAllDataExcel);


// ================= 5. MENUS MANAGEMENT =================
async function loadMenusManager() {
    const container = document.getElementById('menu-management-container');
    if (!container) return;

    try {
        const res = await fetch('/api/menus');
        const data = await res.json();
        const mainMenus = data.main_menus || {};

        container.innerHTML = '';

        for (const [mainCat, subs] of Object.entries(mainMenus)) {
            const card = document.createElement('div');
            card.className = 'menu-group-card';

            let subItemsHTML = '';
            subs.forEach(s => {
                subItemsHTML += `
                    <div class="sub-menu-item">
                        <span><strong>${s.name}</strong> <small class="text-muted">(${s.count} accounts)</small></span>
                        <div class="btn-group">
                            <button class="btn btn-secondary btn-sm" onclick="renameSubMenu('${s.name}')"><i class="fa-solid fa-pen"></i> Edit</button>
                            <button class="btn btn-danger btn-sm" onclick="deleteSubMenu('${s.name}')"><i class="fa-solid fa-trash"></i> Del</button>
                        </div>
                    </div>
                `;
            });

            card.innerHTML = `
                <div class="menu-group-header" onclick="toggleMenuTree(this)">
                    <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
                        <i class="fa-solid fa-chevron-right tree-icon"></i>
                        <h3>📁 ${mainCat}</h3>
                        <span class="badge blue-badge" style="font-size: 12px;">${subs.length} Sub-Menus</span>
                    </div>
                    <div class="btn-group" onclick="event.stopPropagation()">
                        <button class="btn btn-primary btn-sm" onclick="addSubMenuToMain('${mainCat}')"><i class="fa-solid fa-plus"></i> + Sub</button>
                        <button class="btn btn-secondary btn-sm" onclick="renameMainMenu('${mainCat}')"><i class="fa-solid fa-pen"></i> Edit</button>
                        <button class="btn btn-danger btn-sm" onclick="deleteMainMenu('${mainCat}')"><i class="fa-solid fa-trash"></i> Del</button>
                    </div>
                </div>
                <div class="sub-menu-list" style="display: none;">
                    ${subItemsHTML || '<div class="text-muted" style="padding: 8px 0;">គ្មាន Sub-Menu ឡើយ</div>'}
                </div>
            `;
            container.appendChild(card);
        }
    } catch (e) {
        console.error(e);
    }
}

function toggleMenuTree(headerEl) {
    const listEl = headerEl.nextElementSibling;
    const iconEl = headerEl.querySelector('.tree-icon');
    if (!listEl) return;

    if (listEl.style.display === 'none' || !listEl.style.display) {
        listEl.style.display = 'flex';
        if (iconEl) iconEl.style.transform = 'rotate(90deg)';
    } else {
        listEl.style.display = 'none';
        if (iconEl) iconEl.style.transform = 'rotate(0deg)';
    }
}

// Add Main Menu
document.getElementById('btn-add-main-menu-modal')?.addEventListener('click', async () => {
    const name = prompt('បញ្ចូលឈ្មោះ Main Menu ថ្មី (e.g. Casino, Sports):');
    if (!name) return;
    try {
        const res = await fetch('/api/menus/main', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: name.trim() })
        });
        if (res.ok) {
            showToast('✅ បានបន្ថែម Main Menu ថ្មី!', 'success');
            loadMenusManager();
            loadUserPortal();
        }
    } catch (e) { showToast(`❌ ${e.message}`, 'error'); }
});

// Add Sub Menu
document.getElementById('btn-add-sub-menu-modal')?.addEventListener('click', async () => {
    try {
        const res = await fetch('/api/menus');
        const data = await res.json();
        const mainMenus = data.main_menus || {};
        const mainList = Object.keys(mainMenus);

        if (!mainList.length) {
            showToast('⚠️ មិនទាន់មាន Main Menu ឡើយ! សូមបង្កើត Main Menu ជាមុនសិន។', 'error');
            return;
        }

        // Step 1: Choose Main Menu first
        let mainPrompt = 'សូមជ្រើសរើស Main Menu ជាមុនសិន (បញ្ចូលលេខ ឬឈ្មោះ)៖\n\n';
        mainList.forEach((m, idx) => {
            mainPrompt += `${idx + 1}. ${m}\n`;
        });

        const selectedInput = prompt(mainPrompt, '1');
        if (!selectedInput) return;

        let selectedMain = selectedInput.trim();
        const numIndex = parseInt(selectedMain) - 1;
        if (!isNaN(numIndex) && numIndex >= 0 && numIndex < mainList.length) {
            selectedMain = mainList[numIndex];
        } else if (!mainList.includes(selectedMain)) {
            showToast(`❌ មិនរកឃើញ Main Menu "${selectedMain}" ឡើយ!`, 'error');
            return;
        }

        // Step 2: Enter Sub Menu Name to add to the chosen Main Menu
        const subName = prompt(`បានជ្រើសរើស Main Menu: "${selectedMain}"\n\nសូមបញ្ចូលឈ្មោះ Sub Menu ថ្មី (ឧ. ${selectedMain}_NEW):`);
        if (!subName || !subName.trim()) return;

        const addRes = await fetch('/api/menus/sub', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: subName.trim(), main_menu: selectedMain })
        });
        if (addRes.ok) {
            showToast(`✅ បានបន្ថែម Sub Menu "${subName.trim()}" ទៅក្នុង Main Menu "${selectedMain}" រួចរាល់!`, 'success');
            loadMenusManager();
            loadUserPortal();
        } else {
            showToast('❌ បរាជ័យក្នុងការបន្ថែម Sub Menu', 'error');
        }
    } catch (e) { showToast(`❌ ${e.message}`, 'error'); }
});

async function addSubMenuToMain(mainCat) {
    const subName = prompt(`បន្ថែម Sub Menu ថ្មី ទៅក្នុង Main Menu "${mainCat}"៖`);
    if (!subName || !subName.trim()) return;
    try {
        const res = await fetch('/api/menus/sub', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: subName.trim(), main_menu: mainCat })
        });
        if (res.ok) {
            showToast(`✅ បានបន្ថែម Sub Menu "${subName.trim()}" ទៅក្នុង "${mainCat}" រួចរាល់!`, 'success');
            loadMenusManager();
            loadUserPortal();
        }
    } catch (e) { showToast(`❌ ${e.message}`, 'error'); }
}

async function renameMainMenu(oldName) {
    const newName = prompt(`កែប្រែឈ្មោះ Main Menu ពី "${oldName}" ទៅជា:`, oldName);
    if (!newName || newName === oldName) return;
    try {
        const res = await fetch(`/api/menus/main/${encodeURIComponent(oldName)}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ newName: newName.trim() })
        });
        if (res.ok) {
            showToast('✅ កែប្រែឈ្មោះ Main Menu រួចរាល់', 'success');
            loadMenusManager();
            loadUserPortal();
        }
    } catch (e) {}
}

async function deleteMainMenu(name) {
    if (!confirm(`តើអ្នកពិតជាចង់លុប Main Menu "${name}" មែនទេ?`)) return;
    if (!await confirmAdminPasswordPrompt(`លុប Main Menu "${name}"`)) return;

    try {
        const res = await fetch(`/api/menus/main/${encodeURIComponent(name)}`, { method: 'DELETE' });
        if (res.ok) {
            showToast('✅ បានលុប Main Menu រួចរាល់', 'success');
            loadMenusManager();
            loadUserPortal();
        }
    } catch (e) {}
}

async function renameSubMenu(oldName) {
    const newName = prompt(`កែប្រែឈ្មោះ Sub Menu ពី "${oldName}" ទៅជា:`, oldName);
    if (!newName || newName === oldName) return;
    try {
        const res = await fetch(`/api/menus/sub/${encodeURIComponent(oldName)}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ newName: newName.trim() })
        });
        if (res.ok) {
            showToast('✅ កែប្រែឈ្មោះ Sub Menu រួចរាល់', 'success');
            loadMenusManager();
            loadUserPortal();
        }
    } catch (e) {}
}

async function deleteSubMenu(name) {
    if (!confirm(`តើអ្នកពិតជាចង់លុប Sub Menu "${name}" មែនទេ?`)) return;
    if (!await confirmAdminPasswordPrompt(`លុប Sub Menu "${name}"`)) return;

    try {
        const res = await fetch(`/api/menus/sub/${encodeURIComponent(name)}`, { method: 'DELETE' });
        if (res.ok) {
            showToast('✅ បានលុប Sub Menu រួចរាល់', 'success');
            loadMenusManager();
            loadUserPortal();
        }
    } catch (e) {}
}


// ================= 6. HISTORY LOGS =================
let histCurrentPage = 1;

async function loadHistoryTable() {
    const tableBody = document.getElementById('history-table-body');
    if (!tableBody) return;

    const searchVal = '';
    const startDate = document.getElementById('hist-date-start')?.value || '';
    const endDate = document.getElementById('hist-date-end')?.value || '';

    try {
        let apiUrl = `/api/history?page=${histCurrentPage}&limit=15&q=${encodeURIComponent(searchVal)}`;
        if (startDate) apiUrl += `&start_date=${startDate}`;
        if (endDate) apiUrl += `&end_date=${endDate}`;

        const res = await fetch(apiUrl);
        const data = await res.json();

        tableBody.innerHTML = '';
        if (!data.history || data.history.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="7" class="text-center text-muted" style="padding: 24px;">គ្មានប្រវត្តិទាញយកឡើយ</td></tr>`;
        } else {
            data.history.forEach(h => {
                const stockLeftVal = (h.stock_left !== undefined && h.stock_left !== null) ? h.stock_left : '-';
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td data-label="LOG ID">#${h.id}</td>
                    <td data-label="អ្នកប្រើប្រាស់"><strong>${h.tg_name || 'Web User'}</strong></td>
                    <td data-label="MENU NAME"><span class="badge blue-badge">${h.menu_name}</span></td>
                    <td data-label="USERNAME"><code>${h.account_username}</code></td>
                    <td data-label="PASSWORD"><code>${h.account_password}</code></td>
                    <td data-label="ស្តុកនៅសល់"><span class="badge green-badge">${stockLeftVal}</span></td>
                    <td data-label="កាលបរិច្ឆេទ"><span class="text-muted">${h.timestamp}</span></td>
                `;
                tableBody.appendChild(tr);
            });
        }

        document.getElementById('hist-page-info').innerText = `Showing page ${data.page} of ${data.totalPages || 1} (${data.total} total logs)`;
        document.getElementById('hist-current-page').innerText = data.page;
        document.getElementById('hist-prev-btn').disabled = data.page <= 1;
        document.getElementById('hist-next-btn').disabled = data.page >= data.totalPages;

    } catch (e) { console.error(e); }
}

// Clear All History Handler
document.getElementById('btn-delete-all-history')?.addEventListener('click', async () => {
    if (!confirm('⚠️ តើអ្នកពិតជាចង់លុបប្រវត្តិទាញយកទាំងអស់ចេញពី Database មែនទេ? សកម្មភាពនេះមិនអាចសើរើបានឡើយ!')) return;
    if (!await confirmAdminPasswordPrompt('លុបប្រវត្តិទាញយកទាំងអស់')) return;

    try {
        const res = await fetch('/api/history', { method: 'DELETE' });
        if (res.ok) {
            showToast('✅ បានលុបប្រវត្តិទាញយកទាំងអស់ចេញពីប្រព័ន្ធដោយជោគជ័យ!', 'success');
            histCurrentPage = 1;
            loadHistoryTable();
            loadDashboard();
        } else {
            showToast('❌ បរាជ័យក្នុងការលុបប្រវត្តិទាញយក', 'error');
        }
    } catch (e) { showToast(`❌ ${e.message}`, 'error'); }
});

// ================= HISTORY SUBTAB SWITCHING =================
document.querySelectorAll('.history-sub-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.history-sub-btn').forEach(b => {
            b.classList.remove('active', 'btn-primary');
            b.classList.add('btn-secondary');
        });
        btn.classList.remove('btn-secondary');
        btn.classList.add('active', 'btn-primary');

        const subtab = btn.dataset.subtab;
        if (subtab === 'logs') {
            document.getElementById('subtab-history-logs-content').style.display = 'block';
            document.getElementById('subtab-history-delete-content').style.display = 'none';
            loadHistoryTable();
        } else if (subtab === 'delete') {
            document.getElementById('subtab-history-logs-content').style.display = 'none';
            document.getElementById('subtab-history-delete-content').style.display = 'block';
            loadDeleteSingleHistoryTable();
        }
    });
});

// ================= DELETE HISTORY LOGS ONE BY ONE =================
let histDeleteSinglePage = 1;

async function loadDeleteSingleHistoryTable() {
    const tableBody = document.getElementById('history-delete-single-table-body');
    if (!tableBody) return;

    const searchVal = document.getElementById('hist-delete-single-search')?.value.trim() || '';

    try {
        let apiUrl = `/api/history?page=${histDeleteSinglePage}&limit=10&q=${encodeURIComponent(searchVal)}`;

        const res = await fetch(apiUrl);
        const data = await res.json();

        tableBody.innerHTML = '';
        if (!data.history || data.history.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="7" class="text-center text-muted" style="padding: 24px;">គ្មានប្រវត្តិទាញយកឡើយ</td></tr>`;
        } else {
            data.history.forEach(h => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td data-label="LOG ID">#${h.id}</td>
                    <td data-label="អ្នកប្រើប្រាស់"><strong>${h.tg_name || 'Web User'}</strong></td>
                    <td data-label="MENU NAME"><span class="badge blue-badge">${h.menu_name}</span></td>
                    <td data-label="USERNAME"><code>${h.account_username}</code></td>
                    <td data-label="PASSWORD"><code>${h.account_password}</code></td>
                    <td data-label="កាលបរិច្ឆេទ"><span class="text-muted">${h.timestamp}</span></td>
                    <td data-label="សកម្មភាព">
                        <button type="button" class="btn btn-danger btn-sm btn-delete-single-log" data-id="${h.id}" style="padding: 4px 10px; font-size: 12px;">
                            <i class="fa-solid fa-trash-can"></i> លុប
                        </button>
                    </td>
                `;
                tableBody.appendChild(tr);
            });
        }

        document.getElementById('hist-delete-single-page-info').innerText = `Showing page ${data.page} of ${data.totalPages || 1} (${data.total} total logs)`;
        document.getElementById('hist-delete-single-current-page').innerText = data.page;
        document.getElementById('hist-delete-single-prev-btn').disabled = data.page <= 1;
        document.getElementById('hist-delete-single-next-btn').disabled = data.page >= data.totalPages;

    } catch (e) { console.error(e); }
}

async function deleteSingleHistoryLog(id) {
    if (!confirm(`⚠️ តើអ្នកពិតជាចង់លុបប្រវត្តិទាញយក #Log ID: ${id} មែនទេ?`)) return;
    if (!await confirmAdminPasswordPrompt(`លុបប្រវត្តិទាញយក #${id}`)) return;

    try {
        const res = await fetch(`/api/history?id=${id}`, { method: 'DELETE' });
        const data = await res.json();
        if (res.ok && data.success) {
            showToast(`✅ បានលុបប្រវត្តិទាញយក #${id} ដោយជោគជ័យ!`, 'success');
            loadDeleteSingleHistoryTable();
            loadHistoryTable();
            loadDashboard();
        } else {
            showToast(`❌ ${data.error || 'បរាជ័យក្នុងការលុប'}`, 'error');
        }
    } catch (e) {
        showToast(`❌ ${e.message}`, 'error');
    }
}

// Event Delegation for Single Delete Buttons
document.addEventListener('click', (e) => {
    const btn = e.target.closest('.btn-delete-single-log');
    if (btn) {
        const id = btn.dataset.id;
        if (id) deleteSingleHistoryLog(id);
    }
});

// Single Delete Search & Pagination Listeners
document.getElementById('hist-delete-single-search')?.addEventListener('input', () => {
    histDeleteSinglePage = 1;
    loadDeleteSingleHistoryTable();
});
document.getElementById('hist-delete-single-prev-btn')?.addEventListener('click', () => {
    if (histDeleteSinglePage > 1) {
        histDeleteSinglePage--;
        loadDeleteSingleHistoryTable();
    }
});
document.getElementById('hist-delete-single-next-btn')?.addEventListener('click', () => {
    histDeleteSinglePage++;
    loadDeleteSingleHistoryTable();
});

document.getElementById('hist-delete-date-start')?.addEventListener('change', (e) => {
    const logsStart = document.getElementById('hist-date-start');
    if (logsStart) logsStart.value = e.target.value;
});

document.getElementById('hist-delete-date-end')?.addEventListener('change', (e) => {
    const logsEnd = document.getElementById('hist-date-end');
    if (logsEnd) logsEnd.value = e.target.value;
});

// Delete History by Custom Date Range Handler
document.getElementById('btn-delete-range-history')?.addEventListener('click', async () => {
    const startDate = document.getElementById('hist-delete-date-start')?.value || document.getElementById('hist-date-start')?.value || '';
    const endDate = document.getElementById('hist-delete-date-end')?.value || document.getElementById('hist-date-end')?.value || '';

    if (!startDate && !endDate) {
        showToast('⚠️ សូមជ្រើសរើសថ្ងៃខែ (ចាប់ពី ឬ ដល់) ជាមុនសិន!', 'error');
        return;
    }

    let confirmMsg = '⚠️ តើអ្នកពិតជាចង់លុបប្រវត្តិទាញយក';
    if (startDate && endDate) {
        confirmMsg += ` ចាប់ពីថ្ងៃ ${startDate} ដល់ ${endDate} មែនទេ?`;
    } else if (startDate) {
        confirmMsg += ` ចាប់ពីថ្ងៃ ${startDate} ទៅ មែនទេ?`;
    } else {
        confirmMsg += ` រហូតដល់ថ្ងៃ ${endDate} មែនទេ?`;
    }

    if (!confirm(confirmMsg)) return;
    if (!await confirmAdminPasswordPrompt('លុបប្រវត្តិទាញយកតាមកាលបរិច្ឆេទ')) return;

    try {
        const queryParams = new URLSearchParams();
        if (startDate) queryParams.append('start_date', startDate);
        if (endDate) queryParams.append('end_date', endDate);

        const res = await fetch(`/api/history?${queryParams.toString()}`, { method: 'DELETE' });
        const data = await res.json();

        if (res.ok && data.success) {
            showToast(`✅ បានលុបប្រវត្តិទាញយកចំនួន ${data.count !== undefined ? data.count : ''} Record តាមកាលបរិច្ឆេទដោយជោគជ័យ!`, 'success');
            histCurrentPage = 1;
            loadHistoryTable();
            loadDashboard();
        } else {
            showToast(`❌ ${data.error || 'បរាជ័យក្នុងការលុបប្រវត្តិទាញយក'}`, 'error');
        }
    } catch (e) {
        showToast(`❌ ${e.message}`, 'error');
    }
});

// Event Listeners for History search & date filters
document.getElementById('hist-search-input')?.addEventListener('input', () => { histCurrentPage = 1; loadHistoryTable(); });
document.getElementById('hist-date-start')?.addEventListener('change', () => { histCurrentPage = 1; loadHistoryTable(); });
document.getElementById('hist-date-end')?.addEventListener('change', () => { histCurrentPage = 1; loadHistoryTable(); });

document.getElementById('btn-clear-date-filter')?.addEventListener('click', () => {
    const startInput = document.getElementById('hist-date-start');
    const endInput = document.getElementById('hist-date-end');
    if (startInput) startInput.value = '';
    if (endInput) endInput.value = '';
    histCurrentPage = 1;
    loadHistoryTable();
});

document.getElementById('hist-prev-btn')?.addEventListener('click', () => { if (histCurrentPage > 1) { histCurrentPage--; loadHistoryTable(); } });
document.getElementById('hist-next-btn')?.addEventListener('click', () => { histCurrentPage++; loadHistoryTable(); });


// ================= 7. BOT CONTROLLER & TOKEN SETTINGS =================
async function loadBotController() {
    try {
        const res = await fetch('/api/status');
        const data = await res.json();

        if (data.token) {
            const botTokenInput = document.getElementById('bot-token-input');
            if (botTokenInput) botTokenInput.value = data.token;
        }
        if (data.admin_ids) {
            const adminInput = document.getElementById('admin-ids-input');
            if (adminInput) adminInput.value = data.admin_ids.join(', ');
        }

        updateBotProcessUI(data.bot_running);
    } catch (e) {}
}

function updateBotProcessUI(running) {
    const pill = document.getElementById('bot-process-status-pill');
    const startBtn = document.getElementById('btn-start-bot');
    const stopBtn = document.getElementById('btn-stop-bot');

    if (startBtn) startBtn.disabled = false;
    if (stopBtn) stopBtn.disabled = false;

    if (running) {
        if (pill) pill.innerHTML = '<i class="fa-solid fa-circle green-text"></i> RUNNING (កំពុងដំណើការ)';
    } else {
        if (pill) pill.innerHTML = '<i class="fa-solid fa-circle red-text"></i> STOPPED (បានបិទ)';
    }
}

async function startBotAction() {
    try {
        const res = await fetch('/api/bot/start', { method: 'POST' });
        const data = await res.json();
        if (res.ok) {
            showToast('🚀 Telegram Bot process started!', 'success');
            updateBotProcessUI(true);
        }
    } catch (e) { showToast(`❌ ${e.message}`, 'error'); }
}

async function stopBotAction() {
    try {
        const res = await fetch('/api/bot/stop', { method: 'POST' });
        const data = await res.json();
        if (res.ok) {
            showToast('🛑 Telegram Bot process stopped!', 'success');
            updateBotProcessUI(false);
        }
    } catch (e) { showToast(`❌ ${e.message}`, 'error'); }
}

document.getElementById('btn-start-bot')?.addEventListener('click', startBotAction);
document.getElementById('btn-stop-bot')?.addEventListener('click', stopBotAction);

// Toggle Bot Token Visibility Handler
function setupTokenVisibilityToggle(btnId, inputId) {
    document.getElementById(btnId)?.addEventListener('click', () => {
        const input = document.getElementById(inputId);
        if (input) {
            input.type = input.type === 'password' ? 'text' : 'password';
        }
    });
}
setupTokenVisibilityToggle('btn-toggle-token', 'bot-token-input');

// Helper to save token
async function saveBotToken(tokenValue, adminIdsValue) {
    if (!tokenValue) {
        showToast('❌ សូមបញ្ចូល Telegram Bot Token', 'error');
        return;
    }
    const adminIds = adminIdsValue ? adminIdsValue.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n)) : [8558847170];

    try {
        const res = await fetch('/api/config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: tokenValue, admin_ids: adminIds })
        });
        if (res.ok) {
            showToast('✅ បានរក្សាទុកការកំណត់ Bot Token ដោយជោគជ័យ!', 'success');
            loadBotController();
        }
    } catch (e) { showToast(`❌ ${e.message}`, 'error'); }
}

// Save Bot Config Handler
document.getElementById('btn-save-config')?.addEventListener('click', () => {
    const token = document.getElementById('bot-token-input')?.value.trim() || '';
    const adminInput = document.getElementById('admin-ids-input');
    const adminStr = adminInput ? adminInput.value.trim() : '';
    saveBotToken(token, adminStr);
});


// Poll Bot Logs
async function pollBotLogs() {
    const terminal = document.getElementById('bot-terminal-logs');
    if (!terminal) return;

    try {
        const res = await fetch('/api/bot/logs');
        const data = await res.json();

        updateBotProcessUI(data.running);

        if (data.logs && data.logs.length > 0) {
            terminal.innerHTML = data.logs.map(l => `<div class="terminal-line">${escapeHTML(l)}</div>`).join('');
            terminal.scrollTop = terminal.scrollHeight;
        }
    } catch (e) {}
}


// ================= HELPER FUNCTIONS =================
function openModal(id) {
    document.getElementById(id)?.classList.add('active');
}

// Check & Execute Rollback on Modal Close if not copied
async function checkRollbackOnClose(modalId) {
    if (modalId === 'modal-claim-result') {
        if (!isAccountCopied && currentClaimedData) {
            const rollbackData = { ...currentClaimedData };
            currentClaimedData = null;
            try {
                const res = await fetch('/api/rollback', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(rollbackData)
                });
                if (res.ok) {
                    showToast(`↩️ មិនបានចម្លង - បានប្រគល់អាខោន ${rollbackData.menu_name} ទៅស្តុកវិញ!`, 'info');
                    loadUserPortal();
                    loadDashboard();
                }
            } catch (e) {
                console.error('Rollback error:', e);
            }
        } else {
            currentClaimedData = null;
        }
    }
}

function closeModal(id) {
    checkRollbackOnClose(id);
    document.getElementById(id)?.classList.remove('active');
}

document.querySelectorAll('.modal-close').forEach(btn => {
    btn.addEventListener('click', (e) => {
        const modal = e.target.closest('.modal-overlay');
        if (modal) {
            checkRollbackOnClose(modal.id);
            modal.classList.remove('active');
        }
    });
});

function copyText(elementId) {
    const text = document.getElementById(elementId)?.innerText;
    if (text) {
        navigator.clipboard.writeText(text);
        showToast('📋 បានចម្លងទៅ Clipboard!', 'success');
    }
}

function showToast(message, type = 'info') {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<span>${message}</span>`;

    container.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        toast.style.transition = 'all 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}

function escapeHTML(str) {
    return str.replace(/[&<>'"]/g, 
        tag => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;'
        }[tag] || tag)
    );
}

// ================= 8. EXCEL CLIENT-SIDE EXPORT & TEMPLATE GENERATOR =================
async function exportExcelTemplateAndData() {
    try {
        showToast('⏳ កំពុងបង្កើតឯកសារ Excel (Please wait)...', 'info');
        
        // Fetch all accounts
        const accRes = await fetch('/api/accounts?limit=10000');
        const accData = await accRes.json();
        const accounts = accData.accounts || [];

        // Fetch menus
        const menuRes = await fetch('/api/menus');
        const menuData = await menuRes.json();
        const allMenus = menuData.all_menus || [];

        const wb = XLSX.utils.book_new();

        // Sheet 1: Data_Entry (Sample Template)
        const sampleData = [
            { menu_name: "SB_CH_KH", username: "sample_user01", password: "pass1234(sample)" },
            { menu_name: "Ball_CH", username: "sample_user02", password: "pass5678(sample)" }
        ];
        const wsDataEntry = XLSX.utils.json_to_sheet(sampleData, { header: ["menu_name", "username", "password"] });
        XLSX.utils.book_append_sheet(wb, wsDataEntry, "Data_Entry");

        // Sheet 2: menu_name (List of valid menus)
        const menuListRows = allMenus.map(m => ({ menu_name: m }));
        const wsMenus = XLSX.utils.json_to_sheet(menuListRows, { header: ["menu_name"] });
        XLSX.utils.book_append_sheet(wb, wsMenus, "menu_name");

        // Sheet 3: All Data
        const allDataRows = accounts.map(a => ({
            menu_name: a.menu_name,
            username: a.username,
            password: a.password
        }));
        const wsAllData = XLSX.utils.json_to_sheet(allDataRows, { header: ["menu_name", "username", "password"] });
        XLSX.utils.book_append_sheet(wb, wsAllData, "All Data");

        // Generate and download
        XLSX.writeFile(wb, "accounts_template_and_data.xlsx");
        showToast('✅ ទាញយកឯកសារ accounts_template_and_data.xlsx រួចរាល់!', 'success');
    } catch (e) {
        showToast(`❌ បរាជ័យក្នុងការទាញយក Excel: ${e.message}`, 'error');
    }
}

async function exportExcelHistory() {
    try {
        showToast('⏳ កំពុងរៀបចំឯកសារប្រវត្តិទាញយក (History)...', 'info');

        const startDate = document.getElementById('hist-date-start')?.value || '';
        const endDate = document.getElementById('hist-date-end')?.value || '';

        let apiUrl = '/api/history?limit=10000';
        if (startDate) apiUrl += `&start_date=${startDate}`;
        if (endDate) apiUrl += `&end_date=${endDate}`;

        const res = await fetch(apiUrl);
        const data = await res.json();
        const historyList = data.history || [];

        const rows = historyList.map(h => ({
            ID: h.id,
            "Telegram Name": h.tg_name || "Web User",
            "Telegram Username": h.tg_username || "web_user",
            "Category/Menu": h.menu_name,
            "Account Username": h.account_username,
            "Account Password": h.account_password,
            "Timestamp": h.timestamp
        }));

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(rows);
        XLSX.utils.book_append_sheet(wb, ws, "Claim History");

        XLSX.writeFile(wb, "claim_history_logs.xlsx");
        showToast('✅ ទាញយកឯកសារ claim_history_logs.xlsx រួចរាល់!', 'success');
    } catch (e) {
        showToast(`❌ បរាជ័យក្នុងការទាញយកប្រវត្តិ Excel: ${e.message}`, 'error');
    }
}

document.getElementById('btn-export-excel-template')?.addEventListener('click', exportExcelTemplateAndData);
document.getElementById('btn-export-excel-history')?.addEventListener('click', exportExcelHistory);
document.getElementById('btn-export-history-header')?.addEventListener('click', exportExcelHistory);


// ================= ADMIN AUTHENTICATION SYSTEM =================
let isAdminLoggedIn = false;

function checkAdminAuth() {
    isAdminLoggedIn = sessionStorage.getItem('is_admin_logged_in') === 'true';
    updateAdminUI();
}

function updateAdminUI() {
    const adminTabs = document.querySelectorAll('.admin-only-tab');
    const authBtn = document.getElementById('btn-admin-auth');
    const navTabsBar = document.querySelector('.nav-tabs');

    if (isAdminLoggedIn) {
        if (navTabsBar) navTabsBar.style.display = 'flex';
        adminTabs.forEach(t => t.style.display = 'inline-flex');
        if (authBtn) {
            authBtn.className = 'btn btn-danger btn-sm';
            authBtn.style.background = 'var(--danger)';
            authBtn.style.color = '#fff';
            authBtn.title = 'Logout (Admin)';
            authBtn.innerHTML = '<i class="fa-solid fa-right-from-bracket"></i>';
        }
    } else {
        if (navTabsBar) navTabsBar.style.display = 'none';
        adminTabs.forEach(t => t.style.display = 'none');
        if (authBtn) {
            authBtn.className = 'btn btn-secondary btn-sm';
            authBtn.style.background = 'rgba(255, 255, 255, 0.08)';
            authBtn.style.color = 'var(--text-main)';
            authBtn.title = 'Admin Login';
            authBtn.innerHTML = '🔑';
        }

        const activeTab = document.querySelector('.nav-tab.active');
        if (activeTab && activeTab.classList.contains('admin-only-tab')) {
            document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));

            const portalTab = document.querySelector('.nav-tab[data-tab="user-portal"]');
            if (portalTab) portalTab.classList.add('active');
            const portalPane = document.getElementById('tab-user-portal');
            if (portalPane) portalPane.classList.add('active');
            loadUserPortal();
        }
    }
}

// Admin Login Button Click
document.getElementById('btn-admin-auth')?.addEventListener('click', () => {
    if (isAdminLoggedIn) {
        if (confirm('🔒 តើអ្នកពិតជាចង់ចាកចេញពី Admin Mode មែនទេ?')) {
            sessionStorage.removeItem('is_admin_logged_in');
            isAdminLoggedIn = false;
            updateAdminUI();
            showToast('ℹ️ បានចាកចេញពី Admin Mode', 'info');
        }
    } else {
        const modal = document.getElementById('modal-admin-login');
        const pwdInput = document.getElementById('admin-login-pwd-input');
        if (pwdInput) pwdInput.value = '';
        if (modal) modal.style.display = 'flex';
    }
});

// Close Admin Modal Button
document.getElementById('btn-close-admin-modal')?.addEventListener('click', () => {
    const modal = document.getElementById('modal-admin-login');
    if (modal) modal.style.display = 'none';
});

// Submit Admin Login Form
document.getElementById('form-admin-login')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const pwdInput = document.getElementById('admin-login-pwd-input');
    const pwd = pwdInput ? pwdInput.value.trim() : '';

    try {
        const res = await fetch('/api/admin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'login', password: pwd })
        });
        const data = await res.json();

        if (res.ok && data.success) {
            sessionStorage.setItem('is_admin_logged_in', 'true');
            isAdminLoggedIn = true;
            updateAdminUI();
            const modal = document.getElementById('modal-admin-login');
            if (modal) modal.style.display = 'none';
            showToast('✅ Admin Login ជោគជ័យ! ឥឡូវអ្នកអាចប្រើប្រាស់ Admin Tabs ទាំងអស់បាន', 'success');
        } else {
            showToast(`❌ ${data.error || 'ពាក្យសម្ងាត់មិនត្រឹមត្រូវឡើយ!'}`, 'error');
        }
    } catch (err) {
        showToast(`❌ ${err.message}`, 'error');
    }
});

// Change Admin Password Handler in Bot Controller
document.getElementById('btn-save-admin-pwd')?.addEventListener('click', async () => {
    const oldPwd = document.getElementById('change-pwd-old')?.value || '';
    const newPwd = document.getElementById('change-pwd-new')?.value || '';

    if (!oldPwd || !newPwd) {
        showToast('⚠️ សូមបញ្ចូលពាក្យសម្ងាត់ចាស់ និងពាក្យសម្ងាត់ថ្មី!', 'error');
        return;
    }

    try {
        const res = await fetch('/api/admin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'change_password', old_password: oldPwd, new_password: newPwd })
        });
        const data = await res.json();

        if (res.ok && data.success) {
            showToast('✅ កែប្រែពាក្យសម្ងាត់ Admin រួចរាល់!', 'success');
            document.getElementById('change-pwd-old').value = '';
            document.getElementById('change-pwd-new').value = '';
        } else {
            showToast(`❌ ${data.error || 'បរាជ័យក្នុងការកែប្រែពាក្យសម្ងាត់'}`, 'error');
        }
    } catch (e) {
        showToast(`❌ ${e.message}`, 'error');
    }
});


// ================= 8. SUMMARIZE REPORTS =================
async function loadSummarizeClaimedReport() {
    const tableBody = document.getElementById('summarize-claimed-table-body');
    if (!tableBody) return;

    const searchVal = document.getElementById('sum-search-input')?.value.trim() || '';
    const startDate = document.getElementById('sum-date-start')?.value || '';
    const endDate = document.getElementById('sum-date-end')?.value || '';

    try {
        let apiUrl = `/api/summary/claimed?q=${encodeURIComponent(searchVal)}`;
        if (startDate) apiUrl += `&start_date=${startDate}`;
        if (endDate) apiUrl += `&end_date=${endDate}`;

        const res = await fetch(apiUrl);
        const data = await res.json();

        // Update Top Metrics
        if (data.metrics) {
            document.getElementById('sum-today-claimed').innerText = data.metrics.today_claimed || 0;
            document.getElementById('sum-yesterday-claimed').innerText = data.metrics.yesterday_claimed || 0;
            document.getElementById('sum-month-claimed').innerText = data.metrics.month_claimed || 0;
            document.getElementById('sum-top-category').innerText = data.metrics.top_category_today || '-';
        }

        tableBody.innerHTML = '';
        if (!data.summary || data.summary.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="4" class="text-center text-muted" style="padding: 24px;">គ្មានរបាយការណ៍ទិន្នន័យទាញយកឡើយ (No Summarized Claimed Data)</td></tr>`;
            return;
        }

        data.summary.forEach(item => {
            const tr = document.createElement('tr');

            // Format Breakdown Badges (Sorted Descending by Count)
            let breakdownHTML = '';
            if (item.breakdown) {
                const sortedEntries = Object.entries(item.breakdown).sort((a, b) => b[1] - a[1]);
                sortedEntries.forEach(([cat, count]) => {
                    breakdownHTML += `<span class="badge blue-badge" style="white-space: nowrap;">${cat}: <strong>${count}</strong></span>`;
                });
                breakdownHTML = `<div class="sum-breakdown-container">${breakdownHTML}</div>`;
            } else {
                breakdownHTML = '<span class="text-muted">-</span>';
            }

            tr.innerHTML = `
                <td data-label="កាលបរិច្ឆេទ"><strong><i class="fa-solid fa-calendar-day"></i> ${item.date}</strong></td>
                <td data-label="ចំនួនទាញយកសរុប"><span class="badge green-badge" style="font-size: 15px;">${item.total} គណនី</span></td>
                <td data-label="ចំនួនអ្នកប្រើប្រាស់"><span class="badge purple-badge">${item.unique_users} នាក់</span></td>
                <td data-label="សេចក្តីលម្អិតតាម Menu">${breakdownHTML}</td>
            `;
            tableBody.appendChild(tr);
        });

    } catch (e) {
        console.error('Summarize report fetch error:', e);
    }
}

// Search & Filter event listeners for Summarize
document.getElementById('sum-search-input')?.addEventListener('input', loadSummarizeClaimedReport);
document.getElementById('sum-date-start')?.addEventListener('change', loadSummarizeClaimedReport);
document.getElementById('sum-date-end')?.addEventListener('change', loadSummarizeClaimedReport);

// Quick Filter Buttons
document.getElementById('btn-sum-quick-today')?.addEventListener('click', () => {
    const todayStr = new Date(Date.now() + (7 * 60 * 60 * 1000)).toISOString().slice(0, 10);
    document.getElementById('sum-date-start').value = todayStr;
    document.getElementById('sum-date-end').value = todayStr;
    loadSummarizeClaimedReport();
});

document.getElementById('btn-sum-quick-yesterday')?.addEventListener('click', () => {
    const yesterdayStr = new Date(Date.now() + (7 * 60 * 60 * 1000) - (86400000)).toISOString().slice(0, 10);
    document.getElementById('sum-date-start').value = yesterdayStr;
    document.getElementById('sum-date-end').value = yesterdayStr;
    loadSummarizeClaimedReport();
});

document.getElementById('btn-sum-quick-7days')?.addEventListener('click', () => {
    const todayStr = new Date(Date.now() + (7 * 60 * 60 * 1000)).toISOString().slice(0, 10);
    const date7AgoStr = new Date(Date.now() + (7 * 60 * 60 * 1000) - (7 * 86400000)).toISOString().slice(0, 10);
    document.getElementById('sum-date-start').value = date7AgoStr;
    document.getElementById('sum-date-end').value = todayStr;
    loadSummarizeClaimedReport();
});

document.getElementById('btn-sum-reset')?.addEventListener('click', () => {
    document.getElementById('sum-date-start').value = '';
    document.getElementById('sum-date-end').value = '';
    document.getElementById('sum-search-input').value = '';
    loadSummarizeClaimedReport();
});

// Export Excel for Daily Claimed Summary
document.getElementById('btn-sum-export-excel')?.addEventListener('click', async () => {
    const searchVal = document.getElementById('sum-search-input')?.value.trim() || '';
    const startDate = document.getElementById('sum-date-start')?.value || '';
    const endDate = document.getElementById('sum-date-end')?.value || '';

    try {
        let apiUrl = `/api/summary/claimed?q=${encodeURIComponent(searchVal)}`;
        if (startDate) apiUrl += `&start_date=${startDate}`;
        if (endDate) apiUrl += `&end_date=${endDate}`;

        const res = await fetch(apiUrl);
        const data = await res.json();

        if (!data.summary || data.summary.length === 0) {
            showToast('⚠️ គ្មានទិន្នន័យសម្រាប់ Export ឡើយ', 'error');
            return;
        }

        const excelRows = data.summary.map(item => {
            const sortedBreakdown = item.breakdown ? Object.entries(item.breakdown).sort((a, b) => b[1] - a[1]) : [];
            const breakdownStr = sortedBreakdown.map(([c, k]) => `${c}: ${k}`).join(', ');
            return {
                "Date (កាលបរិច្ឆេទ)": item.date,
                "Total Claimed (ចំនួនទាញយក)": item.total,
                "Unique Users (ចំនួនអ្នកប្រើ)": item.unique_users,
                "Breakdown (សេចក្តីលម្អិត)": breakdownStr
            };
        });

        const worksheet = XLSX.utils.json_to_sheet(excelRows);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Daily Claimed Summary");

        const todayStr = new Date().toISOString().slice(0, 10);
        XLSX.writeFile(workbook, `Daily_Claimed_Summary_${todayStr}.xlsx`);
        showToast('✅ ទាញយករបាយការណ៍ Excel ដោយជោគជ័យ!', 'success');
    } catch (e) {
        showToast(`❌ បរាជ័យក្នុងការទាញយក Excel: ${e.message}`, 'error');
    }
});


// ================= SUMMARIZE SUBTAB SWITCHING =================
document.querySelectorAll('.summarize-sub-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.summarize-sub-btn').forEach(b => {
            b.classList.remove('active', 'btn-primary');
            b.classList.add('btn-secondary');
        });
        btn.classList.remove('btn-secondary');
        btn.classList.add('active', 'btn-primary');

        const subtab = btn.dataset.subtab;
        if (subtab === 'claimed') {
            document.getElementById('subtab-claimed-content').style.display = 'block';
            document.getElementById('subtab-user-content').style.display = 'none';
            loadSummarizeClaimedReport();
        } else if (subtab === 'user') {
            document.getElementById('subtab-claimed-content').style.display = 'none';
            document.getElementById('subtab-user-content').style.display = 'block';
            loadSummarizeUserReport();
        }
    });
});

// ================= SUMMARIZE USER DAILY REPORT =================
async function loadSummarizeUserReport() {
    const tableBody = document.getElementById('summarize-user-table-body');
    if (!tableBody) return;

    const searchVal = document.getElementById('sum-user-search-input')?.value.trim() || '';
    const startDate = document.getElementById('sum-user-date-start')?.value || '';
    const endDate = document.getElementById('sum-user-date-end')?.value || '';

    try {
        let apiUrl = `/api/summary/user?q=${encodeURIComponent(searchVal)}`;
        if (startDate) apiUrl += `&start_date=${startDate}`;
        if (endDate) apiUrl += `&end_date=${endDate}`;

        const res = await fetch(apiUrl);
        const data = await res.json();

        // Update Top Metrics
        if (data.metrics) {
            document.getElementById('sum-user-today-active').innerText = `${data.metrics.today_active_users || 0} នាក់`;
            document.getElementById('sum-user-top-today').innerText = data.metrics.top_user_today || '-';
            document.getElementById('sum-user-avg-today').innerText = `${data.metrics.avg_claims_today || 0} គណនី`;
        }

        tableBody.innerHTML = '';
        if (!data.summary || data.summary.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="4" class="text-center text-muted" style="padding: 24px;">គ្មានរបាយការណ៍ User ទាញយកឡើយ (No User Summary Data)</td></tr>`;
            return;
        }

        const sortedSummary = (data.summary || []).sort((a, b) => b.total_claimed - a.total_claimed);

        sortedSummary.forEach(item => {
            const tr = document.createElement('tr');

            // Format Breakdown Badges (Sorted Descending)
            let breakdownHTML = '';
            if (item.breakdown) {
                const sortedEntries = Object.entries(item.breakdown).sort((a, b) => b[1] - a[1]);
                sortedEntries.forEach(([cat, count]) => {
                    breakdownHTML += `<span class="badge blue-badge" style="white-space: nowrap;">${cat}: <strong>${count}</strong></span>`;
                });
                breakdownHTML = `<div class="sum-breakdown-container">${breakdownHTML}</div>`;
            } else {
                breakdownHTML = '<span class="text-muted">-</span>';
            }

            const usernameDisplay = item.tg_username ? `<code>@${item.tg_username}</code>` : '';

            tr.innerHTML = `
                <td data-label="កាលបរិច្ឆេទ"><strong><i class="fa-solid fa-calendar-day"></i> ${item.date}</strong></td>
                <td data-label="ឈ្មោះអ្នកប្រើប្រាស់"><strong>${item.user_name}</strong> ${usernameDisplay}</td>
                <td data-label="ចំនួនទាញយកសរុប"><span class="badge green-badge" style="font-size: 15px;">${item.total_claimed} គណនី</span></td>
                <td data-label="សេចក្តីលម្អិតតាម Category">${breakdownHTML}</td>
            `;
            tableBody.appendChild(tr);
        });

    } catch (e) {
        console.error('Summarize user report fetch error:', e);
    }
}

// Event Listeners for Summarize User Report
document.getElementById('sum-user-search-input')?.addEventListener('input', loadSummarizeUserReport);
document.getElementById('sum-user-date-start')?.addEventListener('change', loadSummarizeUserReport);
document.getElementById('sum-user-date-end')?.addEventListener('change', loadSummarizeUserReport);

document.getElementById('btn-sum-user-quick-today')?.addEventListener('click', () => {
    const todayStr = new Date(Date.now() + (7 * 60 * 60 * 1000)).toISOString().slice(0, 10);
    document.getElementById('sum-user-date-start').value = todayStr;
    document.getElementById('sum-user-date-end').value = todayStr;
    loadSummarizeUserReport();
});

document.getElementById('btn-sum-user-quick-yesterday')?.addEventListener('click', () => {
    const yesterdayStr = new Date(Date.now() + (7 * 60 * 60 * 1000) - (86400000)).toISOString().slice(0, 10);
    document.getElementById('sum-user-date-start').value = yesterdayStr;
    document.getElementById('sum-user-date-end').value = yesterdayStr;
    loadSummarizeUserReport();
});

document.getElementById('btn-sum-user-quick-7days')?.addEventListener('click', () => {
    const todayStr = new Date(Date.now() + (7 * 60 * 60 * 1000)).toISOString().slice(0, 10);
    const date7AgoStr = new Date(Date.now() + (7 * 60 * 60 * 1000) - (7 * 86400000)).toISOString().slice(0, 10);
    document.getElementById('sum-user-date-start').value = date7AgoStr;
    document.getElementById('sum-user-date-end').value = todayStr;
    loadSummarizeUserReport();
});

document.getElementById('btn-sum-user-reset')?.addEventListener('click', () => {
    document.getElementById('sum-user-date-start').value = '';
    document.getElementById('sum-user-date-end').value = '';
    document.getElementById('sum-user-search-input').value = '';
    loadSummarizeUserReport();
});

// Export Excel for User Summary
document.getElementById('btn-sum-user-export-excel')?.addEventListener('click', async () => {
    const searchVal = document.getElementById('sum-user-search-input')?.value.trim() || '';
    const startDate = document.getElementById('sum-user-date-start')?.value || '';
    const endDate = document.getElementById('sum-user-date-end')?.value || '';

    try {
        let apiUrl = `/api/summary/user?q=${encodeURIComponent(searchVal)}`;
        if (startDate) apiUrl += `&start_date=${startDate}`;
        if (endDate) apiUrl += `&end_date=${endDate}`;

        const res = await fetch(apiUrl);
        const data = await res.json();

        if (!data.summary || data.summary.length === 0) {
            showToast('⚠️ គ្មានទិន្នន័យសម្រាប់ Export ឡើយ', 'error');
            return;
        }

        const excelRows = data.summary.map(item => {
            const sortedBreakdown = item.breakdown ? Object.entries(item.breakdown).sort((a, b) => b[1] - a[1]) : [];
            const breakdownStr = sortedBreakdown.map(([c, k]) => `${c}: ${k}`).join(', ');
            return {
                "Date (កាលបរិច្ឆេទ)": item.date,
                "User Name (ឈ្មោះអ្នកប្រើ)": item.user_name,
                "Telegram Username": item.tg_username ? `@${item.tg_username}` : '',
                "Total Claimed (ចំនួនទាញយក)": item.total_claimed,
                "Breakdown (សេចក្តីលម្អិត)": breakdownStr
            };
        });

        const worksheet = XLSX.utils.json_to_sheet(excelRows);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Daily User Summary");

        const todayStr = new Date().toISOString().slice(0, 10);
        XLSX.writeFile(workbook, `Daily_User_Summary_${todayStr}.xlsx`);
        showToast('✅ ទាញយករបាយការណ៍ Excel តាម User ដោយជោគជ័យ!', 'success');
    } catch (e) {
        showToast(`❌ បរាជ័យក្នុងការទាញយក Excel: ${e.message}`, 'error');
    }
});

