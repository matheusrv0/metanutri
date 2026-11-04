# PLAN — Assistente de IA: sugerir e adequar o plano

Lê a `SPEC.md` desta pasta (D-1300 a D-1328, CA-2300 a CA-2381, CB-1300 a CB-1318). Cada tarefa é um commit, em
TDD: o teste primeiro, visto falhando, depois o código. A P1 é invisível e não muda nenhuma tela; a P2 só começa com o
protótipo aprovado.

## 1. Arquivos, na ordem

### P1 — servidor, banco e domínio puro (agora)

| Arquivo | Tarefa | O que muda |
|---|---|---|
| `supabase/016-assistente-ia.sql` | T1 | novo: tabela `uso_da_ia`, `reservar_uso_da_ia`, `concluir_uso_da_ia`, `uso_da_ia_no_mes`, `custo_da_ia_desde`, RLS e grants |
| `src/data/sqlAssistenteIa.test.ts` | T1 | novo: o texto do 016 |
| `testes/seguranca/ia.test.ts` | T1 | novo: o 016 de verdade no Supabase local (RLS, atômico, cascata) |
| `testes/seguranca/preparo.ts` | T1 | `uso_da_ia` entra na lista de tabelas fechadas |
| `src/domain/iaLimites.ts` (+ teste) | T2 | novo: o contador e a frase do limite; a tabela e o mês de Brasília vêm do contrato da função |
| `supabase/functions/_shared/iaContrato.ts` | T3 | novo: o pedido limpo por lista branca, a limpeza de contato, a conferência da resposta, os limites, o mês de Brasília e as frases (o navegador importa daqui, como já faz com `cobranca.ts`) |
| `src/data/servidorIaContrato.test.ts` | T3 | novo |
| `src/domain/iaCatalogo.ts` (+ teste) | T4 | novo: monta o catálogo da IA a partir da base (regra prescritível, "fonte de") |
| `supabase/functions/_shared/iaCatalogo.ts` | T4 | novo, gerado: o texto do catálogo e os ids; `src/data/iaCatalogo.test.ts` confere e regrava com `ATUALIZAR_CATALOGO_IA=1` |
| `supabase/functions/_shared/iaPrompt.ts` | T5 | novo: as regras (desenho, seção 10), o esquema e a mensagem do usuário montada do pedido limpo |
| `src/data/servidorIaPrompt.test.ts` | T5 | novo |
| `supabase/functions/_shared/iaPortas.ts` | T6 | novo: os tipos das portas (modelo e banco) |
| `supabase/functions/_shared/iaAnthropic.ts` | T6 | novo: a porta do modelo por `fetch` (corpo, cabeçalhos, prazo, leitura do fluxo SSE, erros, usos por modelo) |
| `src/data/servidorIaAnthropic.test.ts` | T6 | novo, com `fetch` de mentira |
| `supabase/functions/_shared/ia.ts` | T7 | novo: o núcleo (ordem do D-1316, limites, teto, custo, conclusão) |
| `supabase/functions/_shared/iaFalsa.ts` | T7 | novo: a porta do modelo falso (D-1325) |
| `src/data/servidorIa.test.ts` | T7 | novo: o núcleo com banco e modelo de mentira |
| `supabase/functions/_shared/iaCusto.ts` | T13 | novo: a tabela de preços e a estimativa do corte (D-1329, D-1334) |
| `src/data/servidorIaFalsos.test-utils.ts` | T3 a T7 | novo: o pedido de exemplo, o fluxo SSE, o banco e o modelo da IA de mentira (arquivo próprio, para não mexer no das outras funções) |
| `supabase/functions/_shared/iaSupabase.ts` | T8 | novo: a porta do banco (RPCs do 016, perfil, assinatura, pedido de estudante) |
| `supabase/functions/sugerir-plano/index.ts` | T8 | novo: a ligação no Deno |
| `src/data/servidorIaLigacao.test.ts` | T8 | novo: o texto da ligação |
| `src/domain/iaPedido.ts` (+ teste) | T9 | novo: `perfilParaIa`, `naoUsar`, `meusAlimentosParaIa`, `metasParaIa`, `focoDaFase`, `motivoParaNaoUsarIa`, `lacunasDoPlano` |
| `src/domain/ia.test-utils.ts` | T9 | novo: a gestante do desenho e um plano de ids reais, para os testes do domínio |
| `src/domain/iaConferencia.ts` (+ teste) | T10 | novo: as 13 conferências e o ajuste de energia; `propostaParaPlano` |
| `src/domain/cobrir.ts` | T10 | `porcaoMaximaNaIdade` passa a ser exportada (a conferência usa a mesma porção do Cobrir) |
| `src/domain/iaMudancas.ts` (+ teste) | T11 | novo: conferir, aplicar e o efeito das mudanças do modo adequar |
| `src/seguranca/cspIa.test.ts` | T11 | novo: o CA-2354 |
| `src/data/avaliacaoIa.test.ts` | T12 | novo: os 17 casos; só roda com `AVALIAR_IA=1` e `ANTHROPIC_API_KEY` |

