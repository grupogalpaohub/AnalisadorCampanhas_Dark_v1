// Testes do Funil por Objetivo, dos Destaques e das Manchetes. Rode: node --test tests/*.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lib, periodo, OFFRIO, RECRIE, REFORMER, comArquivo } from './_lib.mjs';

const { compararPeriodos, montarFunil, funisDe, gerarDestaques, gerarManchetes, evolucao, numCurto, assembleLote, parseReport, sugerirComparacao } = lib;

const venda = (name, spend, o) => ({ name, spend, impressions: o.imp, clicks: o.clicks, lpv: o.lpv, atc: o.atc, checkout: o.checkout, purchases: o.purchases, value: (o.purchases || 0) * 200, indicator: 'actions:offsite_conversion.fb_pixel_purchase', results: o.purchases });
const msg = (name, spend, imp, clicks, conv) => ({ name, spend, impressions: imp, clicks, conv, results: conv, indicator: 'actions:onsite_conversion.messaging_conversation_started_7d' });

const SET = () => periodo('set', '2026-09-01', '2026-09-30', [venda('Vendas', 1000, { imp: 50000, clicks: 1500, atc: 400, checkout: 150, purchases: 30 }), msg('Zap', 300, 20000, 800, 150)]);
const OUT = () => periodo('out', '2026-10-01', '2026-10-31', [venda('Vendas', 1000, { imp: 60000, clicks: 1600, atc: 200, checkout: 120, purchases: 40 }), msg('Zap', 250, 20000, 900, 180)]);
const comp = () => compararPeriodos([SET(), OUT()], { analisado: [1], comparacao: [0] });

test('Funil de Vendas: etapas, taxa entre etapas e variação em p.p.', () => {
  const f = montarFunil(comp().objetivos.find(o => o.tipo === 'ecommerce').atual, comp().objetivos.find(o => o.tipo === 'ecommerce').base);
  assert.deepEqual(f.etapas.map(e => e.key), ['impressions', 'linkClicks', 'addToCart', 'checkout', 'purchases']);
  assert.deepEqual(f.etapas.map(e => e.valor), [60000, 1600, 200, 120, 40]);
  assert.equal(f.etapas[0].taxa, null);
  assert.equal(f.etapas[2].taxa, 12.5); // 200 / 1600
  assert.equal(f.etapas[2].taxaBase, (400 / 1500) * 100);
  assert.ok(Math.abs(f.etapas[2].varPP - (12.5 - (400 / 1500) * 100)) < 1e-9);
  assert.equal(f.geral, 1500); // 1 compra a cada 1.500 exibições
});

test('Funil omite a etapa sem dado, sem buraco', () => {
  const p = periodo('x', '2026-10-01', '2026-10-31', [venda('V', 500, { imp: 10000, clicks: 300, atc: 0, checkout: 0, purchases: 12 })]);
  const f = montarFunil(compararPeriodos([p], { analisado: [0], comparacao: [] }).objetivos[0].atual);
  assert.deepEqual(f.etapas.map(e => e.key), ['impressions', 'linkClicks', 'purchases']);
  assert.equal(f.etapas[2].taxa, 4); // 12 / 300
  assert.equal(f.maiorPerda.etapa.key, 'purchases');
});

test('Funil sem base não inventa variação; etapa só na atual não tem taxa de base', () => {
  const atual = periodo('a', '2026-10-01', '2026-10-31', [venda('V', 500, { imp: 10000, clicks: 300, atc: 50, checkout: 20, purchases: 12 })]);
  const base = periodo('b', '2026-09-01', '2026-09-30', [venda('V', 500, { imp: 10000, clicks: 300, atc: 0, checkout: 0, purchases: 9 })]);
  const o = compararPeriodos([base, atual], { analisado: [1], comparacao: [0] }).objetivos[0];
  const f = montarFunil(o.atual, o.base);
  const atc = f.etapas.find(e => e.key === 'addToCart');
  assert.equal(atc.varPP, null);
  assert.equal(f.etapas.find(e => e.key === 'purchases').taxaBase, null); // o passo anterior não existia na base
  const sem = montarFunil(o.atual, null);
  assert.ok(sem.etapas.every(e => e.varPP == null));
  assert.equal(sem.piorou, null);
});

