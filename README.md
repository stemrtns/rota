# Rota — Sistema de Aluguel de Carros

Aplicação acadêmica para consultar veículos, solicitar aluguéis e acompanhar a análise de contratos. O front-end usa HTML, CSS e JavaScript; o JSON Server fornece uma API REST simulada.

> **Projeto:** Laboratório 02 — PUC Minas
> **Situação:** aplicação acadêmica em desenvolvimento; não destinada a uso comercial.

## Índice

- [Sobre o projeto](#sobre-o-projeto)
- [Funcionalidades](#funcionalidades)
- [Tecnologias](#tecnologias)
- [Como executar](#como-executar)
- [Contas de demonstração](#contas-de-demonstração)
- [API e dados](#api-e-dados)
- [Estrutura do projeto](#estrutura-do-projeto)
- [Validação](#validação)
- [Referências e limitações](#referências-e-limitações)
- [Licença](#licença)

## Sobre o projeto

O Rota reúne em uma única interface a consulta pública de veículos e o fluxo de aluguel. Visitantes podem pesquisar o catálogo e consultar fotos de referência. Clientes cadastrados podem preencher o perfil, informar fontes de renda, solicitar veículos e acompanhar os pedidos. Agentes, empresas e bancos podem consultar cadastros, avaliar solicitações e administrar a frota.

O projeto foi desenvolvido para o Laboratório 02 da PUC Minas, com base nos requisitos e wireframes fornecidos. Os dados iniciais são ilustrativos e ficam em `db.json`.

## Funcionalidades

- **Página inicial:** apresentação do serviço, veículos disponíveis e explicação do fluxo em cinco etapas.
- **Catálogo público:** pesquisa, filtros por categoria, estado e município, ordenação e 20 versões de veículos comercializadas no Brasil.
- **Fotos dos veículos:** fotos de referência com créditos e licenças; visitantes podem consultá-las sem login. Há 19 fotos locais e um placeholder para o Nissan Kicks.
- **Contas por perfil:** cadastro e login demonstrativos para clientes, agentes, empresas e bancos.
- **Cadastro do cliente:** dados pessoais, endereço, município, profissão, até três fontes de renda e dados/fotos da frente e do verso da CNH.
- **Solicitações:** fluxo em cinco etapas — veículo, datas e locais, contrato e propriedade, banco responsável (com crédito opcional) e revisão. O cliente pode consultar, editar ou cancelar pedidos que ainda estejam em análise pelo agente.
- **Continuidade do fluxo:** se o cliente selecionar um veículo sem ter completado o cadastro, o sistema preserva o veículo escolhido e volta para a solicitação após salvar o perfil.
- **Pedidos e contratos:** lista e detalhes de solicitações com status e acompanhamento das etapas de análise pelo agente e pelo banco.
- **Análise em duas etapas:** agentes e empresas autorizam ou rejeitam o pedido; ao autorizar, encaminham-no ao banco responsável. O banco pode aceitar ou rejeitar o aluguel, registrando a decisão final. O motivo de rejeição é obrigatório e fica visível ao cliente.
- **Painel bancário:** contas de banco acessam somente os pedidos destinados ao seu banco e podem decidir os que já foram autorizados pelo agente. A gestão de clientes e da frota fica disponível para agentes e empresas.
- **Gestão de clientes:** pesquisa, visualização de dados e CNH e exclusão do cadastro sem apagar a conta ou os pedidos associados.
- **Gestão da frota:** cadastro, edição e remoção de veículos, incluindo upload e substituição de fotos.
- **Disponibilidade:** impede solicitações para veículos indisponíveis ou com conflito de datas.
- **Atualização de dados:** Fetch API consulta o JSON Server; as telas atualizam os dados periodicamente.
- **Interface responsiva:** navegação adaptada para telas de desktop e celular, com identidade visual própria e componentes/utilitários do Bootstrap 5.

## Tecnologias

| Camada | Tecnologias |
| --- | --- |
| Interface | HTML5, CSS3 e JavaScript com módulos ES |
| Componentes e utilitários visuais | Bootstrap 5.3.3, carregado por CDN |
| Comunicação com a API | Fetch API |
| API e persistência de demonstração | JSON Server 0.17.4 e `db.json` |
| Imagens e fontes | Fotos locais e Unsplash; Google Fonts e Bootstrap via CDN |

O Bootstrap é incluído nas páginas HTML e usado, por exemplo, nas classes `container`, `row`, `g-4`, `form-select` e `visually-hidden`. A maior parte do estilo da interface é definida em `styles.css`.

## Como executar

### Pré-requisitos

- Node.js 18 ou superior e npm.
- Conexão com a internet para carregar Bootstrap, Google Fonts e a foto externa do banner.

### Instalação e inicialização

No terminal, entre na pasta do projeto e execute:

```bash
npm install
npm start
```

Abra [http://localhost:3000](http://localhost:3000). O JSON Server disponibiliza o site e a API na mesma origem, monitora `db.json` e persiste nele as alterações feitas pela aplicação.

A URL base da API também está definida em `api.js`. Se a porta `3000` estiver ocupada, encerre o processo que a utiliza antes de iniciar o projeto.

## Contas de demonstração

Todas as contas de exemplo usam a senha `rota123`.

| Perfil | E-mail |
| --- | --- |
| Cliente | `ana@rota.com` |
| Cliente | `bruno@rota.com` |
| Cliente | `carolina@rota.com` |
| Cliente | `diego@rota.com` |
| Cliente | `eduarda@rota.com` |
| Cliente | `felipe@rota.com` |
| Agente | `agente@rota.com` |
| Empresa | `empresa@rota.com` |
| Banco | `banco@rota.com` |

Novas contas criadas pela interface recebem o perfil de cliente. Para solicitar um aluguel, é necessário entrar e completar os dados do perfil, incluindo CNH e ao menos uma fonte de renda.

## API e dados

A API base é `http://localhost:3000`.

| Recurso | Operações utilizadas |
| --- | --- |
| `/users` | `GET`, `POST`, `PATCH`, `DELETE` |
| `/clients` | `GET`, `POST`, `PATCH`, `DELETE` |
| `/vehicles` | `GET`, `POST`, `PATCH`, `DELETE` |
| `/requests` | `GET`, `POST`, `PATCH` |

O `db.json` inicial inclui as coleções `users`, `clients`, `vehicles` e `requests`, com contas de demonstração, seis cadastros de clientes, 20 veículos e pedidos de exemplo. Os dados são compartilhados localmente pelo JSON Server.

Os registros de clientes guardam dados pessoais, rendimentos e campos da CNH. As imagens da CNH são convertidas para JPEG no navegador e limitadas a aproximadamente 600 KB cada. As fotos enviadas para veículos também são otimizadas e guardadas como JPEG no campo `photoDataUrl`.

O fluxo do pedido usa os status `Em análise` (agente), `Aguardando aprovação do banco` e, após a decisão bancária, `Aprovado` ou `Rejeitado`. Cada etapa mantém seu responsável, data e parecer para exibição no acompanhamento do cliente.

> **Privacidade:** use somente dados e imagens fictícios. O JSON Server não oferece autenticação ou controle real de acesso à API; não publique este servidor nem armazene documentos pessoais reais.

## Estrutura do projeto

```text
.
├── index.html                    # Página inicial
├── veiculos.html                 # Catálogo público e consulta de fotos
├── cadastro.html                 # Perfil do cliente e CNH
├── clientes.html                 # Gestão de cadastros pelo agente
├── solicitar.html                # Formulário de solicitação em etapas
├── pedidos.html                  # Pedidos e contratos do cliente
├── analise.html                  # Painel de análise financeira
├── frota.html                    # Gestão de veículos
├── partials/
│   ├── header.html               # Cabeçalho e navegação compartilhados
│   ├── footer.html               # Rodapé compartilhado
│   └── modals.html               # Modais de autenticação e fotos
├── api.js                        # Cliente Fetch para a API
├── app.js                        # Estado, renderização e regras do sistema
├── db.json                       # Dados iniciais e persistência local
├── data/
│   ├── municipalities.json       # Municípios brasileiros e códigos IBGE
│   ├── brazilian-cars.json        # Sugestões de marcas e modelos
│   ├── vehicle-photos.json        # Caminhos e metadados das fotos
│   ├── VEHICLE-IMAGE-CREDITS.md  # Créditos e licenças das fotos
│   └── *-LICENSE                 # Atribuições/licenças das bases de dados
├── images/
│   ├── hero-car.jpg              # Foto do banner inicial
│   └── vehicles/                 # Fotos locais dos veículos
├── styles.css                    # Estilos responsivos do projeto
├── package.json                  # Dependências e comando de inicialização
├── package-lock.json             # Versões resolvidas das dependências
└── Aluguel de Carros (wireframe)/ # Wireframes de referência em PDF
```

O front-end é estático e não requer etapa de build. Cada tela tem seu próprio arquivo HTML. `app.js` carrega o cabeçalho, o rodapé e os modais de `partials/`; `api.js` centraliza as chamadas Fetch para o JSON Server.

### Bases de referência

- **Municípios:** cópia local de [kelvins/municipios-brasileiros](https://github.com/kelvins/municipios-brasileiros), com código IBGE, nome, UF e estado. A licença está em `data/municipios-brasileiros-LICENSE`.
- **Marcas e modelos:** recorte de [gpupo/brazilian-cars](https://github.com/gpupo/brazilian-cars), distribuído sob licença MIT. É uma referência para sugestões e não restringe texto livre no formulário. A licença está em `data/brazilian-cars-LICENSE`.
- **Fotos de veículos:** imagens de referência do [Wikimedia Commons](https://commons.wikimedia.org/); créditos, fontes e licenças estão em `data/VEHICLE-IMAGE-CREDITS.md` e `data/vehicle-photos.json`.
- **Banner:** fotografia do [Unsplash](https://images.unsplash.com/photo-1492144534655-ae79c964c9d7), sob a [licença Unsplash](https://unsplash.com/license).

## Validação

O projeto não possui uma suíte automatizada de testes configurada. É possível verificar a sintaxe dos módulos com:

```bash
node --check app.js
node --check api.js
```

Para validar os fluxos, inicie o sistema e confira manualmente o catálogo, o cadastro, a seleção de veículo, o envio e acompanhamento de pedidos e o painel de análise usando as contas de demonstração.

## Referências e limitações

- A implementação foi orientada pelos requisitos do Laboratório 02 e pelos PDFs na pasta `Aluguel de Carros (wireframe)/`.
- Fotos dos veículos são ilustrativas; ano, versão, motorização ou mercado podem diferir do veículo anunciado. O Nissan Kicks está sem foto para evitar exibir outra geração como se fosse a cadastrada.
- Bootstrap, Google Fonts e a foto do banner dependem de conexão à internet. As fotos locais do catálogo não dependem de serviços externos.
- JSON Server, senhas em texto simples e autorização no navegador são usados somente para fins didáticos. O projeto não oferece segurança adequada para produção, pagamentos ou dados pessoais reais.
- Não há endereço de deploy público configurado; execute a aplicação localmente conforme as instruções acima.

## Licença

Este projeto não declara uma licença de distribuição. Consulte os responsáveis pelo trabalho antes de reutilizar ou redistribuir o código. As licenças de imagens e bases de terceiros são indicadas separadamente nas referências acima.
