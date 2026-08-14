// Cloudflare Pages Function: GET /api/bot/logs

const DEFAULT_TOKEN = "8896158929:AAEtHImX8E6oURbXH2I5K8c03As7DDdoZCk";

export async function onRequest(context) {
    const { env } = context;
    const token = env.BOT_TOKEN || DEFAULT_TOKEN;

    let isRunning = false;
    try {
        const res = await fetch(`https://api.telegram.org/bot${token}/getWebhookInfo`);
        const data = await res.json();
        isRunning = data.ok && data.result && !!data.result.url;
    } catch (e) {}

    return new Response(JSON.stringify({
        logs: [
            `[Cloudflare Edge Engine] Telegram Bot Webhook: ${isRunning ? 'ACTIVE 24/7' : 'STOPPED'}`,
            `[Database] Bound to Cloudflare D1 (tgbot-db)`
        ],
        running: isRunning
    }), {
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        }
    });
}
