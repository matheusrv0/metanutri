# PLAN — Textos e promessas

Spec: `specs/textos-e-promessas/SPEC.md` (D-400 a D-417, CA-1170 a CA-1199, CB-380 a CB-389). Branch da worktree, a
partir da `main` 78c0157.

Cada tarefa é um commit, com o teste antes do código (vermelho, depois verde). A guarda CA-1170
(`src/textosDaFrente.test.ts`) nasce na T1 e cresce a cada tarefa: a tarefa põe os termos dela na lista (vermelho) e
troca os textos (verde). Os e2e que leem um texto trocado mudam na mesma tarefa; a rodada inteira do Playwright roda
na T13.

## Tarefas

| # | Tarefa | Arquivos | Critérios | Depende de |
|---|---|---|---|---|
| T0 | Spec e plano; nota na `site-publico-profissional` sobre os critérios que mudam (CA-999, CA-1000, CA-1001, CA-1003 a CA-1009, CA-1011, CA-1019) | `specs/textos-e-promessas/SPEC.md`, `PLAN.md`, `specs/site-publico-profissional/SPEC.md` | — | — |
| T1 | **Voz única de erro** no cliente (D-401) e a guarda nascendo com "Não consegui", "Não deu para", "O MetaNutri não conseguiu" e "Não dá para desfazer" | `src/textosDaFrente.test.ts` (novo); `src/domain/cartao.ts`, `assinaturaTextos.ts`, `perfil.ts`, `repositorioAcompanhamentos.ts`, `conta.ts` (`MENSAGEM_ERRO`); `src/ui/estado/mensagemDoBanco.ts`, `ProvedorAcompanhamentos.tsx`, `usarNegocio.ts`, `usarSegundoFator.ts`, `usarExclusaoDaConta.ts`; `src/ui/aplicativo/TelaDeErro.tsx`; `src/ui/publico/TelaVoltaPagamento.tsx`; `src/ui/missoes/CartaoLinkMissoes.tsx`, `TelaAdesao.tsx`, `TelaMissoesPaciente.tsx`; `src/ui/aprovacoes/AbaEstudantes.tsx`; `src/ui/casos/DialogoExcluir.tsx`; `src/ui/conta/DialogoExcluirConta.tsx`; os testes que leem essas frases | CA-1170, CA-1171 | T0 |
| T2 | **Mensagens do servidor** na mesma voz (D-401): só o texto; o formato da resposta não muda | `supabase/functions/_shared/assinar.ts`, `cobranca.ts`, `gerenciarAssinatura.ts`, `excluirConta.ts`; `src/data/servidor*.test.ts`; a guarda passa a ler esses quatro | CA-1170, CA-1171 | T1 |
| T3 | **Assinaturas e Preços** (D-405 a D-407): `PLANOS` com limites, `RECURSOS_EM_TODOS_OS_PLANOS`, `porContato` na Clínica, `comparativoDosPlanos` sem Clínica nem suporte; `SecaoPrecos` (título, abertura, três colunas, notas do Estudante e da Clínica, rodapé); `LadoDoPlano`; "Liberado agora" no checkout; o teste das provas | `src/domain/conta.ts` e `.test.ts`, `src/domain/recursosDosPlanos.test.ts` (novo, CA-1179), `src/ui/publico/SecaoPrecos.tsx` e `.test.tsx`, `src/ui/publico/conta/LadoDoPlano.tsx`, `src/ui/publico/TelaCheckout.tsx`, `src/ui/conta/TelaConta.tsx` (resumo); e2e que leem Preços | CA-1178 a CA-1182 | T1 |
| T4 | **Landing** (D-402 a D-404) | `src/ui/publico/TelaInicio.tsx` e `.test.tsx`, `src/App.tsx` (o cartão de alimentos sai, `aoVerFontes` deixa de ser usado pela landing) | CA-1173 a CA-1177 | T3 |
| T5 | **Busca e robôs** (D-415) | `src/seo/paginas.ts`, `cabecalho.ts` e testes, `index.html`, `public/llms.txt`, `src/seo/arquivosDoSite.test.ts`, `src/seo/vitrine.test.tsx` | CA-1183 | T3, T4 |
| T6 | **Páginas públicas** (Termos, Privacidade, Fontes, `baseMetanutri`) | `src/ui/publico/TelaTermos.tsx`, `TelaPrivacidade.tsx`, `TelaFontes.tsx`, `src/domain/baseMetanutri.ts` e testes | CA-1184 | T1 |
| T7 | **Conta, checkout e "Conta e assinatura"** (D-408): telas de conta, checkout, volta do pagamento, assinatura, cartão, tela Conta, menu ("Meus alimentos", "Conta e assinatura") e títulos da área de trabalho | `src/ui/publico/conta/*.tsx`, `src/ui/publico/TelaCheckout.tsx`, `TelaVoltaPagamento.tsx`, `src/domain/assinatura.ts`, `assinaturaTextos.ts`, `cartao.ts`, `src/ui/pagamento/FormularioCartao.tsx`, `src/ui/conta/*.tsx`, `src/ui/layout/MenuLateral.tsx`, `src/ui/AreaDeTrabalho.tsx`, `src/ui/navegacao.ts` (etapas); testes e e2e que leem esses textos | CA-1172, CA-1185 a CA-1187 | T3 |
| T8 | **E-mails** (D-414) | `supabase/emails/*.html`, `src/ui/publico/conta/emails.test.ts` | CA-1188 | T0 |
| T9 | **Painel, lista de planos e primeiro acesso** | `src/ui/painel/TelaPainel.tsx`, `src/ui/casos/TelaCasos.tsx`, `DialogoRenomear.tsx`, `AvisoPrimeiroAcesso.tsx`, `src/domain/exemplo.ts` (só a frase do exemplo), testes | CA-1189 | T1 |
| T10 | **Link do paciente, Adesão e missões** (D-409 no link, D-411, D-412): textos da §3.13 e §3.14, missão das verduras, hora "12h", "me conte", nome do paciente no link novo | `src/ui/missoes/*.tsx`, `src/domain/missoes.ts`, `acompanhamento.ts`, `whatsapp.ts`, `fonteSupabase.ts`, `src/ui/estado/mensagemDoBanco.ts`, `src/ui/AreaDeTrabalho.tsx` (o nome que vai ao link), `src/domain/nomeDoPaciente.ts` (novo); testes e e2e de missões | CA-1190 a CA-1192 | T1 |
| T11 | **Documentos** (D-409, D-410): nome do paciente no plano impresso, no Word e no arquivo; memorial legível; rótulos da §3.17 | `src/domain/nomeDoPaciente.ts`, `src/domain/folhaDieta.ts` (só a linha fina), `src/domain/descreverEstagio.ts` (novo), `src/ui/exportar/*.tsx`, `src/ui/exportar/baixar.ts`, `src/export/aconselhamento-docx.ts`, `memorial-docx.ts`, `copiar-tabela.ts`; testes | CA-1193, CA-1194 | T10 |
| T12 | **Configurações, Ajuda, mensagens do sistema e administração** (D-413, §3.18 a §3.20) | `src/ui/config/TelaConfiguracoes.tsx`, `src/domain/perfil.ts`, `src/ui/ajuda/TelaAjuda.tsx`, `src/ui/nuvem/*.tsx`, `src/domain/persistencia.ts`, `repositorioAcompanhamentos.ts`, `src/ui/publico/conta/AvisoSemServidor.tsx`, `src/ui/estado/usarAssinatura.ts`, `usarPerfilConta.ts`, `src/ui/negocio/ListaDeContas.tsx`, `src/ui/aprovacoes/AbaEstudantes.tsx`, `src/App.tsx`; testes | CA-1195 a CA-1197 | T1 |
| T13 | **Navegador e validação**: e2e da landing, de Preços e da Conta e assinatura (CA-1198, CA-1199); `npm run check`, `npx playwright test` (porta própria), `npm run build`, `npm run test:csp`, `node scripts/conferir-publicacao.mjs`; o Apêndice A da spec com as correções aplicadas | `e2e/textos-e-promessas.spec.ts` (novo), `e2e/servidor-falso/textos-e-promessas.spec.ts` (novo), `specs/textos-e-promessas/SPEC.md` | CA-1198, CA-1199 | T1 a T12 |

## Riscos e decisões marcados para o dono

1. **D-406 / R-400:** a Clínica sai da tabela e do preço público.
2. **D-403 / R-401:** o diferencial compara com "uma lista dos alimentos mais ricos", sem citar a Dietbox.
3. **D-411:** a missão das verduras deixa de contar feijão, batata e mandioca.
4. **R-403:** três funções do servidor para publicar e quatro e-mails para colar no painel.
5. **D-417 / R-404:** os textos dos arquivos das outras frentes ficam com elas; a coerência total vem na junção.
