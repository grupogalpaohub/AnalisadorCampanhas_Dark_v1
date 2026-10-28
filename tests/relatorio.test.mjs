// Testes da geração do HTML do Relatório (estrutura e dados, sem NaN nem valores fixos). Rode: node --test tests/*.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lib, periodo, OFFRIO, RECRIE, REFORMER, comArquivo } from './_lib.mjs';

const { compararPeriodos, evolucao, funisDe, gerarDestaques, gerarManchetes, avaliarMetas, relatorioHTML, assembleLote, parseReport, sugerirComparacao } = lib;

// Mesmo que modeloRelatorio() na aplicação, sem estado
export function modelo(ps, { opts, metas = [], textos = {}, comentario = '', passos = [], versao = 'cliente', extra = {} } = {}) {
  const c = compararPeriodos(ps, opts || sugerirComparacao(ps));
  const evo = evolucao(ps);
  const funis = funisDe(c), aval = avaliarMetas(metas, c);
  return {
    versao, comp: c, evo, periods: ps, perfil: { nome: 'ReCrie', logo: null }, plataforma: 'meta', metas: aval, funis,
    destaques: gerarDestaques(c, { metas: aval, funis }), manchetes: gerarManchetes(c, { evo, metas: aval, funis }),
    textos, comentario, passos, nomeArquivo: 'ReCrie_Outubro-2026', ...extra
  };
}

