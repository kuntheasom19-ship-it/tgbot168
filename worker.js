const DEFAULT_TOKEN = "8853663191:AAFZXa_aYKGzNyVVwSmuX6V_dHYw6jbSy3M";
const MAIN_MENUS = {
    "SB": ["SB_CH", "SB_CH_KH", "SB", "SB_KH", "SB_V", "SB_V_KH", "SB_PK", "SB_PK_KH", "SB_TH", "SB_TH_KH"],
    "Ball": ["Ball_CH", "Ball_V", "Ball_KL", "Ball_TH", "Ball_PK", "Ball"],
    "F88": ["F88_CH", "F88_CH_KH", "F88", "F88_KH", "F88_PK", "F88_PK_KH", "F88_V", "F88_V_KH", "F88_Joker", "F88_Joker_KH", "F88_BK", "F88_BK_KH", "F88_MB", "F88_MB_KH"],
    "Makav": ["Makav_CH", "Makav", "Makav_V", "Makav_KL", "Makav_PK", "Makav_TH"],
    "CK9999": ["CK99_CH", "CK99_CH_KH", "CK99_PK", "CK99_PK_KH", "CK99", "CK99_KH", "CK99_V", "CK99_V_KH", "CK99_TH", "CK99_TH_KH"],
    "Wa855": ["Wa855_CH", "Wa855_CH_KH", "Wa855", "Wa855_KH", "Wa855_PK", "Wa855_PK_KH", "W855_TH", "W855_TH_KH"],
    "M99": ["M99_CH", "M99_CH_KH", "M99", "M99_KH", "M99_PK", "M99_PK_KH", "M99_TH", "M99_TH_KH"],
    "Betwos": ["Betwos_CH", "Betwos", "Betwos_V", "Betwos_PK", "Betwos_KL", "Betwos_TH", "Betwos_BK"],
    "Joker": ["Joker_CH", "Joker", "Joker_V", "Joker_PK", "Joker_KL", "Joker_TH", "Joker_BK"]
};

const CATEGORY_ICONS = {
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

function getMainReplyKeyboard(mainMenus) {
    const menusObj = mainMenus || MAIN_MENUS;
    const keys = Object.keys(menusObj);
    const keyboard = [];
    for (let i = 0; i < keys.length; i += 3) {
        const row = [];
        for (let j = i; j < i + 3 && j < keys.length; j++) {
            const m = keys[j];
            const icon = CATEGORY_ICONS[m] || '📁';
            row.push({ text: `${icon} ${m}` });
        }
        keyboard.push(row);
    }
    keyboard.push([{ text: "🌐 អាខោនតែស (Open Web App)", web_app: { url: "https://tgbot-web-app.pages.dev" } }]);
    return { keyboard, resize_keyboard: true };
}

async function getSubReplyKeyboard(db, catName) {
    const subs = MAIN_MENUS[catName] || [];
    const keyboard = [];

    for (let i = 0; i < subs.length; i += 2) {
        const sub1 = subs[i];
        let count1 = 0;
        if (db) {
            const countRow1 = await db.prepare(`SELECT COUNT(*) as count FROM accounts WHERE menu_name = ?`).bind(sub1).first();
            if (countRow1 && countRow1.count) count1 = countRow1.count;
        }
        const emoji1 = getSubMenuEmoji(sub1);
        const row = [{ text: `${emoji1} ${sub1} (${count1})` }];

        if (subs[i + 1]) {
            const sub2 = subs[i + 1];
            let count2 = 0;
            if (db) {
                const countRow2 = await db.prepare(`SELECT COUNT(*) as count FROM accounts WHERE menu_name = ?`).bind(sub2).first();
                if (countRow2 && countRow2.count) count2 = countRow2.count;
            }
            const emoji2 = getSubMenuEmoji(sub2);
            row.push({ text: `${emoji2} ${sub2} (${count2})` });
        }
        keyboard.push(row);
    }
    keyboard.push([
        { text: "🌐 អាខោនតែស (Open Web App)", web_app: { url: "https://tgbot-web-app.pages.dev" } },
        { text: "⬅️ ត្រឡប់ក្រោយ (Back)" }
    ]);
    return { keyboard, resize_keyboard: true };
}

function getPhnomPenhTimeStr() {
    const date = new Date();
    const utc7 = new Date(date.getTime() + (7 * 60 * 60 * 1000));
    return utc7.toISOString().replace('T', ' ').substring(0, 19);
}

async function deletePreviousMessages(token, chatId, currentMsgId, count = 3) {
    if (!currentMsgId) return;
    for (let i = 0; i < count; i++) {
        const msgIdToDelete = currentMsgId - i;
        if (msgIdToDelete > 0) {
            sendTelegramApi(token, 'deleteMessage', {
                chat_id: chatId,
                message_id: msgIdToDelete
            }).catch(() => {});
        }
    }
}

function jsonResponse(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: {
            'Content-Type': 'application/json;charset=UTF-8',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type'
        }
    });
}

async function getTelegramWebhookInfo(token) {
    try {
        const res = await fetch(`https://api.telegram.org/bot${token}/getWebhookInfo`);
        const data = await res.json();
        return data.ok && data.result && !!data.result.url;
    } catch (e) {
        return false;
    }
}

