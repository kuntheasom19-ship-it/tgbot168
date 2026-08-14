// Cloudflare Pages Function: GET, DELETE /api/history (With Custom Date Range Filtering & Deletion)

export async function onRequest(context) {
    const { request, env } = context;
    const db = env.DB;
    const url = new URL(request.url);
    const method = request.method;

    if (method === 'DELETE') {
        const singleId = url.searchParams.get('id');
        if (singleId) {
            const res = await db.prepare(`DELETE FROM history WHERE id = ?`).bind(singleId).run();
            return new Response(JSON.stringify({
                success: true,
                message: 'Single history record deleted successfully',
                count: 1
            }), { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
        }

        const startDate = url.searchParams.get('start_date');
        const endDate = url.searchParams.get('end_date');

        let deleteQuery = `DELETE FROM history WHERE 1=1`;
        const params = [];

        if (startDate) {
            deleteQuery += ` AND (timestamp >= ? OR substr(timestamp, 1, 10) >= ?)`;
            params.push(`${startDate} 00:00:00`, startDate);
        }
        if (endDate) {
            deleteQuery += ` AND (timestamp <= ? OR substr(timestamp, 1, 10) <= ?)`;
            params.push(`${endDate} 23:59:59`, endDate);
        }

        const res = await db.prepare(deleteQuery).bind(...params).run();
        const deletedCount = (res && res.meta && res.meta.changes !== undefined) ? res.meta.changes : 0;

        return new Response(JSON.stringify({
            success: true,
            message: 'History records deleted successfully',
            count: deletedCount
        }), { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
    }

    const page = parseInt(url.searchParams.get('page')) || 1;
    const limit = parseInt(url.searchParams.get('limit')) || 20;
    const offset = (page - 1) * limit;
    const q = url.searchParams.get('q') ? `%${url.searchParams.get('q')}%` : '%';
    const startDate = url.searchParams.get('start_date');
    const endDate = url.searchParams.get('end_date');

    let query = `SELECT * FROM history WHERE (tg_name LIKE ? OR menu_name LIKE ? OR account_username LIKE ?)`;
    let countQuery = `SELECT COUNT(*) as total FROM history WHERE (tg_name LIKE ? OR menu_name LIKE ? OR account_username LIKE ?)`;
    const params = [q, q, q];
    const countParams = [q, q, q];

    if (startDate) {
        query += ` AND (timestamp >= ? OR substr(timestamp, 1, 10) >= ?)`;
        countQuery += ` AND (timestamp >= ? OR substr(timestamp, 1, 10) >= ?)`;
        params.push(`${startDate} 00:00:00`, startDate);
        countParams.push(`${startDate} 00:00:00`, startDate);
    }

    if (endDate) {
        query += ` AND (timestamp <= ? OR substr(timestamp, 1, 10) <= ?)`;
        countQuery += ` AND (timestamp <= ? OR substr(timestamp, 1, 10) <= ?)`;
        params.push(`${endDate} 23:59:59`, endDate);
        countParams.push(`${endDate} 23:59:59`, endDate);
    }

    query += ` ORDER BY id DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    try {
        await db.prepare(`ALTER TABLE history ADD COLUMN stock_left INTEGER DEFAULT 0`).run();
    } catch(e) {}

    // 1. Live stock counts per menu_name
    const countsRow = await db.prepare(`SELECT menu_name, COUNT(*) as count FROM accounts GROUP BY menu_name`).all();
    const currentCounts = {};
    if (countsRow && countsRow.results) {
        countsRow.results.forEach(r => { currentCounts[r.menu_name] = r.count; });
    }

    // 2. Build exact sequence map for all history entries ordered by id DESC
    const allHistRes = await db.prepare(`SELECT id, menu_name, stock_left FROM history ORDER BY id DESC`).all();
    const menuSeqMap = {};
    if (allHistRes && allHistRes.results) {
        const menuIndices = {};
        allHistRes.results.forEach(h => {
            const m = h.menu_name;
            if (menuIndices[m] === undefined) menuIndices[m] = 0;
            const liveCount = currentCounts[m] !== undefined ? currentCounts[m] : 0;

            const calculatedStock = liveCount + menuIndices[m];

            if (h.stock_left && h.stock_left > 0 && menuIndices[m] === 0) {
                menuSeqMap[h.id] = h.stock_left;
            } else {
                menuSeqMap[h.id] = calculatedStock;
            }

            menuIndices[m]++;
        });
    }

    const rows = await db.prepare(query).bind(...params).all();
    const countRow = await db.prepare(countQuery).bind(...countParams).first();

    const historyWithStock = (rows.results || []).map(h => {
        const stockVal = menuSeqMap[h.id] !== undefined ? menuSeqMap[h.id] : (h.stock_left || 0);
        return {
            ...h,
            stock_left: stockVal
        };
    });

    return new Response(JSON.stringify({
        history: historyWithStock,
        total: countRow ? countRow.total : 0,
        page,
        totalPages: Math.ceil((countRow ? countRow.total : 0) / limit)
    }), { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
}
