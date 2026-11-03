# Diagrama de pacotes — visão lógica

## V0 — decomposição dos subsistemas do enunciado

![Diagrama de pacotes — requisitos originais](./imagens/pacotes-v0.svg)

<details>
<summary>Fonte Mermaid da imagem</summary>

```mermaid
flowchart TB
  subgraph Gestao["Gestão de pedidos e contratos"]
    Cliente[Cadastro do cliente]
    Pedido[Pedido de aluguel]
    Avaliacao[Avaliação financeira]
    Credito[Contrato de crédito]
    Automovel[Dados dos automóveis]
  end

  subgraph Web["Construção dinâmica das páginas web"]
    Interface[Interface HTML e Bootstrap]
    Logica[Comportamento em JavaScript]
  end

  subgraph Persistencia["Persistência e comunicação"]
    API[API REST simulada]
    Dados[(db.json)]
  end

  Interface --> Logica
  Logica --> Cliente
  Logica --> Pedido
  Logica --> Avaliacao
  Logica --> Automovel
  Logica --> API
  API --> Dados
  Pedido --> Avaliacao
  Avaliacao --> Credito
  Pedido --> Automovel
```
</details>

## V1 — pacotes observados no repositório

![Diagrama de pacotes — sistema revisado](./imagens/pacotes-v1.svg)

<details>
<summary>Fonte Mermaid da imagem</summary>

```mermaid
flowchart TB
  subgraph Apresentacao["Apresentação — páginas HTML"]
    Inicio[index.html]
    Catalogo[veiculos.html]
    Cadastro[cadastro.html]
    Solicitar[solicitar.html]
    Pedidos[pedidos.html]
    Analise[analise.html]
    Clientes[clientes.html]
    Frota[frota.html]
    Partials[partials: header, footer e modais]
    Estilos[styles.css + Bootstrap]
  end

  subgraph Aplicacao["Aplicação no navegador — app.js"]
    Estado[Estado e sessão local]
    Navegacao[Rotas e permissões de interface]
    Dominio[Validações e regras de negócio]
    Renderizacao[Renderização e eventos]
  end

  subgraph Integracao["Integração — api.js"]
    Fetch[Cliente Fetch]
  end

  subgraph Servicos["Servidor local — JSON Server"]
    Rest[API REST]
    Static[Arquivos estáticos]
  end

  subgraph Dados["Dados"]
    DB[(db.json: users, clients, vehicles, requests)]
    Catalogos[data/*.json: municípios, veículos e fotos]
  end

  Inicio --> Renderizacao
  Catalogo --> Renderizacao
  Cadastro --> Renderizacao
  Solicitar --> Renderizacao
  Pedidos --> Renderizacao
  Analise --> Renderizacao
  Clientes --> Renderizacao
  Frota --> Renderizacao
  Partials --> Renderizacao
  Estilos --> Inicio
  Estado --> Navegacao
  Navegacao --> Dominio
  Dominio --> Renderizacao
  Renderizacao --> Fetch
  Fetch -->|HTTP / JSON| Rest
  Rest --> DB
  Static --> Apresentacao
  Renderizacao --> Catalogos
```
</details>

### Revisão V0 → V1

- Detalhada a divisão efetiva: páginas/partials e estilos, lógica compartilhada
  no navegador, cliente Fetch, servidor e arquivos de dados.
- Registrado que as telas são arquivos HTML separados; a aplicação não possui
  um framework de interface nem pacotes de domínio JavaScript independentes.
- Incluídas as coleções reais do `db.json` e os catálogos JSON lidos pelo
  navegador.
- A autorização representada em `app.js` protege a navegação da interface, mas
  não corresponde a um pacote de autenticação no servidor.
