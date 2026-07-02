function escapeMarkdown(value) {
  return String(value || '').replace(/([_*[\]()~`>#+\-=|{}.!\\])/g, '\\$1');
}

export async function onRequest(context) {
  const { request, env } = context;

  if (request.method === 'OPTIONS') {
    return new Response(null, {
      headers: { Allow: 'POST, OPTIONS' },
    });
  }

  if (request.method !== 'POST') {
    return Response.json({ error: 'Metodo nao permitido.' }, { status: 405 });
  }

  if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_CHAT_ID) {
    return Response.json({ error: 'Telegram nao configurado.' }, { status: 500 });
  }

  try {
    const dados = await request.json();
    const { nome, cidade, sistema, economia, mensagem, estrelas } = dados;

    const msg = [
      '*Novo Depoimento*',
      '',
      `*Nome:* ${escapeMarkdown(nome) || 'Nao informado'}`,
      estrelas ? `*Estrelas:* ${'⭐'.repeat(parseInt(estrelas) || 0)}` : null,
      cidade ? `*Cidade:* ${escapeMarkdown(cidade)}` : null,
      sistema ? `*Sistema:* ${escapeMarkdown(sistema)}` : null,
      economia ? `*Economizou:* R$ ${escapeMarkdown(economia)}` : null,
      mensagem ? `*Depoimento:* ${escapeMarkdown(mensagem)}` : null,
    ].filter(Boolean).join('\n');

    const telegramRes = await fetch(
      `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: env.TELEGRAM_CHAT_ID,
          text: msg,
          parse_mode: 'MarkdownV2',
        }),
      }
    );

    if (!telegramRes.ok) {
      return Response.json({ error: 'Erro ao enviar para o Telegram.' }, { status: 502 });
    }

    return Response.json({ ok: true });
  } catch (err) {
    return Response.json({ error: 'Requisicao invalida.' }, { status: 400 });
  }
}
