// Cloudflare Pages Function: GET & POST /api/bot/start

const DEFAULT_TOKEN = "8896158929:AAEtHImX8E6oURbXH2I5K8c03As7DDdoZCk";

async function handleStart(context) {
    const { request, env } = context;
    const db = env.DB;
    const url = new URL(request.url);
    let token = env.BOT_TOKEN || DEFAULT_TOKEN;

    if (db) {
        await db.prepare(`CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT)`).run();
        const tokenRow = await db.prepare(`SELECT value FROM settings WHERE key = 'token'`).first();
        if (tokenRow && tokenRow.value) token = tokenRow.value;

        // Set bot_status = 1 in database
        await db.prepare(`INSERT INTO settings (key, value) VALUES ('bot_status', '1') ON CONFLICT(key) DO UPDATE SET value = '1'`).run();
    }

    const domain = url.host;
    const webhookUrl = `https://${domain}/api/telegram-webhook`;

    try {
        const res = await fetch(`https://api.telegram.org/bot${token}/setWebhook?url=${encodeURIComponent(webhookUrl)}`);
        const data = await res.json();

        return new Response(JSON.stringify({
            success: data.ok,
            message: data.ok ? 'Telegram Bot Webhook 24/7 Started' : data.description,
            running: data.ok,
            token: token
        }), {
            headers: {
                'Content-Type': 'application/json;charset=UTF-8',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
            }
        });
    } catch (e) {
        return new Response(JSON.stringify({ success: false, message: e.message }), { status: 500 });
    }
}

export const onRequestGet = handleStart;
export const onRequestPost = handleStart;
export const onRequest = handleStart;
