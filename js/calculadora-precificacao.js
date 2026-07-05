const UNIDADES = ['g', 'ml', 'un', 'cx', 'kg', 'L', 'm', 'pct', 'fat'];

let rowId = 0;

function criarLinha(data) {
  rowId++;
  const id = rowId;
  const tr = document.createElement('tr');
  tr.dataset.rowId = id;

  const unOpts = '<option value=""></option>' + UNIDADES.map(u => `<option value="${u}"${data.produzirUn === u ? ' selected' : ''}>${u}</option>`).join('');

  const v = (val) => val ?? '';
  tr.innerHTML = `
    <td><button class="btn-remove-row" data-row="${id}" title="Remover linha" type="button">&times;</button></td>
    <td><input type="text" class="prec-insumo" data-row="${id}" value="${v(data.insumo)}" placeholder="Ex: Farinha"></td>
    <td><input type="text" class="moeda prec-preco" data-row="${id}" value="${v(data.preco)}" placeholder="0,00" inputmode="decimal"></td>
    <td><input type="text" class="numero prec-qtd-pacote" data-row="${id}" value="${v(data.qtdPacote)}" placeholder="1000" inputmode="numeric"></td>
    <td><input type="text" class="numero prec-produzir-qtd" data-row="${id}" value="${v(data.produzirQtd)}" placeholder="1" inputmode="decimal"></td>
    <td><select class="prec-produzir-un" data-row="${id}">${unOpts}</select></td>
    <td><input type="text" class="moeda prec-custo" data-row="${id}" value="${v(data.custo)}" placeholder="0,00" inputmode="decimal"></td>
    <td><input type="text" class="prec-pct" data-row="${id}" readonly placeholder="—"></td>
    <td><input type="text" class="prec-fornecedor" data-row="${id}" value="${v(data.fornecedor)}" placeholder="Fornecedor"></td>
    <td><input type="date" class="prec-data" data-row="${id}" value="${v(data.data)}"></td>
    <td><input type="text" class="numero prec-estoque" data-row="${id}" value="${v(data.estoque)}" placeholder="500" inputmode="numeric"></td>
    <td><input type="text" class="prec-posso-produzir" data-row="${id}" readonly placeholder="—"></td>
    <td><input type="text" class="prec-obs" data-row="${id}" value="${v(data.obs)}" placeholder="Observações"></td>
  `;

  const tbody = document.getElementById('prec-tbody');
  tbody.appendChild(tr);

  function onUserInput(e) {
    e.target.classList.remove('prec-default');
    recalcular();
  }

  tr.querySelectorAll('.moeda').forEach(inp => {
    inp.addEventListener('blur', function () {
      if (!this.value) return;
      const v = parseMoeda(this.value);
      if (!isNaN(v)) this.value = fmt.numero(Math.round(v * 100) / 100);
    });
    inp.addEventListener('input', onUserInput);
  });

  tr.querySelectorAll('.numero').forEach(inp => {
    inp.addEventListener('blur', function () {
      if (!this.value) return;
      const v = parseInt(this.value.replace(/\D/g, ''), 10);
      if (!isNaN(v) && v >= 1) this.value = v;
    });
    inp.addEventListener('input', onUserInput);
  });

  tr.querySelectorAll('.prec-produzir-qtd, .prec-estoque').forEach(inp => {
    inp.addEventListener('input', onUserInput);
  });

  tr.querySelector('.prec-produzir-un').addEventListener('change', onUserInput);

  tr.querySelectorAll('.prec-insumo, .prec-fornecedor, .prec-obs').forEach(inp => {
    inp.addEventListener('input', onUserInput);
  });

  tr.querySelector('.btn-remove-row').addEventListener('click', function () {
    tr.remove();
    recalcular();
  });

  return tr;
}

