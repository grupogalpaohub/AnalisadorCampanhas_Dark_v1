# HTML único, sem servidor e sem bibliotecas

A V3 continua sendo um único HTML publicado no GitHub Pages, que processa os CSVs só no navegador. Gráficos e Funis são SVG feitos à mão e o PDF sai da impressão do navegador, com um layout A4 dedicado. Descartamos backend (dados de cliente nunca saem da máquina, e não há infraestrutura para manter), Chart.js ou ECharts (funis customizados ficam mais fáceis em SVG, e sem dependência externa) e jsPDF com html2canvas (geraria PDF como imagem, pesado e com texto sem nitidez).

## Consequences

O Perfil do Cliente fica só no navegador onde foi criado: trocar de computador significa recriá-lo.
