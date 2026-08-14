// Cloudflare Pages Function: GET & POST /api/bot/stop

const DEFAULT_TOKEN = "8896158929:AAEtHImX8E6oURbXH2I5K8c03As7DDdoZCk";

async function handleStop(context) {
    const { env } = context;
    const db = env.DB;
    let token = env.BOT_TOKEN || DEFAULT_TOKEN;

    if (db) {
        await db.prepare(`CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT)`).run();
        const tokenRow = await db.prepare(`SELECT value FROM settings WHERE key = 'token'`).first();
        if (tokenRow && tokenRow.value) token = tokenRow.value;

        // Set bot_status = 0 in database
        await db.prepare(`INSERT INTO settings (key, value) VALUES ('bot_status', '0') ON CONFLICT(key) DO UPDATE SET value = '0'`).run();
    }

    try {
        const res = await fetch(`https://api.telegram.org/bot${token}/deleteWebhook`);
        const data = await res.json();

        return new Response(JSON.stringify({
            success: true,
            message: 'Telegram Bot Webhook Stopped',
            running: false
        }), {
            headers: {
                'Content-Type': 'application/json;charset=UTF-8',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
            }
        });
    } catch (e) {
        return new Response(JSON.stringify({ success: true, message: 'Telegram Bot Webhook Stopped', running: false }), {
            headers: {
                'Content-Type': 'application/json;charset=UTF-8',
                'Access-Control-Allow-Origin': '*'
            }
        });
    }
}

export const onRequestGet = handleStop;
export const onRequestPost = handleStop;
export const onRequest = handleStop;
