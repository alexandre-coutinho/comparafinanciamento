export default {
  async fetch(request, env) {
    if (request.method !== 'POST') {
      return new Response('Método não permitido', { status: 405 });
    }

    try {
      const dados = await request.json();
      const { nome, email, telefone, tipo, valor, mensagem } = dados;

      const msg = [
        `Compara Financiamento`,
        ``,
        `*Nome:* ${nome || 'Não informado'}`,
        `*Email:* ${email || 'Não informado'}`,
        `*Telefone:* ${telefone || 'Não informado'}`,
        `*Tipo:* ${tipo || 'Não informado'}`,
        `*Valor:* ${valor || 'Não informado'}`,
        mensagem ? `*Mensagem:* ${mensagem}` : null,
      ].filter(Boolean).join('\n');

      const res = await fetch(
        `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: env.TELEGRAM_CHAT_ID,
            text: msg,
            parse_mode: 'Markdown',
          }),
        }
      );

      if (!res.ok) {
        const err = await res.text();
        return new Response(JSON.stringify({ error: err }), { status: 500 });
      }

      return new Response(JSON.stringify({ ok: true }), {
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), { status: 500 });
    }
  },
};
