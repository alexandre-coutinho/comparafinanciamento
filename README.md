# Compara Financiamento

Conjunto de ferramentas financeiras gratuitas: simulador PRICE vs SAC, conversor de moedas, calculadora de juros compostos, calculadora de porcentagem e comparador de investimentos.

## Funcionalidades

- **Simulador PRICE vs SAC** — Compare tabela PRICE (prestações fixas) e SAC (amortização constante) lado a lado com gráfico interativo
- **Conversor de Moedas** — Cotações em tempo real via AwesomeAPI, com gráfico dos últimos 30 dias
- **Juros Compostos** — Simule investimentos com aportes mensais, gráfico de evolução e tabela mês a mês
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
- AwesomeAPI (cotações)

## Páginas

| Página | Descrição |
|--------|-----------|
| `/` | Simulador Tabela PRICE vs Tabela SAC |
| `/conversor-moedas.html` | Conversor de moedas em tempo real |
| `/juros-compostos.html` | Calculadora de juros compostos com aportes |
| `/calculadora-de-porcentagem.html` | Calculadora de porcentagem com consumo de combustível |
| `/comparador-investimentos.html` | Comparador de investimentos (CDB, LCI, LCA, Tesouro, Ações) |

## Deploy

[https://comparafinanciamento.com.br/](https://comparafinanciamento.com.br/)
