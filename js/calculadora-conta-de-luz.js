function mostrarLoading() {
  document.getElementById('luz-distribuidora').innerHTML = '<option value="">Carregando distribuidoras...</option>';
  document.getElementById('luz-loading').style.display = 'block';
}

function esconderLoading() {
  document.getElementById('luz-loading').style.display = 'none';
}

function mostrarErro(msg) {
  const el = document.getElementById('luz-erro');
  el.textContent = msg;
  el.style.display = 'block';
}

function esconderErro() {
  document.getElementById('luz-erro').style.display = 'none';
}

function criarLinhaEquipamento(idx) {
  const div = document.createElement('div');
  div.className = 'luz-equip-row';
  const label = (text) => idx === 0 ? `<label>${text}</label>` : '';
  div.innerHTML = `
    <span class="luz-equip-num">${idx + 1}</span>
    <div class="campo">
      ${label('Potencia (W)')}
      <input type="number" class="campo__input luz-potencia" min="1" step="1" inputmode="numeric" data-idx="${idx}">
    </div>
    <div class="campo">
      ${label('h/dia')}
      <input type="number" class="campo__input luz-horas" min="0.5" max="24" step="0.5" inputmode="decimal" data-idx="${idx}">
    </div>
    <div class="campo">
      ${label('dias/mes')}
      <input type="number" class="campo__input luz-dias" min="1" max="31" step="1" inputmode="numeric" data-idx="${idx}">
    </div>
  `;
  return div;
}

function montarEquipamentos() {
  const container = document.getElementById('luz-equipamentos');
  for (let i = 0; i < 5; i++) {
    container.appendChild(criarLinhaEquipamento(i));
  }
}

async function carregarBandeiras() {
  try {
    const res = await fetch('/api/bandeiras');
    if (!res.ok) throw new Error('Falha');
    const data = await res.json();
    window.__bandeiras = {};

    const sel = document.getElementById('luz-bandeira');
    sel.innerHTML = '<option value="">Selecione a bandeira</option>';

    for (const b of data.bandeiras) {
      const opt = document.createElement('option');
      opt.value = b.chave;
      opt.textContent = `${b.nome} (R$ ${b.adicional_kwh.toFixed(6).replace('.', ',')}/kWh)`;
      sel.appendChild(opt);
      window.__bandeiras[b.chave] = b;
    }

    if (data.atual && data.atual.chave) {
      sel.value = data.atual.chave;
    }
  } catch (e) {
    console.error('Erro bandeiras:', e);
    document.getElementById('luz-bandeira').innerHTML = '<option value="">Indisponivel</option>';
  }
}

async function carregarImpostos() {
  try {
    const res = await fetch('/api/impostos');
    if (!res.ok) throw new Error('Falha');
    window.__impostos = await res.json();
  } catch (e) {
    console.error('Erro impostos:', e);
    window.__impostos = null;
  }
}

async function carregarDistribuidoras() {
  mostrarLoading();
  esconderErro();

  try {
    const res = await fetch('/api/tarifas');
    if (!res.ok) throw new Error('Falha ao carregar');
    const data = await res.json();
    if (data.error || !data.distribuidoras || data.distribuidoras.length === 0) {
      throw new Error(data.error || 'Nenhuma distribuidora encontrada');
    }
    preencherSelect(data.distribuidoras);
    montarRanking(data.distribuidoras);
    window.__tarifas = data.distribuidoras;
  } catch (e) {
    console.error('Erro ao carregar tarifas:', e);
    mostrarErro('Nao foi possivel carregar as distribuidoras. Tente novamente mais tarde.');
    document.getElementById('luz-distribuidora').innerHTML = '<option value="">Indisponivel</option>';
    document.getElementById('luz-ranking-loading').textContent = 'Ranking indisponivel';
  } finally {
    esconderLoading();
  }
}

function preencherSelect(distribuidoras) {
  const sel = document.getElementById('luz-distribuidora');
  sel.innerHTML = '<option value="">Selecione a distribuidora</option>';
  for (const d of distribuidoras) {
    const opt = document.createElement('option');
    opt.value = d.sigla;
    opt.textContent = `${d.cidade} / ${d.estado} - ${d.sigla}`;
    sel.appendChild(opt);
  }
}

function montarRanking(distribuidoras) {
  const sorted = [...distribuidoras].sort((a, b) => a.total_kwh - b.total_kwh);

  const loading = document.getElementById('luz-ranking-loading');
  loading.style.display = 'none';

  const container = document.getElementById('luz-ranking-tabela');
  container.style.display = 'block';

  let html = '<table class="luz-ranking-table"><thead><tr><th>#</th><th style="text-align:right">Distribuidora</th><th style="text-align:right">Cidade / UF</th><th style="text-align:right">Tarifa (R$/kWh)</th></tr></thead><tbody>';
  for (let i = 0; i < sorted.length; i++) {
    const d = sorted[i];
    html += `<tr>
      <td class="luz-ranking-pos">${i + 1}</td>
      <td style="text-align:right">${d.sigla}</td>
      <td style="text-align:right">${d.cidade} / ${d.estado}</td>
      <td class="luz-ranking-tarifa">${d.total_kwh.toFixed(6).replace('.', ',')}</td>
    </tr>`;
  }
  html += '</tbody></table>';
  container.innerHTML = html;
}

