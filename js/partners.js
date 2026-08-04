function renderPartners() {
  const section = document.getElementById('parceiros-recomendados');
  const grid = document.getElementById('parceiros-grid');
  if (!section || !grid) return;

  const activePartners = (window.partners || [])
    .filter(partner => partner.active)
    .sort((a, b) => a.order - b.order);

  if (!activePartners.length) {
    section.hidden = true;
    grid.innerHTML = '';
    return;
  }

  grid.innerHTML = activePartners.map(partner => {
    const cta = partner.ctaText ? `
      <a class="parceiro-cta" href="${partner.url}" target="_blank" rel="noopener noreferrer">
        <span>${partner.ctaText}</span>
        <span aria-hidden="true">-&gt;</span>
      </a>
    ` : '';

    return `
      <div class="parceiro-item">
        <a class="parceiro-banner" href="${partner.url}" target="_blank" rel="noopener noreferrer" aria-label="${partner.name}">
          <img src="${partner.image}" alt="${partner.alt}" loading="lazy">
        </a>
        ${cta}
      </div>
    `;
  }).join('');
  grid.classList.toggle('parceiros-grid--single', activePartners.length === 1);
  section.hidden = false;
}

document.addEventListener('DOMContentLoaded', renderPartners);
