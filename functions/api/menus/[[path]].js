// Cloudflare Pages Function: /api/menus and all subpaths

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

async function getMainMenus(db) {
    if (db) {
        await db.prepare(`CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT)`).run();
        const row = await db.prepare(`SELECT value FROM settings WHERE key = 'main_menus'`).first();
        if (row && row.value) {
            try { return JSON.parse(row.value); } catch (e) {}
        }
    }
    return JSON.parse(JSON.stringify(DEFAULT_MAIN_MENUS));
}

async function saveMainMenus(db, mainMenusObj) {
    if (db) {
        await db.prepare(`INSERT OR REPLACE INTO settings (key, value) VALUES ('main_menus', ?)`).bind(JSON.stringify(mainMenusObj)).run();
    }
}

export async function onRequest(context) {
    const { request, env } = context;
    const db = env.DB;
    const url = new URL(request.url);
    const method = request.method;
    const path = url.pathname;

    if (method === 'OPTIONS') {
        return jsonResponse({ ok: true });
    }

    let mainMenus = await getMainMenus(db);

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

    // POST /api/menus/main -> Add new main menu
    if (method === 'POST' && (path === '/api/menus/main' || path === '/api/menus/main/')) {
        const body = await request.json();
        const name = body.name ? body.name.trim() : '';
        if (!name) return jsonResponse({ error: 'Main menu name is required' }, 400);

        if (!mainMenus[name]) {
            mainMenus[name] = [];
            await saveMainMenus(db, mainMenus);
        }
        return jsonResponse({ success: true, message: `Main menu "${name}" created successfully` });
    }

    // POST /api/menus/sub -> Add new sub menu
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
            await saveMainMenus(db, mainMenus);
        }
        return jsonResponse({ success: true, message: `Sub menu "${subName}" added under "${mainName}"` });
    }

    // PUT /api/menus/main/:oldName -> Rename main menu
    if (method === 'PUT' && path.startsWith('/api/menus/main/')) {
        const oldName = decodeURIComponent(path.replace('/api/menus/main/', '')).trim();
        const body = await request.json();
        const newName = body.newName ? body.newName.trim() : (body.name ? body.name.trim() : '');

        if (!oldName || !newName) return jsonResponse({ error: 'Old and new main menu names required' }, 400);

        if (mainMenus[oldName] && oldName !== newName) {
            const subs = mainMenus[oldName];
            delete mainMenus[oldName];
            mainMenus[newName] = subs;
            await saveMainMenus(db, mainMenus);
        }
        return jsonResponse({ success: true, message: `Main menu renamed to "${newName}"` });
    }

    // DELETE /api/menus/main/:name -> Delete main menu
    if (method === 'DELETE' && path.startsWith('/api/menus/main/')) {
        const name = decodeURIComponent(path.replace('/api/menus/main/', '')).trim();
        if (mainMenus[name]) {
            delete mainMenus[name];
            await saveMainMenus(db, mainMenus);
        }
        return jsonResponse({ success: true, message: `Main menu "${name}" deleted` });
    }

    // PUT /api/menus/sub/:oldName -> Rename sub menu
    if (method === 'PUT' && path.startsWith('/api/menus/sub/')) {
        const oldName = decodeURIComponent(path.replace('/api/menus/sub/', '')).trim();
        const body = await request.json();
        const newName = body.newName ? body.newName.trim() : (body.name ? body.name.trim() : '');

        if (!oldName || !newName) return jsonResponse({ error: 'Old and new sub menu names required' }, 400);

        let updated = false;
        for (const [main, subs] of Object.entries(mainMenus)) {
            const idx = subs.indexOf(oldName);
            if (idx !== -1) {
                subs[idx] = newName;
                updated = true;
            }
        }

        if (updated) {
            await saveMainMenus(db, mainMenus);
            if (db) {
                await db.prepare(`UPDATE accounts SET menu_name = ? WHERE menu_name = ?`).bind(newName, oldName).run();
            }
        }
        return jsonResponse({ success: true, message: `Sub menu renamed from "${oldName}" to "${newName}"` });
    }

    // DELETE /api/menus/sub/:name -> Delete sub menu
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
            await saveMainMenus(db, mainMenus);
        }
        return jsonResponse({ success: true, message: `Sub menu "${name}" deleted` });
    }

    return jsonResponse({ error: 'Method not allowed or endpoint not found' }, 405);
}
