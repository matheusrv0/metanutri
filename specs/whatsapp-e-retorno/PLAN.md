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
