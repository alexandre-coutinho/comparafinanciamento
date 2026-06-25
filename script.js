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
  const nomes = ['Mês', 'Prestação', 'Juros', 'Real acumulado', 'Total acumulado'];
  const html = `<thead><tr>${nomes.map(n => `<th>${n}</th>`).join('')}</tr></thead>`
    + `<tbody>${tabela.map(r => `<tr><td>${r.mes}</td><td>${fmt.moeda(r.prestacao)}</td><td>${fmt.moeda(r.juros)}</td><td>${fmt.moeda(r.valorRealAcum)}</td><td>${fmt.moeda(r.totalPagoAcum)}</td></tr>`).join('')}</tbody>`;
  document.getElementById(elId).innerHTML = html;
}

// ===== GRAFICO =====
const charts = {};
const resultadosComparativo = {};

function renderizarGraficoComparativo() {
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
          label: 'PRICE Prestação',
          data: price.tabela.map(r => r.prestacao),
          backgroundColor: 'rgba(26,86,219,0.6)',
          borderColor: '#1a56db',
          borderWidth: 1,
          order: 2,
          pointStyle: 'rect',
        },
        {
          label: 'SAC Prestação',
          data: sac.tabela.map(r => r.prestacao),
          backgroundColor: 'rgba(5,150,105,0.6)',
          borderColor: '#059669',
          borderWidth: 1,
          order: 2,
          pointStyle: 'rect',
        },
        {
          label: 'PRICE Saldo devedor',
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
          label: 'SAC Saldo devedor',
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
        legend: { position: 'top', labels: { usePointStyle: true, boxWidth: 12, padding: 10, font: { size: 10 } } },
        tooltip: { callbacks: { label: (ctx) => `${ctx.dataset.label}: ${fmt.moeda(ctx.raw)}` } },
      },
      scales: {
        x: { grid: { display: false }, ticks: { maxTicksLimit: 20, font: { size: 9 } } },
        y: { beginAtZero: true, position: 'left', title: { display: true, text: 'Prestação', font: { size: 10 } }, ticks: { callback: (v) => fmt.moeda(v), font: { size: 9 } } },
        y1: { beginAtZero: true, position: 'right', grid: { display: false }, title: { display: true, text: 'Saldo devedor', font: { size: 10 } }, ticks: { callback: (v) => fmt.moeda(v), font: { size: 9 } } },
      },
    },
  });
}

function renderizarGrafico(elId, tabela, isPrice) {
  const canvas = document.getElementById(elId);
  if (charts[elId]) { charts[elId].destroy(); delete charts[elId]; }
  if (!canvas) return;

  const hoje = new Date().toLocaleDateString('pt-BR');
  const cor = isPrice ? '#1a56db' : '#059669';
  const corClara = isPrice ? 'rgba(26,86,219,0.12)' : 'rgba(5,150,105,0.12)';

  charts[elId] = new Chart(canvas.getContext('2d'), {
    type: 'bar',
    data: {
      labels: tabela.map(r => r.mes),
      datasets: [
        { label: 'Prestação', data: tabela.map(r => r.prestacao), backgroundColor: corClara, borderColor: cor, borderWidth: 1, order: 2 },
        { label: 'Saldo devedor', data: tabela.map(r => r.saldo), type: 'line', borderColor: '#1e293b', backgroundColor: 'rgba(30,41,59,0.15)', fill: true, borderWidth: 2, pointRadius: 2, pointHitRadius: 10, order: 1, yAxisID: 'y1' },
      ],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      interaction: { intersect: false, mode: 'index' },
      plugins: {
        legend: { position: 'top', labels: { boxWidth: 12, padding: 10, font: { size: 10 } } },
        tooltip: { callbacks: { label: (ctx) => `${ctx.dataset.label}: ${fmt.moeda(ctx.raw)}` } },
      },
      scales: {
        x: { grid: { display: false }, ticks: { maxTicksLimit: 15, font: { size: 9 } } },
        y: { beginAtZero: true, position: 'left', ticks: { callback: (v) => fmt.moeda(v), font: { size: 9 } } },
        y1: { beginAtZero: true, position: 'right', grid: { display: false }, ticks: { callback: (v) => fmt.moeda(v), font: { size: 9 } } },
      },
    },
  });
}

