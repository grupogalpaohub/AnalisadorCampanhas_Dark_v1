// Testes do motor de comparação. Rode: node --test tests/*.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lib, periodo, OFFRIO, RECRIE, REFORMER, comArquivo } from './_lib.mjs';

const { compararPeriodos, evolucao, serieEvolucao, sugerirComparacao, variacao, assembleLote, parseReport, rotuloPeriodo, faixaTexto, matrizCustoPorResultado, resumirSelecao } = lib;

const venda = (name, spend, purchases, extra = {}) => ({ name, spend, impressions: spend * 40, clicks: spend * 1.5, lpv: spend, atc: purchases * 5, checkout: purchases * 3, purchases, value: purchases * 200, indicator: 'actions:offsite_conversion.fb_pixel_purchase', results: purchases, ...extra });
const msg = (name, spend, conv) => ({ name, spend, impressions: spend * 50, clicks: spend * 2, conv, results: conv, indicator: 'actions:onsite_conversion.messaging_conversation_started_7d' });

const SET = () => periodo('set.csv', '2026-09-01', '2026-09-30', [venda('Vendas A', 1000, 20), venda('Vendas B', 200, 2), msg('Msg X', 300, 150)]);
const OUT = () => periodo('out.csv', '2026-10-01', '2026-10-31', [venda('Vendas A', 900, 25), venda('Vendas C', 300, 6), msg('Msg X', 280, 160)]);

test('agrega por total, por Objetivo e por Campanha', () => {
  const r = compararPeriodos([SET(), OUT()], { analisado: [1], comparacao: [0] });
  const a = r.analisado;
  assert.equal(a.total.spend, 1480);
  assert.equal(a.porObjetivo.ecommerce.spend, 1200);
  assert.equal(a.porObjetivo.ecommerce.mainResult, 31);
  assert.equal(a.porObjetivo.mensagens.mainResult, 160);
  assert.equal(a.campanhas.length, 3);
  assert.equal(a.campanhas.find(c => c.nome === 'Vendas A').mainResult, 25);
});

test('nunca soma Resultado entre Objetivos', () => {
  const r = compararPeriodos([SET(), OUT()], { analisado: [1], comparacao: [0] });
  assert.equal(r.analisado.total.mainResult, null);
  assert.equal(r.analisado.total.costPerResult, null);
  assert.equal(r.total.mainResult.pct, null);
  assert.equal(r.total.costPerResult.pct, null);
  assert.equal(r.objetivos.find(o => o.tipo === 'ecommerce').atual.mainResult, 31);
});

test('variações: custo por Resultado caindo é bom', () => {
  const r = compararPeriodos([SET(), OUT()], { analisado: [1], comparacao: [0] });
  const v = r.objetivos.find(o => o.tipo === 'ecommerce').var;
  // set: 1200 / 22 ; out: 1200 / 31
  assert.ok(Math.abs(v.costPerResult.atual - 1200 / 31) < 1e-9);
  assert.equal(v.costPerResult.dir, 'down');
  assert.equal(v.costPerResult.bom, true);
  assert.ok(Math.abs(v.costPerResult.pct - ((1200 / 31) / (1200 / 22) - 1) * 100) < 1e-9);
  assert.equal(v.mainResult.dir, 'up');
  assert.equal(v.mainResult.bom, true);
  assert.equal(r.total.spend.dir, 'down'); // 1480 contra 1500
});

test('taxa varia em pontos percentuais', () => {
  const v = variacao(2.5, 3.0, 'ctr');
  assert.equal(v.pp, -0.5);
  assert.equal(v.bom, false);
});

test('Campanha nova ou encerrada é pelo nome exato', () => {
  const r = compararPeriodos([SET(), OUT()], { analisado: [1], comparacao: [0] });
  const est = n => r.campanhas.find(c => c.nome === n).estado;
  assert.equal(est('Vendas A'), 'mantida');
  assert.equal(est('Vendas B'), 'encerrada');
  assert.equal(est('Vendas C'), 'nova');
  const set = periodo('s', '2026-09-01', '2026-09-30', [venda('Vendas A', 100, 1)]);
  const out = periodo('o', '2026-10-01', '2026-10-31', [venda('Vendas A 2', 100, 1)]);
  const r2 = compararPeriodos([set, out], { analisado: [1], comparacao: [0] });
  assert.deepEqual(r2.campanhas.map(c => c.estado).sort(), ['encerrada', 'nova']);
});

test('ciclo da Campanha no Lote: nova a partir de um Período, encerrada antes do último', () => {
  const ps = [SET(), OUT(), periodo('nov', '2026-11-01', '2026-11-30', [venda('Vendas A', 100, 1)])];
  const r = compararPeriodos(ps, { analisado: [2], comparacao: [0, 1] });
  const c = n => r.campanhas.find(x => x.nome === n).ciclo;
  assert.equal(c('Vendas B').encerrada, true);
  assert.equal(c('Vendas B').nova, false);
  assert.equal(c('Vendas C').nova, true);
  assert.equal(c('Vendas C').encerrada, true);
  assert.equal(c('Vendas A').nova, false);
  assert.equal(c('Vendas A').encerrada, false);
});

