# Compara Financiamento (PRICE vs SAC) — Agent Guidelines

## Project Overview
Static HTML + CSS + JS site that compares PRICE (prestações fixas) and SAC (amortização constante) loan amortization systems side-by-side. Domain: `comparafinanciamento.com.br`.

## Key Files
- `index.html` — page structure (2 cards, sticky header with affiliate banner, footer with 4 columns)
- `styles.css` — responsive grid (2-column ≥992px), sticky header, dark footer, toast, BEM naming
- `script.js` — all logic: finance formulas, chart (Chart.js), PDF (jsPDF), clipboard, rate sync, masks
- `sitemap.xml` / `robots.txt` / `README.md` — SEO files

## Architecture (script.js sections, 318 lines)
| Section | Lines | Description |
|---------|-------|-------------|
| FINANCE | 1-72 | Pure functions: `pmtPrice`, `pvPrice`, `nPrice`, `iPrice`, `gerarTabelaPrice`, `gerarTabelaSAC` |
| FORMAT | 73-89 | `fmt.moeda`, `fmt.numero`, `fmt.pctInput`, `parseMoeda`, `parsePct` |
| UI | 90-148 | `exibirResultado`, `renderizarTabela`, `renderizarGrafico`, `mostrarToast` |
| PDF / COPIAR | 149-215 | `exportarPDF`, `copiarTabela`, helpers |
| CALCULAR | 216-288 | `findFaltante`, `validarPrice`, `calcularPrice`, `calcularSAC`, `calcular` (dispatch) |
| INIT | 289-318 | `DOMContentLoaded`: masks, rate sync, event delegation for buttons |

## Finance Logic
- PRICE: `PMT = PV * i * (1+i)^n / ((1+i)^n - 1)`. Fill-3-get-4th: any 3 of PV, i, n, PMT → calculates the missing one.
- SAC: amortization = PV/n (constant), payment = amort + interest (decreasing).
- `iPrice` uses binary search with dynamic hi (starts at 0.01, doubles until bracket, 200 iterations, tolerance ~1e-6 on PMT). Sem limite fixo.
- Monthly ↔ Annual: `(1+i)^12 - 1` and `(1+ia)^(1/12) - 1`.
- `fmt.pctInput`: converts decimal rate to "0,00" format for display.

## Styling
- CSS custom properties for colors/theming
- `--price-color: #1a56db`, `--sac-color: #059669`
- Toast uses `.toast` + `.toast--fade` classes
- Header: blue gradient with flexbox layout (brand left, affiliate CTA right)
- Footer: dark gradient (`#1e293b → #0f172a`), 4-column grid on desktop (≥768px), stacked on mobile
- Affiliate banner uses Financia Tudo brand orange `#ff7a30`

## Affiliates
- **Financia Tudo**: banner in header (`#link-afiliado-topo`, orange CTA button) + logo + heading in footer (`#link-afiliado-footer`)
- Links are placeholders (`#`) awaiting affiliate account approval

## Dependencies (CDN, defer)
- Chart.js 4.4.7 (bar+line chart)
- jsPDF 2.5.2 + jspdf-autotable 3.8.4
- Font Awesome 6.5.1

## SEO
- Domain: `comparafinanciamento.com.br`
- Open Graph + Twitter Card meta tags
- JSON-LD structured data (WebApplication, FinanceApplication)
- `sitemap.xml` + `robots.txt`

## Gotchas
- Currency/percentage masks fire on `blur` (not `input`) — allows typing "0" without interference
- Rate sync uses `dataset.syncing` flag to prevent infinite loop between monthly and annual fields
- Chart instances destroyed before recreate to avoid memory leaks
- `calcular()` dispatches via `CALCULATORS` map — add new key for new amortization systems
- All monetary values use `pt-BR` locale (comma decimal, period thousands)
