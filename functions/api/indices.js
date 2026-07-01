async function fetchSeries(code) {
  const url = `https://api.bcb.gov.br/dados/serie/bcdata.sgs.${code}/dados?formato=json&dataInicial=01/01/2022`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`BCB error for ${code}`);
  return res.json();
}

function convertData(arr) {
  const obj = {};
  for (const item of arr) {
    const [dia, mes, ano] = item.data.split('/');
    obj[`${ano}-${mes}`] = parseFloat(item.valor);
  }
  return obj;
}

const SERIES = [
  { name: 'ipca', code: '10844' },
  { name: 'igpm', code: '189' },
  { name: 'poupanca', code: '195' },
  { name: 'selic', code: '1178' },
];

export async function onRequest(context) {
  const { request, env } = context;

  if (request.method === 'OPTIONS') {
    return new Response(null, {
      headers: { Allow: 'GET, OPTIONS' },
    });
  }

  if (request.method !== 'GET') {
    return Response.json({ error: 'Metodo nao permitido.' }, { status: 405 });
  }

  if (env.INDICES_KV) {
    try {
      const cached = await env.INDICES_KV.get('indices_data', 'json');
      if (cached) {
        return new Response(JSON.stringify(cached), {
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'public, max-age=3600',
          },
        });
      }
    } catch (e) {
      // ignore KV read errors
    }
  }

const results = await Promise.allSettled(
  SERIES.map(s => fetchSeries(s.code).then(data => ({ name: s.name, data })))
);

const output = { _atualizacao: new Date().toISOString() };
for (const r of results) {
  if (r.status === 'fulfilled') {
    output[r.value.name] = convertData(r.value.data);
  }
}

  if (env.INDICES_KV) {
    try {
      await env.INDICES_KV.put('indices_data', JSON.stringify(output), {
        expirationTtl: 604800,
      });
    } catch (e) {
      // ignore KV write errors
    }
  }

  return new Response(JSON.stringify(output), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