test('Onde mais se perde ignora exibição → clique', () => {
  const o = comp().objetivos.find(x => x.tipo === 'ecommerce');
  const f = montarFunil(o.atual, o.base);
  assert.equal(f.maiorPerda.de.key, 'linkClicks');
  assert.equal(f.maiorPerda.etapa.key, 'addToCart');
  assert.equal(f.maiorPerda.perda, 87.5);
  assert.equal(f.piorou.etapa.key, 'addToCart');
});

test('Funil de Mensagens e Alcance; menos de 2 etapas não gera Funil', () => {
  const f = funisDe(comp());
  assert.deepEqual(f.mensagens.etapas.map(e => e.key), ['impressions', 'linkClicks', 'conversas']);
  const alcance = periodo('al', '2026-10-01', '2026-10-31', [{ name: 'Reconhecimento', spend: 100, impressions: 9000, reach: 5000, indicator: 'reach', results: 5000 }]);
  assert.deepEqual(funisDe(compararPeriodos([alcance], { analisado: [0], comparacao: [] })), {});
});

// ---- Destaques ----
test('Destaque: maior variação do Custo por Resultado', () => {
  const d = gerarDestaques(comp());
  const c = d.find(x => x.regra === 'custo');
  // vendas: 1000/30 = 33,33 -> 1000/40 = 25 (−25%) ; zap: 300/150 = 2 -> 250/180 = 1,39 (−31%)
  assert.equal(c.id, 'custo-mensagens');
  assert.match(c.texto, /Cada conversa custou R\$\s1,39 \(Mensagens\), 31% menos que em setembro\./);
});

test('Destaque: Meta atingida ou não, as não atingidas primeiro', () => {
  const d = gerarDestaques(comp(), { metas: [{ atingida: true, resumo: 'Meta A ok' }, { atingida: false, resumo: 'Meta B falhou' }, { atingida: null, resumo: 'sem dado' }] });
  assert.deepEqual(d.filter(x => x.regra === 'meta').map(x => x.texto), ['Meta B falhou', 'Meta A ok']);
});

test('Destaque: Campanha que mais cresceu e Campanha nova relevante', () => {
  const base = periodo('b', '2026-09-01', '2026-09-30', [venda('Vendas', 500, { imp: 1, clicks: 1, purchases: 5 }), venda('Outra', 500, { imp: 1, clicks: 1, purchases: 5 })]);
  const atual = periodo('a', '2026-10-01', '2026-10-31', [venda('Vendas', 900, { imp: 1, clicks: 1, purchases: 9 }), venda('Outra', 520, { imp: 1, clicks: 1, purchases: 5 })]);
  const d = gerarDestaques(compararPeriodos([base, atual], { analisado: [1], comparacao: [0] })).find(x => x.regra === 'campanha');
  assert.equal(d.id, 'campanha-cresceu');
  assert.match(d.texto, /“Vendas”.*80% a mais/);
  const nova = periodo('a2', '2026-10-01', '2026-10-31', [venda('Vendas', 500, { imp: 1, clicks: 1, purchases: 5 }), venda('Lançamento', 700, { imp: 1, clicks: 1, purchases: 7 })]);
  const dn = gerarDestaques(compararPeriodos([base, nova], { analisado: [1], comparacao: [0] })).find(x => x.regra === 'campanha');
  assert.equal(dn.id, 'campanha-nova');
  assert.match(dn.texto, /campanha nova “Lançamento” já responde por 58%/);
});