### P2 — telas, ficha e documentos (depois da aprovação do protótipo)

| Arquivo | Tarefa | O que muda |
|---|---|---|
| `src/domain/pacientes.ts` (+ teste) | T13 | `consentimentoIa: { em, versao } \| null`, lido e gravado, depois dos campos da ficha única |
| `src/domain/tipos.ts`, `src/domain/caso.ts` | T13 | `Caso.origemIa?: { em, modelo }` |
| `src/domain/anamnese.ts` (+ teste) | T13 | pergunta `orcamento` com as três escolhas |
| `src/domain/conta.ts` (+ teste) | T14 | `limiteSugestoesIa` em `PLANOS` (sai de `iaLimites.ts`) e a linha de Planos e preços |
| `src/ui/estado/usarSugestaoIa.ts` (+ teste) | T15 | chama a função, o modo `uso`, os erros e o cancelamento |
| `src/ui/ia/BotaoSugerirComIa.tsx`, `GavetaIa.tsx`, `PedidoDaIa.tsx`, `EsperaDaIa.tsx`, `PropostaDaIa.tsx`, `AdequarComIa.tsx`, `MudancasDaIa.tsx`, `RodapeDaIa.tsx` (+ testes) | T16 a T18 | um componente por arquivo |
| `src/ui/caso/…` (a etapa Refeições) | T18 | os botões na linha das abas, o "Vai para …" e a faixa com "Desfazer" |
| `src/ui/pacientes/AutorizacaoIa.tsx` (+ teste), `src/export/termoIa.ts` (+ teste) | T19 | a chave na ficha e o termo em Word |
| `src/domain/documentoDoPaciente.ts`, `src/domain/folhaDieta.ts`, o Word e o link (+ testes) | T20 | a linha de IA (D-1322) |
| `src/ui/conta/TelaConta.tsx`, `src/ui/publico/…Precos…` (+ testes) | T21 | a linha de uso e a de Planos e preços |
| `src/ui/publico/TelaPrivacidade.tsx`, `TelaTermos.tsx`, `src/domain/legal.ts` (+ testes) | T22 | os textos legais e a versão |
| `e2e/apoio/servidorFalso.ts`, `e2e/apoio/respostasIa.ts`, `e2e/ia.spec.ts` | T23 | o cenário `ia` e os fluxos |

## 2. Tarefas da P1

