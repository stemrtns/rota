# Diagrama de componentes

## V0 — arquitetura pretendida no enunciado

![Diagrama de componentes — arquitetura do enunciado](./imagens/componentes-v0.svg)

<details>
<summary>Fonte Mermaid da imagem</summary>

```mermaid
flowchart LR
  Cliente[Computador do cliente]
  Agentes[Computadores dos agentes]
  Navegador[Navegador web]
  Interface[Aplicação HTML, CSS, JavaScript e Bootstrap]
  Servidor[Servidor central]
  API[JSON Server — API REST]
  DB[(db.json)]

  Cliente --> Navegador
  Agentes --> Navegador
  Navegador --> Interface
  Interface -->|Fetch API / HTTP| Servidor
  Servidor --> API
  API --> DB
```
</details>

## V1 — componentes e conexões da implementação

![Diagrama de componentes — sistema revisado](./imagens/componentes-v1.svg)

<details>
<summary>Fonte Mermaid da imagem</summary>

```mermaid
flowchart LR
  Users[Cliente, agente, empresa ou banco]

  subgraph Browser["Navegador do usuário"]
    Pages[Pages HTML]
    Shared[partials HTML]
    App[app.js: estado, eventos e regras]
    ApiClient[api.js: cliente Fetch]
    Styles[styles.css e Bootstrap]
    LocalData[data/*.json e imagens locais]
    Pages --> App
    Shared --> App
    Styles --> Pages
    App --> LocalData
  end

  subgraph LocalServer["Node.js — localhost:3000"]
    JsonServer[JSON Server 0.17]
    StaticFiles[Serviço de arquivos estáticos]
    Database[(db.json)]
    JsonServer --> Database
  end

  App --> ApiClient
  ApiClient -->|HTTP JSON: users, clients, vehicles, requests| JsonServer
  Users -->|GET das páginas e arquivos| StaticFiles
  StaticFiles --> Pages

  CDN[CDNs: Bootstrap, Google Fonts e banner remoto]
  Pages -.->|recursos externos opcionais| CDN
```
</details>

### Revisão V0 → V1

- Substituído o servidor central genérico pela topologia executável: navegador,
  processo Node/JSON Server na porta 3000, arquivos estáticos e `db.json`.
- Mostrada a separação entre `app.js` e `api.js`, além dos dados JSON locais.
- Registradas as dependências externas de Bootstrap, Google Fonts e imagem do
  banner; a API e as fotos locais não dependem dessas CDNs.
- A comunicação é uma simulação local da arquitetura distribuída descrita no
  enunciado; não existe servidor remoto implantado no repositório.

## Correspondência com o código

| Componente | Arquivos |
| --- | --- |
| Páginas da interface | `index.html`, `veiculos.html`, `cadastro.html`, `solicitar.html`, `pedidos.html`, `analise.html`, `clientes.html`, `frota.html` |
| Componentes compartilhados | `partials/header.html`, `partials/footer.html`, `partials/modals.html` |
| Lógica da aplicação | `app.js` |
| Comunicação HTTP | `api.js` |
| Estilos e framework visual | `styles.css` e Bootstrap 5 via CDN |
| API e persistência de demonstração | JSON Server e `db.json` |
| Dados locais de catálogo | `data/municipalities.json`, `data/brazilian-cars.json`, `data/vehicle-photos.json`, `images/` |
