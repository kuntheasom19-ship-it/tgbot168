// Cloudflare Pages Function: POST /api/claim

function getPhnomPenhTimeStr() {
    const date = new Date();
    const utc7 = new Date(date.getTime() + (7 * 60 * 60 * 1000));
    return utc7.toISOString().replace('T', ' ').substring(0, 19);
}

export async function onRequest(context) {
    const { request, env } = context;
    const db = env.DB;

    if (request.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
    }

    const body = await request.json();
    const { menu_name, user_name, tg_username } = body;

    if (!menu_name) {
        return new Response(JSON.stringify({ error: 'Menu name is required' }), { status: 400 });
    }

    const acc = await db.prepare(`SELECT id, username, password FROM accounts WHERE menu_name = ? ORDER BY id ASC LIMIT 1`).bind(menu_name).first();
    if (!acc) {
        return new Response(JSON.stringify({ error: `No accounts left under category "${menu_name}"` }), { status: 404 });
    }

    try { await db.prepare(`ALTER TABLE history ADD COLUMN stock_left INTEGER DEFAULT 0`).run(); } catch(e) {}

    await db.prepare(`DELETE FROM accounts WHERE id = ?`).bind(acc.id).run();
    const timestamp = getPhnomPenhTimeStr();
    const clientName = user_name || 'Web User';
    const clientUsername = tg_username || 'web_user';

    const countRow = await db.prepare(`SELECT COUNT(*) as count FROM accounts WHERE menu_name = ?`).bind(menu_name).first();
    const remainingStock = countRow ? countRow.count : 0;

    const histRes = await db.prepare(`INSERT INTO history (user_id, tg_username, tg_name, menu_name, account_username, account_password, timestamp, stock_left) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).bind(0, clientUsername, clientName, menu_name, acc.username, acc.password, timestamp, remainingStock).run();
    const historyId = (histRes && histRes.meta) ? histRes.meta.last_row_id : null;

    return new Response(JSON.stringify({
        success: true,
        account: { username: acc.username, password: acc.password },
        menu_name: menu_name,
        history_id: historyId,
        remaining: countRow ? countRow.count : 0,
        timestamp: timestamp
    }), {
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        }
    });
}
