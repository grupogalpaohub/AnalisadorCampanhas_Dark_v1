# DESIGN.md · Relatório V3

Fonte da verdade visual do Relatório (Cliente e Gestor). Derivado do protótipo aprovado em [docs/design/prototipo-relatorio.html](docs/design/prototipo-relatorio.html) (issue #1). Na dúvida, copie o protótipo, não invente.

## Princípios

- **Híbrido dark/desert.** Capa e encerramento em marinho; páginas de dados em desert `#FFFAF3`.
- **Uma página, um achado.** Toda página tem uma Manchete (frase com o achado, não um rótulo) e um número herói.
- **Linguagem do Cliente.** "Viram um anúncio", "puseram no carrinho", "custo por compra". Nada de CPM, CTR ou frequência no Relatório do Cliente.
- **Dourado é sinal.** Só para taxas do Funil, Metas, selo Performance+, Pilares e o número final do Funil. Nunca como fundo de área grande.
- **Sem bibliotecas.** Gráficos em SVG à mão; fontes do Google Fonts (iguais à V2).

## Tokens

```css
:root{
  --navy:#00131D; --navy-2:#001A29; --aqua:#003F61; --aqua-light:#0D6DA0;
  --blue:#45BDFE; --blue-light:#89D5FE;
  --gold:#E6C364; --gold-ink:#8A6A12;          /* gold-ink: texto dourado sobre desert */
  --desert:#FFFAF3; --sand:#F4EBDD; --sand-line:#E7DCCB;
  --ink:#00131D; --ink-2:#3C5466; --ink-3:#6B8090;
  --r-lg:22px; --r-md:14px; --r-sm:8px;
  --page-pad:16mm;
}
```

| Uso | Cor |
|---|---|
| Fundo dark | `radial-gradient(120% 80% at 85% 0%, #0B3A57, --navy-2 45%, --navy)` |
| Texto secundário no dark | `#9DB4C4` / `#B9CCD9` / `#DCE7EE` (nunca cinza neutro) |
| Selo ↑ bom | fundo `#DDF3DE`, texto `#1F7A24` |
| Selo ↓ ruim | fundo `#FBE1E1`, texto `#A83232` |
| Ênfase na Manchete | `--aqua-light` no desert, `--gold` no dark |

"Bom" e "ruim" dependem da métrica: custo caindo é selo verde com seta ↓.

## Tipografia

- **Ubuntu** 700: Manchetes, números, títulos de painel, selos. Tracking -0.02em (capa -0.035em).
- **Manrope** 400–800: texto corrido, rótulos, tabelas. `font-variant-numeric: tabular-nums` no corpo.

| Papel | Tamanho |
|---|---|
| Título da capa | 46pt / 0.98 |
| Manchete | 25pt / 1.08, máx. 150mm, `text-wrap: balance` |
| Número herói | 50pt |
| Número de card | 22pt |
| Lede | 10.5pt / 1.5, máx. 140mm |
| Rótulo | 8–9pt, peso 700 |
| Rodapé | 8pt |

Números em formato pt-BR: `R$ 6.437,51`, `10,19×`, `19,4%`, `2,1 p.p.`, `65,6 mil`.

## Grid A4

- `.page`: 210×297mm, padding 16mm, flex coluna, `overflow:hidden`.
- Estrutura de página de dados: `.run` (marca + nome da seção) → Manchete → lede → conteúdo → `.foot` (empurrado com `margin-top:auto`, linha `--sand-line`, número da página).
- Espaçamentos em mm: 3, 4, 5, 6, 8, 9. Gap padrão entre cards: 5mm.
- Colunas usadas: resumo `1.25fr 1fr` (herói + pilha) e `1fr 1fr`; Funil `1fr 46mm`; Metas `1fr 1fr`.

## Componentes

**Capa (dark).** Logo GG (`Logo01-SLight.svg` embutido como `<symbol>`) à esquerda e logo do Cliente à direita, numa caixa translúcida. Arte do funil em camadas sangrando pela direita. Embaixo: selo Performance+ (contorno dourado, "+" num círculo dourado), título com o mês em `--blue`, lede de uma frase e uma faixa de meta-dados (Período analisado, Período de comparação, plataforma).

**Card herói.** Fundo `--navy`, `--r-lg`, número 50pt com unidade em dourado, selo ↑↓, gráfico de blocos no canto inferior direito, com a última barra em dourado.

**Card de KPI.** Fundo branco, borda `--sand-line`, `--r-md`. Grid: rótulo / número + mini-gráfico (70×26, linha `--blue` 2.5px com ponto final `--aqua`, ou blocos) / selo + contexto (Meta ou detalhe).

**Selo ↑↓.** Pílula 8.5pt com triângulo SVG (`#up` e `#down`). Variação em % ou p.p.

**Nota/Destaque.** Fundo `--sand`, `--r-md`, ícone circular dourado, "**Destaque.**" em negrito e o texto em seguida. Sem borda lateral colorida.

**Funil (peça principal).** SVG `viewBox 0 0 440 600`. Etapas em trapézio, altura 92 e intervalo 26, com largura decrescente em escala log (420 → 128). Cada etapa tem gradiente vertical próprio, numa rampa contínua `#45BDFE → #2FA3E3 → #1987C2 → #0D6DA0 → #035680 → #003F61`, e sombra suave (`feDropShadow dy4 σ5 18%`). Número em Ubuntu desert, com a última etapa em dourado. A legenda descreve a ação em linguagem do Cliente. **Selos dourados** (pílula 68×26 com a taxa) ficam na borda direita, entre as etapas; o último recebe contorno marinho. Rodapé com a taxa geral ("1 compra a cada N exibições"). Etapa sem dado é omitida, sem deixar buraco. Ao lado: caixa navy "Onde mais se perde" com a maior perda e taxas por etapa com selos ↑↓.

**Gráfico de blocos (evolução).** Quadradinhos de 11px, gap 3, `rx 3`, colunas de 3, cada bloco = N unidades (diga o N no lede). O Período de comparação vai em `--sand-line` à esquerda; o Período analisado em `--blue`, com o último em `--aqua`. Total em Ubuntu acima.

**Tabela de top Campanhas.** Posição num círculo navy com número dourado; nome em negrito, com tag de Objetivo e contexto embaixo e uma barra de participação (gradiente azul → aqua; Objetivo diferente em dourado). Colunas numéricas alinhadas à direita. O Resultado sempre leva unidade ("117 compras", "3.297 visitas").

**Medidor de Meta.** SVG `240×150`, arco r=90 com centro (120,125) e traço de 22, pontas arredondadas. Trilho `#F1E8DA`, preenchimento com o gradiente do Funil até o valor, marca da Meta em traço dourado com rótulo em `--gold-ink`, ponteiro navy com miolo dourado. Embaixo: número 28pt, leitura em uma frase ("13% abaixo do limite") e pílula "Meta atingida" (ou vermelha "Meta não atingida"). Ângulo = valor / máximo da escala × 180°.

**Encerramento (dark).** Manchete, Comentário do Gestor (12.5pt, a primeira linha em desert), assinatura em `--blue-light`, Próximos Passos em linhas translúcidas (`rgba(255,250,243,.045)`, borda azul 14%), com o Pilar em Ubuntu caixa-alta dourado, com ponto à esquerda. Fecha com "Até o próximo Performance+." e o logo GG.

## Impressão

```css
@page{size:A4;margin:0}
body{-webkit-print-color-adjust:exact;print-color-adjust:exact}
@media print{
  html,body{background:none}
  .page{margin:0;box-shadow:none;break-after:page}
  /* esconder toda UI de prévia/edição */
}
```

- Uma `.page` = uma folha. O conteúdo nunca transborda: se não couber, divida a página no gerador.
- Imprimir no Chrome com margens "Nenhuma" e gráficos de fundo ligados.
- Na tela, as páginas ficam sobre um fundo `#5b6872` com sombra, para simular as folhas.
- Fontes: aguarde `document.fonts.ready` antes de chamar `window.print()`.

## Ordem das páginas (Relatório do Cliente)

1. Capa · 2. Resumo · 3. Funil · 4. Evolução + top Campanhas · 5. Metas · 6. Encerramento. O Relatório do Gestor insere as páginas técnicas (tabela completa, heatmap, rosca) entre a 5 e a 6, com os mesmos componentes e tokens.
