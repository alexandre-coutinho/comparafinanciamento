const CACHE_TTL = 86400;

const ICMS_ENERGIA = {
  AC: 19, AL: 20.5, AP: 18, AM: 20, BA: 20.5,
  CE: 20, DF: 20, ES: 17, GO: 19, MA: 23,
  MT: 17, MS: 17, MG: 18, PA: 19, PB: 20,
  PR: 19.5, PE: 20.5, PI: 22.5, RJ: 22, RN: 20,
  RS: 17, RO: 19.5, RR: 20, SC: 17, SP: 18,
  SE: 20, TO: 20,
};

const ICMS_ENERGIA_REDUZIDO = {
  AC: 12, AL: 12, AP: 12, AM: 12, BA: 12,
  CE: 12, DF: 12, ES: 12, GO: 12, MA: 12,
  MT: 12, MS: 17, MG: 12, PA: 12, PB: 12,
  PR: 12, PE: 12, PI: 12, RJ: 12, RN: 12,
  RS: 12, RO: 12, RR: 12, SC: 12, SP: 12,
  SE: 12, TO: 12,
};

export async function onRequest(context) {
  const cache = caches.default;
  const cacheKey = new Request('https://aneel-impostos-cache/comparafinanciamento');
  const cached = await cache.match(cacheKey);
  if (cached) return cached;

  const data = {
    pis: 1.14,
    cofins: 5.29,
    icms_por_uf: ICMS_ENERGIA,
    icms_por_uf_reduzido: ICMS_ENERGIA_REDUZIDO,
    icms_reduzido_limite_kwh: 200,
    observacao: 'Alíquotas de ICMS para energia elétrica residencial (>200 kWh) e reduzida (≤200 kWh). PIS/COFINS são alíquotas efetivas médias do setor de distribuição. MS mantém 17% mesmo na reduzida. Fontes: ANEEL, CONFAZ, SEFAZ. Atualize manualmente quando houver mudança na legislação estadual.',
  };

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
