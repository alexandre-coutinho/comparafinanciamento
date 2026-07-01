# Compara Financiamento

Conjunto de ferramentas financeiras gratuitas: simulador PRICE vs SAC, conversor de moedas, calculadora de juros compostos, calculadora de porcentagem, comparador de investimentos e mais.

## Funcionalidades

- **Simulador PRICE vs SAC** — Compare tabela PRICE (prestações fixas) e SAC (amortização constante) lado a lado com gráfico interativo
- **Conversor de Moedas** — Cotações em tempo real via AwesomeAPI, com gráfico dos últimos 30 dias
- **Juros Compostos** — Simule investimentos com aportes mensais, gráfico de evolução e tabela mês a mês
- **Comparador de Investimentos** — Compare CDB, LCI, LCA, Tesouro Direto e ações com IR descontado
- **Calculadora de Porcentagem** — 4 modalidades: % de, é quantos %, aumento, desconto
- **Conversor de Taxa de Juros** — Converta entre taxas diária, mensal e anual
- **Correção Monetária** — Corrija valores por IPCA, IGP-M, Poupança, SELIC e CDI
- **Consumo de Combustível** — Calcule km/l, litros usados e custo total
- **Conversor de Unidades** — Temperatura, distância e massa
- Exportação de tabela em PDF
- Cópia de tabela para área de transferência
- Sincronização automática entre taxa mensal e anual
- Captura de leads via formulário com envio para Telegram (Cloudflare Functions)
- Dados estruturados (FAQPage + WebApplication) para SEO

## Tecnologias

- HTML5 + CSS3 + JavaScript (vanilla)
- Chart.js 4.4.7
- jsPDF 2.5.1 + jspdf-autotable 3.8.4
- Font Awesome 6.5.1
- Cloudflare Functions (formulários)
- Cloudflare Pages (deploy + headers de segurança)
- AwesomeAPI (cotações)

## Páginas

| Página | Descrição |
|--------|-----------|
| `/` | Simulador Tabela PRICE vs Tabela SAC |
| `/conversor-moedas.html` | Conversor de moedas em tempo real |
| `/calculadoras.html` | Calculadoras: taxa de juros, correção monetária, porcentagem, juros compostos, consumo de combustível, conversor de unidades |
| `/comparador-investimentos.html` | Comparador de investimentos (CDB, LCI, LCA, Tesouro, Ações) |

## Segurança (Headers HTTP)

O arquivo `_headers` na raiz define os cabeçalhos de segurança enviados pelo Cloudflare Pages:

| Header | Valor | Finalidade |
|--------|-------|------------|
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains; preload` | Força HTTPS |
| `Content-Security-Policy` | Restritivo (apenas CDNs confiáveis) | Previne XSS e injeção |
| `X-Content-Type-Options` | `nosniff` | Bloqueia MIME sniffing |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Controla envio do Referer |

## Deploy

[https://comparafinanciamento.com.br/](https://comparafinanciamento.com.br/)