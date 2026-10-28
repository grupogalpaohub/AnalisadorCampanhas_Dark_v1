# Analisador de Campanhas · Grupo Galpão

Ferramenta que lê exportações de campanhas da Meta Ads ou do Google Ads, compara períodos e gera relatórios para o gestor de tráfego e para o cliente.

## Cliente

**Cliente**:
Empresa atendida pelo Grupo Galpão cujas campanhas são analisadas (ex.: OffRio).
_Avoid_: Conta, anunciante

**Perfil do Cliente**:
O que se lembra de um Cliente entre usos: nome, logo, Metas e ajustes de Objetivo.
_Avoid_: Cadastro, configuração

**Meta**:
Alvo numérico do Cliente para uma métrica num Período analisado (ex.: Custo por Resultado ≤ R$ 5).
_Avoid_: Objetivo, KPI, target

## Dados

**Período**:
Intervalo de datas coberto por um CSV, dado por `Reporting starts` e `Reporting ends`.
_Avoid_: Arquivo, dia, upload

**Lote**:
Conjunto de CSVs de um mesmo Cliente e plataforma subidos juntos.
_Avoid_: Pacote, upload

**Campanha**:
Campanha de anúncios identificada pelo nome exato; nome diferente é outra Campanha.

**Campanha nova / encerrada**:
Campanha que aparece só a partir de, ou só até, certo Período do Lote.

**Objetivo**:
O que a Campanha busca (Vendas, Mensagens, Engajamento, Tráfego…), que define seu Resultado e seu Funil.
_Avoid_: Tipo de campanha, categoria

**Resultado**:
O evento principal do Objetivo da Campanha (mensagem, compra, clique…). Só se soma dentro do mesmo Objetivo.
_Avoid_: Conversão (genérico)

**Custo por Resultado**:
Investimento dividido pelo Resultado, sempre dentro de um Objetivo.

**Investimento**:
Valor gasto em anúncios no Período.
_Avoid_: Gasto, verba, budget

**Faturamento**:
Receita do Período informada manualmente pelo gestor; habilita o ROAS.

**Funil**:
Sequência de etapas de um Objetivo (ex.: Impressões → Alcance → Contatos) com a taxa entre cada etapa.

## Análise

**Comparativo**:
Análise na tela da evolução entre os Períodos de um Lote.
_Avoid_: Relatório (quando é só a tela)

**Período analisado**:
O intervalo que o Relatório cobre, formado por um ou mais Períodos.

**Período de comparação**:
O intervalo que serve de base para as variações ↑↓ do Período analisado.
_Avoid_: Período anterior (nem sempre é o imediatamente anterior)

## Relatório

**Relatório**:
Documento gerado a partir de um Comparativo para exportar em PDF.
_Avoid_: Dashboard, comparativo

**Relatório do Gestor** / **Relatório do Cliente**:
As duas versões do Relatório: a técnica, completa; e a executiva, sem jargão.

**Manchete**:
Frase-título de uma página do Relatório que resume o achado.

**Destaque**:
Achado gerado automaticamente a partir dos dados, editável pelo gestor.
_Avoid_: Insight

**Comentário do Gestor**:
Texto livre do gestor com a leitura do Período.

**Próximo Passo**:
Ação recomendada, etiquetada com um Pilar.
_Avoid_: Recomendação (essa é a sugestão automática da análise)

**Pilar**:
Um dos cinco eixos do método Performance+: Dados, Criativos, Canais/CRO, Retenção, Metas S.M.A.R.T.
