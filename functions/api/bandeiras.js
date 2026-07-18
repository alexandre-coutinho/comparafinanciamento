const BANDEIRAS = {
  'Verde':          { chave: 'verde',    nome: 'Verde',             adicional_mwh: 0 },
  'Amarela':        { chave: 'amarela',  nome: 'Amarela',           adicional_mwh: 18.85 },
  'Vermelha P1':    { chave: 'vermelha1', nome: 'Vermelha Patamar 1', adicional_mwh: 44.63 },
  'Vermelha P2':    { chave: 'vermelha2', nome: 'Vermelha Patamar 2', adicional_mwh: 78.77 },
  'Escassez Hídrica': { chave: 'escassez', nome: 'Escassez Hídrica', adicional_mwh: 71.00 },
};

const CACHE_TTL = 86400;

export async function onRequest(context) {
  const cache = caches.default;
  const cacheKey = new Request('https://aneel-bandeiras-cache/comparafinanciamento');
  const cached = await cache.match(cacheKey);
  if (cached) return cached;

  const data = await fetchAndProcess();

  const response = new Response(JSON.stringify(data), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': `public, s-maxage=${CACHE_TTL}, max-age=${CACHE_TTL}`,
      'Access-Control-Allow-Origin': '*',
    },
  });

  await cache.put(cacheKey, response.clone());
  return response;
}

async function fetchAndProcess() {
  try {
    const res = await fetch('https://dadosabertos.aneel.gov.br/api/3/action/datastore_search?resource_id=0591b8f6-fe54-437b-b72b-1aa2efd46e42&sort=DatCompetencia%20desc&limit=1');
    if (!res.ok) throw new Error('Falha ANEEL');
    const json = await res.json();
    const rec = json?.result?.records?.[0];
    if (!rec) throw new Error('Sem registros');

    const adicionalMwh = parseFloat((rec.VlrAdicionalBandeira || '0').replace(',', '.'));
    const nomeBandeira = rec.NomBandeiraAcionada;
    const competencia = rec.DatCompetencia;

    const lista = Object.values(BANDEIRAS).map(b => ({
      chave: b.chave,
      nome: b.nome,
      adicional_kwh: +((b.adicional_mwh) / 1000).toFixed(6),
    }));

    return {
      atual: {
        nome: nomeBandeira,
        chave: BANDEIRAS[nomeBandeira]?.chave || 'verde',
        adicional_kwh: +((adicionalMwh) / 1000).toFixed(6),
        competencia,
      },
      bandeiras: lista,
    };
  } catch {
    return {
      atual: { nome: 'Amarela', chave: 'amarela', adicional_kwh: 0.01885, competencia: '' },
      bandeiras: Object.values(BANDEIRAS).map(b => ({
        chave: b.chave, nome: b.nome, adicional_kwh: +((b.adicional_mwh) / 1000).toFixed(6),
      })),
    };
  }
}
