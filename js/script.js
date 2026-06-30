// ===== FINANCE =====
const TAXA_ANUAL = (i) => (1 + i) ** 12 - 1;
const TAXA_MENSAL = (ia) => (1 + ia) ** (1 / 12) - 1;

function pmtPrice(pv, i, n) {
  if (i === 0) return pv / n;
  const f = (1 + i) ** n;
  return pv * i * f / (f - 1);
}

function pvPrice(pmt, i, n) {
  if (i === 0) return pmt * n;
  return pmt * ((1 - (1 + i) ** -n) / i);
}

function nPrice(pv, pmt, i) {
  if (i === 0) return pv / pmt;
  if (pmt <= pv * i) return NaN;
  return Math.log(pmt / (pmt - pv * i)) / Math.log(1 + i);
}

function iPrice(pv, pmt, n) {
  if (n <= 0 || pv <= 0 || pmt <= 0) return NaN;
  if (Math.abs(pmt - pv / n) < 1e-12) return 0;
  if (pmt * n - pv <= 1e-6) return 0;
  let lo = 0, hi = 0.01;
  // Expande hi exponencialmente até que calcPmt > pmt (braqueteia a solução)
  for (let tries = 0; tries < 60; tries++) {
    const f = (1 + hi) ** n;
    const calcPmt = pv * hi * f / (f - 1);
    if (isNaN(calcPmt) || calcPmt > pmt) break;
    lo = hi; hi *= 2;
  }
  for (let iter = 0; iter < 200; iter++) {
    const mid = (lo + hi) / 2;
    const f = (1 + mid) ** n;
    const calcPmt = pv * mid * f / (f - 1);
    if (isNaN(calcPmt)) { hi = mid; continue; }
    if (calcPmt > pmt) hi = mid; else lo = mid;
  }
  return (lo + hi) / 2;
}

function gerarTabelaPrice(pv, i, n, pmt) {
  const rows = [];
  let sd = pv;
  let totalJuros = 0;
  let totalPagoAcum = 0;
  let valorRealAcum = 0;
  for (let m = 1; m <= n; m++) {
    const juros = sd * i;
    const amort = pmt - juros;
    totalJuros += juros;
    sd -= amort;
    totalPagoAcum += pmt;
    valorRealAcum += amort;
    rows.push({ mes: m, prestacao: pmt, juros, totalPagoAcum, valorRealAcum, amortizacao: amort, saldo: Math.max(sd, 0) });
  }
  return { tabela: rows, totalPago: pmt * n, totalJuros, totalAmort: pv };
}

function gerarTabelaSAC(pv, i, n) {
  const amort = pv / n;
  const rows = [];
  let sd = pv;
  let totalJuros = 0;
  let totalPagoAcum = 0;
  let valorRealAcum = 0;
  for (let m = 1; m <= n; m++) {
    const juros = sd * i;
    const prestacao = amort + juros;
    totalJuros += juros;
    sd -= amort;
    totalPagoAcum += prestacao;
    valorRealAcum += amort;
    rows.push({ mes: m, prestacao, juros, totalPagoAcum, valorRealAcum, amortizacao: amort, saldo: Math.max(sd, 0) });
  }
  return { tabela: rows, totalPago: pv + totalJuros, totalJuros, totalAmort: pv };
}

