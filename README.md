# Rota — Sistema de Aluguel de Carros

Aplicação acadêmica de aluguel de carros com páginas HTML separadas, CSS, JavaScript, Bootstrap 5 e JSON Server.

## Executar localmente

1. Instale o Node.js (versão 18 ou superior).
2. Na pasta do projeto, instale as dependências:

   ```bash
   npm install
   ```

3. Inicie o site e a API:

   ```bash
   npm start
   ```

4. Acesse [http://localhost:3000](http://localhost:3000). A API REST também fica disponível na mesma origem.

O JSON Server persiste as alterações diretamente em `db.json`.

## Contas de demonstração

| Perfil | E-mail | Senha |
| --- | --- | --- |
| Cliente | ana@rota.com | rota123 |
| Agente | agente@rota.com | rota123 |
| Empresa | empresa@rota.com | rota123 |
| Banco | banco@rota.com | rota123 |
| Cliente | bruno@rota.com | rota123 |
| Cliente | carolina@rota.com | rota123 |
| Cliente | diego@rota.com | rota123 |
| Cliente | eduarda@rota.com | rota123 |
| Cliente | felipe@rota.com | rota123 |

Novos cadastros criam uma conta de cliente; os dados pessoais, endereço, estado, município, profissão e até três fontes de renda são preenchidos em **Meu cadastro**.
O banco inicial inclui seis cadastros de clientes e dez pedidos ilustrativos. Os cinco clientes adicionais usam dados fictícios e não incluem documentos reais.

## Recursos implementados

- Interface reorganizada para acompanhar a identidade visual dos wireframes: painel escuro de destaque, acesso integrado, catálogo de veículos e painel detalhado de contratos.
- Painel do agente com acesso de leitura ao cadastro completo do cliente associado a cada pedido.
- Área restrita de cadastro de clientes, com pesquisa, visualização de dados/CNH e exclusão do cadastro sem apagar a conta ou os pedidos.
- Cadastro do cliente com número, categoria e validade da CNH, além de fotos obrigatórias da frente e do verso.
- Página inicial com carro em destaque sobre fundo escuro e cinco etapas numeradas em círculos; veículos disponíveis aparecem antes da seção explicativa.
- Catálogo público com 20 versões de veículos comercializadas no Brasil; visitantes podem ver fotos de referência e seus créditos sem criar conta.
- Dezenove veículos têm fotos locais reutilizáveis do Wikimedia Commons, com crédito e licença registrados; o Nissan Kicks exibe um placeholder porque não foi encontrada uma foto livre da geração cadastrada.
- As fotos são ilustrativas e podem variar em ano, versão, motorização ou mercado. Os veículos estão orientados para a esquerda, e o modal mantém o crédito, a fonte e a licença da foto.
- Catálogo pesquisável e ordenável, com valores e disponibilidade atualizados pela API.
- Busca de veículos por estado e município, com municípios carregados localmente e dados de cidade/UF salvos em cada veículo da frota.
- Seleção de município no endereço do cliente; locais de retirada e devolução sugerem municípios brasileiros.
- Filtros de categoria no catálogo e especificações completas nos cards: matrícula, ano, marca, modelo, placa, câmbio e combustível.
- Sugestões de marca e modelo no cadastro da frota, usando a base brasileira convertida para JSON; os campos continuam aceitando texto livre.
- Cadastro e edição de dados do cliente, incluindo até três rendimentos; remoção do cadastro de cliente.
- Solicitação, consulta, edição e cancelamento de pedidos em cartões visuais, com painel detalhado do contrato.
- Solicitação em cinco etapas: veículo, datas e locais, contrato/propriedade, crédito bancário opcional e revisão.
- Análise financeira de pedidos por agentes, empresas e bancos, com renda e até três fontes empregadoras visíveis e ações para aprovar ou rejeitar.
- Painel de análise com todos os pedidos recebidos, separados por status, e ações de aprovação/rejeição apenas para pedidos em análise.
- Cadastro, edição e remoção de veículos com município de operação, matrícula, ano, marca, modelo, placa, categoria, câmbio, combustível, proprietário e upload/substituição de foto.
- Bloqueio de pedidos para veículos indisponíveis ou com reservas ativas nas mesmas datas.
- Atualização periódica dos pedidos e do catálogo via Fetch API para refletir mudanças feitas por outros usuários.
- Navegação responsiva e acesso às áreas de acordo com o perfil conectado.
- Páginas independentes para início, veículos, cadastro, solicitação, pedidos, análise e gestão da frota.

## Endpoints JSON Server

- `GET /users`, `POST /users`, `PATCH /users/:id`, `DELETE /users/:id`
- `GET /clients`, `POST /clients`, `PATCH /clients/:id`, `DELETE /clients/:id`
- `GET /vehicles`, `POST /vehicles`, `PATCH /vehicles/:id`, `DELETE /vehicles/:id`
- `GET /requests`, `POST /requests`, `PATCH /requests/:id`

Os veículos em `db.json` incluem `category`, `transmission`, `fuel`, `cityIbge`, `city`, `state` e `stateName`. Os clientes também guardam município e estado selecionados. Os pedidos guardam os locais de retirada/devolução, tipo de contrato, condição de propriedade e, se solicitado, banco e valor de crédito. A tela do catálogo combina município, estado, categorias, pesquisa e ordenação sem sair da API JSON Server.

## Estrutura do projeto

```text
.
├── index.html                  # Página inicial
├── veiculos.html               # Catálogo público e galeria
├── cadastro.html               # Cadastro do cliente
├── clientes.html               # Consulta e gestão de cadastros pelo agente
├── solicitar.html              # Formulário de solicitação
├── pedidos.html                # Pedidos e contratos do cliente
├── analise.html                # Painel de análise financeira
├── frota.html                  # Gestão de veículos
├── partials/
│   ├── header.html             # Cabeçalho e navegação compartilhados
│   ├── footer.html             # Rodapé compartilhado
│   └── modals.html             # Login, cadastro e galerias
├── api.js                      # Cliente HTTP para a API JSON Server
├── app.js                      # Estado, renderização e regras de interação
├── db.json                     # Dados iniciais e persistência local
├── data/
│   ├── municipalities.json     # 5.571 municípios brasileiros e suas UFs
│   ├── municipios-brasileiros-LICENSE # Licença da base de municípios
│   ├── brazilian-cars.json      # Marcas e modelos para sugestões no cadastro da frota
│   ├── brazilian-cars-LICENSE   # Atribuição e licença da base de referência
│   ├── vehicle-photos.json      # Fotos e metadados de atribuição da frota
│   └── VEHICLE-IMAGE-CREDITS.md # Créditos e licenças de cada foto
├── images/
│   ├── hero-car.jpg              # Foto do Unsplash para o banner inicial
│   └── vehicles/                # Fotos locais otimizadas da frota
├── styles.css                  # Estilos e comportamento responsivo
├── package.json                # Dependências e comando de inicialização
└── package-lock.json           # Versões resolvidas das dependências
```

O front-end é estático e não requer etapa de build. Cada tela tem seu próprio arquivo HTML; cabeçalho, rodapé e modais ficam em `partials/` e são carregados pelo JavaScript. `app.js` inicializa os componentes presentes na página atual, enquanto `api.js` centraliza as chamadas Fetch para o JSON Server. Fotos enviadas na gestão da frota são otimizadas no navegador e salvas como JPEG no campo `photoDataUrl` do veículo em `db.json`; cada imagem armazenada fica limitada a aproximadamente 1,2 MB.

Os dados da CNH e as fotos da frente e do verso são salvos no registro do cliente em `db.json`; cada imagem é convertida para JPEG e limitada a aproximadamente 600 KB. A tela do agente permite consultar esses dados e excluir somente o cadastro, mantendo a conta e o histórico de pedidos. O JSON Server deste projeto acadêmico não oferece autenticação nem controle de acesso à API: use imagens de teste, não documentos reais, e não publique o servidor com dados pessoais.

### Base de marcas e modelos

As sugestões do formulário de frota usam um recorte de marcas e modelos de [gpupo/brazilian-cars](https://github.com/gpupo/brazilian-cars), distribuído sob licença MIT. A base foi convertida de YAML para JSON e contém 89 marcas e 5.619 modelos distintos. É uma referência histórica e pode não refletir os modelos atualmente comercializados; as sugestões não restringem o cadastro. A atribuição e o texto da licença estão em `data/brazilian-cars-LICENSE`.

### Base de municípios

Os seletores de estado e município usam uma cópia local dos dados de [kelvins/municipios-brasileiros](https://github.com/kelvins/municipios-brasileiros), com código IBGE, nome do município, UF e nome do estado. O arquivo `data/municipalities.json` contém 5.571 registros normalizados a partir dos arquivos JSON do repositório, e a licença MIT está em `data/municipios-brasileiros-LICENSE`. A cópia local mantém o site utilizável sem conexão ao GitHub.

As fotos dos veículos foram selecionadas no [Wikimedia Commons](https://commons.wikimedia.org/) e otimizadas para uso local. Créditos, fontes e licenças estão em [`data/VEHICLE-IMAGE-CREDITS.md`](data/VEHICLE-IMAGE-CREDITS.md) e `data/vehicle-photos.json`. A foto do Nissan Kicks não foi substituída por outra geração nem por um carro diferente.

A foto escura do banner inicial foi obtida no [Unsplash](https://images.unsplash.com/photo-1492144534655-ae79c964c9d7) e é usada sob a [licença Unsplash](https://unsplash.com/license).

> **Nota acadêmica:** as credenciais ficam no `db.json` e a autorização é feita no navegador para fins de demonstração. Não use esta autenticação ou esta API sem proteção em produção.
