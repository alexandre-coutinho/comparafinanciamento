const CAPITAIS = {
  'ELETROPAULO':   { cidade: 'São Paulo',       estado: 'SP' },
  'LIGHT SESA':    { cidade: 'Rio de Janeiro',   estado: 'RJ' },
  'CEMIG-D':       { cidade: 'Belo Horizonte',   estado: 'MG' },
  'Neoenergia Brasília': { cidade: 'Brasília',   estado: 'DF' },
  'COELBA':        { cidade: 'Salvador',         estado: 'BA' },
  'ENEL CE':       { cidade: 'Fortaleza',        estado: 'CE' },
  'COPEL-DIS':     { cidade: 'Curitiba',         estado: 'PR' },
  'Neoenergia PE': { cidade: 'Recife',           estado: 'PE' },
  'CEEE-D':        { cidade: 'Porto Alegre',     estado: 'RS' },
  'EQUATORIAL PA': { cidade: 'Belém',            estado: 'PA' },
  'Âmbar Amazonas':{ cidade: 'Manaus',           estado: 'AM' },
  'EQUATORIAL GO': { cidade: 'Goiânia',          estado: 'GO' },
  'EQUATORIAL MA': { cidade: 'São Luís',         estado: 'MA' },
  'COSERN':        { cidade: 'Natal',            estado: 'RN' },
  'EQUATORIAL AL': { cidade: 'Maceió',           estado: 'AL' },
  'EDP ES':        { cidade: 'Vitória',          estado: 'ES' },
  'EQUATORIAL PI': { cidade: 'Teresina',         estado: 'PI' },
  'EPB':           { cidade: 'João Pessoa',      estado: 'PB' },
  'CELESC':        { cidade: 'Florianópolis',    estado: 'SC' },
  'EMT':           { cidade: 'Cuiabá',           estado: 'MT' },
  'EMS':           { cidade: 'Campo Grande',     estado: 'MS' },
  'SULGIPE':       { cidade: 'Aracaju',          estado: 'SE' },
  'EAC':           { cidade: 'Rio Branco',       estado: 'AC' },
  'ERO':           { cidade: 'Porto Velho',      estado: 'RO' },
  'ETO':           { cidade: 'Palmas',           estado: 'TO' },
  'CEA':           { cidade: 'Macapá',           estado: 'AP' },
  'ÂMBAR ENERGIA RR': { cidade: 'Boa Vista',     estado: 'RR' },
};

const CACHE_TTL = 86400;

export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);

  if (url.searchParams.has('forcereload')) {
    return await fetchAndProcess();
  }

  const cache = caches.default;
  const cacheKey = new Request('https://aneel-tarifas-cache/comparafinanciamento');
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
  const body = JSON.stringify({
    resource_id: 'fcf2906c-7c32-4b9b-a637-054e7a5234f4',
    limit: 500,
    filters: { DscSubGrupo: 'B1', DscClasse: 'Residencial', DscSubClasse: 'Residencial', DscModalidadeTarifaria: 'Convencional' },
    sort: 'DatInicioVigencia desc',
  });

  const res = await fetch('https://dadosabertos.aneel.gov.br/api/3/action/datastore_search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  });

  if (!res.ok) {
    return { error: 'Falha ao consultar dados ANEEL', distribuidoras: [] };
  }

  const json = await res.json();
  const records = json?.result?.records || [];
  const seen = new Set();
  const resultado = [];

  for (const rec of records) {
    if (rec.DscBaseTarifaria !== 'Tarifa de Aplicação') continue;

    const teStr = (rec.VlrTE || '0').replace(',', '.').replace(/[^0-9.\-]/g, '');
    const te = parseFloat(teStr);
    if (isNaN(te) || te < 100) continue;

    const sigla = rec.SigAgente;
    if (seen.has(sigla)) continue;
    seen.add(sigla);

    const tusdStr = (rec.VlrTUSD || '0').replace(',', '.').replace(/[^0-9.\-]/g, '');
    const tusd = parseFloat(tusdStr);

    const cap = CAPITAIS[sigla];
    if (cap) {
      resultado.push({
        sigla,
        cidade: cap.cidade,
        estado: cap.estado,
        tusd_kwh: +(tusd / 1000).toFixed(4),
        te_kwh: +(te / 1000).toFixed(4),
        total_kwh: +((tusd + te) / 1000).toFixed(4),
        vigencia: rec.DatInicioVigencia,
        valido_ate: rec.DatFimVigencia,
      });
    }
  }

  resultado.sort((a, b) => a.cidade.localeCompare(b.cidade, 'pt-BR'));

  return { distribuidoras: resultado, atualizado_em: new Date().toISOString() };
}
