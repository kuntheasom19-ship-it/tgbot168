// Cloudflare Pages Function: GET, POST, PUT, DELETE /api/accounts

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

export async function onRequest(context) {
    const { request, env } = context;
    const db = env.DB;
    const url = new URL(request.url);
    const method = request.method;
    const path = url.pathname;

    if (method === 'OPTIONS') {
        return jsonResponse({ ok: true });
    }

    if (method === 'GET') {
        const page = parseInt(url.searchParams.get('page')) || 1;
        const limit = parseInt(url.searchParams.get('limit')) || 20;
        const offset = (page - 1) * limit;
        const q = url.searchParams.get('q') ? `%${url.searchParams.get('q')}%` : '%';
        const menu = url.searchParams.get('menu');

        let query = `SELECT * FROM accounts WHERE (username LIKE ? OR menu_name LIKE ?)`;
        let params = [q, q];
        if (menu && menu !== 'all') {
            query += ` AND menu_name = ?`;
            params.push(menu);
        }
        query += ` ORDER BY id DESC LIMIT ? OFFSET ?`;
        params.push(limit, offset);

        const rows = await db.prepare(query).bind(...params).all();
        const countRow = await db.prepare(`SELECT COUNT(*) as total FROM accounts WHERE (username LIKE ? OR menu_name LIKE ?)`).bind(q, q).first();

        return jsonResponse({
            accounts: rows.results || [],
            total: countRow ? countRow.total : 0,
            page,
            totalPages: Math.ceil((countRow ? countRow.total : 0) / limit)
        });
    }

    if (method === 'POST') {
        const body = await request.json();

        if (Array.isArray(body)) {
            if (body.length === 0) {
                return jsonResponse({ success: true, count: 0, skipped: 0 });
            }

            const existingRows = await db.prepare(`SELECT menu_name, username FROM accounts`).all();
            const existingSet = new Set((existingRows.results || []).map(r => `${(r.menu_name || '').toLowerCase()}___${(r.username || '').toLowerCase()}`));

            const newAccounts = [];
            let skippedCount = 0;

            for (const acc of body) {
                const key = `${(acc.menu_name || '').toLowerCase()}___${(acc.username || '').toLowerCase()}`;
                if (existingSet.has(key)) {
                    skippedCount++;
                } else {
                    existingSet.add(key);
                    newAccounts.push(acc);
                }
            }

            if (newAccounts.length > 0) {
                const batch = newAccounts.map(acc => db.prepare(`INSERT INTO accounts (menu_name, username, password) VALUES (?, ?, ?)`).bind(acc.menu_name || 'SB_CH', acc.username, acc.password));
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
            const res = await db.prepare(`INSERT INTO accounts (menu_name, username, password) VALUES (?, ?, ?)`).bind(menu_name, username, password).run();
            return jsonResponse({ success: true, id: res.meta ? res.meta.last_row_id : null });
        }
    }

    if (method === 'PUT') {
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

    if (method === 'DELETE') {
        let id = url.searchParams.get('id');
        if (!id) {
            const cleanPath = path.replace('/api/accounts', '').replace(/^\/+/, '');
            if (cleanPath) id = cleanPath;
        }

        if (id) {
            await db.prepare(`DELETE FROM accounts WHERE id = ?`).bind(id).run();
            return jsonResponse({ success: true, message: `Account #${id} deleted` });
        } else {
            await db.prepare(`DELETE FROM accounts`).run();
            return jsonResponse({ success: true, message: 'All accounts deleted' });
        }
    }

    return jsonResponse({ error: 'Method not allowed' }, 405);
}
