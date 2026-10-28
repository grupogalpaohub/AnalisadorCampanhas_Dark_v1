// Testes da leitura e montagem do Lote. Rode: node --test tests/
// A lógica pura mora no HTML (ADR 0001); aqui extraímos os trechos entre #testavel:inicio/fim.
// Os CSVs reais são lidos de fora do repositório e nunca copiados; sem eles, os testes que dependem deles são pulados.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const html = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', 'Grupo-Galpao-Analytics-v2.html'), 'utf8');
const trechos = [...html.matchAll(/\/\/ #testavel:inicio[^\n]*\n([\s\S]*?)\/\/ #testavel:fim/g)].map(m => m[1]);
assert.ok(trechos.length >= 3, 'trechos testáveis não encontrados no HTML');
const lib = new Function(`${trechos.join('\n')}\nreturn { parseDateRange, parseReport, assembleLote, parseCSV, parseNumber };`)();
const { parseDateRange, parseReport, assembleLote } = lib;

const DIR = process.env.GG_CSV_DIR || 'D:/00_Coding/01_Grupo Galpao/02_Ferramentas GG/01_Calculadora';
// Compara nomes normalizados: no Windows o acento do nome pode vir decomposto (NFD)
const real = nome => {
  if (!existsSync(DIR)) return null;
  const f = readdirSync(DIR).find(x => x.normalize('NFC') === nome.normalize('NFC'));
  return f ? readFileSync(join(DIR, f), 'utf8') : null;
};
const OFFRIO = real('OffRio---Anunciante-Campanhas-1-de-set-de-2026-30-de-set-de-2026.csv');
const RECRIE = real('CA---ReCrie-Campanhas-1-de-out-de-2026-19-de-out-de-2026.csv');
const REFORMER = real('Reformer-&-Co.-Campaigns-Sep-19-2026-Oct-18-2026.csv');
const GOOGLE = real('Relatório de campanha.csv');
const comArquivo = (txt, fn) => (txt ? fn : { skip: 'CSV real não encontrado em ' + DIR });

const P = (fileName, start, end, platform = 'meta', campaignNames = ['A']) => ({ fileName, start, end, platform, campaignNames });

test('parseDateRange: pt-BR, inglês e ISO', () => {
  assert.deepEqual(parseDateRange('1 de outubro de 2026 - 19 de outubro de 2026'), { start: '2026-10-01', end: '2026-10-19' });
  assert.deepEqual(parseDateRange('Oct 1, 2026 - Oct 19, 2026'), { start: '2026-10-01', end: '2026-10-19' });
  assert.deepEqual(parseDateRange('2026-09-19'), { start: '2026-09-19', end: '2026-09-19' });
  assert.equal(parseDateRange('Relatório de campanha'), null);
});

test('assembleLote ordena pelas datas, não pela ordem dos arquivos', () => {
  const r = assembleLote([P('b', '2026-10-01', '2026-10-31'), P('a', '2026-09-01', '2026-09-30')]);
  assert.deepEqual(r.periods.map(p => p.fileName), ['a', 'b']);
  assert.deepEqual(r.warnings.filter(w => w.type !== 'client'), []);
});

test('assembleLote recusa plataformas misturadas', () => {
  const r = assembleLote([P('m', '2026-09-01', '2026-09-30'), P('g', '2026-10-01', '2026-10-31', 'google')]);
  assert.match(r.error, /uma plataforma só/);
  assert.equal(r.periods.length, 0);
});

test('assembleLote avisa sobreposição e lacuna', () => {
  const sob = assembleLote([P('a', '2026-09-01', '2026-09-30'), P('b', '2026-09-30', '2026-10-31')]);
  assert.deepEqual(sob.warnings.map(w => w.type), ['overlap']);
  const lac = assembleLote([P('a', '2026-09-01', '2026-09-30'), P('b', '2026-10-02', '2026-10-31')]);
  assert.deepEqual(lac.warnings.map(w => w.type), ['gap']);
  const colado = assembleLote([P('a', '2026-09-01', '2026-09-30'), P('b', '2026-10-01', '2026-10-31')]);
  assert.deepEqual(colado.warnings, []);
});

test('assembleLote avisa possível Cliente diferente só quando nenhum nome se repete', () => {
  const dif = assembleLote([P('a', '2026-09-01', '2026-09-30', 'meta', ['X']), P('b', '2026-10-01', '2026-10-31', 'meta', ['Y'])]);
  assert.equal(dif.warnings.filter(w => w.type === 'client').length, 2);
  const igual = assembleLote([P('a', '2026-09-01', '2026-09-30', 'meta', ['X', 'Z']), P('b', '2026-10-01', '2026-10-31', 'meta', ['Y', 'X'])]);
  assert.equal(igual.warnings.filter(w => w.type === 'client').length, 0);
});

test('um CSV só: Lote de um Período, sem avisos', () => {
  const r = assembleLote([P('a', '2026-09-01', '2026-09-30')]);
  assert.equal(r.periods.length, 1);
  assert.deepEqual(r.warnings, []);
});

test('Meta pt-BR (OffRio)', comArquivo(OFFRIO, () => {
  const p = parseReport(OFFRIO);
  assert.equal(p.platform, 'meta');
  assert.deepEqual([p.start, p.end], ['2026-09-01', '2026-09-30']);
  assert.ok(p.dataRows.length > 50 && p.campaignNames.length > 0);
}));

test('Meta pt-BR (ReCrie)', comArquivo(RECRIE, () => {
  const p = parseReport(RECRIE);
  assert.deepEqual([p.platform, p.start, p.end], ['meta', '2026-10-01', '2026-10-19']);
}));

test('Meta em inglês (Reformer)', comArquivo(REFORMER, () => {
  const p = parseReport(REFORMER);
  assert.deepEqual([p.platform, p.start, p.end], ['meta', '2026-09-19', '2026-10-18']);
}));

test('Google Ads: período vem da linha de título', comArquivo(GOOGLE, () => {
  const p = parseReport(GOOGLE);
  assert.deepEqual([p.platform, p.start, p.end], ['google', '2026-10-01', '2026-10-19']);
  assert.ok(p.dataRows.every(r => !/^total:/i.test(r[0])));
}));

test('Lote real: OffRio + ReCrie + Reformer ordenados, sem aviso de plataforma', comArquivo(OFFRIO && RECRIE && REFORMER, () => {
  const mk = (n, t) => ({ ...parseReport(t), fileName: n });
  const r = assembleLote([mk('recrie', RECRIE), mk('offrio', OFFRIO), mk('reformer', REFORMER)]);
  assert.equal(r.error, null);
  assert.deepEqual(r.periods.map(p => p.fileName), ['offrio', 'reformer', 'recrie']);
  // Clientes diferentes de verdade: nenhum nome em comum
  assert.equal(r.warnings.filter(w => w.type === 'client').length, 3);
  assert.ok(r.warnings.some(w => w.type === 'overlap'));
}));

test('Meta + Google reais são recusados', comArquivo(OFFRIO && GOOGLE, () => {
  const r = assembleLote([{ ...parseReport(OFFRIO), fileName: 'm' }, { ...parseReport(GOOGLE), fileName: 'g' }]);
  assert.match(r.error, /Meta Ads e Google Ads/);
}));

test('CSV sem datas é recusado com mensagem clara', () => {
  const csv = 'Campaign name,Amount spent (BRL),Impressions\nX,10,100\n';
  assert.throws(() => parseReport(csv), /datas/);
});
