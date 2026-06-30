const API_BASE = 'https://economia.awesomeapi.com.br/json';
let currencyList = [];
let chartInstance = null;

async function fetchAvailable () {
  try {
    const r = await fetch(`${API_BASE}/available`);
    const data = await r.json();
    const seen = new Map();
    for (const [pair, name] of Object.entries(data)) {
      if (typeof name !== 'string' || !pair.includes('-')) continue;
      const code = pair.split('-')[0];
      const label = name.split('/')[0];
      if (!seen.has(code)) {
        seen.set(code, { code, name: label });
      }
    }
    return Array.from(seen.values()).sort((a, b) => a.code.localeCompare(b.code));
  } catch {
    return getFallbackCurrencies();
  }
}

function getFallbackCurrencies () {
  return [
    { code: 'AUD', name: 'Dólar Australiano' },
    { code: 'BRL', name: 'Real Brasileiro' },
    { code: 'BTC', name: 'Bitcoin' },
    { code: 'CAD', name: 'Dólar Canadense' },
    { code: 'CHF', name: 'Franco Suíço' },
    { code: 'CNY', name: 'Yuan Chinês' },
    { code: 'EUR', name: 'Euro' },
    { code: 'GBP', name: 'Libra Esterlina' },
    { code: 'JPY', name: 'Iene Japonês' },
    { code: 'USD', name: 'Dólar Americano' },
  ];
}

function buildSelect (selectId) {
  const el = document.getElementById(selectId);
  if (!el) return;
  const sorted = [...currencyList].sort((a, b) => a.code.localeCompare(b.code));
  el.innerHTML = sorted.map(c =>
    `<option value="${c.code}">${c.code}</option>`
  ).join('');
}

function setupSelect (selectId, defaultCode) {
  const el = document.getElementById(selectId);
  if (!el) return;
  el.value = defaultCode;
  el.dataset.code = defaultCode;
  el.addEventListener('change', function () {
    this.dataset.code = this.value;
  });
}

async function getRate (from, to) {
  if (from === to) return 1;
  const pair = `${from}-${to}`;
  const reversePair = `${to}-${from}`;
  try {
    const r = await fetch(`${API_BASE}/last/${pair}`);
    if (r.ok) {
      const data = await r.json();
      const key = Object.keys(data)[0];
      if (data[key]) return { rate: parseFloat(data[key].bid), raw: data[key] };
    }
  } catch {}
  try {
    const r = await fetch(`${API_BASE}/last/${reversePair}`);
    if (r.ok) {
      const data = await r.json();
      const key = Object.keys(data)[0];
      if (data[key]) return { rate: 1 / parseFloat(data[key].bid), raw: data[key] };
    }
  } catch {}
  if (to === 'BRL' || from === 'BRL') return null;
  const toBRL = await getRate(from, 'BRL');
  const fromBRL = await getRate('BRL', to);
  if (!toBRL || !fromBRL) return null;
  const rate = toBRL.rate * fromBRL.rate;
  return { rate, raw: null };
}

async function getHistory (from, to, days = 30) {
  const history = [];
  if (from === to) return [];
  const pair = `${from}-${to}`;
  try {
    const r = await fetch(`${API_BASE}/daily/${pair}/${days}`);
    if (r.ok) {
      const data = await r.json();
      if (Array.isArray(data)) return data;
    }
  } catch {}
  const reversePair = `${to}-${from}`;
  try {
    const r = await fetch(`${API_BASE}/daily/${reversePair}/${days}`);
    if (r.ok) {
      const data = await r.json();
      if (Array.isArray(data)) {
        return data.map(d => ({ ...d, bid: (1 / parseFloat(d.bid)).toString(), close: (1 / parseFloat(d.close || d.bid)).toString() }));
      }
    }
  } catch {}
  if (to === 'BRL' || from === 'BRL') return null;
  const toBRL = await getHistory(from, 'BRL', days);
  const fromBRL = await getHistory('BRL', to, days);
  if (!toBRL || !fromBRL) return null;
  const maxLen = Math.max(toBRL.length, fromBRL.length);
  for (let i = 0; i < maxLen; i++) {
    const t = toBRL[i] || toBRL[toBRL.length - 1];
    const f = fromBRL[i] || fromBRL[fromBRL.length - 1];
    const rate = parseFloat(t.bid) * parseFloat(f.bid);
    history.push({ timestamp: t.timestamp, bid: rate.toString(), close: rate.toString() });
  }
  return history;
}