const venda = (name, spend, o) => ({ name, spend, impressions: o.imp, clicks: o.clicks, lpv: o.lpv, atc: o.atc, checkout: o.checkout, purchases: o.purchases, value: o.purchases * 200, reach: o.imp / 2, indicator: 'actions:offsite_conversion.fb_pixel_purchase', results: o.purchases });
const msg = (name, spend, imp, clicks, conv) => ({ name, spend, impressions: imp, clicks, conv, results: conv, reach: imp / 3, indicator: 'actions:onsite_conversion.messaging_conversation_started_7d' });
const AGO = () => periodo('ago', '2026-08-01', '2026-08-31', [venda('Vendas', 1200, { imp: 50000, clicks: 1500, atc: 200, checkout: 100, purchases: 26 })]);
const SET = () => periodo('set', '2026-09-01', '2026-09-30', [venda('Vendas', 1400, { imp: 60000, clicks: 1700, atc: 300, checkout: 140, purchases: 42 }), msg('Zap', 300, 20000, 800, 150)]);
const OUT = () => periodo('out', '2026-10-01', '2026-10-31', [venda('Vendas', 1300, { imp: 68000, clicks: 1680, atc: 179, checkout: 120, purchases: 40 }), msg('Zap', 250, 20000, 900, 180), venda('Nova', 80, { imp: 4000, clicks: 100, purchases: 0 })]);
const pags = html => (html.match(/<section class="page/g) || []).length;

test('Relatório do Cliente: páginas, capa com o mês e Funil com os números reais da comparação', () => {
  const html = relatorioHTML(modelo([AGO(), SET(), OUT()], { comentario: 'Bom mês.', passos: [{ pilar: 'Dados', titulo: 'Medir', texto: 'Semana a semana.' }] }));
  assert.equal(pags(html), 6); // capa, resumo, 2 funis, evolução, encerramento
  assert.ok(!/NaN|undefined|\{\{n\}\}/.test(html));
  assert.match(html, /Relatório<br>de <span>Outubro<\/span>/);
  assert.match(html, /Performance\+/);
  assert.match(html, />72.000<\/text>/); // impressões do Funil
  assert.match(html, />40<\/text>/);
  assert.match(html, /Bom mês\./);
  assert.match(html, /<span class="pilar"><i><\/i>Dados<\/span>/);
  assert.match(html, /Até o próximo<br><span>Performance\+<\/span>/);
  // numeração das páginas
  assert.match(html, /<span>5<\/span><\/div>|<span>4<\/span><\/div>/);
});

test('Relatório: Comentário vazio vira lembrete na tela e some na impressão', () => {
  const html = relatorioHTML(modelo([SET(), OUT()]));
  assert.match(html, /class="comment vazio"/);
  assert.match(html, /@media print\{\.comment\.vazio,\.step\.vazio\{display:none\}/);
});

test('Relatório: Manchetes e Destaques editáveis, e o texto editado vale no lugar do automático', () => {
  const ps = [SET(), OUT()];
  const auto = relatorioHTML(modelo(ps));
  assert.match(auto, /data-edit="resumo"/);
  assert.match(auto, /data-edit="d\.custo-/);
  assert.match(auto, /<h2 class="headline" data-edit="resumo"[^>]*>O custo por compra [^<]*<em>/);
  const editado = relatorioHTML(modelo(ps, { textos: { resumo: 'Título [[novo]] do gestor', 'd.custo-mensagens': '' } }));
  assert.match(editado, /Título <em>novo<\/em> do gestor/);
  assert.ok(!editado.includes('data-edit="d.custo-mensagens"')); // texto vazio remove o Destaque
});

test('Relatório: texto do usuário é escapado', () => {
  const html = relatorioHTML(modelo([SET(), OUT()], { comentario: '<img src=x onerror=alert(1)>', textos: { resumo: '<b>x</b>' } }));
  assert.ok(!html.includes('<img src=x'));
  assert.ok(!html.includes('<b>x</b>'));
});

test('Relatório: Metas viram medidores; sem Metas não há página de Metas', () => {
  const ps = [SET(), OUT()];
  const sem = pags(relatorioHTML(modelo(ps)));
  const com = relatorioHTML(modelo(ps, { metas: [{ id: 'a', metrica: 'costPerResult', objetivo: 'ecommerce', comparador: '<=', valor: 40 }, { id: 'b', metrica: 'costPerResult', objetivo: 'mensagens', comparador: '<=', valor: 1 }] }));
  assert.equal(pags(com), sem + 1);
  assert.match(com, /Meta atingida/);
  assert.match(com, /Meta não atingida/);
  assert.match(com, /Custo por compra/);
  assert.match(com, /As Metas|1 de 2 Metas foram <em>atingidas<\/em>/);
});

test('Relatório: Funil omite etapa sem dado e Objetivo sem Funil não gera página de Funil', () => {
  const p = periodo('x', '2026-10-01', '2026-10-31', [venda('V', 500, { imp: 10000, clicks: 300, atc: 0, checkout: 0, purchases: 12 })]);
  const html = relatorioHTML(modelo([periodo('b', '2026-09-01', '2026-09-30', [venda('V', 400, { imp: 9000, clicks: 250, atc: 0, checkout: 0, purchases: 9 })]), p]));
  assert.ok(!html.includes('puseram no carrinho'));
  assert.match(html, /compraram/);
  const alc = periodo('al', '2026-10-01', '2026-10-31', [{ name: 'Rec', spend: 100, impressions: 9000, reach: 5000, indicator: 'reach', results: 5000 }]);
  const html2 = relatorioHTML(modelo([periodo('b', '2026-09-01', '2026-09-30', [{ name: 'Rec', spend: 90, impressions: 8000, reach: 4000, indicator: 'reach', results: 4000 }]), alc]));
  assert.ok(!/Funil de/.test(html2));
  assert.ok(!/NaN|undefined/.test(html2));
});

test('Relatório: sem Período de comparação não quebra', () => {
  const html = relatorioHTML(modelo([SET(), OUT()], { opts: { analisado: [1], comparacao: [] } }));
  assert.ok(!/NaN|undefined/.test(html));
  assert.match(html, /Comparado com<b>—<\/b>/);
});

test('CSVs reais: o Relatório sai completo, sem NaN, com os dados do Lote', comArquivo(OFFRIO && RECRIE && REFORMER, () => {
  const ps = assembleLote([OFFRIO, REFORMER, RECRIE].map((t, i) => ({ ...parseReport(t), fileName: ['offrio', 'reformer', 'recrie'][i] }))).periods;
  const html = relatorioHTML(modelo(ps, { comentario: 'x' }));
  assert.ok(pags(html) >= 4);
  assert.ok(!/NaN|undefined|Infinity|\{\{n\}\}/.test(html));
  assert.match(html, /Relatório<br>de <span>Outubro<\/span>/);
  assert.match(html, /1 a 19 out 2026/);
}));

// ---- Relatório do Gestor ----
const recs = [{ label: 'Vendas (site)', resumo: '1 campanha · R$ 1.300', recs: [{ priority: 'high', title: 'Poucos visitantes adicionam ao carrinho', area: '🖱️ Página de produto', desc: 'd', evidence: 'e', impact: '', steps: ['a', 'b'] }] }];

test('Gestor: acrescenta rosca, tabela completa, heatmap e recomendações ao Relatório do Cliente', () => {
  const ps = [AGO(), SET(), OUT()];
  const cliente = relatorioHTML(modelo(ps, { comentario: 'x' }));
  const gestor = relatorioHTML(modelo(ps, { comentario: 'x', versao: 'gestor', extra: { recs, overrides: {} } }));
  assert.equal(pags(gestor), pags(cliente) + 4);
  assert.ok(!/NaN|undefined|\{\{n\}\}/.test(gestor));
  assert.match(gestor, /Gestor \(técnica\)/);
  assert.match(gestor, /<circle [^>]*stroke-dasharray/); // rosca
  assert.match(gestor, /Tabela completa por campanha/);
  assert.match(gestor, /<th>CPM<\/th>/); assert.match(gestor, /<th>CTR<\/th>/); assert.match(gestor, /Freq\./);
  assert.match(gestor, /class="heat"/);
  assert.match(gestor, /Poucos visitantes adicionam ao carrinho/);
  // o Cliente não traz jargão técnico
  assert.ok(!/CPM|CTR|Frequência/.test(cliente.replace(/<style>[\s\S]*?<\/style>/, '')));
  // encerramento continua por último
  assert.ok(gestor.lastIndexOf('Até o próximo') > gestor.lastIndexOf('class="heat"'));
});

test('Gestor: tabela completa quebra em várias páginas e o heatmap vira diário quando o CSV tem dias', () => {
  const muitas = Array.from({ length: 30 }, (_, i) => venda('Campanha ' + i, 100 + i, { imp: 1000, clicks: 30, atc: 5, checkout: 3, purchases: 2 }));
  const ps = [periodo('s', '2026-09-01', '2026-09-30', muitas), periodo('o', '2026-10-01', '2026-10-31', muitas)];
  const g = relatorioHTML(modelo(ps, { versao: 'gestor', extra: { recs: [], overrides: {} } }));
  assert.match(g, /1 de 3/);
  assert.match(g, /Nenhuma etapa do Funil ficou/);
  const dias = periodo('d', '2026-10-01', '2026-10-03', [{ ...venda('V', 100, { imp: 1000, clicks: 30, purchases: 2 }), start: '2026-10-01', end: '2026-10-01' }, { ...venda('V', 90, { imp: 1000, clicks: 30, purchases: 3 }), start: '2026-10-02', end: '2026-10-02' }]);
  const gd = relatorioHTML(modelo([periodo('b', '2026-09-01', '2026-09-30', muitas.slice(0, 1)), dias], { versao: 'gestor', extra: { recs: [], overrides: {} } }));
  assert.match(gd, /campanha × dia/);
  assert.match(gd, /<th>01\/10<\/th>/);
});

test('CSVs reais: o Relatório do Gestor sai completo', comArquivo(OFFRIO && RECRIE && REFORMER, () => {
  const ps = assembleLote([OFFRIO, REFORMER, RECRIE].map((t, i) => ({ ...parseReport(t), fileName: ['offrio', 'reformer', 'recrie'][i] }))).periods;
  const html = relatorioHTML(modelo(ps, { comentario: 'x', versao: 'gestor', extra: { recs, overrides: {} } }));
  assert.ok(!/NaN|undefined|Infinity|\{\{n\}\}/.test(html));
  assert.match(html, /class="heat"/);
}));
