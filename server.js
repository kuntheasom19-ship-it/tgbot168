const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const multer = require('multer');
const XLSX = require('xlsx');
const { spawn, exec } = require('child_process');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const CLOUDFLARE_API_URL = process.env.WEB_APP_URL || 'https://tgbot-web-app.pages.dev';

// Proxy Web App API requests to Cloudflare D1 Database
app.use('/api', async (req, res, next) => {
    if (req.path.startsWith('/bot/') || req.path === '/config') {
        return next();
    }
    try {
        const targetUrl = `${CLOUDFLARE_API_URL.replace(/\/$/, '')}${req.originalUrl}`;
        const fetchOptions = {
            method: req.method,
            headers: { 'Content-Type': req.headers['content-type'] || 'application/json' }
        };
        if (req.method !== 'GET' && req.method !== 'HEAD' && req.body) {
            fetchOptions.body = JSON.stringify(req.body);
        }
        const cfRes = await fetch(targetUrl, fetchOptions);
        const data = await cfRes.json();
        return res.status(cfRes.status).json(data);
    } catch (e) {
        next();
    }
});

app.use(express.static(path.join(__dirname, 'public')));

// Configure Multer for uploads
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}
const upload = multer({ dest: uploadDir });

// Database Connection
const DB_PATH = path.join(__dirname, 'bot_data.db');
const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
        console.error('Error opening database:', err);
    } else {
        console.log('Connected to SQLite database bot_data.db');
        initDb();
    }
});

