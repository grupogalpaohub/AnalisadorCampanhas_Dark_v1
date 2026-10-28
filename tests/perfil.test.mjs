// Testes do Perfil do Cliente e das Metas. Rode: node --test tests/*.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lib, periodo } from './_lib.mjs';

const { normalizarPerfil, normalizarPerfis, avaliarMeta, avaliarMetas, escalaMedidor, compararPeriodos, gerarDestaques } = lib;

const venda = (name, spend, purchases) => ({ name, spend, impressions: 10000, clicks: 300, purchases, value: purchases * 100, indicator: 'actions:offsite_conversion.fb_pixel_purchase', results: purchases });
const comp = (fat) => compararPeriodos([periodo('s', '2026-09-01', '2026-09-30', [venda('V', 400, 10)]), periodo('o', '2026-10-01', '2026-10-31', [venda('V', 1328, 40)])],
  { analisado: [1], comparacao: [0], faturamento: fat });

test('Meta de Custo por Resultado: atingida com folga e leitura', () => {
  const r = avaliarMeta({ metrica: 'costPerResult', objetivo: 'ecommerce', comparador: '<=', valor: 40 }, comp());
  assert.equal(r.valor, 33.2);
  assert.equal(r.atingida, true);
  assert.equal(r.leitura, '17% abaixo do limite');
  assert.equal(r.nome, 'Custo por compra');
  assert.equal(r.metaTxt, 'até R$ 40,00');
  assert.equal(r.max, 60);
  assert.match(r.resumo, /^Meta atingida: custo por compra de R\$\s33,20 \(até R\$\s40,00\)\.$/);
});

test('Meta não atingida', () => {
  const r = avaliarMeta({ metrica: 'costPerResult', objetivo: 'ecommerce', comparador: '<=', valor: 30 }, comp());
  assert.equal(r.atingida, false);
  assert.equal(r.leitura, '11% acima do limite');
  assert.match(r.resumo, /^Meta não atingida/);
});

test('Meta de ROAS: do Objetivo vem do CSV; do total precisa do Faturamento', () => {
  const doObjetivo = avaliarMeta({ metrica: 'roas', objetivo: 'ecommerce', comparador: '>=', valor: 2 }, comp());
  assert.equal(doObjetivo.valor, 4000 / 1328);
  assert.equal(doObjetivo.atingida, true);
  const meta = { metrica: 'roas', objetivo: 'total', comparador: '>=', valor: 8 };
  assert.equal(avaliarMeta(meta, comp()), null); // sem Faturamento, sem ROAS do total
  const r = avaliarMeta(meta, comp({ '2026-10-01_2026-10-31': 10732 }));
  assert.ok(Math.abs(r.valor - 10732 / 1328) < 1e-9);
  assert.equal(r.atingida, true);
  assert.equal(r.leitura, '1% acima do mínimo');
});

test('Meta de métrica sem dado ou Resultado do total some da lista', () => {
  assert.equal(avaliarMeta({ metrica: 'costPerResult', objetivo: 'total', comparador: '<=', valor: 5 }, comp()), null);
  assert.equal(avaliarMeta({ metrica: 'costPerResult', objetivo: 'mensagens', comparador: '<=', valor: 5 }, comp()), null);
  assert.equal(avaliarMetas([{ metrica: 'costPerResult', objetivo: 'ecommerce', comparador: '<=', valor: 40 }, { metrica: 'costPerResult', objetivo: 'total', comparador: '<=', valor: 5 }], comp()).length, 1);
});

test('Metas viram Destaques', () => {
  const c = comp();
  const metas = avaliarMetas([{ metrica: 'costPerResult', objetivo: 'ecommerce', comparador: '<=', valor: 30 }], c);
  assert.ok(gerarDestaques(c, { metas }).some(d => d.regra === 'meta' && /não atingida/.test(d.texto)));
});

test('escala do medidor', () => {
  assert.equal(escalaMedidor(33.2, 40), 60);
  assert.equal(escalaMedidor(8.08, 8), 15);
  assert.equal(escalaMedidor(0, 0), 1);
});

test('Perfil: normaliza e descarta o que está estragado (sobrevive a um recarregamento)', () => {
  const salvo = JSON.stringify({
    atual: 'a', lista: [
      { id: 'a', nome: 'ReCrie', logo: 'data:image/png;base64,AAA', metas: [
        { id: 'm1', metrica: 'costPerResult', objetivo: 'ecommerce', comparador: '<=', valor: 40 },
        { metrica: 'inexistente', objetivo: 'ecommerce', comparador: '<=', valor: 1 },
        { metrica: 'roas', objetivo: 'total', comparador: '!=', valor: 1 },
        { metrica: 'roas', objetivo: 'total', comparador: '>=', valor: 'x' }],
        ajustes: { 'Camp A': 'mensagens', 'Camp B': 'naoexiste' }, faturamento: { '2026-10-01_2026-10-31': 10732, ruim: 'x', neg: -3 } },
      { id: 'a', nome: 'duplicado' }, null]
  });
  const r = normalizarPerfis(JSON.parse(salvo));
  assert.equal(r.lista.length, 2);
  assert.equal(r.lista.filter(p => p.id === 'a').length, 1);
  const p = r.lista[0];
  assert.equal(p.nome, 'ReCrie');
  assert.equal(p.logo, 'data:image/png;base64,AAA');
  assert.deepEqual(p.metas.map(m => m.id), ['m1']);
  assert.deepEqual(p.ajustes, { 'Camp A': 'mensagens' });
  assert.deepEqual(p.faturamento, { '2026-10-01_2026-10-31': 10732 });
  // ida e volta pelo JSON: igual
  assert.deepEqual(normalizarPerfis(JSON.parse(JSON.stringify(r))), r);
});

test('Perfil: logo que não é imagem em data URL é ignorado; lixo vira Perfil vazio', () => {
  assert.equal(normalizarPerfil({ logo: 'https://x/y.png' }).logo, null);
  assert.equal(normalizarPerfil(null).nome, 'Cliente');
  assert.deepEqual(normalizarPerfis(null), { atual: null, lista: [] });
  assert.equal(normalizarPerfis({ atual: 'nao-existe', lista: [{ id: 'z', nome: 'Z' }] }).atual, 'z');
});
