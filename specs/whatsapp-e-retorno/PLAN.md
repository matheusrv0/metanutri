# PLAN — Enviar pelo WhatsApp e retorno marcado

**Spec:** `specs/whatsapp-e-retorno/SPEC.md`, aprovada pelo dono em 14/10/2026 ('implemente as novidades').
Cobre D-140 a D-149, CA-500 a CA-528 e CB-140 a CB-149.

**Stack:** o que já existe. Vitest + Testing Library para domínio e telas; Playwright pela linha de comando para o
fluxo no navegador. **Nenhuma dependência nova**, **nenhuma chave nova no armazenamento**, nenhum SQL.

## Regras que valem em todas as tarefas

- TDD: o teste do critério primeiro, com o ID no nome; ver falhar; depois o código. Um commit por tarefa.
- O dado novo é um campo da ficha (`proximaConsulta`). Ele sincroniza porque a ficha já sincroniza: toda edição
  passa por `repositorio.salvar`, que atualiza o `atualizadoEm`.
- Os componentes que hoje funcionam sem um provedor (o cartão do link e a Adesão sem pacientes; o Painel sem
  links) continuam funcionando: usam a versão opcional do contexto.
- Textos: português com acento, frases curtas, sem eyebrow, sem subtítulo que repete o título.

## Tarefas, na ordem

### T1 · Telefone e textos do WhatsApp (domínio)
- **Cria** `src/domain/whatsapp.ts`: `normalizarTelefone` (D-141), `formatarTelefone`, `linkDoWhatsApp`
  (CB-141, CB-142), `primeiroNome` e os quatro textos: link, contato (sumindo e atenção), lembrete e parabéns.
- **Cria** `src/domain/whatsapp.test.ts`: CA-500, CA-501, CA-502, CA-507, CA-510 e CA-511 (os textos), CB-140,
  CB-141, CB-142.
- **Altera** `src/domain/formatarData.ts` (+ `formatarData.test.ts`): `diaDaSemana` ("2026-10-16" → "sexta-feira"),
  que o lembrete e o bloco do Painel usam. Acrescentado antes do código, ao ver que os dois precisam dele.
- Depende de: nada.

### T2 · Próxima consulta, fuso de Brasília e a agenda da semana (domínio)
- **Altera** `src/domain/pacientes.ts`: campo `proximaConsulta: string | null` no `Paciente`, `null` na ficha nova;
  na leitura, valor que não é uma consulta válida vira `null` (CA-526).
- **Cria** `src/domain/retorno.ts`: `lerConsulta`, `escreverConsulta` (CB-149), `agoraEmBrasilia` (D-144),
  `somarDias`, `consultaPassou` (D-145), `quando` (os textos "Hoje às 14:30", "Sexta, 16/10"…),
  `aniversarioNaJanela` (D-148, CB-146, CB-147), `pacienteDoAcompanhamento` e `ultimoLinkPorPaciente` (D-147,
  CB-145), `agendaDaSemana` (D-146).
- **Cria** `src/domain/retorno.test.ts`: CA-518 a CA-523 no domínio, CA-525 (junção da nuvem com
  `registrarMudanca` e `juntarCopias`), CA-526, CB-145 a CB-147, CB-149.
- Depende de: nada. (T1 e T2 são independentes.)

### T3 · Ficha: próxima consulta, aviso do telefone e o endereço que foca o Telefone
- **Altera** `design-system/componentes/forms/CampoTexto.tsx`: `tipo` aceita `'time'`; props opcionais
  `desativado` e `focar` (foco ao abrir). Nada muda para quem já usa.
- **Altera** `src/ui/navegacao.ts` (+ `navegacao.test.ts`): rota `{ tela: 'paciente', pacienteId, campo: 'telefone' }`
  ↔ `#/paciente/<id>/telefone`.
- **Cria** `src/ui/pacientes/CartaoProximaConsulta.tsx`: Dia, Horário (desativado sem dia), "Limpar" e "Essa data
  já passou." (CA-512 a CA-515).
- **Altera** `src/ui/pacientes/TelaPaciente.tsx`: o cartão novo logo depois de Identificação; dica do telefone
  (CA-516); prop `focar?: 'telefone'` (CA-517).
- **Altera** `src/ui/AreaDeTrabalho.tsx`: passa o `campo` da rota para a ficha.
- **Cria** `src/ui/pacientes/proximaConsulta.test.tsx`: CA-512 a CA-517.
- Depende de: T1 (dica do telefone), T2 (campo e leitura).

