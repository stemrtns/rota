# Rota — Sistema de Aluguel de Carros

Aplicação acadêmica de aluguel de carros com HTML, CSS, JavaScript, Bootstrap 5 e JSON Server.

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

Novos cadastros criam uma conta de cliente; os dados pessoais, endereço, profissão e até três fontes de renda são preenchidos em **Meu cadastro**.

## Recursos implementados

- Interface reorganizada para acompanhar a identidade visual dos wireframes: painel escuro de destaque, acesso integrado, catálogo de veículos e painel detalhado de contratos.
- Catálogo público com 20 versões de veículos comercializadas no Brasil; visitantes podem navegar por três fotos ilustrativas de cada modelo sem criar conta.
- Fotografias da frota carregadas do Unsplash; é necessária conexão à internet para exibi-las.
- Catálogo pesquisável e ordenável, com valores e disponibilidade atualizados pela API.
- Cadastro e edição de dados do cliente, incluindo até três rendimentos; remoção do cadastro de cliente.
- Solicitação, consulta, edição e cancelamento de pedidos em cartões visuais, com painel detalhado do contrato.
- Análise financeira de pedidos por agentes, empresas e bancos, com aprovação ou rejeição.
- Cadastro, edição e remoção de veículos com matrícula, ano, marca, modelo, placa e proprietário.
- Bloqueio de pedidos para veículos indisponíveis ou com reservas ativas nas mesmas datas.
- Navegação responsiva e acesso às áreas de acordo com o perfil conectado.

## Endpoints JSON Server

- `GET /users`, `POST /users`, `PATCH /users/:id`, `DELETE /users/:id`
- `GET /clients`, `POST /clients`, `PATCH /clients/:id`, `DELETE /clients/:id`
- `GET /vehicles`, `POST /vehicles`, `PATCH /vehicles/:id`, `DELETE /vehicles/:id`
- `GET /requests`, `POST /requests`, `PATCH /requests/:id`

> **Nota acadêmica:** as credenciais ficam no `db.json` e a autorização é feita no navegador para fins de demonstração. Não use esta autenticação ou esta API sem proteção em produção.
