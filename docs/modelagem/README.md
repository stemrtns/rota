# Modelagem do sistema Rota

Este diretório reúne os artefatos de modelagem do Laboratório 02:

- [Diagrama de casos de uso](./casos-de-uso.md)
- [Histórias do usuário](./historias-do-usuario.md)
- [Diagrama de classes](./classes.md)
- [Diagrama de pacotes (visão lógica)](./pacotes.md)
- [Diagrama de componentes](./componentes.md)

Cada diagrama tem uma imagem vetorial SVG para visualização direta no GitHub.
As imagens das versões inicial e revisada ficam em [`imagens/`](./imagens/);
as páginas individuais exibem as imagens e mantêm a fonte Mermaid recolhida
para facilitar futuras alterações. As histórias do usuário são uma
especificação textual, não um diagrama.

## Histórico das versões

| Versão | Base | Alterações |
| --- | --- | --- |
| V0 — requisitos | Enunciado do Laboratório 02 | Modelagem inicial dos atores, dados, responsabilidades e comunicação descritos no PDF. |
| V1 — sistema implementado | Código e `db.json` deste repositório, revisados em 03/11/2026 | Atualização dos fluxos para refletir cadastro, perfis, catálogo, solicitação em cinco etapas, análise do agente e decisão do banco, além da arquitetura real com JSON Server. |

Não havia diagramas ou versões anteriores de modelagem no repositório quando
estes arquivos foram criados. Por isso, a V0 é uma reconstrução documentada a
partir do enunciado, não uma cópia de uma entrega anterior. A V1 registra a
revisão feita a partir do código disponível; nenhum feedback específico de aula
foi fornecido nesta revisão ou é atribuído a ela. Novos comentários do docente
devem ser registrados como versões posteriores, sem substituir o histórico.

## Decisões e limites do modelo revisado

- As entidades representam os registros persistidos em `db.json`, não classes
  JavaScript instanciadas em memória.
- `EmployerIncome` é um objeto dentro do array `ClientProfile.employers`, e não
  uma coleção independente da API.
- O pedido guarda os dados das decisões do agente e do banco nos próprios
  campos. O sistema não mantém entidades separadas de parecer, contrato
  assinado, pagamento ou execução do aluguel.
- A aplicação possui papéis e restrições de navegação no navegador, mas o JSON
  Server não implementa autenticação nem autorização no servidor.
- O cadastro do cliente pode ser criado e alterado pelo próprio cliente. A
  interface interna permite consultar e excluir cadastros, mas não oferece
  operações administrativas de criação/edição de cadastro de terceiros. O
  histórico de pedidos e a conta permanecem quando o cadastro é excluído.
- O catálogo pode ser consultado sem login e o cadastro cria uma conta de
  cliente com perfil inicialmente incompleto. Essas escolhas da implementação
  ampliam o fluxo resumido no enunciado, que diz que o sistema só pode ser
  utilizado após cadastro.