function recalcular() {
  const tbody = document.getElementById('prec-tbody');
  const rows = tbody.querySelectorAll('tr');
  let custoTotal = 0;
  const custos = [];

  rows.forEach(tr => {
    const id = tr.dataset.rowId;
    const precoStr = tr.querySelector(`.prec-preco[data-row="${id}"]`)?.value || '';
    const qtdPacoteStr = tr.querySelector(`.prec-qtd-pacote[data-row="${id}"]`)?.value || '';
    const produzirQtdStr = tr.querySelector(`.prec-produzir-qtd[data-row="${id}"]`)?.value || '';
    const custoManualStr = tr.querySelector(`.prec-custo[data-row="${id}"]`)?.value || '';
    const estoqueStr = tr.querySelector(`.prec-estoque[data-row="${id}"]`)?.value || '';

    const preco = parseMoeda(precoStr);
    const qtdPacote = parseFloat(qtdPacoteStr.replace(',', '.'));
    let produzirQtd = parseFloat(produzirQtdStr.replace(',', '.'));
    if (isNaN(produzirQtd) || produzirQtd <= 0) produzirQtd = 1;
    const estoque = parseFloat(estoqueStr.replace(',', '.'));
    const custoManual = parseMoeda(custoManualStr);

    let custo = 0;
    let autoCalc = false;

    // Auto-calc from package when preco and qtdPacote have values
    if (!isNaN(preco) && preco > 0 && !isNaN(qtdPacote) && qtdPacote > 0) {
      custo = (preco / qtdPacote) * produzirQtd;
      autoCalc = true;
    }

    custo = Math.round(custo * 100) / 100;

    // Determine final custo: prefer manual custo if no preco/qtdPacote
    if (autoCalc && custo > 0) {
      // Auto-calculated: write to field (only if different)
      const custoInput = tr.querySelector(`.prec-custo[data-row="${id}"]`);
      if (custoInput) {
        const currentVal = custoInput.value;
        const newVal = fmt.moeda(custo);
        if (currentVal !== newVal) {
          custoInput.value = newVal;
        }
      }
    } else if (!autoCalc && !isNaN(custoManual) && custoManual > 0) {
      custo = custoManual;
    } else if (!autoCalc) {
      custo = 0;
    }

    custos.push({ id, custo });
    custoTotal += custo;

    // Posso produzir = Estoque / P/ Produzir
    const possoInput = tr.querySelector(`.prec-posso-produzir[data-row="${id}"]`);
    if (possoInput) {
      if (!isNaN(estoque) && estoque > 0 && !isNaN(produzirQtd) && produzirQtd > 0) {
        possoInput.value = Math.floor(estoque / produzirQtd);
      } else {
        possoInput.value = '';
      }
    }
  });

  // Second pass: percentages
  rows.forEach(tr => {
    const id = tr.dataset.rowId;
    const entry = custos.find(c => c.id == id);
    if (!entry) return;
    const pctInput = tr.querySelector(`.prec-pct[data-row="${id}"]`);
    if (pctInput) {
      if (custoTotal > 0) {
        pctInput.value = ((entry.custo / custoTotal) * 100).toFixed(2).replace('.', ',') + '%';
      } else {
        pctInput.value = '';
      }
    }
  });

  document.getElementById('prec-custo-total').textContent = fmt.moeda(custoTotal);

  const margemRs = parseMoeda(document.getElementById('prec-margem').value);
  if (!isNaN(margemRs) && margemRs > 0) {
    document.getElementById('prec-preco-venda').textContent = fmt.moeda(custoTotal + margemRs);
  } else if (custoTotal > 0) {
    document.getElementById('prec-preco-venda').textContent = fmt.moeda(custoTotal);
  } else {
    document.getElementById('prec-preco-venda').textContent = 'R$ 0,00';
  }
}

function copiarTabela() {
  const tbody = document.getElementById('prec-tbody');
  const rows = tbody.querySelectorAll('tr');

  let text = 'Ingrediente/Insumo\tPreço\tQtd. Pacote\tP/ Produzir\tUn.\tCusto\t%\tFornecedor\tÚltima Compra\tEstoque\tPosso Produzir\tObservações\n';

  rows.forEach(tr => {
    const id = tr.dataset.rowId;
    const cells = [
      tr.querySelector(`.prec-insumo[data-row="${id}"]`)?.value || '',
      tr.querySelector(`.prec-preco[data-row="${id}"]`)?.value || '',
      tr.querySelector(`.prec-qtd-pacote[data-row="${id}"]`)?.value || '',
      tr.querySelector(`.prec-produzir-qtd[data-row="${id}"]`)?.value || '',
      tr.querySelector(`.prec-produzir-un[data-row="${id}"]`)?.value || '',
      tr.querySelector(`.prec-custo[data-row="${id}"]`)?.value || '',
      tr.querySelector(`.prec-pct[data-row="${id}"]`)?.value || '',
      tr.querySelector(`.prec-fornecedor[data-row="${id}"]`)?.value || '',
      tr.querySelector(`.prec-data[data-row="${id}"]`)?.value || '',
      tr.querySelector(`.prec-estoque[data-row="${id}"]`)?.value || '',
      tr.querySelector(`.prec-posso-produzir[data-row="${id}"]`)?.value || '',
      tr.querySelector(`.prec-obs[data-row="${id}"]`)?.value || '',
    ];
    text += cells.join('\t') + '\n';
  });

  text += '\n';
  text += `Custo Total\t${document.getElementById('prec-custo-total').textContent}\n`;
  const maoObraVal = parseMoeda(document.getElementById('prec-margem').value);
  text += `MÃO DE OBRA\t${isNaN(maoObraVal) ? 'R$ 0,00' : fmt.moeda(maoObraVal)}\n`;
  text += `Preço de Venda\t${document.getElementById('prec-preco-venda').textContent}\n`;

  navigator.clipboard.writeText(text).then(() => {
    mostrarToast('Tabela copiada!');
  }).catch(() => {
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    ta.remove();
    mostrarToast('Tabela copiada!');
  });
}