test('Destaque: etapa do Funil que mais piorou', () => {
  const d = gerarDestaques(comp()).find(x => x.regra === 'funil');
  assert.equal(d.id, 'funil-ecommerce');
  assert.match(d.texto, /Vendas \(site\).*puseram no carrinho piorou 14,2 p\.p\.: de 26,7% para 12,5%/);
});

test('Sem Período de comparação não há Destaque de variação', () => {
  const c = compararPeriodos([OUT()], { analisado: [0], comparacao: [] });
  assert.deepEqual(gerarDestaques(c).filter(x => x.regra !== 'meta'), []);
});

// ---- Manchetes ----
test('Manchetes: resumo, funil, evolução, metas', () => {
  const ps = [SET(), OUT()];
  const c = compararPeriodos(ps, { analisado: [1], comparacao: [0] });
  const m = gerarManchetes(c, { evo: evolucao(ps), metas: [{ atingida: true }, { atingida: true }] });
  assert.equal(m.resumo, 'O custo por compra caiu [[25%]] e o custo por conversa caiu [[31%]].');
  assert.equal(m.funil.ecommerce, 'De [[60 mil]] exibições a [[40]] compras.');
  assert.equal(m.evolucao, 'Em 2 períodos, compras foram de [[30]] para [[40]].');
  assert.equal(m.metas, 'As 2 Metas foram [[batidas]].');
  assert.match(m.encerramento, /\[\[Outubro\]\]/);
  assert.match(m.lede, /^Outubro investiu 3,8% menos que setembro\.$/);
});

test('Manchete do resumo: custo estável e sem comparação', () => {
  const est = periodo('e', '2026-10-01', '2026-10-31', [venda('Vendas', 1000, { imp: 60000, clicks: 1600, atc: 200, checkout: 120, purchases: 30 })]);
  const c = compararPeriodos([SET(), est], { analisado: [1], comparacao: [0] });
  assert.match(gerarManchetes(c).resumo, /^O custo por compra ficou estável em \[\[R\$ 33\]\]/);
  const so = compararPeriodos([OUT()], { analisado: [0], comparacao: [] });
  assert.match(gerarManchetes(so).resumo, /^Foram \[\[R\$ 1.250\]\] investidos e \[\[40\]\] compras chegaram\.$/);
});

test('Manchete de Metas: nenhuma, algumas, sem Metas', () => {
  const c = comp();
  assert.equal(gerarManchetes(c, { metas: [{ atingida: false }] }).metas, 'A Meta [[não foi atingida]] neste período.');
  assert.equal(gerarManchetes(c, { metas: [{ atingida: true }, { atingida: false }, { atingida: false }] }).metas, '1 de 3 Metas foram [[atingidas]].');
  assert.equal(gerarManchetes(c, { metas: [] }).metas, 'Metas do período.');
});

test('numCurto', () => {
  assert.equal(numCurto(67911), '67,9 mil');
  assert.equal(numCurto(60000), '60 mil');
  assert.equal(numCurto(9500), '9.500');
  assert.equal(numCurto(1200000), '1,2 mi');
  assert.equal(numCurto(40), '40');
});

test('CSVs reais: Funil e Destaques rodam sobre o Lote', comArquivo(OFFRIO && RECRIE && REFORMER, () => {
  const ps = assembleLote([OFFRIO, REFORMER, RECRIE].map((t, i) => ({ ...parseReport(t), fileName: ['offrio', 'reformer', 'recrie'][i] }))).periods;
  const c = compararPeriodos(ps, sugerirComparacao(ps));
  const funis = funisDe(c);
  for (const f of Object.values(funis)) {
    assert.ok(f.etapas.length >= 2);
    assert.ok(f.etapas.every(e => e.valor > 0));
  }
  const d = gerarDestaques(c, { funis });
  assert.ok(Array.isArray(d));
  const m = gerarManchetes(c, { evo: evolucao(ps), funis });
  assert.ok(m.resumo.length > 10 && !m.resumo.includes('NaN') && !m.resumo.includes('undefined'));
  assert.ok(!m.capa.includes('NaN'));
}));