test('Período analisado com vários Períodos soma tudo', () => {
  const r = compararPeriodos([SET(), OUT()], { analisado: [0, 1], comparacao: [] });
  assert.equal(r.comparacao, null);
  assert.equal(r.analisado.total.spend, 2980);
  assert.equal(r.analisado.dias, 61);
  assert.equal(r.campanhas.find(c => c.nome === 'Vendas A').atual.spend, 1900);
  assert.equal(r.campanhas.find(c => c.nome === 'Vendas A').estado, null);
});

test('durações muito diferentes comparam volumes por dia', () => {
  const set = periodo('s', '2026-09-01', '2026-09-30', [venda('V', 3000, 30)]);
  const parcial = periodo('o', '2026-10-01', '2026-10-15', [venda('V', 1500, 15)]);
  const r = compararPeriodos([set, parcial], { analisado: [1], comparacao: [0] });
  assert.equal(r.dias.porDia, true);
  assert.equal(r.total.spend.porDia, true);
  assert.equal(r.total.spend.dir, 'flat'); // 1500/15 = 100 por dia contra 3000/30 = 100 por dia
  assert.equal(r.total.cpm.porDia, false);
  const quase = periodo('q', '2026-10-01', '2026-10-28', [venda('V', 2800, 28)]);
  const r2 = compararPeriodos([set, quase], { analisado: [1], comparacao: [0] });
  assert.equal(r2.dias.porDia, false);
  assert.equal(r2.total.spend.porDia, false);
  assert.equal(r2.total.spend.dir, 'down');
});

test('evolução com granularidade mista mostra volumes por dia', () => {
  const ps = [periodo('a', '2026-09-01', '2026-09-30', [venda('V', 3000, 30)]), periodo('b', '2026-10-01', '2026-10-10', [venda('V', 1000, 10)])];
  const evo = evolucao(ps);
  assert.equal(evo.misto, true);
  const s = serieEvolucao(evo, 'total', 'spend');
  assert.equal(s.porDia, true);
  assert.deepEqual(s.pontos.map(p => p.valor), [100, 100]);
  const c = serieEvolucao(evo, 'ecommerce', 'costPerResult');
  assert.equal(c.porDia, false);
  assert.deepEqual(c.pontos.map(p => p.valor), [100, 100]);
  assert.equal(evolucao([SET(), OUT()]).misto, false);
});

test('sugere mês atual × mês anterior', () => {
  assert.deepEqual(sugerirComparacao([SET(), OUT()]), { analisado: [1], comparacao: [0], motivo: 'mes' });
  const meio = periodo('m', '2026-09-20', '2026-10-05', [venda('V', 1, 1)]);
  assert.deepEqual(sugerirComparacao([SET(), meio, periodo('o', '2026-10-06', '2026-10-31', [venda('V', 1, 1)])]).comparacao, [0]);
  const longe = sugerirComparacao([periodo('j', '2026-06-01', '2026-06-30', [venda('V', 1, 1)]), OUT()]);
  assert.equal(longe.motivo, 'anterior');
  assert.equal(sugerirComparacao([OUT()]), null);
});

test('o ajuste de Objetivo vale para todos os Períodos', () => {
  const r = compararPeriodos([SET(), OUT()], { analisado: [1], comparacao: [0], overrides: { 'Vendas A': 'trafego' } });
  assert.equal(r.campanhas.find(c => c.nome === 'Vendas A').atual.tipo, 'trafego');
  assert.equal(r.campanhas.find(c => c.nome === 'Vendas A').base.tipo, 'trafego');
  assert.equal(r.analisado.porObjetivo.ecommerce.mainResult, 6);
});

test('mesma Campanha detectada com Objetivos diferentes fica com um só (o da linha de maior Investimento)', () => {
  const a = periodo('a', '2026-09-01', '2026-09-30', [venda('Z', 900, 9)]);
  const b = periodo('b', '2026-10-01', '2026-10-31', [{ name: 'Z', spend: 100, impressions: 5000, clicks: 100, lpv: 80, indicator: 'link_click', results: 80 }]);
  const r = compararPeriodos([a, b], { analisado: [0, 1], comparacao: [] });
  assert.equal(r.campanhas.find(c => c.nome === 'Z').tipo, 'ecommerce');
  assert.equal(Object.keys(r.analisado.porObjetivo).length, 1);
});