### T4 · O diálogo e o botão do WhatsApp
- **Cria** `src/ui/whatsapp/DialogoWhatsApp.tsx` (o diálogo, com os três casos do D-142) e
  `src/ui/whatsapp/BotaoWhatsApp.tsx` (o botão com rótulo ou só o ícone, que monta o diálogo ao abrir, para o
  texto nascer sempre do texto pronto).
- **Cria** `src/ui/whatsapp/whatsapp.test.tsx`: CA-503 a CA-506, CB-141.
- Depende de: T1.

### T5 · No cartão do link
- **Altera** `src/ui/missoes/CartaoLinkMissoes.tsx`: "WhatsApp" ao lado de "Copiar", com o texto do link; o
  paciente é o do plano ou o do link, lido pelo `usePacientesOpcional` que já existe; prop `aoCadastrarTelefone`.
- **Altera** `src/ui/AreaDeTrabalho.tsx`: `aoCadastrarTelefone` leva a `#/paciente/<id>/telefone`.
- **Cria** `src/ui/missoes/whatsappNasMissoes.test.tsx`: CA-508.
- Depende de: T4.

### T6 · Na Adesão
- **Altera** `src/ui/estado/contextoCasos.ts`: `useCasosOpcional`.
- **Altera** `src/ui/missoes/TelaAdesao.tsx`: "Retorno …" ao lado do nome (CA-524); "WhatsApp" com o texto de
  contato para sumindo e atenção (CA-509); prop `aoCadastrarTelefone`.
- **Altera** `src/ui/AreaDeTrabalho.tsx`: passa `aoCadastrarTelefone`.
- **Altera** `src/ui/missoes/whatsappNasMissoes.test.tsx`: CA-509, CA-524.
- Depende de: T2, T4.

### T7 · No Painel: "Hoje e esta semana"
- **Altera** `src/ui/estado/contextoAcompanhamentos.ts`: `useAcompanhamentosOpcional`; `useLerDaNuvemAoAbrir`
  passa a não fazer nada fora do provedor (hoje lançaria erro; quem o usa está sempre dentro).
- **Cria** `src/ui/painel/HojeEEstaSemana.tsx`: o cartão do bloco, montado só quando há linha (CA-518), com nome,
  quando, selo (CA-521) e o WhatsApp do lembrete ou dos parabéns (CA-510, CA-511); lê a nuvem ao aparecer (D-147).
- **Altera** `src/ui/painel/TelaPainel.tsx`: o bloco na coluna da direita, acima de "Precisa de atenção" (D-146);
  props `agora` (teste) e `aoCadastrarTelefone`.
- **Altera** `src/ui/AreaDeTrabalho.tsx`: passa `aoCadastrarTelefone`.
- **Cria** `src/ui/painel/hojeEEstaSemana.test.tsx`: CA-510, CA-511, CA-518 a CA-523 na tela.
- Depende de: T2, T4.

### T8 · No navegador
- **Cria** `e2e/whatsapp-e-retorno.spec.ts`: CA-528 (ficha → Painel → diálogo → link `wa.me`) e CA-527 (360 px,
  sem rolagem lateral, botões com 44 px).
- Depende de: T3 a T7.

### Validação (sem commit)
`npm run check`, `npx playwright test` e `npm run build`, tudo verde. Prints em 1280 px e 390 px das telas novas
(ficha, Painel com o bloco, Adesão, cartão do link e o diálogo), com dados de exemplo, num script fora do
repositório.

## Rodada da revisão (15/10/2026)

A revisão de código pediu correções. A SPEC mudou primeiro (marcas "(revisão de 15/10)"); depois, uma tarefa por
item, em TDD, um commit cada.

### R1 · Uma regra só para o paciente de um link (D-147)
- **Altera** `src/domain/retorno.ts`: `pacienteDoAcompanhamento` passa a dar o paciente do plano primeiro, e o do
  link só quando o plano não tem paciente ou não existe. A Adesão e o selo do Painel usam essa função; o cartão
  do link já seguia a regra.
- **Altera** `src/domain/retorno.test.ts`, `src/ui/missoes/whatsappNasMissoes.test.tsx` e
  `src/ui/painel/hojeEEstaSemana.test.tsx`: plano trocado de Ana para Bia → cartão, Adesão e Painel apontam para Bia.