// ===== FORMAT =====
const fmt = {
  moeda: (v) => (v ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
  numero: (v) => v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
  pctInput: (v) => (v * 100).toFixed(2).replace('.', ','),
};

function parseMoeda(str) {
  if (!str || str.trim() === '') return NaN;
  return parseFloat(str.replace(/\./g, '').replace(',', '.').replace(/[^0-9.\-]/g, '')) || NaN;
}

function parsePct(str) {
  if (!str || str.trim() === '') return NaN;
  return parseFloat(str.replace(',', '.').replace(/[^0-9.\-]/g, '')) / 100 || NaN;
}

// ===== UI =====
function exibirResultado(id, result, isPrice) {
  const { tabela, totalPago, totalJuros } = result;
  if (!tabela || !tabela.length) return;
  const label = isPrice ? 'Prestação fixa' : '1ª prestação';
  const resumoEl = document.getElementById(`resumo-${id}`);
  resumoEl.innerHTML = `
    <div class="resumo-item"><span class="rotulo">${label}</span><span class="valor destaque">${fmt.moeda(tabela[0].prestacao)}</span></div>
    <div class="resumo-item"><span class="rotulo">Total pago</span><span class="valor">${fmt.moeda(totalPago)}</span></div>
    <div class="resumo-item"><span class="rotulo">Total juros</span><span class="valor destaque">${fmt.moeda(totalJuros)}</span></div>`;
  renderizarTabela(`tabela-${id}`, tabela);
  resumoEl.hidden = false;
  document.getElementById(`resultado-${id}`).hidden = false;
  resultadosComparativo[id] = result;
  renderizarGraficoComparativo();
  const card = document.getElementById('card-comparativo');
  if (resultadosComparativo.price && resultadosComparativo.sac) card.hidden = false;
}

function renderizarTabela(elId, tabela) {
  const nomes = ['Mês', 'Prestação', 'Juros', 'Total acumulado'];
  const html = `<thead><tr>${nomes.map(n => `<th>${n}</th>`).join('')}</tr></thead>`
    + `<tbody>${tabela.map(r => `<tr><td>${r.mes}</td><td>${fmt.moeda(r.prestacao)}</td><td>${fmt.moeda(r.juros)}</td><td>${fmt.moeda(r.totalPagoAcum)}</td></tr>`).join('')}</tbody>`;
  document.getElementById(elId).innerHTML = html;
}

// ===== GRAFICO =====
const charts = {};
const resultadosComparativo = {};

let _carregandoChart = null;
function carregarChartJs() {
  if (window.Chart) return Promise.resolve();
  if (_carregandoChart) return _carregandoChart;
  _carregandoChart = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.7/dist/chart.umd.min.js';
    s.onload = resolve;
    s.onerror = reject;
    document.head.appendChild(s);
  });
  return _carregandoChart;
}

// Pré-carrega Chart.js quando o card comparativo entrar na viewport
(function() {
  const alvo = document.getElementById('card-comparativo');
  if (alvo && 'IntersectionObserver' in window) {
    const obs = new IntersectionObserver(entries => {
      if (entries.some(e => e.isIntersecting)) {
        carregarChartJs();
        obs.disconnect();
      }
    }, { rootMargin: '300px' });
    obs.observe(alvo);
  }
})();

function renderizarGraficoComparativo() {
  if (typeof Chart === 'undefined') {
    carregarChartJs().then(() => renderizarGraficoComparativo());
    return;
  }
  const price = resultadosComparativo.price;
  const sac = resultadosComparativo.sac;
  if (!price || !sac) return;
  const canvas = document.getElementById('grafico-comparativo');
  if (!canvas) return;
  if (charts['comparativo']) { charts['comparativo'].destroy(); delete charts['comparativo']; }

  const maxLen = Math.max(price.tabela.length, sac.tabela.length);
  const labels = Array.from({ length: maxLen }, (_, i) => i + 1);

  charts['comparativo'] = new Chart(canvas.getContext('2d'), {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'Tabela PRICE Prestação',
          data: price.tabela.map(r => r.prestacao),
          backgroundColor: 'rgba(26,86,219,0.6)',
          borderColor: '#1a56db',
          borderWidth: 1,
          order: 2,
          pointStyle: 'rect',
        },
        {
          label: 'Tabela SAC Prestação',
          data: sac.tabela.map(r => r.prestacao),
          backgroundColor: 'rgba(5,150,105,0.6)',
          borderColor: '#059669',
          borderWidth: 1,
          order: 2,
          pointStyle: 'rect',
        },
        {
          label: 'Tabela PRICE Saldo devedor',
          data: price.tabela.map(r => r.saldo),
          type: 'line',
          borderColor: '#1a56db',
          backgroundColor: 'transparent',
          borderWidth: 2,
          pointRadius: 1.5,
          pointHitRadius: 10,
          order: 1,
          yAxisID: 'y1',
          pointStyle: 'line',
        },
        {
          label: 'Tabela SAC Saldo devedor',
          data: sac.tabela.map(r => r.saldo),
          type: 'line',
          borderColor: '#059669',
          backgroundColor: 'transparent',
          borderWidth: 2,
          pointRadius: 1.5,
          pointHitRadius: 10,
          order: 1,
          yAxisID: 'y1',
          pointStyle: 'line',
        },
      ],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      interaction: { intersect: false, mode: 'index' },
      plugins: {
        legend: {
          position: window.innerWidth < 992 ? 'bottom' : 'top',
          labels: {
            usePointStyle: true,
            boxWidth: window.innerWidth < 992 ? 8 : 12,
            padding: window.innerWidth < 992 ? 4 : 10,
            font: { size: window.innerWidth < 992 ? 8 : 10 },
          },
        },
        tooltip: false,
      },
      scales: {
        x: { grid: { display: false }, ticks: { maxTicksLimit: 20, font: { size: 9 } } },
        y: { beginAtZero: true, position: 'left', title: { display: window.innerWidth >= 992, text: 'Prestação', font: { size: 10 }, padding: { right: 8 } }, ticks: { callback: (v) => fmt.moeda(v), font: { size: 9 } } },
        y1: { beginAtZero: true, position: 'right', grid: { display: false }, title: { display: window.innerWidth >= 992, text: 'Saldo devedor', font: { size: 10 }, padding: { left: 8 } }, ticks: { callback: (v) => fmt.moeda(v), font: { size: 9 } } },
      },
    },
  });
}