export default {
    async fetch(request, env, ctx) {
        const url = new URL(request.url);
        const path = url.pathname;
        const method = request.method;

        if (method === 'OPTIONS') {
            return jsonResponse({ ok: true });
        }

        const db = env.DB;
        let token = env.BOT_TOKEN || DEFAULT_TOKEN;

        if (db) {
            await db.prepare(`CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT)`).run();
            const tokenRow = await db.prepare(`SELECT value FROM settings WHERE key = 'token'`).first();
            if (tokenRow && tokenRow.value) token = tokenRow.value;
        }

        // 1. Status Check
        if (path === '/api/status') {
            const now = new Date();
            const phnomPenhOffset = 7 * 60 * 60 * 1000;
            const phnomPenhDate = new Date(now.getTime() + phnomPenhOffset);
            const todayStr = phnomPenhDate.toISOString().slice(0, 10);

            const accRow = db ? await db.prepare(`SELECT COUNT(*) as total FROM accounts`).first() : { total: 0 };
            const histRow = db ? await db.prepare(`SELECT COUNT(*) as total FROM history`).first() : { total: 0 };
            const todayHistRow = db ? await db.prepare(`SELECT COUNT(*) as total FROM history WHERE substr(timestamp, 1, 10) = ? OR timestamp LIKE ?`).bind(todayStr, `${todayStr}%`).first() : { total: 0 };
            const allSubs = Object.values(MAIN_MENUS).flat();

            const row = db ? await db.prepare(`SELECT value FROM settings WHERE key = 'bot_status'`).first() : null;
            const dbBotStatus = row ? row.value : '0';

            const activeOnTelegram = await getTelegramWebhookInfo(token);
            let finalStatus = (dbBotStatus === '1' && activeOnTelegram) ? 'running' : 'stopped';

            return jsonResponse({
                running: finalStatus === 'running',
                bot_running: finalStatus === 'running',
                webhook_active: activeOnTelegram,
                bot_status: dbBotStatus,
                token_set: !!token,
                total_accounts: accRow ? accRow.total : 0,
                total_claimed: histRow ? histRow.total : 0,
                today_claimed: todayHistRow ? todayHistRow.total : 0,
                total_main_menus: Object.keys(MAIN_MENUS).length,
                total_sub_menus: allSubs.length,
                token: token
            });
        }

        // 2. Claim Account
        if (path === '/api/claim' && method === 'POST') {
            const body = await request.json();
            const { menu_name, user_name, tg_username } = body;

            if (!menu_name) return jsonResponse({ error: 'Menu name is required' }, 400);

            const acc = await db.prepare(`SELECT id, username, password FROM accounts WHERE menu_name = ? ORDER BY id ASC LIMIT 1`).bind(menu_name).first();
            if (!acc) return jsonResponse({ error: `No accounts left under category "${menu_name}"` }, 404);

            try { await db.prepare(`ALTER TABLE history ADD COLUMN stock_left INTEGER DEFAULT 0`).run(); } catch(e) {}

            await db.prepare(`DELETE FROM accounts WHERE id = ?`).bind(acc.id).run();
            const timestamp = getPhnomPenhTimeStr();
            const clientName = user_name || 'Web User';
            const clientUsername = tg_username || 'web_user';

            const countRow = await db.prepare(`SELECT COUNT(*) as count FROM accounts WHERE menu_name = ?`).bind(menu_name).first();
            const remainingStock = countRow ? countRow.count : 0;

            const histRes = await db.prepare(`INSERT INTO history (user_id, tg_username, tg_name, menu_name, account_username, account_password, timestamp, stock_left) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).bind(0, clientUsername, clientName, menu_name, acc.username, acc.password, timestamp, remainingStock).run();
            const historyId = (histRes && histRes.meta) ? histRes.meta.last_row_id : null;

            return jsonResponse({
                success: true,
                account: { username: acc.username, password: acc.password },
                menu_name: menu_name,
                history_id: historyId,
                remaining: countRow ? countRow.count : 0,
                timestamp: timestamp
            });
        }

        // 3. Rollback / Return Account to Stock
        if (path === '/api/rollback' && method === 'POST') {
            try {
                const body = await request.json();
                const { menu_name, username, password, history_id } = body;

                if (!menu_name || !username || !password) {
                    return jsonResponse({ error: 'Missing account details' }, 400);
                }

                await db.prepare(`INSERT INTO accounts (menu_name, username, password) VALUES (?, ?, ?)`).bind(menu_name, username, password).run();

                if (history_id) {
                    await db.prepare(`DELETE FROM history WHERE id = ?`).bind(history_id).run();
                } else {
                    await db.prepare(`DELETE FROM history WHERE menu_name = ? AND account_username = ? ORDER BY id DESC LIMIT 1`).bind(menu_name, username).run();
                }

                return jsonResponse({ success: true, message: 'Account returned to stock successfully' });
            } catch (e) {
                return jsonResponse({ error: e.message }, 500);
            }
        }

        // 4. Accounts Management
        if (path === '/api/accounts' && method === 'GET') {
            const isAll = url.searchParams.get('all') === 'true' || 
                          url.searchParams.get('export') === 'true' || 
                          url.searchParams.get('backup') === 'true' || 
                          url.searchParams.get('limit') === '1000000' ||
                          url.searchParams.get('all') === '1';

            if (isAll) {
                const rows = db ? await db.prepare(`SELECT * FROM accounts ORDER BY id ASC LIMIT 100000`).all() : { results: [] };
                const accountsList = rows.results || [];
                return jsonResponse({
                    accounts: accountsList,
                    total: accountsList.length,
                    page: 1,
                    totalPages: 1
                });
            }

            const page = parseInt(url.searchParams.get('page')) || 1;
            const limit = parseInt(url.searchParams.get('limit')) || 20;
            const offset = (page - 1) * limit;
            const filterMenu = url.searchParams.get('menu');
            const search = url.searchParams.get('q');

            let query = `SELECT * FROM accounts WHERE 1=1`;
            let countQuery = `SELECT COUNT(*) as total FROM accounts WHERE 1=1`;
            const params = [];
            const countParams = [];

            if (filterMenu && filterMenu !== 'all') {
                query += ` AND menu_name = ?`;
                countQuery += ` AND menu_name = ?`;
                params.push(filterMenu);
                countParams.push(filterMenu);
            }
            if (search) {
                query += ` AND (username LIKE ? OR menu_name LIKE ?)`;
                countQuery += ` AND (username LIKE ? OR menu_name LIKE ?)`;
                params.push(`%${search}%`, `%${search}%`);
                countParams.push(`%${search}%`, `%${search}%`);
            }

            query += ` ORDER BY id ASC LIMIT ? OFFSET ?`;
            params.push(limit, offset);

            const rows = db ? await db.prepare(query).bind(...params).all() : { results: [] };
            const countRow = db ? await db.prepare(countQuery).bind(...countParams).first() : { total: 0 };

            return jsonResponse({
                accounts: rows.results || [],
                total: countRow ? countRow.total : 0,
                page,
                totalPages: Math.ceil((countRow ? countRow.total : 0) / limit)
            });
        }

        if (path === '/api/accounts' && method === 'POST') {
            const body = await request.json();

            if (Array.isArray(body)) {
                if (body.length === 0) {
                    return jsonResponse({ success: true, count: 0, skipped: 0 });
                }

                const existingRows = db ? await db.prepare(`SELECT menu_name, username FROM accounts`).all() : { results: [] };
                const existingSet = new Set((existingRows.results || []).map(r => `${(r.menu_name || '').toLowerCase()}___${(r.username || '').toLowerCase()}`));

                const newAccounts = [];
                let skippedCount = 0;

                for (const acc of body) {
                    const menuName = (acc.menu_name || acc.menu || acc.Category || 'SB_CH').trim();
                    const username = (acc.username || acc.user || '').trim();
                    const password = (acc.password || acc.pass || '').trim();

                    if (!username || !password) continue;

                    const key = `${menuName.toLowerCase()}___${username.toLowerCase()}`;
                    if (existingSet.has(key)) {
                        skippedCount++;
                    } else {
                        existingSet.add(key);
                        newAccounts.push({ menu_name: menuName, username, password });
                    }
                }

                if (newAccounts.length > 0 && db) {
                    const batch = newAccounts.map(acc => db.prepare(`INSERT INTO accounts (menu_name, username, password) VALUES (?, ?, ?)`).bind(acc.menu_name, acc.username, acc.password));
                    for (let i = 0; i < batch.length; i += 50) {
                        await db.batch(batch.slice(i, i + 50));
                    }
                }

                return jsonResponse({
                    success: true,
                    count: newAccounts.length,
                    skipped: skippedCount,
                    totalProcessed: body.length
                });
            } else {
                const { menu_name, username, password } = body;
                if (!menu_name || !username || !password) {
                    return jsonResponse({ error: 'Missing required fields' }, 400);
                }
                const res = db ? await db.prepare(`INSERT INTO accounts (menu_name, username, password) VALUES (?, ?, ?)`).bind(menu_name.trim(), username.trim(), password.trim()).run() : { meta: {} };
                return jsonResponse({ success: true, id: res.meta ? res.meta.last_row_id : null });
            }
        }

        if (path.startsWith('/api/accounts') && method === 'PUT') {
            let id = url.searchParams.get('id');
            if (!id) {
                const cleanPath = path.replace('/api/accounts', '').replace(/^\/+/, '');
                if (cleanPath) id = cleanPath;
            }

            const body = await request.json();
            if (!id && body.id) id = body.id;

            const { menu_name, username, password } = body;

            if (!id || !menu_name || !username || !password) {
                return jsonResponse({ error: 'Missing account ID or required details' }, 400);
            }

            await db.prepare(`UPDATE accounts SET menu_name = ?, username = ?, password = ? WHERE id = ?`).bind(menu_name, username, password, id).run();
            return jsonResponse({ success: true, message: `Account #${id} updated successfully` });
        }

        if (path === '/api/accounts' && method === 'DELETE') {
            const id = url.searchParams.get('id');
            if (id) {
                await db.prepare(`DELETE FROM accounts WHERE id = ?`).bind(id).run();
                return jsonResponse({ success: true, message: `Account #${id} deleted` });
            } else {
                await db.prepare(`DELETE FROM accounts`).run();
                return jsonResponse({ success: true, message: 'All accounts deleted' });
            }
        }

        if (path === '/api/admin' && method === 'POST') {
            try {
                const body = await request.json();
                const action = body.action || 'login';

                const pwdRow = db ? await db.prepare(`SELECT value FROM settings WHERE key = 'admin_password'`).first() : null;
                const currentPassword = pwdRow ? pwdRow.value : '13579';

                if (action === 'login') {
                    const inputPassword = body.password || '';
                    if (inputPassword === currentPassword) {
                        return jsonResponse({ success: true, message: 'Admin login successful' });
                    } else {
                        return jsonResponse({ success: false, error: 'ពាក្យសម្ងាត់មិនត្រឹមត្រូវឡើយ!' }, 401);
                    }
                }

                if (action === 'change_password') {
                    const oldPassword = body.old_password || '';
                    const newPassword = body.new_password || '';

                    if (oldPassword !== currentPassword) {
                        return jsonResponse({ success: false, error: 'ពាក្យសម្ងាត់ចាស់មិនត្រឹមត្រូវឡើយ!' }, 400);
                    }

                    if (!newPassword || newPassword.trim().length < 4) {
                        return jsonResponse({ success: false, error: 'ពាក្យសម្ងាត់ថ្មីត្រូវតែមានយ៉ាងតិច ៤ តួ!' }, 400);
                    }

                    if (db) {
                        await db.prepare(`INSERT OR REPLACE INTO settings (key, value) VALUES ('admin_password', ?)`).bind(newPassword.trim()).run();
                    }

                    return jsonResponse({ success: true, message: 'កែប្រែពាក្យសម្ងាត់ Admin រួចរាល់!' });
                }
            } catch (e) {
                return jsonResponse({ success: false, error: e.message }, 500);
            }
        }

        if (path === '/api/send-telegram-msg' && method === 'POST') {
            let token = env.BOT_TOKEN || DEFAULT_TOKEN;
            if (db) {
                try {
                    const tokenRow = await db.prepare(`SELECT value FROM settings WHERE key = 'token'`).first();
                    if (tokenRow && tokenRow.value) token = tokenRow.value;
                } catch(e) {}
            }

            try {
                const body = await request.json();
                const { user_id, menu_name, username, password } = body;

                if (user_id) {
                    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            chat_id: user_id,
                            text: `នេះជាគណនី ${menu_name} របស់អ្នក៖`
                        })
                    });

                    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            chat_id: user_id,
                            text: `<code>${username}\n${password}</code>`,
                            parse_mode: 'HTML'
                        })
                    });
                }
                return jsonResponse({ success: true });
            } catch (e) {
                return jsonResponse({ success: false, error: e.message });
            }
        }

        if (path === '/api/history') {
            if (method === 'DELETE') {
                const singleId = url.searchParams.get('id');
                if (singleId) {
                    const res = await db.prepare(`DELETE FROM history WHERE id = ?`).bind(singleId).run();
                    return jsonResponse({ success: true, message: 'History record deleted successfully', count: 1 });
                }

                const startDate = url.searchParams.get('start_date');
                const endDate = url.searchParams.get('end_date');

                let deleteQuery = `DELETE FROM history WHERE 1=1`;
                const params = [];

                if (startDate) {
                    deleteQuery += ` AND (timestamp >= ? OR substr(timestamp, 1, 10) >= ?)`;
                    params.push(`${startDate} 00:00:00`, startDate);
                }
                if (endDate) {
                    deleteQuery += ` AND (timestamp <= ? OR substr(timestamp, 1, 10) <= ?)`;
                    params.push(`${endDate} 23:59:59`, endDate);
                }

                const res = await db.prepare(deleteQuery).bind(...params).run();
                const deletedCount = (res && res.meta && res.meta.changes !== undefined) ? res.meta.changes : 0;

                return jsonResponse({ success: true, message: 'History records deleted successfully', count: deletedCount });
            }

            const page = parseInt(url.searchParams.get('page')) || 1;
            const limit = parseInt(url.searchParams.get('limit')) || 20;
            const offset = (page - 1) * limit;
            const q = url.searchParams.get('q') ? `%${url.searchParams.get('q')}%` : '%';
            const startDate = url.searchParams.get('start_date');
            const endDate = url.searchParams.get('end_date');

            let query = `SELECT * FROM history WHERE (tg_name LIKE ? OR menu_name LIKE ? OR account_username LIKE ?)`;
            let countQuery = `SELECT COUNT(*) as total FROM history WHERE (tg_name LIKE ? OR menu_name LIKE ? OR account_username LIKE ?)`;
            const params = [q, q, q];
            const countParams = [q, q, q];

            if (startDate) {
                query += ` AND (timestamp >= ? OR substr(timestamp, 1, 10) >= ?)`;
                countQuery += ` AND (timestamp >= ? OR substr(timestamp, 1, 10) >= ?)`;
                params.push(`${startDate} 00:00:00`, startDate);
                countParams.push(`${startDate} 00:00:00`, startDate);
            }

            if (endDate) {
                query += ` AND (timestamp <= ? OR substr(timestamp, 1, 10) <= ?)`;
                countQuery += ` AND (timestamp <= ? OR substr(timestamp, 1, 10) <= ?)`;
                params.push(`${endDate} 23:59:59`, endDate);
                countParams.push(`${endDate} 23:59:59`, endDate);
            }

            query += ` ORDER BY id DESC LIMIT ? OFFSET ?`;
            params.push(limit, offset);

            try {
                await db.prepare(`ALTER TABLE history ADD COLUMN stock_left INTEGER DEFAULT 0`).run();
            } catch(e) {}

            // 1. Live stock counts per menu_name
            const countsRow = db ? await db.prepare(`SELECT menu_name, COUNT(*) as count FROM accounts GROUP BY menu_name`).all() : { results: [] };
            const currentCounts = {};
            if (countsRow && countsRow.results) {
                countsRow.results.forEach(r => { currentCounts[r.menu_name] = r.count; });
            }

            // 2. Build exact sequence map for all history entries ordered by id DESC
            const allHistRes = db ? await db.prepare(`SELECT id, menu_name, stock_left FROM history ORDER BY id DESC`).all() : { results: [] };
            const menuSeqMap = {};
            if (allHistRes && allHistRes.results) {
                const menuIndices = {};
                allHistRes.results.forEach(h => {
                    const m = h.menu_name;
                    if (menuIndices[m] === undefined) menuIndices[m] = 0;
                    const liveCount = currentCounts[m] !== undefined ? currentCounts[m] : 0;

                    const calculatedStock = liveCount + menuIndices[m];

                    if (h.stock_left && h.stock_left > 0 && menuIndices[m] === 0) {
                        menuSeqMap[h.id] = h.stock_left;
                    } else {
                        menuSeqMap[h.id] = calculatedStock;
                    }

                    menuIndices[m]++;
                });
            }

            const rows = db ? await db.prepare(query).bind(...params).all() : { results: [] };
            const countRow = db ? await db.prepare(countQuery).bind(...countParams).first() : { total: 0 };

            const historyWithStock = (rows.results || []).map(h => {
                const stockVal = menuSeqMap[h.id] !== undefined ? menuSeqMap[h.id] : (h.stock_left || 0);
                return {
                    ...h,
                    stock_left: stockVal
                };
            });

            return jsonResponse({
                history: historyWithStock,
                total: countRow ? countRow.total : 0,
                page,
                totalPages: Math.ceil((countRow ? countRow.total : 0) / limit)
            });
        }

        // 4.4. Summarize Claimed Daily Report
        if (path === '/api/summary/claimed' && method === 'GET') {
            try {
                const startDate = url.searchParams.get('start_date');
                const endDate = url.searchParams.get('end_date');
                const q = url.searchParams.get('q');

                let query = `SELECT * FROM history WHERE 1=1`;
                const params = [];

                if (startDate) {
                    query += ` AND (timestamp >= ? OR substr(timestamp, 1, 10) >= ?)`;
                    params.push(`${startDate} 00:00:00`, startDate);
                }
                if (endDate) {
                    query += ` AND (timestamp <= ? OR substr(timestamp, 1, 10) <= ?)`;
                    params.push(`${endDate} 23:59:59`, endDate);
                }
                if (q) {
                    query += ` AND (timestamp LIKE ? OR menu_name LIKE ? OR tg_name LIKE ?)`;
                    params.push(`%${q}%`, `%${q}%`, `%${q}%`);
                }

                query += ` ORDER BY timestamp DESC, id DESC`;

                const historyRows = db ? await db.prepare(query).bind(...params).all() : { results: [] };
                const rows = historyRows.results || [];

                const dailySummaryMap = {};
                const todayStr = new Date(Date.now() + (7 * 60 * 60 * 1000)).toISOString().slice(0, 10);
                const yesterdayStr = new Date(Date.now() + (7 * 60 * 60 * 1000) - (86400000)).toISOString().slice(0, 10);
                const currentMonthStr = todayStr.slice(0, 7);

                let todayTotal = 0;
                let yesterdayTotal = 0;
                let monthTotal = 0;
                const todayCategoryCounts = {};

                rows.forEach(h => {
                    const dateKey = (h.timestamp || '').substring(0, 10);
                    if (!dateKey || dateKey.length < 10) return;

                    if (dateKey === todayStr) {
                        todayTotal++;
                        const cat = h.menu_name || 'Other';
                        todayCategoryCounts[cat] = (todayCategoryCounts[cat] || 0) + 1;
                    }
                    if (dateKey === yesterdayStr) {
                        yesterdayTotal++;
                    }
                    if (dateKey.startsWith(currentMonthStr)) {
                        monthTotal++;
                    }

                    if (!dailySummaryMap[dateKey]) {
                        dailySummaryMap[dateKey] = {
                            date: dateKey,
                            total: 0,
                            usersSet: new Set(),
                            breakdown: {}
                        };
                    }

                    const item = dailySummaryMap[dateKey];
                    item.total += 1;
                    if (h.tg_name || h.tg_username || h.user_id) {
                        item.usersSet.add(h.tg_name || h.tg_username || h.user_id);
                    }
                    const cat = h.menu_name || 'Other';
                    item.breakdown[cat] = (item.breakdown[cat] || 0) + 1;
                });

                let topCategoryToday = '-';
                let maxCount = 0;
                for (const [cat, count] of Object.entries(todayCategoryCounts)) {
                    if (count > maxCount) {
                        maxCount = count;
                        topCategoryToday = `${cat} (${count})`;
                    }
                }

                const summaryList = Object.values(dailySummaryMap).map(d => ({
                    date: d.date,
                    total: d.total,
                    unique_users: d.usersSet.size,
                    breakdown: d.breakdown
                }));

                return jsonResponse({
                    success: true,
                    metrics: {
                        today_claimed: todayTotal,
                        yesterday_claimed: yesterdayTotal,
                        month_claimed: monthTotal,
                        top_category_today: topCategoryToday
                    },
                    summary: summaryList
                });
            } catch (e) {
                return jsonResponse({ error: e.message }, 500);
            }
        }

        // 4.4.2. Summarize User Daily Report
        if (path === '/api/summary/user' && method === 'GET') {
            try {
                const startDate = url.searchParams.get('start_date');
                const endDate = url.searchParams.get('end_date');
                const q = url.searchParams.get('q');

                let query = `SELECT * FROM history WHERE 1=1`;
                const params = [];

                if (startDate) {
                    query += ` AND (timestamp >= ? OR substr(timestamp, 1, 10) >= ?)`;
                    params.push(`${startDate} 00:00:00`, startDate);
                }
                if (endDate) {
                    query += ` AND (timestamp <= ? OR substr(timestamp, 1, 10) <= ?)`;
                    params.push(`${endDate} 23:59:59`, endDate);
                }
                if (q) {
                    query += ` AND (timestamp LIKE ? OR menu_name LIKE ? OR tg_name LIKE ? OR tg_username LIKE ?)`;
                    params.push(`%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`);
                }

                query += ` ORDER BY timestamp DESC, id DESC`;

                const historyRows = db ? await db.prepare(query).bind(...params).all() : { results: [] };
                const rows = historyRows.results || [];

                const todayStr = new Date(Date.now() + (7 * 60 * 60 * 1000)).toISOString().slice(0, 10);
                const userSummaryMap = {};
                const todayUserCounts = {};

                rows.forEach(h => {
                    const dateKey = (h.timestamp || '').substring(0, 10);
                    if (!dateKey || dateKey.length < 10) return;

                    const userName = h.tg_name || h.tg_username || 'Web User';
                    const tgUser = h.tg_username || '';
                    const key = userName;

                    if (dateKey === todayStr) {
                        todayUserCounts[userName] = (todayUserCounts[userName] || 0) + 1;
                    }

                    if (!userSummaryMap[key]) {
                        userSummaryMap[key] = {
                            min_date: dateKey,
                            max_date: dateKey,
                            user_name: userName,
                            tg_username: tgUser,
                            total_claimed: 0,
                            breakdown: {}
                        };
                    }

                    const item = userSummaryMap[key];
                    item.total_claimed += 1;
                    if (dateKey < item.min_date) item.min_date = dateKey;
                    if (dateKey > item.max_date) item.max_date = dateKey;

                    const cat = h.menu_name || 'Other';
                    item.breakdown[cat] = (item.breakdown[cat] || 0) + 1;
                });

                const todayActiveUsersCount = Object.keys(todayUserCounts).length;
                let todayTotalClaims = 0;
                let topUserToday = '-';
                let maxUserClaims = 0;

                for (const [uName, count] of Object.entries(todayUserCounts)) {
                    todayTotalClaims += count;
                    if (count > maxUserClaims) {
                        maxUserClaims = count;
                        topUserToday = `${uName} (${count})`;
                    }
                }

                const avgClaimsToday = todayActiveUsersCount > 0 ? (todayTotalClaims / todayActiveUsersCount).toFixed(1) : 0;

                const summaryList = Object.values(userSummaryMap).map(u => ({
                    date: u.min_date === u.max_date ? u.min_date : `${u.min_date} ដល់ ${u.max_date}`,
                    user_name: u.user_name,
                    tg_username: u.tg_username,
                    total_claimed: u.total_claimed,
                    breakdown: u.breakdown
                })).sort((a, b) => b.total_claimed - a.total_claimed);

                return jsonResponse({
                    success: true,
                    metrics: {
                        today_active_users: todayActiveUsersCount,
                        top_user_today: topUserToday,
                        avg_claims_today: avgClaimsToday
                    },
                    summary: summaryList
                });
            } catch (e) {
                return jsonResponse({ error: e.message }, 500);
            }
        }

        // 4.5. Menus Management
        if (path.startsWith('/api/menus')) {
            const DEFAULT_MAIN_MENUS = {
                "SB": ["SB_CH", "SB_CH_KH", "SB", "SB_KH", "SB_V", "SB_V_KH", "SB_PK", "SB_PK_KH", "SB_TH", "SB_TH_KH"],
                "Ball": ["Ball_CH", "Ball_V", "Ball_KL", "Ball_TH", "Ball_PK", "Ball"],
                "F88": ["F88_CH", "F88_CH_KH", "F88", "F88_KH", "F88_PK", "F88_PK_KH", "F88_V", "F88_V_KH", "F88_Joker", "F88_Joker_KH", "F88_BK", "F88_BK_KH", "F88_MB", "F88_MB_KH"],
                "Makav": ["Makav_CH", "Makav", "Makav_V", "Makav_KL", "Makav_PK", "Makav_TH"],
                "CK9999": ["CK99_CH", "CK99_CH_KH", "CK99_PK", "CK99_PK_KH", "CK99", "CK99_KH", "CK99_V", "CK99_V_KH", "CK99_TH", "CK99_TH_KH"],
                "Wa855": ["Wa855_CH", "Wa855_CH_KH", "Wa855", "Wa855_KH", "Wa855_PK", "Wa855_PK_KH", "W855_TH", "W855_TH_KH"],
                "M99": ["M99_CH", "M99_CH_KH", "M99", "M99_KH", "M99_PK", "M99_PK_KH", "M99_TH", "M99_TH_KH"],
                "Betwos": ["Betwos_CH", "Betwos", "Betwos_V", "Betwos_PK", "Betwos_KL", "Betwos_TH", "Betwos_BK"],
                "Joker": ["Joker_CH", "Joker", "Joker_V", "Joker_PK", "Joker_KL", "Joker_TH", "Joker_BK"]
            };

            let mainMenus = JSON.parse(JSON.stringify(DEFAULT_MAIN_MENUS));
            if (db) {
                const row = await db.prepare(`SELECT value FROM settings WHERE key = 'main_menus'`).first();
                if (row && row.value) {
                    try { mainMenus = JSON.parse(row.value); } catch (e) {}
                }
            }

            const saveMenus = async (obj) => {
                if (db) {
                    await db.prepare(`INSERT OR REPLACE INTO settings (key, value) VALUES ('main_menus', ?)`).bind(JSON.stringify(obj)).run();
                }
            };

            // GET /api/menus
            if (method === 'GET') {
                const rows = db ? await db.prepare(`SELECT menu_name, COUNT(*) as count FROM accounts GROUP BY menu_name`).all() : { results: [] };
                const countMap = {};
                if (rows && rows.results) {
                    rows.results.forEach(r => { countMap[r.menu_name] = r.count; });
                }

                const menusWithCounts = {};
                const allMenus = [];
                for (const [main, subs] of Object.entries(mainMenus)) {
                    menusWithCounts[main] = subs.map(s => {
                        allMenus.push(s);
                        return { name: s, count: countMap[s] || 0 };
                    });
                }

                return jsonResponse({
                    main_menus: menusWithCounts,
                    all_menus: allMenus,
                    counts: countMap
                });
            }

            // POST /api/menus/main
            if (method === 'POST' && (path === '/api/menus/main' || path === '/api/menus/main/')) {
                const body = await request.json();
                const name = body.name ? body.name.trim() : '';
                if (!name) return jsonResponse({ error: 'Main menu name is required' }, 400);

                if (!mainMenus[name]) {
                    mainMenus[name] = [];
                    await saveMenus(mainMenus);
                }
                return jsonResponse({ success: true, message: `Main menu "${name}" created` });
            }

            // POST /api/menus/sub
            if (method === 'POST' && (path === '/api/menus/sub' || path === '/api/menus/sub/')) {
                const body = await request.json();
                const subName = body.name ? body.name.trim() : '';
                let mainName = body.main_menu ? body.main_menu.trim() : null;

                if (!subName) return jsonResponse({ error: 'Sub menu name is required' }, 400);

                const keys = Object.keys(mainMenus);
                if (!keys.length) {
                    mainMenus['ទូទៅ'] = [];
                    keys.push('ទូទៅ');
                }

                if (!mainName || !mainMenus[mainName]) {
                    mainName = keys[0];
                }

                if (!mainMenus[mainName].includes(subName)) {
                    mainMenus[mainName].push(subName);
                    await saveMenus(mainMenus);
                }
                return jsonResponse({ success: true, message: `Sub menu "${subName}" added under "${mainName}"` });
            }

            // PUT /api/menus/main/:oldName
            if (method === 'PUT' && path.startsWith('/api/menus/main/')) {
                const oldName = decodeURIComponent(path.replace('/api/menus/main/', '')).trim();
                const body = await request.json();
                const newName = body.newName ? body.newName.trim() : (body.name ? body.name.trim() : '');

                if (!oldName || !newName) return jsonResponse({ error: 'Old and new names required' }, 400);

                if (mainMenus[oldName] && oldName !== newName) {
                    const subs = mainMenus[oldName];
                    delete mainMenus[oldName];
                    mainMenus[newName] = subs;
                    await saveMenus(mainMenus);
                }
                return jsonResponse({ success: true, message: `Main menu renamed to "${newName}"` });
            }

            // DELETE /api/menus/main/:name
            if (method === 'DELETE' && path.startsWith('/api/menus/main/')) {
                const name = decodeURIComponent(path.replace('/api/menus/main/', '')).trim();
                if (mainMenus[name]) {
                    delete mainMenus[name];
                    await saveMenus(mainMenus);
                }
                return jsonResponse({ success: true, message: `Main menu "${name}" deleted` });
            }

            // PUT /api/menus/sub/:oldName
            if (method === 'PUT' && path.startsWith('/api/menus/sub/')) {
                const oldName = decodeURIComponent(path.replace('/api/menus/sub/', '')).trim();
                const body = await request.json();
                const newName = body.newName ? body.newName.trim() : (body.name ? body.name.trim() : '');

                if (!oldName || !newName) return jsonResponse({ error: 'Old and new names required' }, 400);

                let updated = false;
                for (const [main, subs] of Object.entries(mainMenus)) {
                    const idx = subs.indexOf(oldName);
                    if (idx !== -1) {
                        subs[idx] = newName;
                        updated = true;
                    }
                }

                if (updated) {
                    await saveMenus(mainMenus);
                    if (db) {
                        await db.prepare(`UPDATE accounts SET menu_name = ? WHERE menu_name = ?`).bind(newName, oldName).run();
                    }
                }
                return jsonResponse({ success: true, message: `Sub menu renamed to "${newName}"` });
            }

            // DELETE /api/menus/sub/:name
            if (method === 'DELETE' && path.startsWith('/api/menus/sub/')) {
                const name = decodeURIComponent(path.replace('/api/menus/sub/', '')).trim();
                let updated = false;
                for (const [main, subs] of Object.entries(mainMenus)) {
                    const idx = subs.indexOf(name);
                    if (idx !== -1) {
                        subs.splice(idx, 1);
                        updated = true;
                    }
                }

                if (updated) {
                    await saveMenus(mainMenus);
                }
                return jsonResponse({ success: true, message: `Sub menu "${name}" deleted` });
            }
        }

        // 5. Telegram Webhook Endpoint
        if (path === '/api/telegram-webhook' && method === 'POST') {
            try {
                const update = await request.json();
                const task = handleTelegramUpdate(update, db, token);
                if (ctx && ctx.waitUntil) {
                    ctx.waitUntil(task);
                } else {
                    await task;
                }
            } catch (e) {
                console.error('Telegram webhook error:', e);
            }
            return jsonResponse({ ok: true });
        }

        return jsonResponse({ error: 'Endpoint not found' }, 404);
    }
};

