// Cloudflare Pages Function: POST /api/send-excel-telegram
export async function onRequestPost(context) {
    const { request, env } = context;
    const db = env.DB;

    try {
        const body = await request.json();
        const { user_id, filename, file_base64 } = body;

        if (!user_id || !file_base64) {
            return new Response(JSON.stringify({ success: false, error: 'user_id and file_base64 are required' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
            });
        }

        // Fetch Bot Token from env or D1 settings
        let token = env.BOT_TOKEN;
        if (!token && db) {
            try {
                const row = await db.prepare(`SELECT value FROM settings WHERE key = 'token'`).first();
                if (row && row.value) token = row.value;
            } catch (e) {}
        }

        if (!token) {
            return new Response(JSON.stringify({ success: false, error: 'Telegram Bot Token is not configured' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
            });
        }

        // Convert Base64 string to Uint8Array Uint8Array / Blob
        const binaryStr = atob(file_base64);
        const bytes = new Uint8Array(binaryStr.length);
        for (let i = 0; i < binaryStr.length; i++) {
            bytes[i] = binaryStr.charCodeAt(i);
        }

        const blob = new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const formData = new FormData();
        formData.append('chat_id', user_id);
        formData.append('caption', '📊 នេះជាឯកសារទិន្នន័យទាំងអស់ (Export All Data .xlsx)');
        formData.append('document', blob, filename || 'Export_All_Data.xlsx');

        const tgRes = await fetch(`https://api.telegram.org/bot${token}/sendDocument`, {
            method: 'POST',
            body: formData
        });

        const tgData = await tgRes.json();
        return new Response(JSON.stringify({ success: tgData.ok, result: tgData }), {
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });

    } catch (err) {
        return new Response(JSON.stringify({ success: false, error: err.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
    }
}

export async function onRequestOptions() {
    return new Response(null, {
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type'
        }
    });
}
