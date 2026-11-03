# Histórias do usuário

As histórias V0 resumem os objetivos do enunciado. A coluna de situação foi
conferida com as telas e a lógica existentes na revisão V1.

## V0 — histórias derivadas dos requisitos

| ID | História | Critérios de aceite do requisito |
| --- | --- | --- |
| US-01 | Como cliente, quero informar meus dados de identificação, endereço, profissão e rendimentos para solicitar um aluguel. | Dados de RG, CPF, nome e endereço; empregadores e rendimentos limitados a três fontes. |
| US-02 | Como cliente, quero criar um pedido de aluguel pela Internet para encaminhá-lo à análise. | O pedido identifica o automóvel e pode ser associado a um contrato de crédito concedido por um banco agente. |
| US-03 | Como cliente, quero consultar meus pedidos para conhecer o andamento do aluguel. | O cliente consegue identificar e consultar seus pedidos. |
| US-04 | Como cliente, quero modificar ou cancelar meus pedidos para corrigir ou desistir de uma solicitação. | O cliente pode modificar e cancelar pedidos que ainda estejam em andamento, respeitando as regras do sistema. |
| US-05 | Como agente, quero avaliar financeiramente os pedidos para decidir se podem seguir para a consideração do contrato. | Um parecer positivo encaminha o pedido à etapa de consideração do contrato. |
| US-06 | Como banco agente, quero participar da avaliação e do crédito associado ao aluguel para registrar a decisão bancária. | O banco envolvido pode avaliar o pedido e conceder ou não o crédito associado. |
| US-07 | Como responsável pelo sistema, quero manter os dados dos automóveis para que os pedidos se refiram a veículos identificáveis. | O automóvel tem matrícula, ano, marca, modelo e placa. |

## V1 — histórias revisadas e situação no protótipo

| ID | História revisada | Critérios de aceite observados | Situação |
| --- | --- | --- | --- |
| US-01 | Como visitante, quero consultar veículos sem criar uma conta para conhecer a frota. | Catálogo público com busca, filtros e ordenação; consulta de fotos quando disponíveis. | Implementada |
| US-02 | Como visitante, quero criar uma conta de cliente para acessar as funções de aluguel. | Cadastro cria usuário com papel `client` e um perfil vazio; o perfil completo é solicitado antes do aluguel. | Implementada |
| US-03 | Como cliente, quero preencher e atualizar meu cadastro para fornecer dados suficientes à análise. | Identificação, endereço/localidade, profissão, dados e fotos da CNH, e de uma a três fontes de renda. | Implementada |
| US-04 | Como cliente, quero escolher um veículo, período, locais, tipo de contrato e banco para enviar uma solicitação completa. | Formulário em cinco etapas; crédito adicional opcional; datas passadas, datas inválidas, conflito ativo e veículo indisponível são recusados. | Implementada |
| US-05 | Como cliente, quero acompanhar a análise do agente e a decisão do banco para saber o resultado do pedido. | Histórico exibe envio, etapa do agente, etapa bancária e pareceres registrados. | Implementada |
| US-06 | Como cliente, quero corrigir ou cancelar um pedido ainda em análise pelo agente. | Edição e cancelamento só aparecem/funcionam quando o status é `Em análise`; pedidos editados voltam à análise. | Implementada |
| US-07 | Como agente ou empresa, quero analisar pedidos e consultar os dados financeiros do cliente para emitir um parecer. | Lista de pedidos, perfil e rendimentos; autorização encaminha ao banco selecionado; rejeição exige motivo. | Implementada |
| US-08 | Como banco, quero decidir sobre os aluguéis encaminhados para registrar o resultado bancário. | O banco acessa pedidos atribuídos ao seu identificador e só decide após autorização do agente; rejeição exige motivo. | Implementada |
| US-09 | Como agente ou empresa, quero consultar e excluir cadastros para manter a base de clientes. | Pesquisa, visualização e exclusão; conta e pedidos são preservados. Não há edição administrativa de cadastro de terceiros. | Parcial — consulta e exclusão disponíveis |
| US-10 | Como agente ou empresa, quero cadastrar, editar e remover veículos para manter o catálogo atualizado. | Campos de identificação, preço, disponibilidade, proprietário e foto. | Implementada |

## Revisão V0 → V1

- Detalhados os critérios que a implementação exige para completar o cadastro
  e submeter um pedido, incluindo CNH, fontes de renda e conflito de datas.
- Refinado o papel bancário: no protótipo, o banco decide o aluguel depois da
  autorização do agente; crédito adicional é opcional.
- Registradas as funções que apareceram no código além do enunciado, como
  catálogo público, fotos, conta demonstrativa e gestão de frota.
- Explicitada a lacuna entre “CRUD de cliente” no processo de desenvolvimento
  do PDF e a área interna atual: ela consulta e exclui cadastros, mas não cria
  nem edita o cadastro de outra pessoa.

> **Atenção:** as situações descrevem a implementação observada; não
> substituem testes de aceitação em execução. Não foi fornecido feedback de
> aula para esta revisão.