function initDb() {
    db.run(`
        CREATE TABLE IF NOT EXISTS accounts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            menu_name TEXT,
            username TEXT,
            password TEXT
        )
    `);
    db.run(`
        CREATE TABLE IF NOT EXISTS history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            tg_username TEXT,
            tg_name TEXT,
            menu_name TEXT,
            account_username TEXT,
            account_password TEXT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);
}

// Config file management
const CONFIG_FILE = path.join(__dirname, 'config.json');

function loadConfig() {
    const defaultConfig = {
        TOKEN: process.env.BOT_TOKEN || "",
        ADMIN_IDS: [8558847170],
        MENUS: ["F88$", "F88$_CH", "F88_CH_KH", "F88_KH"],
        MAIN_MENUS: { "General": ["F88$", "F88$_CH", "F88_CH_KH", "F88_KH"] }
    };
    if (fs.existsSync(CONFIG_FILE)) {
        try {
            const raw = fs.readFileSync(CONFIG_FILE, 'utf-8');
            const data = JSON.parse(raw);
            if (!data.MAIN_MENUS) {
                data.MAIN_MENUS = { "General": data.MENUS || [] };
            }
            return data;
        } catch (e) {
            console.error('Error reading config.json:', e);
        }
    }
    return defaultConfig;
}

function saveConfig(config) {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8');
}

// Bot Process Management
let botProcess = null;
let botLogs = [];
const MAX_LOG_LINES = 500;

function addBotLog(msg) {
    const time = new Date().toLocaleTimeString();
    botLogs.push(`[${time}] ${msg}`);
    if (botLogs.length > MAX_LOG_LINES) {
        botLogs.shift();
    }
}

function getPhnomPenhTimeStr() {
    const date = new Date();
    // Offset +7 hours
    const utc7 = new Date(date.getTime() + (7 * 60 * 60 * 1000));
    return utc7.toISOString().replace('T', ' ').substring(0, 19);
}

// ================= API ENDPOINTS =================

// System Status
app.get('/api/status', (req, res) => {
    const config = loadConfig();
    db.get('SELECT COUNT(*) as total_accounts FROM accounts', [], (err, accRow) => {
        db.get('SELECT COUNT(*) as total_claimed FROM history', [], (err, histRow) => {
            res.json({
                bot_running: botProcess !== null,
                total_accounts: accRow ? accRow.total_accounts : 0,
                total_claimed: histRow ? histRow.total_claimed : 0,
                total_main_menus: Object.keys(config.MAIN_MENUS || {}).length,
                total_sub_menus: (config.MENUS || []).length,
                token: config.TOKEN || "",
                admin_ids: config.ADMIN_IDS || []
            });
        });
    });
});

// Menus and Counts
app.get('/api/menus', (req, res) => {
    const config = loadConfig();
    db.all('SELECT menu_name, COUNT(*) as count FROM accounts GROUP BY menu_name', [], (err, rows) => {
        const countMap = {};
        if (rows) {
            rows.forEach(r => { countMap[r.menu_name] = r.count; });
        }

        const mainMenus = config.MAIN_MENUS || {};
        const menusWithCounts = {};

        for (const [main, subs] of Object.entries(mainMenus)) {
            menusWithCounts[main] = subs.map(s => ({
                name: s,
                count: countMap[s] || 0
            }));
        }

        res.json({
            main_menus: menusWithCounts,
            all_menus: config.MENUS || [],
            counts: countMap
        });
    });
});

// Claim account from sub-menu
app.post('/api/claim', (req, res) => {
    const { menu_name, user_name } = req.body;
    if (!menu_name) {
        return res.status(400).json({ error: 'Menu name is required' });
    }

    db.get('SELECT id, username, password FROM accounts WHERE menu_name = ? ORDER BY id ASC LIMIT 1', [menu_name], (err, row) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (!row) {
            return res.status(404).json({ error: `No accounts left under category "${menu_name}"` });
        }

        const accountId = row.id;
        const accUser = row.username;
        const accPass = row.password;

        // Delete dispensed account
        db.run('DELETE FROM accounts WHERE id = ?', [accountId], function (delErr) {
            if (delErr) {
                return res.status(500).json({ error: delErr.message });
            }

            const clientName = user_name || 'Web Portal User';
            const timestamp = getPhnomPenhTimeStr();

            // Insert into history log
            db.run(
                'INSERT INTO history (user_id, tg_username, tg_name, menu_name, account_username, account_password, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [0, 'web_user', clientName, menu_name, accUser, accPass, timestamp],
                function (histErr) {
                    // Return remaining count
                    db.get('SELECT COUNT(*) as count FROM accounts WHERE menu_name = ?', [menu_name], (cErr, cRow) => {
                        res.json({
                            success: true,
                            account: { username: accUser, password: accPass },
                            menu_name: menu_name,
                            remaining: cRow ? cRow.count : 0,
                            timestamp: timestamp
                        });
                    });
                }
            );
        });
    });
});

// Get Accounts List (Paginated / Filtered)
app.get('/api/accounts', (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const search = req.query.q ? `%${req.query.q}%` : '%';
    const menu = req.query.menu || null;

    let query = 'SELECT * FROM accounts WHERE (username LIKE ? OR menu_name LIKE ?)';
    let params = [search, search];

    if (menu && menu !== 'all') {
        query += ' AND menu_name = ?';
        params.push(menu);
    }

    query += ' ORDER BY id DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    db.all(query, params, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });

        let countQuery = 'SELECT COUNT(*) as total FROM accounts WHERE (username LIKE ? OR menu_name LIKE ?)';
        let countParams = [search, search];
        if (menu && menu !== 'all') {
            countQuery += ' AND menu_name = ?';
            countParams.push(menu);
        }

        db.get(countQuery, countParams, (cErr, cRow) => {
            res.json({
                accounts: rows || [],
                total: cRow ? cRow.total : 0,
                page,
                totalPages: Math.ceil((cRow ? cRow.total : 0) / limit)
            });
        });
    });
});

// Add Single Account
app.post('/api/accounts', (req, res) => {
    const { menu_name, username, password } = req.body;
    if (!menu_name || !username || !password) {
        return res.status(400).json({ error: 'menu_name, username, and password are required' });
    }

    db.run('INSERT INTO accounts (menu_name, username, password) VALUES (?, ?, ?)', [menu_name.trim(), username.trim(), password.trim()], function (err) {
        if (err) return res.status(500).json({ error: err.message });

        // Ensure menu is registered in config
        const config = loadConfig();
        if (!config.MENUS.includes(menu_name.trim())) {
            config.MENUS.push(menu_name.trim());
            const firstMain = Object.keys(config.MAIN_MENUS)[0] || "General";
            if (!config.MAIN_MENUS[firstMain]) config.MAIN_MENUS[firstMain] = [];
            config.MAIN_MENUS[firstMain].push(menu_name.trim());
            saveConfig(config);
        }

        res.json({ success: true, id: this.lastID });
    });
});

// Edit Account
app.put('/api/accounts/:id', (req, res) => {
    const { id } = req.params;
    const { menu_name, username, password } = req.body;
    db.run('UPDATE accounts SET menu_name = ?, username = ?, password = ? WHERE id = ?', [menu_name, username, password, id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, changes: this.changes });
    });
});

// Delete Account
app.delete('/api/accounts/:id', (req, res) => {
    const { id } = req.params;
    db.run('DELETE FROM accounts WHERE id = ?', [id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, changes: this.changes });
    });
});

// Delete All Accounts
app.delete('/api/accounts/all', (req, res) => {
    db.run('DELETE FROM accounts', [], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, message: 'All accounts deleted' });
    });
});

// Excel Import
app.post('/api/excel/import', upload.single('excel_file'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No Excel file uploaded' });
    }

    try {
        const workbook = XLSX.readFile(req.file.path);
        let sheetName = workbook.SheetNames.find(s => s === 'Data_Entry' || s === 'All Data') || workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(sheet);

        if (!data || data.length === 0) {
            fs.unlinkSync(req.file.path);
            return res.status(400).json({ error: 'Excel file is empty' });
        }

        const config = loadConfig();
        let imported = 0;
        let skipped = 0;
        let newMenus = new Set();

        const stmt = db.prepare('INSERT INTO accounts (menu_name, username, password) VALUES (?, ?, ?)');
        const checkStmt = db.prepare('SELECT 1 FROM accounts WHERE menu_name = ? AND username = ?');

        let processed = 0;
        data.forEach(row => {
            const menuName = row.menu_name ? String(row.menu_name).trim() : '';
            const username = row.username ? String(row.username).trim() : '';
            const password = row.password ? String(row.password).trim() : '';

            if (menuName && username && password) {
                db.get('SELECT 1 FROM accounts WHERE menu_name = ? AND username = ?', [menuName, username], (err, exists) => {
                    if (exists) {
                        skipped++;
                    } else {
                        db.run('INSERT INTO accounts (menu_name, username, password) VALUES (?, ?, ?)', [menuName, username, password]);
                        imported++;
                        newMenus.add(menuName);
                    }
                    processed++;
                    if (processed === data.length) {
                        // Update config with new menus if any
                        newMenus.forEach(m => {
                            if (!config.MENUS.includes(m)) {
                                config.MENUS.push(m);
                                const firstMain = Object.keys(config.MAIN_MENUS)[0] || "General";
                                if (!config.MAIN_MENUS[firstMain]) config.MAIN_MENUS[firstMain] = [];
                                config.MAIN_MENUS[firstMain].push(m);
                            }
                        });
                        saveConfig(config);
                        fs.unlinkSync(req.file.path);
                        res.json({
                            success: true,
                            message: `Imported ${imported} accounts (${skipped} duplicates skipped).`,
                            new_menus: Array.from(newMenus)
                        });
                    }
                });
            } else {
                processed++;
                if (processed === data.length) {
                    fs.unlinkSync(req.file.path);
                    res.json({
                        success: true,
                        message: `Imported ${imported} accounts (${skipped} duplicates skipped).`
                    });
                }
            }
        });
    } catch (e) {
        if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        res.status(500).json({ error: e.message });
    }
});

// Excel Template & Export
app.get('/api/excel/export', (req, res) => {
    const config = loadConfig();
    db.all('SELECT menu_name, username, password FROM accounts', [], (err, allRows) => {
        db.all('SELECT menu_name, COUNT(*) as count FROM accounts GROUP BY menu_name', [], (err, menuCounts) => {
            const wb = XLSX.utils.book_new();

            // Sheet 1: Data_Entry Sample Template
            const sampleData = [
                { menu_name: 'F88$', username: 'user123', password: 'pass123' },
                { menu_name: 'F88$_CH', username: 'user456', password: 'pass456' }
            ];
            const wsSample = XLSX.utils.json_to_sheet(sampleData);
            XLSX.utils.book_append_sheet(wb, wsSample, 'Data_Entry');

            // Sheet 2: menu_name
            const menuSummary = (config.MENUS || []).map(m => {
                const found = (menuCounts || []).find(c => c.menu_name === m);
                return { menu_name: m, Amount: found ? found.count : 0 };
            });
            const wsMenus = XLSX.utils.json_to_sheet(menuSummary);
            XLSX.utils.book_append_sheet(wb, wsMenus, 'menu_name');

            // Sheet 3: All Data
            const wsAll = XLSX.utils.json_to_sheet(allRows || []);
            XLSX.utils.book_append_sheet(wb, wsAll, 'All Data');

            const filePath = path.join(uploadDir, `accounts_export_${Date.now()}.xlsx`);
            XLSX.writeFile(wb, filePath);

            res.download(filePath, 'accounts_backup.xlsx', () => {
                if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
            });
        });
    });
});

// Menu Management
app.post('/api/menus/main', (req, res) => {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });
    const config = loadConfig();
    if (config.MAIN_MENUS[name]) return res.status(400).json({ error: 'Main menu already exists' });

    config.MAIN_MENUS[name] = [];
    saveConfig(config);
    res.json({ success: true, main_menus: config.MAIN_MENUS });
});

app.put('/api/menus/main/:oldName', (req, res) => {
    const { oldName } = req.params;
    const { newName } = req.body;
    if (!newName) return res.status(400).json({ error: 'New name is required' });
    const config = loadConfig();
    if (!config.MAIN_MENUS[oldName]) return res.status(404).json({ error: 'Main menu not found' });

    config.MAIN_MENUS[newName] = config.MAIN_MENUS[oldName];
    delete config.MAIN_MENUS[oldName];
    saveConfig(config);
    res.json({ success: true, main_menus: config.MAIN_MENUS });
});

app.delete('/api/menus/main/:name', (req, res) => {
    const { name } = req.params;
    const config = loadConfig();
    if (!config.MAIN_MENUS[name]) return res.status(404).json({ error: 'Main menu not found' });

    const subs = config.MAIN_MENUS[name] || [];
    delete config.MAIN_MENUS[name];
    config.MENUS = config.MENUS.filter(m => !subs.includes(m));
    saveConfig(config);

    res.json({ success: true, main_menus: config.MAIN_MENUS, menus: config.MENUS });
});

app.post('/api/menus/sub', (req, res) => {
    const { name, main_menu } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });
    const config = loadConfig();

    if (config.MENUS.includes(name)) return res.status(400).json({ error: 'Sub menu already exists' });

    const targetMain = main_menu || Object.keys(config.MAIN_MENUS)[0] || "General";
    if (!config.MAIN_MENUS[targetMain]) config.MAIN_MENUS[targetMain] = [];

    config.MENUS.push(name);
    config.MAIN_MENUS[targetMain].push(name);
    saveConfig(config);

    res.json({ success: true, main_menus: config.MAIN_MENUS, menus: config.MENUS });
});

app.put('/api/menus/sub/:oldName', (req, res) => {
    const { oldName } = req.params;
    const { newName } = req.body;
    if (!newName) return res.status(400).json({ error: 'New name is required' });
    const config = loadConfig();

    if (!config.MENUS.includes(oldName)) return res.status(404).json({ error: 'Sub menu not found' });

    config.MENUS = config.MENUS.map(m => m === oldName ? newName : m);
    for (const [main, subs] of Object.entries(config.MAIN_MENUS)) {
        config.MAIN_MENUS[main] = subs.map(s => s === oldName ? newName : s);
    }
    saveConfig(config);

    db.run('UPDATE accounts SET menu_name = ? WHERE menu_name = ?', [newName, oldName], (err) => {
        res.json({ success: true, main_menus: config.MAIN_MENUS, menus: config.MENUS });
    });
});

app.delete('/api/menus/sub/:name', (req, res) => {
    const { name } = req.params;
    const config = loadConfig();

    config.MENUS = config.MENUS.filter(m => m !== name);
    for (const [main, subs] of Object.entries(config.MAIN_MENUS)) {
        config.MAIN_MENUS[main] = subs.filter(s => s !== name);
    }
    saveConfig(config);

    res.json({ success: true, main_menus: config.MAIN_MENUS, menus: config.MENUS });
});

app.post('/api/menus/move', (req, res) => {
    const { sub_menu, target_main } = req.body;
    const config = loadConfig();

    if (!config.MAIN_MENUS[target_main]) return res.status(404).json({ error: 'Target main menu not found' });

    for (const [main, subs] of Object.entries(config.MAIN_MENUS)) {
        config.MAIN_MENUS[main] = subs.filter(s => s !== sub_menu);
    }
    config.MAIN_MENUS[target_main].push(sub_menu);
    saveConfig(config);

    res.json({ success: true, main_menus: config.MAIN_MENUS });
});

// Claim History Logs
app.get('/api/history', (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const search = req.query.q ? `%${req.query.q}%` : '%';

    db.all(
        'SELECT * FROM history WHERE (tg_name LIKE ? OR menu_name LIKE ? OR account_username LIKE ?) ORDER BY id DESC LIMIT ? OFFSET ?',
        [search, search, search, limit, offset],
        (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            db.get(
                'SELECT COUNT(*) as total FROM history WHERE (tg_name LIKE ? OR menu_name LIKE ? OR account_username LIKE ?)',
                [search, search, search],
                (cErr, cRow) => {
                    res.json({
                        history: rows || [],
                        total: cRow ? cRow.total : 0,
                        page,
                        totalPages: Math.ceil((cRow ? cRow.total : 0) / limit)
                    });
                }
            );
        }
    );
});

// Export History to Excel
app.get('/api/history/export', (req, res) => {
    db.all('SELECT * FROM history ORDER BY id DESC', [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(rows || []);
        XLSX.utils.book_append_sheet(wb, ws, 'History');

        const filePath = path.join(uploadDir, `history_export_${Date.now()}.xlsx`);
        XLSX.writeFile(wb, filePath);

        res.download(filePath, 'claim_history.xlsx', () => {
            if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        });
    });
});

function startBotProcess() {
    if (botProcess !== null) {
        return false;
    }

    addBotLog('Launching Python Telegram Bot process (bot.py)...');

    if (process.platform === 'win32') {
        exec('taskkill /f /im bot.exe', () => {});
    }

    const env = Object.assign({}, process.env, {
        PYTHONUNBUFFERED: '1',
        USER_BASE_DIR: __dirname,
        TOKEN: process.env.BOT_TOKEN || process.env.TOKEN || ''
    });

    const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';
    botProcess = spawn(pythonCmd, ['bot.py'], { cwd: __dirname, env });

    botProcess.stdout.on('data', (data) => {
        const text = data.toString('utf-8').trim();
        if (text) addBotLog(text);
    });

    botProcess.stderr.on('data', (data) => {
        const text = data.toString('utf-8').trim();
        if (text) addBotLog(`[ERROR] ${text}`);
    });

    botProcess.on('close', (code) => {
        addBotLog(`Bot process stopped with code ${code}.`);
        botProcess = null;
    });

    botProcess.on('error', (err) => {
        addBotLog(`Failed to start bot process (${pythonCmd}): ${err.message}`);
        if (pythonCmd === 'python3') {
            try {
                botProcess = spawn('python', ['bot.py'], { cwd: __dirname, env });
            } catch(e) {}
        }
    });

    return true;
}

// Bot Controller (Start / Stop Telegram Bot)
app.get('/api/bot/logs', (req, res) => {
    res.json({ logs: botLogs, running: botProcess !== null });
});

app.post('/api/bot/start', (req, res) => {
    if (botProcess !== null) {
        return res.json({ success: true, message: 'Bot is already running', running: true });
    }
    const started = startBotProcess();
    res.json({ success: started, message: started ? 'Bot process started' : 'Failed to start bot', running: botProcess !== null });
});

app.post('/api/bot/stop', (req, res) => {
    if (botProcess === null) {
        return res.json({ success: true, message: 'Bot is not running', running: false });
    }

    addBotLog('Stopping Telegram Bot process...');
    if (process.platform === 'win32') {
        exec(`taskkill /f /t /pid ${botProcess.pid}`, () => {
            botProcess = null;
            addBotLog('Bot process terminated.');
            res.json({ success: true, message: 'Bot process stopped', running: false });
        });
    } else {
        botProcess.kill();
        botProcess = null;
        res.json({ success: true, message: 'Bot process stopped', running: false });
    }
});

// Update Config / Token
app.post('/api/config', (req, res) => {
    const { token, admin_ids } = req.body;
    const config = loadConfig();
    if (token) config.TOKEN = token;
    if (admin_ids) config.ADMIN_IDS = admin_ids;
    saveConfig(config);
    res.json({ success: true, config });
});

// Start Web Server
if (!process.env.VERCEL) {
    app.listen(PORT, () => {
        console.log(`=================================================`);
        console.log(`🚀 Telegram Bot Web App is live on http://localhost:${PORT}`);
        console.log(`=================================================`);
    });
}

module.exports = app;

