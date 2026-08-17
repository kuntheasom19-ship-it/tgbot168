const DEFAULT_TOKEN = "8853663191:AAFZXa_aYKGzNyVVwSmuX6V_dHYw6jbSy3M";

export async function onRequestPost(context) {
    const { request, env } = context;
    const db = env.DB;

    let token = env.BOT_TOKEN || DEFAULT_TOKEN;
    if (db) {
        try {
            const tokenRow = await db.prepare(`SELECT value FROM settings WHERE key = 'token'`).first();
            if (tokenRow && tokenRow.value) token = tokenRow.value;
        } catch (e) {}
    }

    try {
        const body = await request.json();
        const { user_id, menu_name, username, password } = body;

        if (!user_id) {
            return new Response(JSON.stringify({ success: false, error: 'user_id is required' }), {
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
            });
        }

        if (!token) {
            return new Response(JSON.stringify({ success: false, error: 'Telegram Bot Token is not configured' }), {
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
            });
        }

        // Send Message in Telegram default font
        const message = `<b>✅ គណនី ${menu_name} របស់អ្នក៖</b>\n\n${username}\n${password}`;
        await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: user_id,
                text: message,
                parse_mode: 'HTML'
            })
        });

        // NOTE: NO HISTORY INSERTION HERE! History is recorded strictly ONCE during /api/claim.
        return new Response(JSON.stringify({ success: true }), {
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
    } catch (e) {
        return new Response(JSON.stringify({ success: false, error: e.message }), {
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
    }
}
