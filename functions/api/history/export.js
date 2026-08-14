// Cloudflare Pages Function: GET /api/history/export

export async function onRequest(context) {
    const { env } = context;
    const db = env.DB;

    const rows = db ? await db.prepare(`SELECT id, tg_name, tg_username, menu_name, account_username, account_password, timestamp FROM history ORDER BY id DESC`).all() : { results: [] };
    const historyData = (rows && rows.results) ? rows.results : [];

    let csv = "ID,Telegram Name,Telegram Username,Menu Category,Account Username,Account Password,Timestamp\n";
    historyData.forEach(r => {
        csv += `"${r.id}","${r.tg_name || ''}","${r.tg_username || ''}","${r.menu_name || ''}","${r.account_username || ''}","${r.account_password || ''}","${r.timestamp || ''}"\n`;
    });

    return new Response(csv, {
        headers: {
            'Content-Type': 'text/csv; charset=utf-8',
            'Content-Disposition': 'attachment; filename="claim_history.csv"',
            'Access-Control-Allow-Origin': '*'
        }
    });
}