// ===== PDF =====
let _carregandoPdf = null;
function carregarPdfJs() {
  if (window.jspdf) return Promise.resolve();
  if (_carregandoPdf) return _carregandoPdf;
  _carregandoPdf = (async () => {
    await new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
      s.onload = resolve; s.onerror = reject;
      document.head.appendChild(s);
    });
    await new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.4/jspdf.plugin.autotable.min.js';
      s.onload = resolve; s.onerror = reject;
      document.head.appendChild(s);
    });
  })();
  return _carregandoPdf;
}

function exportarPDF(id) {
  const resultadoEl = document.getElementById(`resultado-${id}`);
  if (!resultadoEl || resultadoEl.hidden) {
    mostrarToast('Calcule primeiro antes de exportar PDF');
    return;
  }
  if (!window.jspdf) {
    carregarPdfJs().then(() => exportarPDF(id));
    return;
  }
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const titulo = id === 'price' ? 'Tabela PRICE - Prestações fixas' : 'Tabela SAC - Prestações decrescentes';
  doc.setFontSize(16);
  doc.text('Calculadora de Financiamento - ' + titulo, 14, 20);
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text('https://comparafinanciamento.com.br/', 14, 26);
  doc.setTextColor(0);

  let y = 34;
  const resumo = obterResumoPDF(id);
  doc.setFontSize(10);
  doc.text(`Valor financiado R$: ${resumo.valorFinanciado}`, 14, y);
  doc.text(`Nº de meses: ${resumo.meses}`, 115, y);
  y += 5;
  doc.text(`Total juros: ${resumo.totalJuros}`, 14, y);
  doc.text(`Taxa mensal (%): ${resumo.taxaMensal}`, 115, y);
  y += 5;
  doc.text(`Total pago: ${resumo.totalPago}`, 14, y);
  doc.text(`Taxa anual (%): ${resumo.taxaAnual}`, 115, y);
  y += 10;

  const dados = extrairTabela(`tabela-${id}`);
  if (dados) {
    const nomes = ['Mês', 'Prestação', 'Juros', 'Total acumulado'];
    doc.autoTable({
      head: [nomes], body: dados, startY: y,
      theme: 'grid',
      headStyles: { fillColor: id === 'price' ? [26, 86, 219] : [5, 150, 105], fontSize: 8 },
      bodyStyles: { fontSize: 7 },
      styles: { halign: 'right' },
      columnStyles: { 0: { halign: 'center' } },
    });
  }
  doc.save('compara-financiamento.pdf');
}

function obterResumoPDF(id) {
  const resumoEl = document.getElementById(`resumo-${id}`);
  const resumoItens = Array.from(resumoEl?.querySelectorAll('.resumo-item') || []);
  const obterValorResumo = (labelBusca) => {
    const item = resumoItens.find(el => (el.querySelector('.rotulo')?.textContent || '').trim() === labelBusca);
    return item?.querySelector('.valor')?.textContent || 'R$ 0,00';
  };

  const valorFinanciado = document.getElementById(`${id}-pv`)?.value || '0,00';
  const meses = document.getElementById(`${id}-n`)?.value || '0';
  const taxaMensal = document.getElementById(`${id}-i`)?.value || '0,00';
  const taxaAnual = document.getElementById(`${id}-i-anual`)?.value || '0,00';

  return {
    valorFinanciado,
    meses,
    taxaMensal,
    taxaAnual,
    totalJuros: obterValorResumo('Total juros'),
    totalPago: obterValorResumo('Total pago'),
  };
}

function extrairTabela(elId) {
  const t = document.getElementById(elId);
  if (!t || !t.rows || t.rows.length <= 1) return null;
  return Array.from(t.rows).slice(1).map(tr => Array.from(tr.cells).map(td => td.textContent));
}

