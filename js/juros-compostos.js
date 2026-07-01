let chartInstance = null;

function calcularJC() {
  const pv = parseMoeda(document.getElementById('jc-pv').value) || 0;
  const pmt = parseMoeda(document.getElementById('jc-pmt').value) || 0;
  let i = parsePct(document.getElementById('jc-i').value);
  const n = parseInt(document.getElementById('jc-n').value.replace(/\D/g, ''), 10);

  if (isNaN(i) || i < 0) {
    i = 0.01;
    document.getElementById('jc-i').value = fmt.pctInput(i);
    document.getElementById('jc-i-anual').value = fmt.pctInput(TAXA_ANUAL(i));
  }

  if (pv <= 0 && pmt <= 0) {
    mostrarToast('Informe o valor inicial ou o aporte mensal.');
    return;
  }

  if (isNaN(n) || n < 1) {
    mostrarToast('Informe o número de meses.');
    return;
  }

  if (i <= 0 && pmt <= 0) {
    mostrarToast('Informe a taxa de juros ou o aporte mensal.');
    return;
  }

  const rows = [];
  let saldo = pv;
  let totalInvestido = pv;
  let totalJuros = 0;

  for (let m = 1; m <= n; m++) {
    const juros = saldo * i;
    saldo = saldo + juros + pmt;
    totalInvestido += pmt;
    totalJuros += juros;
    rows.push({
      mes: m,
      saldoInicial: saldo - juros - pmt,
      aporte: pmt,
      juros: juros,
      saldoFinal: saldo,
      totalInvestido: totalInvestido,
    });
  }

  const valorFinal = saldo;
  const totalInvestidoFinal = pv + pmt * n;
  const totalJurosFinal = valorFinal - totalInvestidoFinal;

  document.getElementById('jc-valor-final').textContent = fmt.moeda(valorFinal);
  document.getElementById('jc-total-investido').textContent = fmt.moeda(totalInvestidoFinal);
  document.getElementById('jc-total-juros').textContent = fmt.moeda(totalJurosFinal);

  renderTabela(rows);
  renderGrafico(rows, pv);

  document.getElementById('resultado-jc').hidden = false;
}

function renderTabela(rows) {
  const nomes = ['Mês', 'Saldo Inicial', 'Aporte', 'Juros', 'Saldo Final'];
  const html = `<thead><tr>${nomes.map(n => `<th>${n}</th>`).join('')}</tr></thead>`
    + `<tbody>${rows.slice(0, 360).map(r => `<tr>
      <td>${r.mes}</td>
      <td>${fmt.moeda(r.saldoInicial)}</td>
      <td>${fmt.moeda(r.aporte)}</td>
      <td>${fmt.moeda(r.juros)}</td>
      <td>${fmt.moeda(r.saldoFinal)}</td>
    </tr>`).join('')}</tbody>`;
  document.getElementById('tabela-jc').innerHTML = html;
}

function renderGrafico(rows, pv) {
  const canvas = document.getElementById('grafico-jc');
  if (!canvas) return;

  if (chartInstance) { chartInstance.destroy(); chartInstance = null; }

  if (typeof Chart === 'undefined') {
    carregarChartJs().then(() => renderGrafico(rows, pv));
    return;
  }

  const labels = rows.map(r => r.mes);
  const valoresTotal = rows.map(r => r.saldoFinal);
  const investido = rows.map(r => r.totalInvestido);

  chartInstance = new Chart(canvas.getContext('2d'), {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Valor Total',
          data: valoresTotal,
          borderColor: '#1a56db',
          backgroundColor: 'rgba(26,86,219,0.1)',
          borderWidth: 2,
          pointRadius: 0,
          pointHitRadius: 10,
          fill: true,
          tension: 0.3,
        },
        {
          label: 'Total Investido',
          data: investido,
          borderColor: '#94a3b8',
          backgroundColor: 'transparent',
          borderWidth: 2,
          borderDash: [5, 5],
          pointRadius: 0,
          pointHitRadius: 10,
          fill: false,
          tension: 0.3,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { intersect: false, mode: 'index' },
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            usePointStyle: true,
            boxWidth: 12,
            padding: 10,
            font: { size: 11 },
          },
        },
        tooltip: {
          callbacks: {
            label: ctx => `${ctx.dataset.label}: ${fmt.moeda(ctx.parsed.y)}`,
          },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: {
            maxTicksLimit: 15,
            font: { size: 9 },
          },
        },
        y: {
          beginAtZero: true,
          ticks: {
            font: { size: 9 },
            callback: v => fmt.moeda(v),
          },
        },
      },
    },
  });
}

document.addEventListener('DOMContentLoaded', () => {
  setupCurrencyMask();
  setupIntegerMask();
  setupPercentMask();
  setupRateSync();
  setupHamburgerMenu();

  document.getElementById('btn-calcular-jc')?.addEventListener('click', calcularJC);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const inp = e.target.closest('#jc-pv, #jc-pmt, #jc-i, #jc-i-anual, #jc-n');
      if (inp) calcularJC();
    }
  });
});
