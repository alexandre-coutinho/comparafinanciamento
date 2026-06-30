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

const TAXA_ANUAL = (i) => (1 + i) ** 12 - 1;
const TAXA_MENSAL = (ia) => (1 + ia) ** (1 / 12) - 1;

let _chartLoading = null;
function carregarChartJs() {
  if (window.Chart) return Promise.resolve();
  if (_chartLoading) return _chartLoading;
  _chartLoading = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.7/dist/chart.umd.min.js';
    s.onload = resolve;
    s.onerror = reject;
    document.head.appendChild(s);
  });
  return _chartLoading;
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

function setupRateSync(containerSelector) {
  const container = containerSelector ? document.querySelector(containerSelector) : document;
  container.querySelectorAll('.porcentagem').forEach(inp => {
    inp.addEventListener('input', function () {
      if (this.dataset.syncing) return;
      const parent = this.closest('main, .card');
      if (!parent) return;
      const isMensal = this.id.endsWith('-i') && !this.id.endsWith('-i-anual');
      const isAnual = this.id.endsWith('-i-anual');
      if (!isMensal && !isAnual) return;

      const v = parseFloat(this.value.replace(',', '.'));
      const destId = isMensal ? this.id.replace(/-i$/, '-i-anual') : this.id.replace(/-i-anual$/, '-i');
      const dest = document.getElementById(destId);
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
}

function setupCurrencyMask(containerSelector) {
  const container = containerSelector ? document.querySelector(containerSelector) : document;
  container.querySelectorAll('.moeda').forEach(inp => {
    inp.addEventListener('blur', () => {
      if (!inp.value) return;
      const v = parseMoeda(inp.value);
      if (!isNaN(v)) inp.value = fmt.numero(Math.round(v * 100) / 100);
    });
  });
}

function setupIntegerMask(containerSelector) {
  const container = containerSelector ? document.querySelector(containerSelector) : document;
  container.querySelectorAll('.numero').forEach(inp => {
    inp.addEventListener('blur', () => {
      if (!inp.value) return;
      const v = parseInt(inp.value.replace(/\D/g, ''), 10);
      if (!isNaN(v) && v >= 1) inp.value = v;
    });
  });
}

function setupPercentMask(containerSelector) {
  const container = containerSelector ? document.querySelector(containerSelector) : document;
  container.querySelectorAll('.porcentagem').forEach(inp => {
    inp.addEventListener('blur', () => {
      if (!inp.value) return;
      const v = parseFloat(inp.value.replace(',', '.'));
      if (!isNaN(v) && v >= 0) inp.value = v.toFixed(2).replace('.', ',');
    });
  });
}

function setupHamburgerMenu() {
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
}