// ===== COPIAR TABELA =====
function copiarTabela(id) {
  const el = document.getElementById(`tabela-${id}`);
  if (!el) return;
  const texto = Array.from(el.querySelectorAll('tr'))
    .map(tr => Array.from(tr.querySelectorAll('th, td')).map(td => td.textContent).join('\t')).join('\n');
  navigator.clipboard.writeText(texto).then(() => mostrarToast('Tabela copiada!'))
    .catch(() => {
      const t = document.createElement('textarea');
      t.value = texto; document.body.appendChild(t); t.select();
      document.execCommand('copy'); t.remove();
      mostrarToast('Tabela copiada!');
    });
}

function mostrarToast(msg) {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = msg;
  document.body.appendChild(toast);
  setTimeout(() => { toast.classList.add('toast--fade'); setTimeout(() => toast.remove(), 300); }, 2000);
}

// ===== CALCULAR =====
function findFaltante(dados) {
  const filled = Object.entries(dados).filter(([_, v]) => !isNaN(v));
  if (filled.length === 4) return 'pmt';
  if (filled.length === 3) return Object.entries(dados).find(([_, v]) => isNaN(v))?.[0];
  return null;
}

function validarPrice(pv, i, n, pmt, chave) {
  switch (chave) {
    case 'pv':  return !(isNaN(i) || isNaN(pmt) || isNaN(n) || i <= 0 || n < 1 || pmt <= 0);
    case 'i':   return !(isNaN(pv) || isNaN(pmt) || isNaN(n) || pv <= 0 || n < 1 || pmt <= 0);
    case 'n':   return !(isNaN(pv) || isNaN(pmt) || isNaN(i) || pv <= 0 || i <= 0 || pmt <= 0);
    case 'pmt': return !(isNaN(pv) || isNaN(i) || isNaN(n) || pv <= 0 || i <= 0 || n < 1);
    default: return false;
  }
}

function calcularPrice() {
  let pv  = parseMoeda(document.getElementById('price-pv').value);
  let i   = parsePct(document.getElementById('price-i').value);
  let n   = parseInt(document.getElementById('price-n').value, 10);
  let pmt = parseMoeda(document.getElementById('price-pmt').value);

  if (isNaN(i)) {
    i = 0.02;
    document.getElementById('price-i').value = fmt.pctInput(i);
    document.getElementById('price-i-anual').value = fmt.pctInput(TAXA_ANUAL(i));
  }

  const faltante = findFaltante({ pv, i, n, pmt });
  if (!faltante) return;
  if (!validarPrice(pv, i, n, pmt, faltante)) {
    alert('Verifique os campos preenchidos. O campo deixado em branco será calculado.'); return;
  }

  if (!isNaN(pv) && !isNaN(n) && !isNaN(pmt) && pv > n * pmt) {
    alert('Valor financiado deve ser menor.'); return;
  }

  let pvR = pv, iR = i, nR = n, pmtR = pmt;

  switch (faltante) {
    case 'pv':  pvR  = pvPrice(pmt, i, n); break;
    case 'i':   iR   = iPrice(pv, pmt, n);
                if (isNaN(iR)) { alert('Não foi possível calcular a taxa. Verifique os valores.'); return; }
                document.getElementById('price-i').value = fmt.pctInput(iR);
                break;
    case 'n':   nR   = Math.round(nPrice(pv, pmt, i));
                if (isNaN(nR) || nR <= 0) { alert('Valores inconsistentes: a prestação precisa cobrir os juros.'); return; }
                document.getElementById('price-n').value = nR;
                break;
    case 'pmt': pmtR = pmtPrice(pv, i, n); break;
  }

  if (faltante === 'pv')  document.getElementById('price-pv').value  = fmt.numero(Math.round(pvR * 100) / 100);
  if (faltante === 'pmt') document.getElementById('price-pmt').value = fmt.numero(Math.round(pmtR * 100) / 100);

  document.getElementById('price-i-anual').value = fmt.pctInput(TAXA_ANUAL(iR));

  exibirResultado('price', gerarTabelaPrice(pvR, iR, nR, pmtR), true);
}