test('Faturamento manual habilita o ROAS do total, só se todos os Períodos da seleção têm valor', () => {
  const ps = [SET(), OUT()];
  const r = compararPeriodos(ps, { analisado: [1], comparacao: [0], faturamento: { '2026-10-01_2026-10-31': 5000, '2026-09-01_2026-09-30': 3000 } });
  assert.equal(r.analisado.total.roas, 5000 / 1480);
  assert.equal(r.total.roas.dir, 'up');
  const parcial = compararPeriodos(ps, { analisado: [1], comparacao: [0], faturamento: { '2026-10-01_2026-10-31': 5000 } });
  assert.equal(parcial.analisado.total.roas, 5000 / 1480);
  assert.equal(parcial.total.roas.pct, null);
  assert.equal(compararPeriodos(ps, { analisado: [0, 1], comparacao: [], faturamento: { '2026-10-01_2026-10-31': 5000 } }).analisado.total.roas, null);
  const sem = compararPeriodos(ps, { analisado: [1], comparacao: [0] });
  assert.equal(sem.analisado.total.roas, null);
  assert.equal(sem.analisado.porObjetivo.ecommerce.roas, (31 * 200) / 1200);
});

test('ignora Campanhas sem investimento nem impressões, salvo se pedido', () => {
  const p = periodo('x', '2026-10-01', '2026-10-31', [venda('V', 100, 1), { name: 'Parada', spend: 0, impressions: 0 }]);
  assert.equal(compararPeriodos([p], { analisado: [0], comparacao: [] }).analisado.campanhas.length, 1);
  assert.equal(compararPeriodos([p], { analisado: [0], comparacao: [], ignorarZero: false }).analisado.campanhas.length, 2);
});

test('rótulos de Período', () => {
  assert.equal(rotuloPeriodo({ start: '2026-09-01', end: '2026-09-30' }), 'Set/2026');
  assert.equal(rotuloPeriodo({ start: '2026-10-01', end: '2026-10-19' }), '1 a 19 out 2026');
  assert.equal(rotuloPeriodo({ start: '2026-09-19', end: '2026-10-18' }), '19 set a 18 out 2026');
  assert.equal(faixaTexto('2026-12-30', '2027-01-05'), '30 dez 2026 a 5 jan 2027');
});

test('matriz Campanha × Período; com quebra por dia, as colunas viram dias', () => {
  const m = matrizCustoPorResultado([SET(), OUT()]);
  assert.equal(m.diario, false);
  assert.deepEqual(m.rotulos, ['Set/2026', 'Out/2026']);
  assert.deepEqual(m.linhas.find(l => l.nome === 'Vendas A').valores, [50, 36]);
  assert.equal(m.linhas.find(l => l.nome === 'Vendas B').valores[1], null);
  const dias = periodo('d', '2026-10-01', '2026-10-03', [
    { ...venda('V', 100, 2), start: '2026-10-01', end: '2026-10-01' }, { ...venda('V', 90, 3), start: '2026-10-02', end: '2026-10-02' }, { ...venda('V', 50, 1), start: '2026-10-03', end: '2026-10-03' }]);
  const md = matrizCustoPorResultado([dias]);
  assert.equal(md.diario, true);
  assert.deepEqual(md.rotulos, ['2026-10-01', '2026-10-02', '2026-10-03']);
  assert.deepEqual(md.linhas[0].valores, [50, 30, 50]);
});

// ---- CSVs reais ----
const lotePeriodos = () => assembleLote([OFFRIO, REFORMER, RECRIE].map((t, i) => ({ ...parseReport(t), fileName: ['offrio', 'reformer', 'recrie'][i] }))).periods;

test('CSVs reais: o total fecha com a soma dos Objetivos e das Campanhas', comArquivo(OFFRIO && RECRIE && REFORMER, () => {
  const ps = lotePeriodos();
  assert.deepEqual(ps.map(p => p.fileName), ['offrio', 'reformer', 'recrie']);
  for (let i = 0; i < ps.length; i++) {
    const a = resumirSelecao(ps, [i]);
    assert.ok(a.total.spend > 0, 'investimento > 0 em ' + ps[i].fileName);
    const soma = Object.values(a.porObjetivo).reduce((s, o) => s + o.spend, 0);
    assert.ok(Math.abs(soma - a.total.spend) < 1e-6);
    assert.ok(Math.abs(a.campanhas.reduce((s, c) => s + c.spend, 0) - a.total.spend) < 1e-6);
    assert.equal(a.total.mainResult, null);
  }
}));

test('CSVs reais: a comparação sugerida roda e as variações são coerentes', comArquivo(OFFRIO && RECRIE && REFORMER, () => {
  const ps = lotePeriodos();
  const sug = sugerirComparacao(ps);
  assert.equal(ps[sug.analisado[0]].fileName, 'recrie');
  const r = compararPeriodos(ps, { ...sug });
  assert.equal(r.dias.porDia, true); // 19 dias contra 30
  assert.ok(r.objetivos.length >= 1);
  assert.ok(r.campanhas.some(c => c.estado === 'nova') && r.campanhas.some(c => c.estado === 'encerrada'));
  const evo = evolucao(ps);
  assert.equal(evo.misto, true);
  assert.equal(evo.periodos.length, 3);
}));
