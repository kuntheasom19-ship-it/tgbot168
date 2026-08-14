// Cloudflare Pages Function: POST /api/rollback

export async function onRequest(context) {
    const { request, env } = context;
    const db = env.DB;

    if (request.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
    }

    try {
        const body = await request.json();
        const { menu_name, username, password, history_id } = body;

        if (!menu_name || !username || !password) {
            return new Response(JSON.stringify({ error: 'Missing account details' }), { status: 400 });
        }

        // 1. Restore account back into accounts table
        await db.prepare(`INSERT INTO accounts (menu_name, username, password) VALUES (?, ?, ?)`).bind(menu_name, username, password).run();

        // 2. Remove entry from history table
        if (history_id) {
            await db.prepare(`DELETE FROM history WHERE id = ?`).bind(history_id).run();
        } else {
            await db.prepare(`DELETE FROM history WHERE menu_name = ? AND account_username = ? ORDER BY id DESC LIMIT 1`).bind(menu_name, username).run();
        }

        return new Response(JSON.stringify({ success: true, message: 'Account returned to stock successfully' }), {
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            }
        });
    } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
}
