// Cloudflare Pages Function: POST & GET /api/config

const DEFAULT_TOKEN = "8896158929:AAEtHImX8E6oURbXH2I5K8c03As7DDdoZCk";

export async function onRequest(context) {
    const { request, env } = context;
    const db = env.DB;
    const url = new URL(request.url);
    const method = request.method;

    if (method === 'OPTIONS') {
        return new Response(JSON.stringify({ ok: true }), {
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type'
            }
        });
    }

    // Ensure settings table exists
    if (db) {
        await db.prepare(`CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT)`).run();
    }

    if (method === 'GET') {
        let token = env.BOT_TOKEN || DEFAULT_TOKEN;
        let adminIds = [8558847170, 551401200];

        if (db) {
            const tokenRow = await db.prepare(`SELECT value FROM settings WHERE key = 'token'`).first();
            if (tokenRow && tokenRow.value) token = tokenRow.value;

            const adminRow = await db.prepare(`SELECT value FROM settings WHERE key = 'admin_ids'`).first();
            if (adminRow && adminRow.value) {
                try { adminIds = JSON.parse(adminRow.value); } catch(e) {}
            }
        }

        return new Response(JSON.stringify({ token, admin_ids: adminIds }), {
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
    }

    if (method === 'POST') {
        const body = await request.json();
        const { token, admin_ids } = body;

        if (!token) {
            return new Response(JSON.stringify({ error: 'Token is required' }), { status: 400 });
        }

        if (db) {
            await db.prepare(`INSERT INTO settings (key, value) VALUES ('token', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value`).bind(token).run();
            if (admin_ids) {
                await db.prepare(`INSERT INTO settings (key, value) VALUES ('admin_ids', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value`).bind(JSON.stringify(admin_ids)).run();
            }
        }

        // Re-set Telegram Webhook and Chat Menu Button with the NEW token
        const domain = url.host;
        const webhookUrl = `https://${domain}/api/telegram-webhook`;
        try {
            await fetch(`https://api.telegram.org/bot${token}/setWebhook?url=${encodeURIComponent(webhookUrl)}`);
            await fetch(`https://api.telegram.org/bot${token}/setMyCommands`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    commands: [
                        { command: 'start', description: 'សូមចាប់ផ្តើម និងបង្ហាញម៉ឺនុយ' }
                    ]
                })
            });
            await fetch(`https://api.telegram.org/bot${token}/setChatMenuButton`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    menu_button: { type: 'commands' }
                })
            });
        } catch (e) {}

        return new Response(JSON.stringify({
            success: true,
            message: 'Bot token updated and webhook re-linked successfully!',
            token: token
        }), {
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
    }

    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
}
