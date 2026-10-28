# Analisador de Campanhas · Grupo Galpão

Ferramenta de página única que lê o CSV de campanhas da **Meta Ads** ou do **Google Ads** e calcula métricas, funil e recomendações por tipo de campanha. Todo o processamento acontece no navegador; nenhum dado é enviado a servidor.

## Ambientes

| Ambiente | Branch | Endereço |
|---|---|---|
| Produção | `main` | https://grupogalpaohub.github.io/AnalisadorCampanhas_Dark_v1/ |
| Desenvolvimento | `dev` | https://grupogalpaohub.github.io/AnalisadorCampanhas_Dark_v1/dev/ |

O deploy é automático (GitHub Actions, `.github/workflows/pages.yml`) a cada push em `main` ou `dev`.

## Fluxo

1. Trabalhe na branch `dev` e confira em `/dev/`.
2. Quando estiver aprovado, faça merge de `dev` em `main` para publicar em produção.

## Arquivos

- `Grupo-Galpao-Analytics-v3.html`: o app (publicado como `index.html`); `Grupo-Galpao-Analytics-v2.html` fica como versão anterior.
- `Logo01-SLight.svg`: logo usado no topo.

CSVs de clientes ficam fora do repositório (`.gitignore`).