function calcularSAC() {
  const pv = parseMoeda(document.getElementById('sac-pv').value);
  let i  = parsePct(document.getElementById('sac-i').value);
  const n  = parseInt(document.getElementById('sac-n').value, 10);

  if (isNaN(i)) {
    i = 0.02;
    document.getElementById('sac-i').value = fmt.pctInput(i);
    document.getElementById('sac-i-anual').value = fmt.pctInput(TAXA_ANUAL(i));
  }

  if (isNaN(pv) || pv <= 0) { document.getElementById('resultado-sac').hidden = true; return; }
  if (isNaN(i) || i <= 0)   { document.getElementById('resultado-sac').hidden = true; return; }
  if (isNaN(n) || n < 1)    { document.getElementById('resultado-sac').hidden = true; return; }

  exibirResultado('sac', gerarTabelaSAC(pv, i, n), false);
}

const CALCULATORS = { price: calcularPrice, sac: calcularSAC };
function calcular(id) { CALCULATORS[id]?.(); }

function visaoRapida() {
  const ia = 0.08;
  const im = TAXA_MENSAL(ia);
  ['price', 'sac'].forEach(id => {
    document.getElementById(`${id}-pv`).value = fmt.numero(200000);
    document.getElementById(`${id}-i`).value = fmt.pctInput(im);
    document.getElementById(`${id}-i-anual`).value = fmt.pctInput(ia);
    document.getElementById(`${id}-n`).value = '360';
    if (id === 'price') document.getElementById(`${id}-pmt`).value = '';
  });
  calcular('price');
  calcular('sac');
  const chart = document.getElementById('card-comparativo');
  if (chart) setTimeout(() => chart.scrollIntoView({ behavior: 'smooth' }), 350);
}

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
  // Máscara moeda no blur
  document.querySelectorAll('.moeda').forEach(inp => {
    inp.addEventListener('blur', () => {
      if (!inp.value) return;
      const v = parseMoeda(inp.value);
      if (!isNaN(v)) inp.value = fmt.numero(Math.round(v * 100) / 100);
    });
  });

  // Máscara número inteiro no blur
  document.querySelectorAll('.numero').forEach(inp => {
    inp.addEventListener('blur', () => {
      if (!inp.value) return;
      const v = parseInt(inp.value.replace(/\D/g, ''), 10);
      if (!isNaN(v) && v >= 1) inp.value = v;
    });
  });

  // Máscara porcentagem no blur
  document.querySelectorAll('.porcentagem').forEach(inp => {
    inp.addEventListener('blur', () => {
      if (!inp.value) return;
      const v = parseFloat(inp.value.replace(',', '.'));
      if (!isNaN(v) && v >= 0) inp.value = v.toFixed(2).replace('.', ',');
    });
  });

  // Sync taxa mensal ↔ anual
  document.querySelectorAll('.porcentagem').forEach(inp => {
    inp.addEventListener('input', function () {
      if (this.dataset.syncing) return;
      const card = this.closest('.card');
      if (!card) return;
      const id = card.dataset.cenario;
      const isMensal = this.id === `${id}-i`;
      const isAnual  = this.id === `${id}-i-anual`;
      if (!isMensal && !isAnual) return;

      const v = parseFloat(this.value.replace(',', '.'));
      const dest = document.getElementById(isMensal ? `${id}-i-anual` : `${id}-i`);
      if (!dest) return;

      if (isNaN(v) || v <= 0) { dest.dataset.syncing = 'true'; dest.value = ''; delete dest.dataset.syncing; return; }

      dest.dataset.syncing = 'true';
      dest.value = (isMensal
        ? TAXA_ANUAL(v / 100) * 100
        : TAXA_MENSAL(v / 100) * 100
      ).toFixed(2).replace('.', ',');
      delete dest.dataset.syncing;
    });
  });

  // Botões Calcular (event delegation)
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.btn-calcular');
    if (!btn) return;
    const card = btn.closest('.card');
    if (!card) return;
    calcular(card.dataset.cenario);
  });

  // Re-renderiza gráfico no resize
  window.addEventListener('resize', () => {
    if (resultadosComparativo.price && resultadosComparativo.sac) {
      renderizarGraficoComparativo();
    }
  });

  // Enter nos inputs
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter') return;
    const inp = e.target.closest('.card-body input');
    if (!inp) return;
    const card = inp.closest('.card');
    if (card) calcular(card.dataset.cenario);
  });

  // Botões de ação (PDF, Copiar)
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.btn-pdf, .btn-copiar');
    if (!btn) return;
    const card = btn.closest('.card');
    if (!card) return;
    const id = card.dataset.cenario;
    if (btn.classList.contains('btn-pdf')) exportarPDF(id);
    if (btn.classList.contains('btn-copiar')) copiarTabela(id);
  });

  // ===== DEPOIMENTOS =====
  const depNome = document.getElementById('dep-nome');
  const depEconomia = document.getElementById('dep-economia');
  if (depEconomia) {
    depEconomia.addEventListener('blur', function () {
      if (!this.value) return;
      const v = parseMoeda(this.value);
      if (!isNaN(v)) this.value = fmt.numero(Math.round(v * 100) / 100);
    });
  }

  const modalDep = document.getElementById('modal-depoimento');
  const formDep = document.getElementById('form-depoimento');

  // Star rating
  const starRating = document.getElementById('star-rating');
  const depEstrelas = document.getElementById('dep-estrelas');
  starRating?.addEventListener('click', (e) => {
    const star = e.target.closest('i');
    if (!star) return;
    const val = parseInt(star.dataset.value);
    depEstrelas.value = val;
    starRating.querySelectorAll('i').forEach(s => {
      s.classList.toggle('active', parseInt(s.dataset.value) <= val);
    });
  });
  starRating?.querySelectorAll('i').forEach(s => {
    s.addEventListener('mouseenter', () => {
      const val = parseInt(s.dataset.value);
      starRating.querySelectorAll('i').forEach(st => {
        st.classList.toggle('active', parseInt(st.dataset.value) <= val);
      });
    });
    s.addEventListener('mouseleave', () => {
      const val = parseInt(depEstrelas.value);
      starRating.querySelectorAll('i').forEach(st => {
        st.classList.toggle('active', parseInt(st.dataset.value) <= val);
      });
    });
  });

  function abrirModalDep() { if (modalDep) modalDep.hidden = false; }
  function fecharModalDep() { if (modalDep) modalDep.hidden = true; }

  document.getElementById('btn-abrir-depoimento')?.addEventListener('click', abrirModalDep);
  document.getElementById('btn-fechar-depoimento')?.addEventListener('click', fecharModalDep);
  modalDep?.addEventListener('click', (e) => { if (e.target === modalDep) fecharModalDep(); });

  formDep?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = formDep.querySelector('.modal__submit');
    btn.disabled = true; btn.textContent = 'Enviando...';
    const dados = Object.fromEntries(new FormData(formDep));

    try {
      const res = await fetch('/api/depoimento', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dados),
      });
      if (!res.ok) throw new Error('Erro ao enviar');
      formDep.reset();
      fecharModalDep();
      setTimeout(() => alert('Depoimento enviado! Após moderação ele aparecerá no site.'), 100);
    } catch {
      alert('Erro ao enviar. Tente novamente mais tarde.');
    } finally {
      btn.disabled = false; btn.textContent = 'Enviar depoimento';
    }
  });

  // ===== LEAD FORM (Telegram) =====
  const modal = document.getElementById('modal-lead');
  const form = document.getElementById('form-lead');

  function abrirModal() { modal.hidden = false; }
  function fecharModal() { modal.hidden = true; }

  document.querySelectorAll('.btn-lead').forEach(btn => btn.addEventListener('click', abrirModal));
  document.getElementById('btn-fechar-lead').addEventListener('click', fecharModal);
  modal.addEventListener('click', (e) => { if (e.target === modal) fecharModal(); });

  // Hamburger toggle
  const hamburger = document.getElementById('btn-hamburger');
  const headerNav = document.getElementById('header-nav');
  hamburger?.addEventListener('click', () => {
    const open = headerNav.classList.toggle('header__nav--open');
    hamburger.setAttribute('aria-expanded', open);
  });
  headerNav?.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
    headerNav.classList.remove('header__nav--open');
    hamburger.setAttribute('aria-expanded', 'false');
  }));

  document.getElementById('btn-visao-rapida')?.addEventListener('click', visaoRapida);

  document.querySelector('#form-lead input[name="valor"]').addEventListener('blur', function () {
    if (!this.value) return;
    const v = parseMoeda(this.value);
    if (!isNaN(v)) this.value = fmt.numero(Math.round(v * 100) / 100);
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = form.querySelector('.modal__submit');
    btn.disabled = true; btn.textContent = 'Enviando...';

    const dados = Object.fromEntries(new FormData(form));

    try {
      const res = await fetch('/api/lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dados),
      });
      if (!res.ok) throw new Error('Erro ao enviar');
      form.reset();
      fecharModal();
      setTimeout(() => alert('Mensagem enviada.'), 100);
    } catch {
      alert('Erro ao enviar. Tente novamente mais tarde.');
    } finally {
      btn.disabled = false; btn.textContent = 'Enviar';
    }
  });
});