async function handleTelegramUpdate(update, db, token) {
    if (!update) return;

    if (db) {
        const tokenRow = await db.prepare(`SELECT value FROM settings WHERE key = 'token'`).first();
        if (tokenRow && tokenRow.value) token = tokenRow.value;
    }

    let chatId = null;
    let messageText = null;
    let callbackData = null;
    let fromUser = null;

    if (update.message) {
        chatId = update.message.chat.id;
        messageText = update.message.text ? update.message.text.trim() : '';
        fromUser = update.message.from;
    } else if (update.callback_query) {
        chatId = update.callback_query.message.chat.id;
        callbackData = update.callback_query.data;
        fromUser = update.callback_query.from;

        sendTelegramApi(token, 'answerCallbackQuery', {
            callback_query_id: update.callback_query.id
        });
    }

    if (!chatId || !fromUser) return;

    let adminIds = [8558847170, 551401200];
    if (db) {
        const adminRow = await db.prepare(`SELECT value FROM settings WHERE key = 'admin_ids'`).first();
        if (adminRow && adminRow.value) {
            try { adminIds = JSON.parse(adminRow.value); } catch(e) {}
        }
    }
    const isAdmin = adminIds.map(id => Number(id)).includes(Number(fromUser.id));

    if (messageText === '/admin' || messageText === 'admin' || messageText === '🛠️ Admin Panel' || callbackData === 'admin_panel') {
        await sendTelegramApi(token, 'sendMessage', {
            chat_id: chatId,
            text: '🌐 <b>មុខងារគ្រប់គ្រង Admin ទាំងអស់ត្រូវបានផ្លាស់ប្តូរទៅកាន់ Web App ទាំងស្រុង៖</b>\n\nសូមចុចប៊ូតុងខាងក្រោមដើម្បីចូលទៅកាន់ Web App Dashboard ៖',
            parse_mode: 'HTML',
            reply_markup: getMainReplyKeyboard(MAIN_MENUS)
        });
        return;
    }

    if (messageText === '/start' || messageText === 'start' || messageText === '⬅️ ត្រឡប់ក្រោយ (Back)' || callbackData === 'main_menu') {
        // Reset Chat Menu Button to default/commands so blue Web button is removed
        sendTelegramApi(token, 'setChatMenuButton', {
            chat_id: chatId,
            menu_button: { type: 'commands' }
        }).catch(() => {});

        // Register bot command menu (/start)
        sendTelegramApi(token, 'setMyCommands', {
            commands: [
                { command: 'start', description: 'សូមចាប់ផ្តើម និងបង្ហាញម៉ឺនុយ' }
            ]
        }).catch(() => {});

        await sendTelegramApi(token, 'sendMessage', {
            chat_id: chatId,
            text: '<b>សូមស្វាគមន៍!</b> សូមជ្រើសរើស អាខោន តេស ខាងក្រោម ឬប្រើប្រាស់ Web App ៖',
            parse_mode: 'HTML',
            reply_markup: {
                inline_keyboard: [
                    [{ text: "🌐 អាខោនតែស (Open Web App)", web_app: { url: "https://tgbot-web-app.pages.dev" } }]
                ]
            }
        });

        await sendTelegramApi(token, 'sendMessage', {
            chat_id: chatId,
            text: '📁 <b>ម៉ឺនុយសំខាន់ៗ (Main Categories)៖</b>',
            parse_mode: 'HTML',
            reply_markup: getMainReplyKeyboard(MAIN_MENUS)
        });
        return;
    }

    if (messageText && (messageText.includes('Open Web App') || messageText.includes('អាខោនតែស'))) {
        await sendTelegramApi(token, 'sendMessage', {
            chat_id: chatId,
            text: '🌐 <b>សូមចុចប៊ូតុងខាងក្រោមដើម្បីបើក អាខោនតែស Web App ៖</b>',
            parse_mode: 'HTML',
            reply_markup: {
                inline_keyboard: [
                    [{ text: "🌐 អាខោនតែស (Open Web App)", web_app: { url: "https://tgbot-web-app.pages.dev" } }]
                ]
            }
        });
        return;
    }

    let matchedCat = null;
    if (messageText) {
        if (MAIN_MENUS[messageText]) {
            matchedCat = messageText;
        } else {
            const alphaOnly = messageText.replace(/[^a-zA-Z0-9_]/g, '').trim();
            if (MAIN_MENUS[alphaOnly]) {
                matchedCat = alphaOnly;
            }
        }
    } else if (callbackData && callbackData.startsWith('cat_')) {
        matchedCat = callbackData.replace('cat_', '');
    }

    if (matchedCat) {
        const icon = CATEGORY_ICONS[matchedCat] || '📁';
        const subKeyboard = await getSubReplyKeyboard(db, matchedCat);

        await sendTelegramApi(token, 'sendMessage', {
            chat_id: chatId,
            text: `${icon} <b>${matchedCat}</b>`,
            parse_mode: 'HTML',
            reply_markup: subKeyboard
        });
        return;
    }

    let claimSubName = null;
    if (messageText) {
        let rawName = messageText.split('(')[0];
        rawName = rawName.replace(/[^a-zA-Z0-9_]/g, '').trim();
        
        const allSubs = Object.values(MAIN_MENUS).flat();
        if (allSubs.includes(rawName)) {
            claimSubName = rawName;
        }
    } else if (callbackData && callbackData.startsWith('claim_')) {
        claimSubName = callbackData.replace('claim_', '');
    }

    if (claimSubName) {
        let currentMsgId = update.message ? update.message.message_id : (update.callback_query ? update.callback_query.message.message_id : null);
        if (currentMsgId) deletePreviousMessages(token, chatId, currentMsgId, 5);

        const acc = await db.prepare(`SELECT id, username, password FROM accounts WHERE menu_name = ? ORDER BY id ASC LIMIT 1`).bind(claimSubName).first();

        if (!acc) {
            await sendTelegramApi(token, 'sendMessage', {
                chat_id: chatId,
                text: `❌ អាខោនប្រភេទ <b>${claimSubName}</b> ត្រូវបានអស់ស្តុកហើយ!`,
                parse_mode: 'HTML'
            });
            return;
        }

        const timestamp = getPhnomPenhTimeStr();
        const tgName = `${fromUser.first_name || ''} ${fromUser.last_name || ''}`.trim();
        
        try { await db.prepare(`ALTER TABLE history ADD COLUMN stock_left INTEGER DEFAULT 0`).run(); } catch(e) {}

        await db.prepare(`DELETE FROM accounts WHERE id = ?`).bind(acc.id).run();
        const countRow = await db.prepare(`SELECT COUNT(*) as count FROM accounts WHERE menu_name = ?`).bind(claimSubName).first();
        const remainingStock = countRow ? countRow.count : 0;

        await db.prepare(`INSERT INTO history (user_id, tg_username, tg_name, menu_name, account_username, account_password, timestamp, stock_left) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).bind(fromUser.id || 0, fromUser.username || '', tgName, claimSubName, acc.username, acc.password, timestamp, remainingStock).run();

        let parentCat = 'SB';
        for (const [cat, list] of Object.entries(MAIN_MENUS)) {
            if (list.includes(claimSubName)) {
                parentCat = cat;
                break;
            }
        }
        const updatedSubKeyboard = await getSubReplyKeyboard(db, parentCat);

        const credsText = `<b>✅ គណនី ${claimSubName} របស់អ្នក៖</b>\n\n<b>${acc.username}\n${acc.password}</b>`;

        await sendTelegramApi(token, 'sendMessage', {
            chat_id: chatId,
            text: credsText,
            parse_mode: 'HTML',
            reply_markup: updatedSubKeyboard
        });
    }
}

async function sendTelegramApi(token, method, payload) {
    const apiUrl = `https://api.telegram.org/bot${token}/${method}`;
    const res = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
    return await res.json();
}
