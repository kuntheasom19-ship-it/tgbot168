// Cloudflare Pages Function: POST /api/admin/login, POST /api/admin/password

export async function onRequest(context) {
    const { request, env } = context;
    const db = env.DB;
    const url = new URL(request.url);
    const method = request.method;

    if (method === 'OPTIONS') {
        return new Response(null, {
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type'
            }
        });
    }

    if (method === 'POST') {
        try {
            const body = await request.json();
            const action = body.action || 'login';

            // Get current admin_password from settings, fallback to '13579'
            const pwdRow = await db.prepare(`SELECT value FROM settings WHERE key = 'admin_password'`).first();
            const currentPassword = pwdRow ? pwdRow.value : '13579';

            if (action === 'login') {
                const inputPassword = body.password || '';
                if (inputPassword === currentPassword) {
                    return new Response(JSON.stringify({ success: true, message: 'Admin login successful' }), {
                        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
                    });
                } else {
                    return new Response(JSON.stringify({ success: false, error: 'ពាក្យសម្ងាត់មិនត្រឹមត្រូវឡើយ!' }), {
                        status: 401,
                        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
                    });
                }
            }

            if (action === 'change_password') {
                const oldPassword = body.old_password || '';
                const newPassword = body.new_password || '';

                if (oldPassword !== currentPassword) {
                    return new Response(JSON.stringify({ success: false, error: 'ពាក្យសម្ងាត់ចាស់មិនត្រឹមត្រូវឡើយ!' }), {
                        status: 400,
                        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
                    });
                }

                if (!newPassword || newPassword.trim().length < 4) {
                    return new Response(JSON.stringify({ success: false, error: 'ពាក្យសម្ងាត់ថ្មីត្រូវតែមានយ៉ាងតិច ៤ តួ!' }), {
                        status: 400,
                        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
                    });
                }

                await db.prepare(`INSERT OR REPLACE INTO settings (key, value) VALUES ('admin_password', ?)`).bind(newPassword.trim()).run();

                return new Response(JSON.stringify({ success: true, message: 'កែប្រែពាក្យសម្ងាត់ Admin រួចរាល់!' }), {
                    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
                });
            }

        } catch (e) {
            return new Response(JSON.stringify({ success: false, error: e.message }), {
                status: 500,
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
            });
        }
    }

    return new Response(JSON.stringify({ error: 'Method Not Allowed' }), { status: 405 });
}
