// Cloudflare Pages Function: GET /api/status

const DEFAULT_TOKEN = "8896158929:AAEtHImX8E6oURbXH2I5K8c03As7DDdoZCk";
const MAIN_MENUS = {
    "SB": ["SB_CH", "SB_CH_KH", "SB", "SB_KH", "SB_V", "SB_V_KH", "SB_PK", "SB_PK_KH", "SB_TH", "SB_TH_KH"],
    "Ball": ["Ball_CH", "Ball_V", "Ball_KL", "Ball_TH", "Ball_PK", "Ball"],
    "F88": ["F88_CH", "F88_CH_KH", "F88", "F88_KH", "F88_PK", "F88_PK_KH", "F88_V", "F88_V_KH", "F88_Joker", "F88_Joker_KH", "F88_BK", "F88_BK_KH", "F88_MB", "F88_MB_KH"],
    "Makav": ["Makav_CH", "Makav", "Makav_V", "Makav_KL", "Makav_PK", "Makav_TH"],
    "CF388": ["CF388_KH", "CF388_V_KH", "CF388_PK_KH", "CF388_KL_KH", "CF388_TH_KH", "CF388_CH_KH"],
    "M99": ["M99_CH", "M99_CH_KH", "M99", "M99_KH", "M99_PK", "M99_PK_KH", "M99_TH", "M99_TH_KH"],
    "Wa855": ["Wa855_CH", "Wa855_CH_KH", "Wa855", "Wa855_KH", "Wa855_PK", "Wa855_PK_KH", "W855_TH", "W855_TH_KH"],
    "Betwos": ["Betwos_CH", "Betwos", "Betwos_V", "Betwos_PK", "Betwos_KL", "Betwos_TH", "Betwos_BK"],
    "Joker": ["Joker_CH", "Joker", "Joker_V", "Joker_PK", "Joker_KL", "Joker_TH", "Joker_BK"]
};

export async function onRequest(context) {
    const { env } = context;
    const db = env.DB;
    let token = env.BOT_TOKEN || DEFAULT_TOKEN;
    let botStatusSetting = '1';

    if (db) {
        await db.prepare(`CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT)`).run();
        const tokenRow = await db.prepare(`SELECT value FROM settings WHERE key = 'token'`).first();
        if (tokenRow && tokenRow.value) token = tokenRow.value;

        const statusRow = await db.prepare(`SELECT value FROM settings WHERE key = 'bot_status'`).first();
        if (statusRow && statusRow.value !== undefined) botStatusSetting = statusRow.value;
    }

    let isBotRunning = false;
    if (botStatusSetting !== '0') {
        try {
            const res = await fetch(`https://api.telegram.org/bot${token}/getWebhookInfo`);
            const data = await res.json();
            isBotRunning = data.ok && data.result && !!data.result.url;
        } catch (e) {}
    }

    const now = new Date();
    const phnomPenhOffset = 7 * 60 * 60 * 1000;
    const phnomPenhDate = new Date(now.getTime() + phnomPenhOffset);
    const todayStr = phnomPenhDate.toISOString().slice(0, 10);

    const accRow = db ? await db.prepare(`SELECT COUNT(*) as total FROM accounts`).first() : { total: 0 };
    const histRow = db ? await db.prepare(`SELECT COUNT(*) as total FROM history`).first() : { total: 0 };
    const todayHistRow = db ? await db.prepare(`SELECT COUNT(*) as total FROM history WHERE substr(timestamp, 1, 10) = ? OR timestamp LIKE ?`).bind(todayStr, `${todayStr}%`).first() : { total: 0 };
    const allSubs = Object.values(MAIN_MENUS).flat();

    return new Response(JSON.stringify({
        bot_running: isBotRunning,
        total_accounts: accRow ? accRow.total : 0,
        total_claimed: histRow ? histRow.total : 0,
        today_claimed: todayHistRow ? todayHistRow.total : 0,
        total_main_menus: Object.keys(MAIN_MENUS).length,
        total_sub_menus: allSubs.length,
        token: token,
        admin_ids: [8558847170, 551401200]
    }), {
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        }
    });
}