- [x] **T1 — O banco (016).** Depende de nada. Tabela `public.uso_da_ia` (D-1319) com índices por conta e data e por
  data, RLS e `revoke all` de `anon` e `authenticated`. `reservar_uso_da_ia(p_conta, p_modo, p_consentimento,
  p_limite_mes, p_inicio_mes, p_limite_hora)` com `pg_advisory_xact_lock` por conta: apaga os de mais de 13 meses,
  conta o mês (`ok` + `reservado` de menos de 10 min desde `p_inicio_mes`) e a hora (tudo da última hora), e anota
  `reservado` só se couber; devolve `(id, motivo)`. `concluir_uso_da_ia` só muda o que está `reservado`.
  `uso_da_ia_no_mes` e `custo_da_ia_desde` para o contador e o teto. Funções só para `service_role`. Transação,
  `notify pgrst` e as consultas de conferência no fim. Teste de texto (CA-2322 a CA-2324) e, no Supabase local, RLS,
  concorrência e cascata.
- [x] **T2 — Os limites (domínio).** `LIMITE_DE_SUGESTOES_IA`, `inicioDoMesEmBrasilia`, `renovaEm`,
  `textoDoContador` ("7 de 20 sugestões em novembro") e `textoDoLimite` (CA-2307, CA-2374, D-1321). A função tem a
  mesma tabela (`_shared/iaContrato.ts`), e um teste confere que as duas batem.
- [x] **T3 — O contrato.** `limparPedido` (lista branca, cortes, números na faixa, "[removido]"; CA-2303, CA-2304 e
  CA-2311) e `conferirResposta` (esquema por código, ids, gramas, cortes, `foraDaBase`; CA-2314 e CA-2317).
- [x] **T4 — O catálogo.** `montarCatalogoIa(alimentos)` no domínio e o arquivo gerado na função (CA-2355, D-1315).
  Depende de nada.
- [x] **T5 — O prompt.** As regras (desenho 10.1), o `ESQUEMA_RESPOSTA` (desenho 3.3) e `montarMensagem(pedidoLimpo,
  nomes)` na ordem fixa do desenho 10.2. Testes: sem data nem hora, o texto fixo não muda, a mensagem não tem campo
  fora da lista. Depende de T3 e T4.
- [x] **T6 — A porta da IA.** `criarModeloAnthropic(chave, opcoes, buscar = fetch)`: monta o corpo do CA-2312, lê o
  fluxo (`message_start`, `content_block_*`, `message_delta`, `error`), devolve `ok` / `recusa` / `cortada` /
  `erro-http` / `erro-fluxo` / `demorou` / `sem-rede`, com o uso por modelo (`usage.iterations` quando vier).
  Depende de T5.
- [x] **T7 — O núcleo.** `sugerirPlano(pedido, dependencias)` na ordem do D-1316 (CA-2300 a CA-2321) e a porta falsa
  (CA-2321). Depende de T1 a T6.
- [x] **T8 — A ligação.** `iaSupabase.ts` (RPCs e leituras com `npm:@supabase/supabase-js@2.117.2`) e o `index.ts`
  (CORS, 64 KB, segredos `ANTHROPIC_API_KEY`, `IA_MODELO`, `IA_ESFORCO`, `IA_TETO_DIARIO_USD`, `IA_MODO`). Teste de
  texto: sem decisão no `index.ts`, `npm:` com versão fixa, a chave só lida do ambiente.
- [x] **T9 — O pedido no navegador.** CA-2330 a CA-2335 e CA-2352.
- [x] **T10 — A conferência.** CA-2336 a CA-2350.
- [x] **T11 — O modo adequar e a CSP.** CA-2351, CA-2353 e CA-2354.
- [x] **T12 — A avaliação real.** Os 17 casos do desenho, montados com `perfilParaIa`, chamados pelo núcleo com a
  porta de verdade e conferidos com `conferirSugestao`; mede as metas do desenho (8.3) e escreve o relatório em
  `AVALIAR_IA_SAIDA` (fora do repositório). Pulado sem `AVALIAR_IA=1` e sem `ANTHROPIC_API_KEY`. Não roda sem o "sim"
  do dono para o gasto.

`npm run check` e `npm run test:seguranca` (com o Docker) antes de dizer que terminou.

## 3. Decisões do plano (para o dono revisar)

