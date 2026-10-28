// Carrega a lógica pura do HTML (ADR 0001): extrai os trechos entre #testavel:inicio/fim e devolve tudo o que eles declaram.
// Os CSVs reais são lidos de fora do repositório e nunca copiados; sem eles, os testes que dependem deles são pulados.
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const html = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', 'Grupo-Galpao-Analytics-v3.html'), 'utf8');
const trechos = [...html.matchAll(/\/\/ #testavel:inicio[^\n]*\n([\s\S]*?)\/\/ #testavel:fim/g)].map(m => m[1]);
const codigo = trechos.join('\n');
const nomes = [...codigo.matchAll(/^(?:const|let|function)\s+(\w+)/gm)].map(m => m[1]);
export const lib = new Function(`${codigo}\nreturn { ${[...new Set(nomes)].join(', ')} };`)();

const DIR = process.env.GG_CSV_DIR || 'D:/00_Coding/01_Grupo Galpao/02_Ferramentas GG/01_Calculadora';
export const real = nome => {
  if (!existsSync(DIR)) return null;
  const f = readdirSync(DIR).find(x => x.normalize('NFC') === nome.normalize('NFC'));
  return f ? readFileSync(join(DIR, f), 'utf8') : null;
};
export const OFFRIO = real('OffRio---Anunciante-Campanhas-1-de-set-de-2026-30-de-set-de-2026.csv');
export const RECRIE = real('CA---ReCrie-Campanhas-1-de-out-de-2026-19-de-out-de-2026.csv');
export const REFORMER = real('Reformer-&-Co.-Campaigns-Sep-19-2026-Oct-18-2026.csv');
export const comArquivo = (txt, fn) => (txt ? fn : { skip: 'CSV real não encontrado em ' + DIR });

// CSV sintético da Meta (inglês, vírgula, ponto decimal). rows: objetos com name, spend, impressions e as colunas opcionais
const COLS = ['start', 'end', 'name', 'delivery', 'indicator', 'results', 'spend', 'impressions', 'reach', 'clicks', 'lpv', 'atc', 'checkout', 'purchases', 'value', 'conv', 'eng'];
const HEAD = ['Reporting starts', 'Reporting ends', 'Campaign name', 'Campaign delivery', 'Result indicator', 'Results', 'Amount spent (BRL)', 'Impressions', 'Reach', 'Link clicks', 'Landing page views', 'Adds to cart', 'Checkouts initiated', 'Purchases', 'Purchases conversion value', 'Messaging conversations started', 'Post engagements'];
export function csvMeta(start, end, rows) {
  const q = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
  return [HEAD.map(q).join(','), ...rows.map(r => COLS.map(c => q(c === 'start' ? r.start || start : c === 'end' ? r.end || end : c === 'delivery' ? r.delivery || 'active' : r[c])).join(','))].join('\n');
}
// Período pronto para o motor
export function periodo(fileName, start, end, rows) {
  return { ...lib.parseReport(csvMeta(start, end, rows)), fileName };
}
