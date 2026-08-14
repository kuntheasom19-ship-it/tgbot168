const DEFAULT_TOKEN = "";
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

function getPhnomPenhTimeStr() {
    const date = new Date();
    const utc7 = new Date(date.getTime() + (7 * 60 * 60 * 1000));
    return utc7.toISOString().replace('T', ' ').substring(0, 19);
}

export async function onRequest(context) {
    const { request, env, waitUntil } = context;
    const db = env.DB;
    let token = env.BOT_TOKEN || DEFAULT_TOKEN;

    if (request.method !== 'POST') {
        return new Response(JSON.stringify({ ok: true }));
    }

    try {
        const update = await request.json();
        const task = handleTelegramUpdate(update, db, token, env);
        if (waitUntil) {
            waitUntil(task);
        } else {
            await task;
        }
    } catch (e) {
        console.error('Telegram webhook error:', e);
    }

    return new Response(JSON.stringify({ ok: true }), {
        headers: { 'Content-Type': 'application/json' }
    });
}

function getMainReplyKeyboard(isAdmin) {
    const keyboard = [
        [{ text: "📁 SB" }, { text: "⚽ Ball" }, { text: "💳 F88" }],
        [{ text: "💰 Makav" }, { text: "🎮 CK9999" }, { text: "🎲 Wa855" }],
        [{ text: "🏆 M99" }, { text: "💎 Betwos" }, { text: "🃏 Joker" }]
    ];
    if (isAdmin) {
        keyboard.push([{ text: "🛠️ Admin Panel" }]);
    }
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
    return { keyboard, resize_keyboard: true };
}

