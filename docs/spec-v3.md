# Spec · Analisador de Campanhas V3

Vocabulário: ver [GLOSSARY.md](../GLOSSARY.md). Arquitetura: [ADR 0001](adr/0001-html-unico-sem-servidor.md). Referências visuais: [docs/design/referencias](design/referencias/README.md).

## Problema

A V2 analisa um CSV por vez. O gestor de tráfego não consegue ver a evolução entre Períodos e monta à mão o relatório mensal para o Cliente. A V3 compara vários Períodos e gera um Relatório bonito, em PDF, que o Cliente entende sem jargão.

## Solução

Subindo dois ou mais CSVs, a ferramenta monta um Comparativo na tela. O botão "Gerar relatório" abre uma prévia do Relatório (versão do Gestor ou do Cliente), com campos editáveis, e o "Exportar PDF" imprime em A4 com a identidade do Grupo Galpão. A tela de análise da V2, com um CSV só, continua igual.

## Histórias de usuário

1. Como gestor, subo vários CSVs de uma vez e cada um vira um Período, ordenado pelas datas de dentro do arquivo.
2. Como gestor, sou avisado se dois Períodos se sobrepõem, se falta um intervalo entre eles, ou se os CSVs parecem ser de plataformas ou de Clientes diferentes.
3. Como gestor, vejo a evolução do total, por Objetivo e por Campanha, com as Campanhas novas e encerradas marcadas.
4. Como gestor, defino o Período analisado e o Período de comparação. A ferramenta sugere "mês atual × mês anterior" quando os dois existem.
5. Como gestor, crio e escolho um Perfil do Cliente (nome, logo, Metas), que fica lembrado no navegador.
6. Como gestor, informo o Faturamento de um Período, que é opcional, para ver o ROAS.
7. Como gestor, clico em "Gerar relatório", escolho Gestor ou Cliente e vejo a prévia.
8. Como gestor, edito Manchetes e Destaques, escrevo o Comentário do Gestor e os Próximos Passos (cada um com um Pilar).
9. Como gestor, sou lembrado se o Relatório do Cliente for exportado sem Comentário.
10. Como gestor, exporto o PDF com nome sugerido `Cliente_Periodo.pdf`.
11. Como cliente, abro o PDF e entendo em segundos quanto investi, quanto voltou, quanto custou cada Resultado e se melhorou.
12. Como cliente, vejo o Funil do meu Objetivo e onde as pessoas se perdem.
13. Como cliente, vejo se as Metas foram atingidas.

## Decisões de implementação

### Leitura e montagem do Lote
- Cada CSV vira um Período usando `Reporting starts/ends` (Meta) ou o equivalente do Google. A ordem vem das datas, não do nome do arquivo.
- Um Lote só aceita uma plataforma. Se houver plataformas misturadas, o Lote é recusado com uma explicação.
- Se nenhum nome de Campanha se repetir entre os Períodos, a ferramenta avisa que os CSVs podem ser de Clientes diferentes (aviso, não bloqueio).
- Lacunas e sobreposições geram aviso. Nada é interpolado.
- O último Lote fica guardado no navegador (opcional, com try/catch).

### Motor de comparação (módulo puro, testável)
- Entrada: os Períodos lidos, o Período analisado, o Período de comparação e os ajustes de Objetivo. Saída: agregados por total, por Objetivo e por Campanha, com as variações.
- A Campanha é identificada pelo nome exato.
- O Resultado e o Custo por Resultado só são somados dentro do mesmo Objetivo. Não existe "Resultado total".
- No gráfico de evolução com granularidades misturadas, os volumes aparecem por dia.
- O Funil é montado por Objetivo a partir das colunas disponíveis. Uma etapa sem dado é omitida. Mostra a taxa entre etapas e a variação de cada etapa.
- O Objetivo continua sendo detectado como na V2 (indicador de resultado primeiro, nome da Campanha como plano B), e o ajuste manual por nome vale para todos os Períodos.
- Os Destaques são gerados por regras (maior variação do Custo por Resultado, Meta atingida ou não, Campanha que mais cresceu, etapa do Funil que mais piorou). Não usa IA.