| # | Decisão |
|---|---|
| DP-IA-1 | **O SQL é o 016.** O 015 é do `marca-no-link`, que vai antes para a `main`. |
| DP-IA-2 | **Os limites ficam em `src/domain/iaLimites.ts` na P1.** `conta.ts` está sendo mudado por outra frente (importar pacientes) e mexer em `PLANOS` muda a página de Preços, que é visível. A P2 junta. |
| DP-IA-3 | **O catálogo é gerado por um teste, não por script `.mjs`.** A regra prescritível e a base ampliada vivem em TypeScript; um `.mjs` teria de copiar a regra. `ATUALIZAR_CATALOGO_IA=1 npx vitest run src/data/iaCatalogo.test.ts` regrava; sem a variável, o teste falha quando a base muda e diz o comando. |
| DP-IA-4 | **A avaliação real é um teste pulado por padrão** (`src/data/avaliacaoIa.test.ts`), pelo mesmo motivo: ela usa o domínio inteiro. |
| DP-IA-5 | **A função lê o fluxo inteiro e só então monta a mensagem.** O fluxo existe para a conexão não ficar parada; mostrar o texto parcial não serve (o JSON só vale inteiro). |
| DP-IA-6 | **A tabela de preços é a da página oficial, conferida em 03/11/2026 (D-1334)** (Opus 5.5: US$ 4 / 5 / 0,20 / 20 por milhão de entrada, gravação de cache de 5 min, leitura e saída; Sonnet 5.5: 2 / 2,50 / 0,10 / 10; Sonnet 5: 2 / 2,50 / 0,20 / 10; Haiku 5.5: 0,10 / 0,125 / 0,01 / 0,50; Opus 5 e Opus 4.8, que a troca automática usa: 5 / 6,25 / 0,50 / 25). O custo anotado é uma estimativa; a fatura é a do Console. |
| DP-IA-7 | **A hora conta todo pedido à IA**, com qualquer resultado; o mês conta só o sucesso (D-1318). Assim a recusa não gasta a cota, mas também não vira um jeito de chamar a IA sem fim. |
| DP-IA-8 | **CRN não encontrado bloqueia a IA na hora**, sem os 7 dias de prazo da exportação: a Política de Uso pede profissional com registro. |

## 4. Riscos do plano

- O Supabase local precisa do Docker ligado para o `test:seguranca`; sem ele, o T1 fica só com o teste de texto e o
  relatório diz.
- A forma exata de `usage.iterations` na troca automática não está na documentação local da skill: a leitura é
  defensiva (sem o campo, vale o uso de cima com o modelo da resposta), e a avaliação real confere.

## 5. Ordem de publicação

1. **Dono:** cria a conta e a chave na Anthropic, põe crédito e o limite do mês (passos 1 a 4 do desenho, seção 9).
2. **Dono:** guarda `ANTHROPIC_API_KEY` em Edge Functions → Secrets (passo 5). Opcionais: `IA_MODELO`, `IA_ESFORCO`,
   `IA_TETO_DIARIO_USD`. Nunca `IA_MODO` em produção.
3. **Dono:** roda o `016-assistente-ia.sql` no SQL Editor, depois do 015.
4. **Eu:** publico a função `sugerir-plano` (`npx supabase functions deploy sugerir-plano --project-ref
   qmpljfjbdcrdbqutuvmg`) e confiro que ela responde 401 sem sessão.
5. **Dono:** diz "sim" ao gasto da avaliação real; eu rodo os 17 casos com a chave numa variável de ambiente local e
   decido o modelo pelas metas (desenho, 8.3).
6. **P2**, depois do protótipo aprovado: telas, textos legais e e2e; publicação do site no dia da versão nova dos
   Termos.

## 6. Rodada de correção (revisão de segurança, 03/11/2026)

A revisão independente reprovou o servidor por 8 achados. Cada um vira decisão na SPEC (D-1329 a D-1336) e teste com o
ID (CA-2382 a CA-2389, CB-1319), em commits novos:

- [x] **T13 — Custo do corte e cancelamento (D-1329, D-1330).** `_shared/iaCusto.ts` (novo: preços e estimativa do
  corte); `iaAnthropic.ts` lê o fluxo aos poucos, junta o sinal do pedido ao prazo e devolve os tokens vistos e
  estimados; `ia.ts` anota `custo_estimado` e responde 499 no cancelamento; `index.ts` passa `req.signal`; o 016 ganha
  a coluna `custo_estimado` e o parâmetro em `concluir_uso_da_ia`.
- [x] **T14 — Limpeza de contato (D-1331).** `iaContrato.ts`: NFKC, e-mail escrito por extenso, @perfil, endereço web
  sem http e sequência de 8 ou mais algarismos; os 21 casos da revisão viram teste.
- [x] **T15 — A porção depois da soma (D-1332).** `iaConferencia.ts` (conferência 8 no total; ajuste só no alimento
  com grupo e até 2.000 g) e `iaMudancas.ts` (soma no máximo do grupo, com a marca e o efeito).
- [x] **T16 — Modelo, preços e texto da IA (D-1333 a D-1335).**
- [x] **T17 — Os testes que faltavam:** CA-2300 (CORS e 405 pelo cabeçalho que a função devolve), CB-1300, CB-1306,
  CB-1308, CB-1311 e CB-1317.

**P2 (D-1336):** a função passa a conferir a autorização gravada na ficha antes de chamar a IA (tarefa nova da P2, junto
do consentimento na ficha).

## 7. Rodada de correção 2 (revisão de segurança, 04/11/2026)

A revisão da rodada 2 reprovou por dois achados médios (cancelamento de ponta a ponta e CPU da limpeza) e quatro
baixos. Decisões D-1337 a D-1341 (e a do cancelamento, depois da prova no edge-runtime local), testes CA-2390 em diante:

- [x] **T18 — CPU da limpeza (D-1337, CA-2390).** `iaContrato.ts`: `textoCurto` corta em 2× o limite antes de limpar;
  `EMAIL` e `DOMINIO` ancorados no início da palavra; as listas param no máximo. Teste de tempo com 60 KB num campo.
- [x] **T19 — O 016 de novo (D-1338, CA-2391).** `add column if not exists custo_estimado` e `drop function if exists`
  da `concluir_uso_da_ia` de 9 parâmetros; o teste de texto cobre os dois; prova no banco de rascunho local.
- [x] **T20 — Cancelar de verdade, ou a spec do que acontece.** Feito: o fluxo não serve (D-1342: o edge-runtime derruba a função sem chamar o `cancel()` e sem deixar concluir o uso); o D-1330, o CA-2383, o CB-1300, o CB-1319, o CA-2366 e o CA-2373 dizem o comportamento real, e os testes também. Tentativa de até 30 min: resposta em fluxo
  (`ReadableStream`) com batimento curto e o `cancel()` do fluxo abortando a chamada à IA, provada com a
  `sonda-cancelar-r2.mjs` no edge-runtime local. Sem prova, o D-1330, o CA-2383 e o CB-1319 passam a dizer o
  comportamento real. Arquivos: `sugerir-plano/index.ts`, `_shared/ia.ts`, a SPEC e os testes da ligação e do núcleo.
- [x] **T21 — Corte por caractere e não-caracteres (D-1339, CA-2392).** `textoCurto` e `cortar` em `iaContrato.ts`.
- [x] **T22 — Texto da IA limpo de contato (D-1340, CA-2393).** `cortar` passa pela limpeza; a NFKC só onde há contato.
- [x] **T23 — Formatos novos de contato (D-1341, CA-2394).** `iaContrato.ts`; os 22 formatos da revisão viram teste.
- [x] **T24 — Recomendação leve: id de "Meus alimentos" (D-1343, CA-2395).** `iaContrato.ts`.
