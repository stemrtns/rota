Atores do Sistema
Visitante: Utilizador não autenticado que apenas navega pelo site e consulta o catálogo de veículos.

Cliente: Utilizador registado que gere os seus dados pessoais, fontes de renda, efetua pedidos de aluguer e acompanha o estado dos contratos.

Agente (Empresas/Bancos): Utilizador com permissões restritas responsável por analisar solicitações, emitir pareceres financeiros e gerir a frota.

Casos de Uso Principais
1. Módulo Público / Visitante e Cliente
UC01 - Consultar Catálogo de Veículos

Ator Principal: Visitante / Cliente

Descrição: Permite visualizar a lista de veículos disponíveis, filtrando por tipo, marca, valor da diária ou características (como câmbio e ar-condicionado), além de abrir a galeria de fotos de cada modelo.

UC02 - Registar e Gerir Conta de Cliente (CRUD)

Ator Principal: Cliente

Descrição: Permite ao utilizador criar uma conta no sistema, efetuar login e atualizar os seus dados cadastrais (nome, RG, CPF, morada e profissão).

UC03 - Registar Fontes de Renda

Ator Principal: Cliente

Descrição: Permite ao cliente adicionar, editar ou remover até 3 fontes de renda/empregadores com os respetivos valores mensais, essenciais para a análise de crédito.

2. Módulo de Aluguer (Área do Cliente)
UC04 - Solicitar Aluguer de Veículo

Ator Principal: Cliente

Descrição: O cliente seleciona um veículo disponível, define as datas de retirada/devolução, os locais, o tipo de contrato (com ou sem crédito opcional de um banco agente) e submete o pedido para análise.

UC05 - Consultar e Acompanhar Pedidos

Ator Principal: Cliente

Descrição: Permite ao cliente visualizar a listagem dos seus pedidos de aluguer efetuados, acompanhando o estado atual (ex: Em análise, Aprovado pelo agente, Rejeitado) e os detalhes do contrato.

3. Módulo de Gestão e Análise (Área do Agente)
UC06 - Analisar e Emitir Parecer Financeiro

Ator Principal: Agente (Empresa / Banco)

Descrição: O agente acede à área restrita para visualizar a fila de pedidos pendentes, consultar a renda comprovada e os vínculos empregatícios do cliente, e emitir um parecer positivo (aprovar) ou negativo (rejeitar), podendo também modificar as condições do pedido.

UC07 - Gerir Frota de Veículos

Ator Principal: Agente

Descrição: Permite adicionar novos veículos ao sistema, editar informações técnicas (matrícula, ano, placa, cor, preço) ou remover registos da frota de demonstração do db.json.