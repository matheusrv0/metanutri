# LGPD — rascunhos

> ⚠️ **Isto é rascunho, não peça jurídica.** Foi escrito por um assistente de código,
> não por advogado. Serve para você não começar de uma página em branco e para saber
> o que precisa decidir. **Antes de publicar, um advogado precisa ler.** Dado de saúde
> é dado pessoal sensível (LGPD, art. 5º, II e art. 11), e o custo de errar aqui não é
> um bug: é multa e processo.

## O que você precisa preencher antes de qualquer coisa

O texto abaixo tem lacunas marcadas com `[...]`. Nenhuma delas dá para eu inventar:

- `[RAZÃO SOCIAL]` e `[CNPJ]` — ou seu nome e CPF, se ainda não abriu empresa.
  Enquanto for pessoa física, é **você** quem responde pelos dados.
- `[E-MAIL DE CONTATO]` — o canal do titular. Precisa existir e ser lido.
- `[ENCARREGADO]` — a pessoa responsável pelos dados (pode ser você mesmo).
- `[PRAZO]` — por quanto tempo você guarda os dados depois do cancelamento.

## Quem é o quê

Esta é a decisão estruturante, e ela já está no plano de negócio:

- **O nutricionista é o controlador.** É ele que decide tratar o dado do paciente,
  coleta e responde pelo atendimento.
- **O MetaNutri é o operador.** Trata o dado em nome do nutricionista, só para fazer
  o serviço funcionar.

Consequência prática: o consentimento do paciente é colhido **pelo nutricionista**,
não pelo software. O MetaNutri precisa deixar isso registrado no contrato com ele.

Um detalhe que hoje está a seu favor: enquanto o dado fica no navegador do
nutricionista, o MetaNutri quase não trata dado nenhum. Isso muda no dia em que as
missões subirem para o Supabase — e é por isso que este texto existe agora.

---

## Rascunho 1 — Política de privacidade

**MetaNutri — Política de Privacidade**
Última atualização: `[DATA]`

**Quem somos.** O MetaNutri é um software de planejamento alimentar e acompanhamento
de pacientes, operado por `[RAZÃO SOCIAL]`, `[CNPJ]`.

**Nosso papel.** Quando um nutricionista usa o MetaNutri para atender, ele é o
controlador dos dados do paciente e nós somos o operador: tratamos os dados em nome
dele e seguindo as instruções dele. Em relação aos dados da conta do próprio
nutricionista, nós somos o controlador.

**Que dados tratamos.**

| Dado | De quem | Para quê |
|---|---|---|
| E-mail e nome | Nutricionista | Criar e manter a conta |
| Nome, sexo, idade, peso, estatura, medidas | Paciente | Calcular o plano alimentar |
| Restrições, condições clínicas, medicamentos, anamnese | Paciente | Montar o plano com segurança |
| Missões marcadas e datas | Paciente | Mostrar a adesão ao nutricionista |

Os dados clínicos são **dados pessoais sensíveis**. Eles são tratados com base no
consentimento do titular, colhido pelo nutricionista, e para a tutela da saúde por
profissional de saúde (LGPD, art. 11, II, "f").

**Onde os dados ficam.** Os planos ficam no navegador do nutricionista. Quando o
acompanhamento por missões é usado, os dados necessários para o link do paciente ficam
em servidores da Supabase `[REGIÃO]`.

**Com quem compartilhamos.** Com ninguém, além dos provedores de infraestrutura
necessários para o serviço funcionar (hospedagem e banco de dados). Não vendemos dados,
não usamos para publicidade e não treinamos modelos com eles.

**Por quanto tempo.** Enquanto a conta existir. Depois do cancelamento, apagamos em
até `[PRAZO]`, salvo obrigação legal de guarda.

**Seus direitos.** O titular pode pedir confirmação, acesso, correção, anonimização,
portabilidade e eliminação dos dados, e revogar o consentimento (LGPD, art. 18). Basta
escrever para `[E-MAIL DE CONTATO]`. Respondemos em até 15 dias.

**Segurança.** Acesso por senha, conexão criptografada e separação por usuário no banco,
de modo que um nutricionista não alcança os dados de outro. O link de missões do
paciente usa um endereço secreto e dá acesso apenas às missões daquele paciente.

**Encarregado.** `[ENCARREGADO]`, `[E-MAIL DE CONTATO]`.

**Mudanças.** Avisamos por e-mail quando esta política mudar de forma relevante.

---

## Rascunho 2 — Consentimento do paciente

Texto curto, para o nutricionista apresentar ao paciente **antes** de gerar o link.
Vale em papel ou na tela; o importante é ficar registrado que foi apresentado.

> **Autorização para uso dos meus dados**
>
> Autorizo `[NOME DO NUTRICIONISTA]`, CRN `[NÚMERO]`, a registrar meus dados pessoais
> e de saúde (medidas corporais, condições clínicas, restrições alimentares e o que eu
> marcar como feito no acompanhamento) no software MetaNutri, com a finalidade de
> montar e acompanhar meu plano alimentar.
>
> Fui informado(a) de que:
> - meus dados de saúde são sensíveis e só serão usados para o meu atendimento;
> - posso pedir para ver, corrigir ou apagar meus dados a qualquer momento;
> - posso retirar esta autorização quando quiser, sem que isso afete o atendimento já
>   realizado;
> - o link de acompanhamento é pessoal e não deve ser compartilhado.
>
> Nome: _______________________  Data: ____/____/____
> Assinatura: _______________________

## Rascunho 3 — Cláusulas para o contrato com o nutricionista

Pontos que o contrato de uso precisa deixar escritos. Não é o contrato inteiro:

1. **Papéis.** O nutricionista é controlador; o MetaNutri é operador (LGPD, art. 39).
2. **Instruções.** O MetaNutri trata os dados apenas conforme as instruções do
   nutricionista e para prestar o serviço.
3. **Consentimento.** É obrigação do nutricionista colher o consentimento do paciente
   antes de inserir dados dele.
4. **Segurança e incidente.** O MetaNutri comunica o nutricionista em até `[PRAZO]`
   horas se houver incidente de segurança com os dados dele (LGPD, art. 48).
5. **Subcontratados.** O MetaNutri pode usar provedores de infraestrutura, listados na
   política de privacidade, e responde por eles.
6. **Fim do contrato.** Ao encerrar, o nutricionista pode exportar os dados; depois de
   `[PRAZO]`, o MetaNutri apaga.
7. **Sem uso próprio.** O MetaNutri não usa os dados dos pacientes para finalidade
   própria, inclusive estatística identificável ou treino de modelo.

## O que ainda falta no produto, não no texto

Para a política acima ser verdade, três coisas precisam existir em código:

- [ ] **Excluir a conta** e apagar os dados de verdade (hoje não existe botão).
- [ ] **Exportar os dados** do paciente em formato legível (o backup de Configurações
      já faz parte disso).
- [ ] **Tela de consentimento** antes de gerar o link do paciente pela primeira vez.

Enquanto esses três não existirem, publicar a política cria uma promessa que o
software não cumpre — e isso é pior do que não ter política.