### R2 · Editar o dia não apaga o horário (CA-514, CA-515)
- **Altera** `src/domain/retorno.ts`: ano antes de 1900 não é dia válido; `diaValido` passa a ser exportado.
- **Altera** `src/ui/pacientes/CartaoProximaConsulta.tsx`: rascunho local do dia e do horário; `''` e valor
  incompleto do campo do dia não gravam; só valor completo e válido grava; "Limpar" é o único jeito de tirar a
  consulta; horário apagado grava quando o campo perde o foco; aviso "Essa consulta já passou."; o campo do dia
  pede para conferir a data quando o ano não vale.
- **Altera** `design-system/componentes/forms/CampoTexto.tsx`: prop opcional `aoSair` (perder o foco), para o
  horário apagado. Acrescentado ao implementar a tarefa.
- **Altera** `src/ui/pacientes/proximaConsulta.test.tsx`: sequência `''`, `'0002-10-16'`, `'2026-10-16'`.

### R3 · O relógio: tolerância, o mesmo "hoje" e a hora que anda (D-144, D-145, CA-520, CA-529)
- **Altera** `src/domain/retorno.ts`: `consultaPassou` com 1 hora de tolerância.
- **Cria** `src/ui/estado/usarAgora.ts`: a hora de agora, refeita a cada minuto e ao voltar para a aba (assinatura
  de evento e intervalo dentro de efeito; nada de mudar estado durante a renderização).
- **Altera** `src/ui/painel/TelaPainel.tsx` e `src/ui/missoes/TelaAdesao.tsx`: usam `useAgora` quando o teste não
  passa `agora`; a Adesão conta o estado pelo dia de Brasília.
- **Altera** `src/ui/missoes/CartaoLinkMissoes.tsx`: o selo do cartão também pelo dia de Brasília.
- **Altera** os testes de domínio e de tela correspondentes (`retorno.test.ts`, `hojeEEstaSemana.test.tsx`,
  `whatsappNasMissoes.test.tsx`).

### R4 · Textos (CA-503, CA-504, CA-510, CA-511, CB-142)
- **Altera** `src/domain/whatsapp.ts` (+ teste): `toWellFormed` (com alternativa) antes de codificar; lembrete de
  hoje com "é hoje às 14:30"; parabéns "adiantado" antes do dia.
- **Altera** `src/ui/whatsapp/DialogoWhatsApp.tsx` (+ teste): "Para Ana Souza, (11) 98765-4321. Quem envia é
  você."; "(abre em nova aba)" só para o leitor de tela.
- **Altera** `src/ui/painel/HojeEEstaSemana.tsx`: passa o dia de hoje para os dois textos.

### R5 · No navegador (CA-527)
- **Altera** `e2e/whatsapp-e-retorno.spec.ts`: a Adesão em 360 px; o nome novo do link "Abrir no WhatsApp".

## Integração com as outras frentes (15/10/2026)

- [x] **I1** · Com a dieta no link (spec `dieta-no-link`), `textoDoLink` recebe `comDieta` e o cartão passa
  `temDieta(acompanhamento.dieta)`, a mesma regra da tela do paciente. Altera `src/domain/whatsapp.ts` e
  `src/ui/missoes/CartaoLinkMissoes.tsx` (+ testes em `whatsapp.test.ts` e `whatsappNasMissoes.test.tsx`). Cobre CA-596.
- [x] **I2** · O cartão se chama "Link do paciente" (D-159 da `dieta-no-link`): os testes procuram o nome novo, o botão
  "Gerar link do paciente" e o campo "Endereço do link".

## Decisões para o dono revisar

- **R-1 (D-144).** "Esta semana" são 7 dias corridos a partir de hoje, não a semana de segunda a domingo.
- **R-2 (D-145).** Consulta de hoje sai do Painel quando o horário passa. A outra leitura seria "fica até o fim
  do dia".
- **R-3 (D-141).** O nono dígito nunca é acrescentado; número de 8 dígitos começando com 6 a 9 vai como está.
- **R-4 (D-146).** O bloco fica na coluna da direita, acima de "Precisa de atenção"; no celular, depois de "Onde
  você parou".
- **R-5 (D-149).** Os quatro textos prontos (link, contato, lembrete, parabéns) estão em `src/domain/whatsapp.ts`
  e saem sem assinatura: a mensagem já sai do WhatsApp do próprio nutricionista.
- **R-6.** `CampoTexto` (design system) ganha `tipo="time"`, `desativado` e `focar`. É arquivo de apoio, não um
  dos 25 componentes; a vitrine não muda.
