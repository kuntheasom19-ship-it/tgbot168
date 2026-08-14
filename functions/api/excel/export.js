// Cloudflare Pages Function: GET /api/excel/export

export async function onRequest(context) {
    const { env } = context;
    const db = env.DB;

    const rows = db ? await db.prepare(`SELECT menu_name, username, password FROM accounts`).all() : { results: [] };
    const accountsData = (rows && rows.results) ? rows.results : [];

    const menusRows = db ? await db.prepare(`SELECT DISTINCT menu_name FROM accounts`).all() : { results: [] };
    const menusData = (menusRows && menusRows.results) ? menusRows.results : [];

    // Return JSON or CSV format with attachment headers
    let csv = "menu_name,username,password\n";
    accountsData.forEach(r => {
        csv += `"${r.menu_name || ''}","${r.username || ''}","${r.password || ''}"\n`;
    });

    return new Response(csv, {
        headers: {
            'Content-Type': 'text/csv; charset=utf-8',
            'Content-Disposition': 'attachment; filename="accounts_data.csv"',
            'Access-Control-Allow-Origin': '*'
        }
    });
}