// ===== PDF =====
function exportarPDF(id) {
  if (!window.jspdf) { alert('Aguarde o carregamento da biblioteca PDF.'); return; }
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const titulo = id === 'price' ? 'PRICE - Prestações Fixas' : 'SAC - Amortização Constante';
  doc.setFontSize(16);
  doc.text('Calculadora de Financiamento - ' + titulo, 14, 20);

  const resumoEl = document.getElementById(`resumo-${id}`);
  if (resumoEl) {
    doc.setFontSize(10);
    let y = 30;
    resumoEl.querySelectorAll('.resumo-item').forEach(item => {
      const label = item.querySelector('.rotulo')?.textContent || '';
      const valor = item.querySelector('.valor')?.textContent || '';
      doc.text(`${label}: ${valor}`, 14, y);
      y += 5;
    });
  }

  const dados = extrairTabela(`tabela-${id}`);
  if (dados) {
    const nomes = ['Mês', 'Prestação', 'Juros', 'Real acumulado', 'Total acumulado'];
    doc.autoTable({
      head: [nomes], body: dados, startY: doc.lastAutoTable?.finalY || 40,
      theme: 'grid',
      headStyles: { fillColor: id === 'price' ? [26, 86, 219] : [5, 150, 105], fontSize: 8 },
      bodyStyles: { fontSize: 7 },
      styles: { halign: 'right' },
      columnStyles: { 0: { halign: 'center' } },
    });
  }
  doc.save(`financiamento-${id}.pdf`);
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
  const pv  = parseMoeda(document.getElementById('price-pv').value);
  const i   = parsePct(document.getElementById('price-i').value);
  const n   = parseInt(document.getElementById('price-n').value, 10);
  const pmt = parseMoeda(document.getElementById('price-pmt').value);

  if (isNaN(pv) && isNaN(i) && isNaN(n) && isNaN(pmt)) {
    alert('Preencha pelo menos 3 campos.'); return;
  }

  const faltante = findFaltante({ pv, i, n, pmt });
  if (!faltante) { alert('Preencha pelo menos 3 campos.'); return; }
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
  calcularSAC();
}

function calcularSAC() {
  const sacPv = document.getElementById('sac-pv');
  const independente = !sacPv.disabled;

  let pv, i, n;

  if (independente) {
    pv = parseMoeda(sacPv.value);
    i  = parsePct(document.getElementById('sac-i').value);
    n  = parseInt(document.getElementById('sac-n').value, 10);
  } else {
    pv = parseMoeda(document.getElementById('price-pv').value);
    i  = parsePct(document.getElementById('price-i').value);
    n  = parseInt(document.getElementById('price-n').value, 10);

    document.getElementById('sac-pv').value       = document.getElementById('price-pv').value;
    document.getElementById('sac-i').value         = document.getElementById('price-i').value;
    document.getElementById('sac-i-anual').value   = document.getElementById('price-i-anual').value;
    document.getElementById('sac-n').value         = document.getElementById('price-n').value;
  }

  if (isNaN(pv) || pv <= 0) { document.getElementById('resultado-sac').hidden = true; return; }
  if (isNaN(i) || i <= 0)   { document.getElementById('resultado-sac').hidden = true; return; }
  if (isNaN(n) || n < 1)    { document.getElementById('resultado-sac').hidden = true; return; }

  exibirResultado('sac', gerarTabelaSAC(pv, i, n), false);
}

const CALCULATORS = { price: calcularPrice, sac: calcularSAC };
function calcular(id) { CALCULATORS[id]?.(); }

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

  // Botão Escrever — libera campos SAC para edição manual
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.btn-escrever');
    if (!btn) return;
    btn.disabled = true;
    btn.textContent = 'Editando';
    const card = btn.closest('.card');
    if (!card) return;
    const placeholders = { 'sac-pv': '0,00', 'sac-i': '0,00', 'sac-i-anual': '0,00', 'sac-n': '1' };
    card.querySelectorAll('.card-body input').forEach(inp => {
      inp.disabled = false;
      inp.readOnly = false;
      inp.placeholder = placeholders[inp.id] ?? '';
    });
  });

  // Botões Calcular (event delegation)
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.btn-calcular');
    if (!btn) return;
    const card = btn.closest('.card');
    if (card) calcular(card.dataset.cenario);
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

  // ===== LEAD FORM (Telegram) =====
  const modal = document.getElementById('modal-lead');
  const form = document.getElementById('form-lead');

  function abrirModal() { modal.hidden = false; }
  function fecharModal() { modal.hidden = true; }

  document.getElementById('btn-abrir-lead').addEventListener('click', abrirModal);
  document.getElementById('btn-abrir-lead-footer').addEventListener('click', abrirModal);
  document.getElementById('btn-fechar-lead').addEventListener('click', fecharModal);
  modal.addEventListener('click', (e) => { if (e.target === modal) fecharModal(); });

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
    const msg = [
      `Compara Financiamento`,
      ``,
      `*Nome:* ${dados.nome}`,
      `*Email:* ${dados.email}`,
      `*Telefone:* ${dados.telefone}`,
      `*Tipo:* ${dados.tipo || 'Não informado'}`,
      `*Valor:* ${dados.valor || 'Não informado'}`,
      dados.mensagem ? `*Mensagem:* ${dados.mensagem}` : null,
    ].filter(Boolean).join('\n');

    try {
      const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text: msg, parse_mode: 'Markdown' }),
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