function carregarExemplo() {
  document.getElementById('prec-tbody').innerHTML = '';

  const exemplos = [
    { insumo: 'Farinha de trigo', preco: '50,00', qtdPacote: '1000', produzirQtd: '10', produzirUn: 'g', fornecedor: 'ABC Alimentos', data: '2026-07-04', estoque: '500' },
    { insumo: 'Açúcar', preco: '45,00', qtdPacote: '1000', produzirQtd: '8', produzirUn: 'g', fornecedor: 'ABC Alimentos', data: '2026-07-03', estoque: '500' },
    { insumo: 'Manteiga', preco: '35,00', qtdPacote: '500', produzirQtd: '5', produzirUn: 'g', fornecedor: 'Laticínios XYZ', data: '2026-07-02', estoque: '200' },
    { insumo: 'Embalagem', preco: '500,00', qtdPacote: '500', produzirQtd: '1', produzirUn: 'un', fornecedor: 'Embalagens ABC', data: '2026-07-01', estoque: '500' },
    { insumo: 'Água/Energia (30 dias)', custo: '0,30', fornecedor: 'Concessionária', obs: 'Custo fixo rateado' },
    { insumo: 'Materiais de limpeza', custo: '0,50', fornecedor: 'ABC', obs: 'Custo fixo rateado' },
    { insumo: 'Materiais diversos', custo: '0,10', fornecedor: 'ABC', obs: 'Custo fixo rateado' },
    { insumo: 'Taxas bancárias / Máq. cartão', custo: '1,00', fornecedor: 'Bancos', obs: 'Por venda' },
    { insumo: 'Frete/Entrega', custo: '0,50', fornecedor: 'Uber/99', obs: 'Por unidade' },
    { insumo: 'Outros', custo: '2,00', obs: 'Por unidade' },
  ];

  exemplos.forEach(d => criarLinha(d));
  recalcular();
  document.getElementById('prec-margem').value = '4,60';
  recalcular();

  // Mark all filled inputs as default (light font until user edits)
  document.querySelectorAll('#prec-tbody input:not([readonly])').forEach(inp => {
    if (inp.value) inp.classList.add('prec-default');
  });
}

document.addEventListener('DOMContentLoaded', () => {
  criarLinha({ insumo: '', preco: '', qtdPacote: '', produzirQtd: '1', produzirUn: 'un', fornecedor: '', data: '', estoque: '', obs: '' });

  document.getElementById('btn-add-row').addEventListener('click', () => {
    criarLinha({ insumo: '', preco: '', qtdPacote: '', produzirQtd: '1', produzirUn: 'un', fornecedor: '', data: '', estoque: '', obs: '' });
    recalcular();
  });

  document.getElementById('btn-copy-table').addEventListener('click', copiarTabela);
  document.getElementById('btn-copy-table-mobile').addEventListener('click', copiarTabela);
  document.getElementById('btn-exemplo').addEventListener('click', carregarExemplo);

  document.getElementById('prec-margem').addEventListener('input', recalcular);
  document.getElementById('prec-margem').addEventListener('blur', function () {
    if (!this.value) return;
    const v = parseMoeda(this.value);
    if (!isNaN(v)) this.value = fmt.numero(Math.round(v * 100) / 100);
    recalcular();
  });

  setupCurrencyMask();
  setupIntegerMask();
  setupPercentMask();
  setupHamburgerMenu();

  recalcular();
});