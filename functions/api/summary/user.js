// Cloudflare Pages Function: GET /api/summary/user

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
            query += ` AND (timestamp LIKE ? OR menu_name LIKE ? OR tg_name LIKE ? OR tg_username LIKE ?)`;
            params.push(`%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`);
        }

        query += ` ORDER BY timestamp DESC, id DESC`;

        const historyRows = db ? await db.prepare(query).bind(...params).all() : { results: [] };
        const rows = historyRows.results || [];

        const todayStr = new Date(Date.now() + (7 * 60 * 60 * 1000)).toISOString().slice(0, 10);
        const userSummaryMap = {};
        const todayUserCounts = {};

        rows.forEach(h => {
            const dateKey = (h.timestamp || '').substring(0, 10);
            if (!dateKey || dateKey.length < 10) return;

            const userName = h.tg_name || h.tg_username || 'Web User';
            const tgUser = h.tg_username || '';
            const key = userName;

            if (dateKey === todayStr) {
                todayUserCounts[userName] = (todayUserCounts[userName] || 0) + 1;
            }

            if (!userSummaryMap[key]) {
                userSummaryMap[key] = {
                    min_date: dateKey,
                    max_date: dateKey,
                    user_name: userName,
                    tg_username: tgUser,
                    total_claimed: 0,
                    breakdown: {}
                };
            }

            const item = userSummaryMap[key];
            item.total_claimed += 1;
            if (dateKey < item.min_date) item.min_date = dateKey;
            if (dateKey > item.max_date) item.max_date = dateKey;

            const cat = h.menu_name || 'Other';
            item.breakdown[cat] = (item.breakdown[cat] || 0) + 1;
        });

        // Calculate Today's Top User & Metrics
        const todayActiveUsersCount = Object.keys(todayUserCounts).length;
        let todayTotalClaims = 0;
        let topUserToday = '-';
        let maxUserClaims = 0;

        for (const [uName, count] of Object.entries(todayUserCounts)) {
            todayTotalClaims += count;
            if (count > maxUserClaims) {
                maxUserClaims = count;
                topUserToday = `${uName} (${count})`;
            }
        }

        const avgClaimsToday = todayActiveUsersCount > 0 ? (todayTotalClaims / todayActiveUsersCount).toFixed(1) : 0;

        const summaryList = Object.values(userSummaryMap).map(u => ({
            date: u.min_date === u.max_date ? u.min_date : `${u.min_date} ដល់ ${u.max_date}`,
            user_name: u.user_name,
            tg_username: u.tg_username,
            total_claimed: u.total_claimed,
            breakdown: u.breakdown
        })).sort((a, b) => b.total_claimed - a.total_claimed);

        return jsonResponse({
            success: true,
            metrics: {
                today_active_users: todayActiveUsersCount,
                top_user_today: topUserToday,
                avg_claims_today: avgClaimsToday
            },
            summary: summaryList
        });

    } catch (e) {
        return jsonResponse({ error: e.message }, 500);
    }
}