function calcular() {
  try { esconderErro(); } catch (e) {}
  try {

  const rows = document.querySelectorAll('.luz-equip-row');
  let totalKwh = 0;

  for (const row of rows) {
    const potencia = parseFloat(row.querySelector('.luz-potencia').value);
    const horas = parseFloat(row.querySelector('.luz-horas').value);
    const dias = parseFloat(row.querySelector('.luz-dias').value);

    if (!potencia || potencia <= 0) continue;

    const h = (!horas || horas <= 0) ? 0 : horas;
    const d = (!dias || dias <= 0) ? 0 : dias;

    if (h <= 0 || d <= 0) continue;

    const kwh = (potencia / 1000) * h * d;
    totalKwh += kwh;
  }

  const sigla = document.getElementById('luz-distribuidora').value;
  const bandeira = document.getElementById('luz-bandeira').value;

  if (totalKwh <= 0) { mostrarErro('Preencha ao menos um equipamento com potencia, horas e dias validos.'); return; }
  if (!sigla) { mostrarErro('Selecione uma distribuidora.'); return; }
  if (!bandeira) { mostrarErro('Selecione a bandeira tarifaria.'); return; }

  const tarifas = window.__tarifas || [];
  const dist = tarifas.find(d => d.sigla === sigla);
  if (!dist) { mostrarErro('Distribuidora nao encontrada.'); return; }

  const bands = window.__bandeiras || {};
  const band = bands[bandeira];
  if (!band) { mostrarErro('Bandeira nao encontrada.'); return; }

  const custoEnergia = totalKwh * dist.total_kwh;
  const custoBandeira = totalKwh * band.adicional_kwh;
  const total = custoEnergia + custoBandeira;

  const elResultado = document.getElementById('luz-resultado');
  elResultado.classList.add('luz-resultado--show');

  const consumoTexto = `${totalKwh.toFixed(1).replace('.', ',')} kWh/mes`;
  const elConsumoAntigo = document.getElementById('luz-result-consumo-antigo');
  const elConsumoCorreto = document.getElementById('luz-result-consumo-correto');
  if (elConsumoAntigo) elConsumoAntigo.textContent = consumoTexto;
  if (elConsumoCorreto) elConsumoCorreto.textContent = consumoTexto;

  const impostos = window.__impostos;
  const elValorAntigo = document.getElementById('luz-result-valor-com-impostos');
  const elValorCorreto = document.getElementById('luz-result-valor-correto');
  const elAliquotas = document.getElementById('luz-result-aliquotas');
  const elAliquotasCorreto = document.getElementById('luz-result-aliquotas-correto');

  if (impostos && impostos.icms_por_uf && impostos.icms_por_uf[dist.estado]) {
    const limiteReduzido = impostos.icms_reduzido_limite_kwh || 200;
    const icmsPct = (totalKwh <= limiteReduzido && impostos.icms_por_uf_reduzido)
      ? impostos.icms_por_uf_reduzido[dist.estado]
      : impostos.icms_por_uf[dist.estado];
    const icms = icmsPct / 100;
    const pis = impostos.pis / 100;
    const cofins = impostos.cofins / 100;

    const totalAntigo = total / (1 - icms - pis - cofins);
    const totalCorreto = total * (1 + pis + cofins) * (1 + icms);

    if (elValorAntigo) elValorAntigo.textContent = totalAntigo.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    if (elValorCorreto) elValorCorreto.textContent = totalCorreto.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    const label = `ICMS ${icmsPct}% | PIS ${impostos.pis}% | COFINS ${impostos.cofins}%`;
    if (elAliquotas) elAliquotas.textContent = label;
    if (elAliquotasCorreto) elAliquotasCorreto.textContent = label;
  } else {
    if (elValorAntigo) elValorAntigo.textContent = '-';
    if (elValorCorreto) elValorCorreto.textContent = '-';
    if (elAliquotas) elAliquotas.textContent = 'Indisponivel';
    if (elAliquotasCorreto) elAliquotasCorreto.textContent = 'Indisponivel';
  }


  } catch (e) { console.warn('calcular():', e); mostrarErro('Erro ao calcular. Tente novamente.'); }
}

document.addEventListener('DOMContentLoaded', () => {
  montarEquipamentos();
  carregarDistribuidoras();
  carregarBandeiras();
  carregarImpostos();
  try { setupHamburgerMenu(); } catch (e) { console.warn('Hamburger menu:', e); }

  document.querySelectorAll('#luz-equipamentos input').forEach(el => {
    el.addEventListener('input', () => calcular());
    el.addEventListener('change', () => calcular());
  });

  document.getElementById('luz-distribuidora').addEventListener('change', () => calcular());
  document.getElementById('luz-bandeira').addEventListener('change', () => calcular());
});
