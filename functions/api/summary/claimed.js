// Cloudflare Pages Function: GET /api/summary/claimed

function jsonResponse(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: {
            'Content-Type': 'application/json;charset=UTF-8',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type'
        }
    });
}

export async function onRequest(context) {
    const { request, env } = context;
    const db = env.DB;
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
        return jsonResponse({ ok: true });
    }

    try {
        const startDate = url.searchParams.get('start_date');
        const endDate = url.searchParams.get('end_date');
        const q = url.searchParams.get('q');

        let query = `SELECT * FROM history WHERE 1=1`;
        const params = [];

        if (startDate) {
            query += ` AND (timestamp >= ? OR substr(timestamp, 1, 10) >= ?)`;
            params.push(`${startDate} 00:00:00`, startDate);
        }
        if (endDate) {
            query += ` AND (timestamp <= ? OR substr(timestamp, 1, 10) <= ?)`;
            params.push(`${endDate} 23:59:59`, endDate);
        }
        if (q) {
            query += ` AND (timestamp LIKE ? OR menu_name LIKE ? OR tg_name LIKE ?)`;
            params.push(`%${q}%`, `%${q}%`, `%${q}%`);
        }

        query += ` ORDER BY timestamp DESC, id DESC`;

        const historyRows = db ? await db.prepare(query).bind(...params).all() : { results: [] };
        const rows = historyRows.results || [];

        const dailySummaryMap = {};
        const todayStr = new Date(Date.now() + (7 * 60 * 60 * 1000)).toISOString().slice(0, 10);
        const yesterdayStr = new Date(Date.now() + (7 * 60 * 60 * 1000) - (86400000)).toISOString().slice(0, 10);
        const currentMonthStr = todayStr.slice(0, 7);

        let todayTotal = 0;
        let yesterdayTotal = 0;
        let monthTotal = 0;
        const todayCategoryCounts = {};

        rows.forEach(h => {
            const dateKey = (h.timestamp || '').substring(0, 10);
            if (!dateKey || dateKey.length < 10) return;

            if (dateKey === todayStr) {
                todayTotal++;
                const cat = h.menu_name || 'Other';
                todayCategoryCounts[cat] = (todayCategoryCounts[cat] || 0) + 1;
            }
            if (dateKey === yesterdayStr) {
                yesterdayTotal++;
            }
            if (dateKey.startsWith(currentMonthStr)) {
                monthTotal++;
            }

            if (!dailySummaryMap[dateKey]) {
                dailySummaryMap[dateKey] = {
                    date: dateKey,
                    total: 0,
                    usersSet: new Set(),
                    breakdown: {}
                };
            }

            const item = dailySummaryMap[dateKey];
            item.total += 1;
            if (h.tg_name || h.tg_username || h.user_id) {
                item.usersSet.add(h.tg_name || h.tg_username || h.user_id);
            }
            const cat = h.menu_name || 'Other';
            item.breakdown[cat] = (item.breakdown[cat] || 0) + 1;
        });

        // Find top category today
        let topCategoryToday = '-';
        let maxCount = 0;
        for (const [cat, count] of Object.entries(todayCategoryCounts)) {
            if (count > maxCount) {
                maxCount = count;
                topCategoryToday = `${cat} (${count})`;
            }
        }

        const summaryList = Object.values(dailySummaryMap).map(d => ({
            date: d.date,
            total: d.total,
            unique_users: d.usersSet.size,
            breakdown: d.breakdown
        }));

        return jsonResponse({
            success: true,
            metrics: {
                today_claimed: todayTotal,
                yesterday_claimed: yesterdayTotal,
                month_claimed: monthTotal,
                top_category_today: topCategoryToday
            },
            summary: summaryList
        });

    } catch (e) {
        return jsonResponse({ error: e.message }, 500);
    }
}
