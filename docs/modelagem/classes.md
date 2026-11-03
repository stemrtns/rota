# Diagrama de classes

## V0 — modelo conceitual dos requisitos

![Diagrama de classes — requisitos originais](./imagens/classes-v0.svg)

<details>
<summary>Fonte Mermaid da imagem</summary>

```mermaid
classDiagram
  class Cliente {
    +id
    +nome
    +rg
    +cpf
    +endereco
    +profissao
  }
  class EmpregadorERendimento {
    +entidade
    +rendimento
  }
  class PedidoAluguel {
    +id
    +status
    +dadosDoAluguel
  }
  class Automovel {
    +matricula
    +ano
    +marca
    +modelo
    +placa
  }
  class Agente {
    +id
    +nome
    +tipo
  }
  class ContratoCredito {
    +id
    +dadosDoCredito
  }

  Cliente "1" *-- "0..3" EmpregadorERendimento : rendimentos
  Cliente "1" --> "0..*" PedidoAluguel : solicita
  PedidoAluguel "*" --> "1" Automovel : refere-se a
  Agente "1" --> "0..*" PedidoAluguel : avalia
  PedidoAluguel "0..1" --> "0..1" ContratoCredito : pode associar
  Agente "1" --> "0..*" ContratoCredito : banco concede
```
</details>

## V1 — modelo lógico dos registros implementados

![Diagrama de classes — sistema revisado](./imagens/classes-v1.svg)

<details>
<summary>Fonte Mermaid da imagem</summary>

```mermaid
classDiagram
  class User {
    +number id
    +string name
    +string email
    +string password
    +Role role
  }
  class ClientProfile {
    +number id
    +number userId
    +string rg
    +string cpf
    +string address
    +number cityIbge
    +string city
    +string state
    +string stateName
    +string profession
    +string cnhNumber
    +string cnhCategory
    +date cnhExpiry
    +string cnhPhotoFrontDataUrl
    +string cnhPhotoBackDataUrl
    +EmployerIncome[] employers
  }
  class EmployerIncome {
    +string name
    +number monthlyIncome
  }
  class Vehicle {
    +number id
    +string matricula
    +number year
    +string brand
    +string model
    +string plate
    +number dailyRate
    +string status
    +string ownerType
    +string ownerName
    +number cityIbge
    +string city
    +string state
    +string photoDataUrl
  }
  class RentalRequest {
    +number id
    +number userId
    +number clientId
    +number vehicleId
    +date startDate
    +date endDate
    +number days
    +number totalValue
    +number monthlyIncome
    +string pickupLocation
    +string returnLocation
    +string contractType
    +string propertyOption
    +boolean creditRequested
    +string approvalBankId
    +string creditBankId
    +number creditAmount
    +RequestStatus status
    +ReviewStatus agentStatus
    +string agentReviewedBy
    +date agentReviewedAt
    +string agentNote
    +ReviewStatus bankStatus
    +string bankReviewedBy
    +date bankReviewedAt
    +string bankNote
    +string rejectedByRole
    +string analysisNote
    +string notes
    +string createdAt
    +string updatedAt
  }
  class Role {
    <<enumeration>>
    client
    agent
    company
    bank
  }
  class RequestStatus {
    <<enumeration>>
    EM_ANALISE
    AGUARDANDO_APROVACAO_DO_BANCO
    APROVADO
    REJEITADO
    CANCELADO
  }
  class ReviewStatus {
    <<enumeration>>
    PENDENTE
    APROVADO
    REJEITADO
    NAO_INICIADA
  }
  class VehicleStatus {
    <<enumeration>>
    DISPONIVEL
    INDISPONIVEL
  }

  User "1" --> "0..1" ClientProfile : userId
  ClientProfile "1" *-- "0..3" EmployerIncome : employers
  User "1" --> "0..*" RentalRequest : userId
  ClientProfile "0..1" --> "0..*" RentalRequest : clientId
  Vehicle "1" --> "0..*" RentalRequest : vehicleId
  User "0..1" --> "0..*" RentalRequest : approvalBankId, papel bank
  User ..> Role : role
  Vehicle ..> VehicleStatus : status
  RentalRequest ..> RequestStatus : status
  RentalRequest ..> ReviewStatus : agentStatus, bankStatus
```
</details>

### Revisão V0 → V1

- Separadas a conta (`User`) e os dados cadastrais (`ClientProfile`), que são
  registros independentes nas coleções `users` e `clients`, ligados por
  `userId`.
- Rendimentos continuam limitados a três, mas são objetos embutidos em
  `ClientProfile.employers`; não possuem identidade ou endpoint próprio. O
  perfil pode existir sem rendimentos enquanto está incompleto.
- Automóveis foram modelados como `Vehicle`, com os campos implementados para
  catálogo, disponibilidade, propriedade e foto.
- Pedido agora explicita período, cálculo do total, localidades, preferência
  de contrato/propriedade, banco responsável e campos das duas decisões.
- O banco é referenciado por `approvalBankId` para um usuário de papel `bank`;
  crédito opcional usa campos no próprio pedido, não uma entidade persistida
  `ContratoCredito`.

### Observações sobre persistência

O diagrama representa a forma lógica dos documentos JSON, não validações
relacionais do banco. JSON Server não impõe chaves estrangeiras, cardinalidades
ou enumerações. A propriedade `password` aparece porque existe nos dados de
demonstração; o armazenamento de senha em texto simples não é apropriado para
um sistema real. Os valores de `RequestStatus` correspondem a `Em análise`,
`Aguardando aprovação do banco`, `Aprovado`, `Rejeitado` e `Cancelado`;
`ReviewStatus` corresponde a `Pendente`, `Aprovado`, `Rejeitado` e
`Não iniciada`; `VehicleStatus` corresponde a `Disponível` e `Indisponível`.
O identificador do banco é string no formulário JSON atual, e os horários de
auditoria são armazenados como strings ISO 8601.
