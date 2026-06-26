# Compara Financiamento (Tabela PRICE vs Tabela SAC) — Agent Guidelines

## Project Overview
Static HTML + CSS + JS site that compares Tabela PRICE (prestações fixas) and Tabela SAC (amortização constante) loan amortization systems side-by-side. Domain: `comparafinanciamento.com.br`.

## Key Files
- `index.html` — page structure (2 cards, sticky header with affiliate banner, footer with 4 columns)
- `css/styles.css` — responsive grid (2-column ≥992px), sticky header, dark footer, toast, BEM naming
- `js/script.js` — all logic: finance formulas, chart (Chart.js), PDF (jsPDF), clipboard, rate sync, masks, lead form
- `js/worker-telegram.js` — Telegram worker
- `config.js` — Telegram bot token and chat ID (gitignored)
- `functions/api/lead.js` — Cloudflare Function para envio do lead form
- `sitemap.xml` / `robots.txt` — SEO files
- `.gitignore` — excludes `opencode.json` and `config.js` (contain secrets)

## Lead Capture (Telegram)
- Bot: @comparaBot_bot (token em `config.js`, gitignorado)
- Chat ID: `6215630573`
- Modal com form nativo (Nome, Email, Telefone, Tipo, Valor, Mensagem) → envia via `api.telegram.org/botTOKEN/sendMessage`
- Botões "Fale conosco" no header e footer abrem o modal
- Sucesso → `alert('Mensagem enviada.')`; erro → `alert('Erro ao enviar...')`

## Architecture (js/script.js sections, 574 lines)
| Section | Lines | Description |
|---------|-------|-------------|
| FINANCE | 1-80 | Pure functions: `pmtPrice`, `pvPrice`, `nPrice`, `iPrice`, `gerarTabelaPrice`, `gerarTabelaSAC` |
| FORMAT | 82-97 | `fmt.moeda`, `fmt.numero`, `fmt.pctInput`, `parseMoeda`, `parsePct` |
| UI | 98-122 | `exibirResultado`, `renderizarTabela`, `renderizarGrafico`, `mostrarToast` |
| GRAFICO | 124-238 | Chart.js — `renderizarGraficoComparativo`, `renderizarGrafico` |
| PDF / COPIAR | 240-305 | `exportarPDF`, `copiarTabela`, `mostrarToast`, helpers |
| CALCULAR | 307-387 | `findFaltante`, `validarPrice`, `calcularPrice`, `calcularSAC`, `calcular` (dispatch) |
| INIT | 389-574 | `DOMContentLoaded`: masks, rate sync, event delegation, lead form |

## Finance Logic
- Tabela PRICE: `PMT = PV * i * (1+i)^n / ((1+i)^n - 1)`. Fill-3-get-4th: any 3 of PV, i, n, PMT → calculates the missing one.
- Tabela SAC: amortization = PV/n (constant), payment = amort + interest (decreasing).
- `iPrice` uses binary search with dynamic hi (starts at 0.01, doubles until bracket, 200 iterations, tolerance ~1e-6 on PMT). Sem limite fixo.
- Monthly ↔ Annual: `(1+i)^12 - 1` and `(1+ia)^(1/12) - 1`.
- `fmt.pctInput`: converts decimal rate to "0,00" format for display.

## Folder Structure
```
/
├── index.html            # Página principal
├── css/styles.css        # Estilos
├── js/
│   ├── script.js         # Lógica do simulador
│   └── worker-telegram.js
├── functions/api/lead.js # Cloudflare Function
├── .agents/              # Agentes e guidelines
├── config.js             # Telegram secrets (gitignored)
├── robots.txt / sitemap.xml
└── .gitignore
```

## Styling
- CSS custom properties for colors/theming
- `--price-color: #1a56db`, `--sac-color: #059669`
- Toast uses `.toast` + `.toast--fade` classes (z-index 9999)
- Modal overlay z-index 1000, form dentro usa inputs/select/textarea padronizados
- Header: blue gradient with flexbox layout (brand left, affiliate CTA right)
- Footer: dark gradient (`#1e293b → #0f172a`), 4-column grid on desktop (≥768px), stacked on mobile
- Affiliate banner uses Financia Tudo brand orange `#ff7a30`

## Affiliates
- **Financia Tudo**: banner in header (`#btn-abrir-lead`, orange CTA button) + logo + heading in footer (`#btn-abrir-lead-footer`)
- Both buttons open the lead form modal instead of external links

## Dependencies (CDN, defer)
- Chart.js 4.4.7 (bar+line chart)
- jsPDF 2.5.2 + jspdf-autotable 3.8.4
- Font Awesome 6.5.1

## SEO
- Domain: `comparafinanciamento.com.br`
- Open Graph + Twitter Card meta tags
- JSON-LD structured data (WebApplication, FinanceApplication)
- `sitemap.xml` + `robots.txt`

## .gitignore
- `opencode.json` and `config.js` contain secrets and must never be committed

## Gotchas
- Currency/percentage masks fire on `blur` (not `input`) — allows typing "0" without interference
- Rate sync uses `dataset.syncing` flag to prevent infinite loop between monthly and annual fields
- Chart instances destroyed before recreate to avoid memory leaks
- `calcular()` dispatches via `CALCULATORS` map — add new key for new amortization systems
- All monetary values use `pt-BR` locale (comma decimal, period thousands)
- Lead form success usa `alert()` em vez de toast porque o modal fechava antes do toast aparecer