async function converter () {
  const fromInput = document.getElementById('conv-from');
  const toInput = document.getElementById('conv-to');
  const amountInput = document.getElementById('conv-amount');
  const resultado = document.getElementById('conv-resultado');
  const info = document.getElementById('conv-info');
  const dataEl = document.getElementById('conv-data');
  const erroEl = document.getElementById('conv-erro');
  const graficoCard = document.getElementById('card-grafico');

  const from = (fromInput.dataset.code || fromInput.value).toUpperCase();
  const to = (toInput.dataset.code || toInput.value).toUpperCase();
  const amount = parseFloat(amountInput.value.replace(/\./g, '').replace(',', '.')) || 0;

  if (!from || !to) {
    erroEl.hidden = false; erroEl.textContent = 'Selecione as moedas de origem e destino.';
    resultado.hidden = true; graficoCard.hidden = true;
    return;
  }
  if (amount <= 0) {
    erroEl.hidden = false; erroEl.textContent = 'Digite um valor válido.';
    resultado.hidden = true; graficoCard.hidden = true;
    return;
  }

  erroEl.hidden = true;
  resultado.hidden = true;
  graficoCard.hidden = true;

  const result = await getRate(from, to);
  if (!result) {
    erroEl.hidden = false; erroEl.textContent = 'Não foi possível obter a cotação para este par.';
    return;
  }

  const converted = amount * result.rate;
  const raw = result.raw;

  resultado.querySelector('.conversor-resultado__valor').textContent =
    `${amount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${from} = ${converted.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${to}`;

  resultado.hidden = false;

  if (raw) {
    info.hidden = false;
    const variacao = parseFloat(raw.pctChange || 0);
    const varEl = document.getElementById('conv-variacao');
    varEl.textContent = `${variacao >= 0 ? '+' : ''}${variacao.toFixed(2)}%`;
    varEl.className = 'conversor-resultado__variacao' + (variacao >= 0 ? ' conversor-resultado__variacao--positiva' : ' conversor-resultado__variacao--negativa');
    document.getElementById('conv-high').textContent = `Máx: ${parseFloat(raw.high).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    document.getElementById('conv-low').textContent = `Mín: ${parseFloat(raw.low).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    dataEl.hidden = false;
    dataEl.textContent = `Atualizado em: ${new Date(raw.create_date).toLocaleString('pt-BR')}`;
  } else {
    info.hidden = true;
    dataEl.hidden = true;
  }

  graficoCard.hidden = false;
  renderChart(from, to);
}

function renderChart (from, to) {
  const canvas = document.getElementById('chart-conversor');
  if (!canvas) return;
  const wrapper = canvas.parentElement;
  wrapper.querySelector('.conversor-loading')?.remove();

  if (chartInstance) { chartInstance.destroy(); chartInstance = null; }

  if (typeof Chart === 'undefined') {
    const loading = document.createElement('div');
    loading.className = 'conversor-loading';
    loading.textContent = 'Carregando gráfico';
    wrapper.appendChild(loading);
    carregarChartJs().then(() => renderChart(from, to));
    return;
  }

  wrapper.querySelector('.conversor-loading')?.remove();

  getHistory(from, to, 30).then(history => {
    if (!history || history.length === 0) return;

    const data = history.reverse();
    const labels = data.map(d => {
      const t = new Date(parseInt(d.timestamp) * 1000);
      return t.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    });
    const values = data.map(d => parseFloat(d.bid));

    chartInstance = new Chart(canvas.getContext('2d'), {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: `${from} → ${to}`,
          data: values,
          borderColor: '#1a56db',
          backgroundColor: 'rgba(26,86,219,0.08)',
          borderWidth: 2,
          pointRadius: 1.5,
          pointHitRadius: 10,
          pointBackgroundColor: '#1a56db',
          fill: true,
          tension: 0.3,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: ctx => `${parseFloat(ctx.parsed.y).toLocaleString('pt-BR', { minimumFractionDigits: 4, maximumFractionDigits: 4 })}`,
            },
          },
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: {
              maxTicksLimit: 10,
              font: { size: 9 },
            },
          },
          y: {
            beginAtZero: false,
            ticks: {
              font: { size: 9 },
              callback: v => parseFloat(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
            },
          },
        },
      },
    });
  });
}

function swapCurrencies () {
  const from = document.getElementById('conv-from');
  const to = document.getElementById('conv-to');
  const tmp = from.value; from.value = to.value; to.value = tmp;
  const tmpCode = from.dataset.code; from.dataset.code = to.dataset.code; to.dataset.code = tmpCode;
  converter();
}

document.addEventListener('DOMContentLoaded', async () => {
  const amount = document.getElementById('conv-amount');
  if (amount) {
    amount.addEventListener('blur', function () {
      if (!this.value) return;
      const v = parseFloat(this.value.replace(/\./g, '').replace(',', '.'));
      if (!isNaN(v)) {
        this.value = v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      }
    });
    amount.addEventListener('focus', function () {
      if (this.value) {
        this.value = this.value.replace(/\./g, '').replace(',', '.');
      }
    });
  }

  currencyList = await fetchAvailable();

  if (currencyList.length === 0) {
    currencyList = getFallbackCurrencies();
  }

  const allowedCodes = new Set(['USD','BRL','EUR','GBP','JPY','CHF','CAD','AUD','CNY','BTC']);
  currencyList = currencyList.filter(c => allowedCodes.has(c.code));

  buildSelect('conv-from');
  buildSelect('conv-to');

  setupSelect('conv-from', 'USD');
  setupSelect('conv-to', 'BRL');

  document.getElementById('btn-converter')?.addEventListener('click', converter);
  document.getElementById('btn-swap')?.addEventListener('click', swapCurrencies);

  document.getElementById('conv-amount')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') converter();
  });
  document.getElementById('conv-from')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') converter();
  });
  document.getElementById('conv-to')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') converter();
  });

  converter();

  setupHamburgerMenu();
});