async function handleTelegramUpdate(update, db, token, env) {
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

    // Load Admin IDs
    let adminIds = [8558847170, 551401200];
    if (db) {
        const adminRow = await db.prepare(`SELECT value FROM settings WHERE key = 'admin_ids'`).first();
        if (adminRow && adminRow.value) {
            try { adminIds = JSON.parse(adminRow.value); } catch(e) {}
        }
    }
    const isAdmin = adminIds.map(id => Number(id)).includes(Number(fromUser.id));

    // Restore Backup via JSON File Upload
    if (update.message && update.message.document && isAdmin) {
        const doc = update.message.document;
        if (doc.file_name.endsWith('.json') || doc.mime_type === 'application/json') {
            try {
                const fileRes = await fetch(`https://api.telegram.org/bot${token}/getFile?file_id=${doc.file_id}`);
                const fileData = await fileRes.json();
                if (fileData.ok && fileData.result.file_path) {
                    const downloadUrl = `https://api.telegram.org/file/bot${token}/${fileData.result.file_path}`;
                    const contentRes = await fetch(downloadUrl);
                    const backupJson = await contentRes.json();

                    let restoredCount = 0;
                    let accountsList = [];
                    if (backupJson.accounts && Array.isArray(backupJson.accounts)) {
                        accountsList = backupJson.accounts;
                    } else if (Array.isArray(backupJson)) {
                        accountsList = backupJson;
                    }

                    if (accountsList.length > 0 && db) {
                        const batchStmt = accountsList.map(a => 
                            db.prepare(`INSERT INTO accounts (menu_name, username, password) VALUES (?, ?, ?)`).bind(a.menu_name || a.category || 'SB_CH', a.username, a.password)
                        );
                        for (let i = 0; i < batchStmt.length; i += 50) {
                            await db.batch(batchStmt.slice(i, i + 50));
                        }
                        restoredCount = accountsList.length;
                    }

                    await sendTelegramApi(token, 'sendMessage', {
                        chat_id: chatId,
                        text: `✅ <b>បានស្តារទិន្នន័យ (Restore Backup) ដោយជោគជ័យ!</b>\n\n📦 បានបញ្ចូលអាខោនចំនួន <b>${restoredCount}</b> គណនី ទៅក្នុង Database!`,
                        parse_mode: 'HTML',
                        reply_markup: getMainReplyKeyboard(isAdmin)
                    });
                    return;
                }
            } catch (err) {
                await sendTelegramApi(token, 'sendMessage', {
                    chat_id: chatId,
                    text: `❌ <b>មានបញ្ហាក្នុងការស្តារទិន្នន័យ៖</b> ${err.message}`,
                    parse_mode: 'HTML'
                });
                return;
            }
        }
    }

    // Admin Commands: /addadmin & /deladmin
    if (messageText && messageText.startsWith('/addadmin')) {
        if (!isAdmin) return;
        const parts = messageText.split(/\s+/);
        if (parts.length < 2 || isNaN(parts[1])) {
            await sendTelegramApi(token, 'sendMessage', {
                chat_id: chatId,
                text: '⚠️ <b>ទម្រង់មិនត្រឹមត្រូវ!</b> សូមប្រើ៖ <code>/addadmin [លេខID]</code>',
                parse_mode: 'HTML'
            });
            return;
        }
        const newId = Number(parts[1]);
        if (!adminIds.includes(newId)) {
            adminIds.push(newId);
            if (db) {
                await db.prepare(`INSERT INTO settings (key, value) VALUES ('admin_ids', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value`).bind(JSON.stringify(adminIds)).run();
            }
        }
        await sendTelegramApi(token, 'sendMessage', {
            chat_id: chatId,
            text: `✅ <b>បានបន្ថែម Admin ID: <code>${newId}</code> ដោយជោគជ័យ!</b>`,
            parse_mode: 'HTML'
        });
        return;
    }

    if (messageText && messageText.startsWith('/deladmin')) {
        if (!isAdmin) return;
        const parts = messageText.split(/\s+/);
        if (parts.length < 2 || isNaN(parts[1])) {
            await sendTelegramApi(token, 'sendMessage', {
                chat_id: chatId,
                text: '⚠️ <b>ទម្រង់មិនត្រឹមត្រូវ!</b> សូមប្រើ៖ <code>/deladmin [លេខID]</code>',
                parse_mode: 'HTML'
            });
            return;
        }
        const delId = Number(parts[1]);
        if (delId === 8558847170) {
            await sendTelegramApi(token, 'sendMessage', {
                chat_id: chatId,
                text: '❌ មិនអាចលុប Default Admin ID (8558847170) បានឡើយ。',
                parse_mode: 'HTML'
            });
            return;
        }
        adminIds = adminIds.filter(id => Number(id) !== delId);
        if (db) {
            await db.prepare(`INSERT INTO settings (key, value) VALUES ('admin_ids', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value`).bind(JSON.stringify(adminIds)).run();
        }
        await sendTelegramApi(token, 'sendMessage', {
            chat_id: chatId,
            text: `🗑️ <b>បានលុប Admin ID: <code>${delId}</code> រួចរាល់!</b>`,
            parse_mode: 'HTML'
        });
        return;
    }

    // Show Admin Panel
    if (messageText === '/admin' || messageText === '🛠️ Admin Panel' || callbackData === 'admin_panel') {
        if (!isAdmin) {
            await sendTelegramApi(token, 'sendMessage', {
                chat_id: chatId,
                text: '❌ អ្នកមិនមានសិទ្ធិប្រើប្រាស់ Admin Panel ឡើយ。',
                parse_mode: 'HTML'
            });
            return;
        }

        const adminKeyboard = [
            [{ text: "🌐 ផ្ទាំងគ្រប់គ្រង Web App Dashboard", url: "https://tgbot-web-app.pages.dev" }],
            [{ text: "➕ បញ្ចូលគណនីថ្មី (Add Accounts)", callback_data: "admin_add_help" }],
            [{ text: "⚙️ គ្រប់គ្រង Menu (Menus Summary)", callback_data: "admin_menus" }],
            [{ text: "👤 គ្រប់គ្រង Admin (Admins Config)", callback_data: "admin_admins" }],
            [{ text: "📜 ប្រវត្តិទាញយក (History Logs)", callback_data: "admin_history" }],
            [{ text: "📥 បម្រុងទុក (Backup)", callback_data: "admin_backup" }, { text: "📤 ស្តារឡើងវិញ (Restore)", callback_data: "admin_restore" }],
            [{ text: "🏠 ត្រឡប់ទៅទំព័រដើម (Home)", callback_data: "main_menu" }]
        ];

        await sendTelegramApi(token, 'sendMessage', {
            chat_id: chatId,
            text: '🛠️ <b>ផ្ទាំងគ្រប់គ្រងសម្រាប់ Admin (CRUD & Admin Panel):</b>\n\n' +
                  `👤 Admin Logged In: <code>${fromUser.first_name || 'Admin'}</code> (ID: <code>${fromUser.id}</code>)\n` +
                  'សូមជ្រើសរើសផ្នែកខាងក្រោម ដើម្បីគ្រប់គ្រងប្រព័ន្ធ៖',
            parse_mode: 'HTML',
            reply_markup: { inline_keyboard: adminKeyboard }
        });
        return;
    }

    // Backup Callback
    if (callbackData === 'admin_backup') {
        if (!isAdmin) return;

        const accRows = db ? await db.prepare(`SELECT menu_name, username, password FROM accounts`).all() : { results: [] };
        const histRows = db ? await db.prepare(`SELECT * FROM history ORDER BY id DESC LIMIT 500`).all() : { results: [] };

        const backupObject = {
            version: "3.0.3",
            timestamp: getPhnomPenhTimeStr(),
            total_accounts: accRows.results ? accRows.results.length : 0,
            accounts: accRows.results || [],
            history: histRows.results || []
        };

        const jsonStr = JSON.stringify(backupObject, null, 2);
        const filename = `bot_backup_${Date.now()}.json`;

        await sendTelegramDocumentBuffer(token, chatId, filename, jsonStr);
        return;
    }

    // Restore Callback
    if (callbackData === 'admin_restore') {
        if (!isAdmin) return;
        const keyboard = [[{ text: '⬅️ ត្រឡប់ក្រោយ (Back)', callback_data: 'admin_panel' }]];
        await sendTelegramApi(token, 'sendMessage', {
            chat_id: chatId,
            text: `📤 <b>របៀបស្តារទិន្នន័យឡើងវិញ (Restore Backup)៖</b>\n\n` +
                  `សូមផ្ញើឯកសារបម្រុងទុក <code>.json</code> (ឧ. <code>bot_backup_data.json</code>) មកកាន់ Telegram Bot នេះ។\n` +
                  `Bot នឹងធ្វើការអាន និងបញ្ចូលគណនីទាំងអស់ទៅក្នុង Database ដោយស្វ័យប្រវត្តិ!`,
            parse_mode: 'HTML',
            reply_markup: { inline_keyboard: keyboard }
        });
        return;
    }

    // Admin Sub-Callbacks
    if (callbackData === 'admin_admins') {
        if (!isAdmin) return;
        const listText = adminIds.map(id => `• <code>${id}</code>`).join('\n');
        const keyboard = [[{ text: '⬅️ ត្រឡប់ក្រោយ (Back)', callback_data: 'admin_panel' }]];
        await sendTelegramApi(token, 'sendMessage', {
            chat_id: chatId,
            text: `👤 <b>គ្រប់គ្រង Admin ទាំងអស់ក្នុងប្រព័ន្ធ (Admins Config)៖</b>\n\n` +
                  `📋 <b>បញ្ជី ID Admin បច្ចុប្បន្ន៖</b>\n${listText}\n\n` +
                  `➕ <b>របៀបបន្ថែម Admin ថ្មី៖</b>\n<code>/addadmin [លេខID]</code>\n\n` +
                  `🗑️ <b>របៀបលុប Admin៖</b>\n<code>/deladmin [លេខID]</code>`,
            parse_mode: 'HTML',
            reply_markup: { inline_keyboard: keyboard }
        });
        return;
    }

    if (callbackData === 'admin_history') {
        if (!isAdmin) return;
        const histRow = db ? await db.prepare(`SELECT COUNT(*) as total FROM history`).first() : { total: 0 };
        const rows = db ? await db.prepare(`SELECT * FROM history ORDER BY id DESC LIMIT 5`).all() : { results: [] };
        
        let logsText = '<i>គ្មានទិន្នន័យ</i>';
        if (rows && rows.results && rows.results.length > 0) {
            logsText = rows.results.map(r => `• <b>${r.tg_name || 'User'}</b> -> <code>${r.menu_name}</code> (${r.account_username})`).join('\n');
        }

        const keyboard = [[{ text: '⬅️ ត្រឡប់ក្រោយ (Back)', callback_data: 'admin_panel' }]];
        await sendTelegramApi(token, 'sendMessage', {
            chat_id: chatId,
            text: `📜 <b>ប្រវត្តិទាញយកអាខោនសរុប (History Logs)៖</b>\n\n` +
                  `📊 សរុបទទួលបាន៖ <b>${histRow ? histRow.total : 0}</b> លើក\n\n` +
                  `🕒 <b>សកម្មភាពចុងក្រោយបំផុត ៥ លើក៖</b>\n${logsText}\n\n` +
                  `🌐 មើលប្រវត្តិពេញលេញលើ Web App: https://tgbot-web-app.pages.dev`,
            parse_mode: 'HTML',
            reply_markup: { inline_keyboard: keyboard }
        });
        return;
    }

    if (callbackData === 'admin_add_help') {
        if (!isAdmin) return;
        const keyboard = [[{ text: '🌐 ចូលទៅ Web App Dashboard', url: 'https://tgbot-web-app.pages.dev' }], [{ text: '⬅️ ត្រឡប់ក្រោយ (Back)', callback_data: 'admin_panel' }]];
        await sendTelegramApi(token, 'sendMessage', {
            chat_id: chatId,
            text: `➕ <b>របៀបបញ្ចូលគណនីថ្មី ឬ Excel៖</b>\n\n` +
                  `១. សូមចូលទៅកាន់គេហទំព័រ Web App: https://tgbot-web-app.pages.dev\n` +
                  `២. ចូលទៅកាន់ផ្ទាំង <b>Accounts</b> ឬ <b>Excel Tools</b>\n` +
                  `៣. អ្នកអាច Drag & Drop ឯកសារ Excel (<code>.xlsx</code>) បញ្ចូលគណនីរាប់ពាន់ក្នុងពេលតែមួយបានយ៉ាងលឿន!`,
            parse_mode: 'HTML',
            reply_markup: { inline_keyboard: keyboard }
        });
        return;
    }

    if (callbackData === 'admin_menus') {
        if (!isAdmin) return;
        const accRow = db ? await db.prepare(`SELECT COUNT(*) as total FROM accounts`).first() : { total: 0 };
        const keyboard = [[{ text: '⬅️ ត្រឡប់ក្រោយ (Back)', callback_data: 'admin_panel' }]];
        await sendTelegramApi(token, 'sendMessage', {
            chat_id: chatId,
            text: `⚙️ <b>គ្រប់គ្រង Menu & Stock សរុប៖</b>\n\n` +
                  `📁 Main Categories: <b>${Object.keys(MAIN_MENUS).length}</b>\n` +
                  `🎮 Sub Menus: <b>${Object.values(MAIN_MENUS).flat().length}</b>\n` +
                  `📦 អាខោនក្នុងស្តុកសរុប៖ <b>${accRow ? accRow.total : 0}</b> គណនី\n\n` +
                  `🌐 គ្រប់គ្រង Menu និងឈ្មោះលើ Web App: https://tgbot-web-app.pages.dev`,
            parse_mode: 'HTML',
            reply_markup: { inline_keyboard: keyboard }
        });
        return;
    }

    // Main Start Command or Back to Main Menu
    if (messageText === '/start' || messageText === 'start' || messageText === '⬅️ ត្រឡប់ក្រោយ (Back)' || callbackData === 'main_menu') {
        await sendTelegramApi(token, 'sendMessage', {
            chat_id: chatId,
            text: '<b>សូមស្វាគមន៍!</b> សូមជ្រើសរើស អាខោន តេស ខាងក្រោម៖',
            parse_mode: 'HTML',
            reply_markup: getMainReplyKeyboard(isAdmin)
        });
        return;
    }

    // Detect Main Category Click -> Render Sub-Menus in Reply Keyboard!
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

    // Detect Sub-Menu Claim Click from Reply Keyboard or Callback Query!
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
        
        await db.batch([
            db.prepare(`DELETE FROM accounts WHERE id = ?`).bind(acc.id),
            db.prepare(`INSERT INTO history (user_id, tg_username, tg_name, menu_name, account_username, account_password, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?)`).bind(fromUser.id || 0, fromUser.username || '', tgName, claimSubName, acc.username, acc.password, timestamp)
        ]);

        // Message 1: Notice matching screenshot
        await sendTelegramApi(token, 'sendMessage', {
            chat_id: chatId,
            text: `នេះជាគណនី ${claimSubName} របស់អ្នក៖`
        });

        let parentCat = 'SB';
        for (const [cat, list] of Object.entries(MAIN_MENUS)) {
            if (list.includes(claimSubName)) {
                parentCat = cat;
                break;
            }
        }
        const updatedSubKeyboard = await getSubReplyKeyboard(db, parentCat);

        // Message 2: Monospace Username & Password for 1-click copy matching screenshot
        const credsText = `<code>${acc.username}\n${acc.password}</code>`;

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

async function sendTelegramDocumentBuffer(token, chatId, filename, jsonContent) {
    const formData = new FormData();
    formData.append('chat_id', chatId);
    formData.append('document', new Blob([jsonContent], { type: 'application/json' }), filename);
    formData.append('caption', `💾 <b>ឯកសារបម្រុងទុកទិន្នន័យ (Backup File)</b>\nកាលបរិច្ឆេទ: <code>${getPhnomPenhTimeStr()}</code>`);
    formData.append('parse_mode', 'HTML');

    const res = await fetch(`https://api.telegram.org/bot${token}/sendDocument`, {
        method: 'POST',
        body: formData
    });
    return await res.json();
}