### Perfil do Cliente
- Guarda nome, logo (data URL), Metas e ajustes de Objetivo no `localStorage`.
- Uma Meta tem: métrica, Objetivo, comparador (≤ / ≥) e valor.

### Relatório
- **Relatório do Cliente** (de 3 a 5 páginas A4):
  1. Capa dark com as marcas GG e do Cliente, o Período analisado e o selo Performance+.
  2. Resumo com 4 a 6 cards: número grande, selo ↑↓ e mini-gráfico.
  3. Funil por Objetivo, que é a página principal do Relatório.
  4. Evolução: gráfico de blocos ou de linhas.
  5. Top Campanhas.
  6. Metas: medidor semicircular.
  7. Comentário do Gestor e Próximos Passos por Pilar, com encerramento em fundo dark.
- **Relatório do Gestor**: tudo o que está no do Cliente, mais a tabela completa por Campanha, CPM, CTR, frequência, as recomendações da V2, o heatmap Campanha × dia (Custo por Resultado) e a rosca do Investimento por Objetivo.
- Cada página traz uma Manchete gerada automaticamente e editável, e um número herói.
- O PDF sai de `window.print()` com `@page A4`, quebras de página controladas e `print-color-adjust: exact`.
- O visual é híbrido: capa, aberturas e encerramento em dark marinho; as páginas de dados em desert `#FFFAF3`.

### Identidade visual
- Paleta: marinho `#00131D`/`#003F61`, azul `#45BDFE`, dourado `#E6C364`, desert `#FFFAF3`, sucesso `#5CE560`, alerta `#FF6B6B`.
- Fontes: Ubuntu nos títulos e números, Manrope no texto corrido.
- Gráficos em SVG feito à mão: Funil em gradiente do azul ao marinho com selos dourados entre as etapas, cards com mini-gráfico, barras em blocos, medidor semicircular, rosca e heatmap.
- O `DESIGN.md` sai do protótipo aprovado (ticket 1) e é a fonte da verdade visual para os demais tickets.

## Testes

- O motor de comparação é um módulo puro, testado com os CSVs reais (OffRio, ReCrie, Reformer) como fixtures locais, nunca commitados. Os testes cobrem a ordenação, as lacunas e sobreposições, Campanha nova ou encerrada, a regra de não somar Resultado entre Objetivos, as variações, o Funil com etapa faltante e as Metas.
- O parsing dos CSVs reaproveita os testes ou casos da V2.
- O PDF é validado visualmente pelo usuário antes do merge para a `main`, imprimindo do Chrome.

## Fora do escopo

- Juntar Meta e Google no mesmo Relatório (V4).
- Casar Campanhas renomeadas manualmente.
- Backend, login, compartilhamento por link, envio automático para o Cliente.
- Dados por hora ou por dispositivo.
- Texto gerado por IA.

## Tickets sugeridos (ordem e modelo)

1. **Protótipo visual do Relatório** com dados da OffRio, gerando o `DESIGN.md`. Opus + `/impeccable`. Bloqueia os tickets 6 a 8.
2. **Leitura do Lote**: vários CSVs, Períodos, ordenação, avisos. Sonnet.
3. **Motor de comparação**: agregados, variações, Campanha nova ou encerrada, com testes. Sonnet.
4. **Funil por Objetivo e Destaques** (regras), com testes. Sonnet.
5. **Perfil do Cliente, Metas e Faturamento.** Sonnet.
6. **Aba Comparativo** na tela (dark, padrão V2). Sonnet.
7. **Relatório do Cliente**: prévia, edição, componentes SVG e impressão A4. Sonnet seguindo o `DESIGN.md`.
8. **Relatório do Gestor**: páginas extras, heatmap e rosca. Sonnet.
9. **Revisão final**: `/code-review` no Opus, validação do PDF pelo usuário e merge `dev` → `main`.
