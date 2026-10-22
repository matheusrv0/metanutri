# PLAN — Ficha única

**Spec de origem:** `./SPEC.md` (D-340 a D-366, CA-1030 a CA-1089, CB-340 a CB-356)
**Status:** pedido pelo coordenador em 21/10/2026 ("Apenas faça"); aprovação pelas telas antes de publicar.

## Abordagem

1. **Domínio primeiro, cada parte com o próprio teste.** Restrições (dado + regra), água, campos novos da ficha,
   o plano que lê a ficha e a anamnese da versão 3 são funções puras em `src/domain`, testadas antes da tela.
2. **Um ponto só de leitura.** `casoComFicha(caso, paciente, hoje)` devolve o caso como ele vale (sexo, idade, meses,
   condição, nome, ocupação e diagnóstico da ficha) e os avisos. A `AreaDeTrabalho` calcula esse caso uma vez e o
   entrega a todas as telas que calculam ou imprimem (etapas 1 a 3, exportar, link). A edição continua gravando no
   caso guardado: os campos que vêm da ficha não são editados no plano com paciente.
3. **Restrição como objeto.** `RestricoesDoPaciente` (grupos marcados, linhas de texto e "não gosta") substitui a lista
   de textos em `cobrir.ts`, `trocas.ts` e na folha; um contexto pequeno (`contextoRestricoes.ts`) leva o objeto à
   etapa 2 sem passar por `TelaPlano` e `CartaoRefeicao`, que a frente `alimentos-e-gramaturas` também muda.
4. **Ficha e etapa 1 refeitas com os componentes do design system** (`Card`, `Recolhivel`, `GrupoOpcoes`,
   `CampoTexto`, `CampoNumero`, `Alert`, `Badge`) e dois componentes de tela novos (`EscolhaMultipla` e os campos fixos).

**Suposições (para revisar):**
- A ficha continua uma chave só (`metanutri:pacientes`): os campos novos vão no mesmo objeto, depois dos antigos
  (DP-34). Nenhuma chave nova em `CHAVES_DE_DADOS`.
- O caso ganha só os dois campos da meta de água (`metodoAgua` e `aguaLitros`, T4b), lidos com padrão quando faltam.
  A cópia de nome, sexo e idade no plano novo continua, só para versões antigas do app.
- "Paciente com plano anterior" (R12) é paciente com ao menos um plano salvo.

## Arquivos

| Arquivo | Ação | Tarefa |
|---|---|---|
| `specs/ficha-unica/SPEC.md`, `PLAN.md`; notas datadas em `specs/anamnese-e-prescricoes`, `conduta-da-nutricionista`, `planejador-metanutri`, `pdf-e-telas-limpas`, `revisao-geral-trabalho` | criar / alterar | T1 |
| `src/domain/restricoesDaBase.ts` (novo), `src/domain/restricoes.ts`, testes | criar / alterar | T2 |
| `src/domain/cobrir.ts`, `src/domain/trocas.ts` (a linha da restrição e o "não gosta"), `src/ui/adequacao/GavetaCobrir.tsx`, `MicrosDoDia.tsx`, `TelaAdequacao.tsx`, `src/ui/exportar/FolhaDieta.tsx`, `DialogoImprimir.tsx`, `MenuExportar.tsx`, `src/ui/estado/contextoRestricoes.ts` (novo), `src/ui/plano/SugestoesDaRefeicao.tsx`, `src/ui/plano/LinhaItem.tsx`, testes | alterar | T3 |
| `src/domain/agua.ts` (novo), `src/domain/folhaDieta.ts`, `src/domain/missoes.ts`, `src/ui/caso/CampoAgua.tsx`, testes | criar / alterar | T4 |
| `src/domain/pacientes.ts`, `src/domain/momentoDeVida.ts` (novo), `src/domain/doencas.ts` (novo), testes | alterar / criar | T5 |
| `src/domain/fichaNoPlano.ts` (novo), `src/domain/duplicar.ts`, `src/domain/caso.ts`, testes | criar / alterar | T6 |
| `src/domain/anamnese.ts`, `src/domain/regrasDaFicha.ts` (novo), `src/domain/atividade.ts`, testes | alterar / criar | T7 |
| `src/ui/pacientes/TelaPaciente.tsx`, `CartaoDadosDoPaciente.tsx` (novo), `CampoGestacaoLactacao.tsx` (novo), `AnamneseDaFicha.tsx`, `PerguntaDaAnamnese.tsx` (novo), `CamposDaFicha.tsx` (novo), `EscolhaMultipla.tsx` (novo), `ListaExamesRecentes.tsx` (novo), `DialogoRoteiro.tsx`, `CartaoSuplementos.tsx`, `DialogoModelosSuplemento.tsx`, `TelaPacientes.tsx`, testes | alterar / criar | T8 |
| `src/ui/AreaDeTrabalho.tsx`, `src/ui/caso/TelaCaso.tsx`, `CartaoIdentificacao.tsx`, `CartaoPacienteDoPlano.tsx` (novo), `CartaoPessoa.tsx` → `CartaoMedidas.tsx`, `CartaoDocumento.tsx` (novo), `CampoNivelAtividade.tsx`, `CampoMetaEnergia.tsx`, `src/ui/resumo/AjusteEnergia.tsx`, `src/domain/camposVisiveis.ts`, testes | alterar / criar | T9 |
| `src/domain/caso.ts`, `src/domain/energia.ts` (textos), `src/ui/config/TelaConfiguracoes.tsx`, `src/domain/perfil.ts` (textos 111) | alterar | T10 |
| `e2e/*.spec.ts` que usam a ficha e a etapa 1, `e2e/ficha-unica.spec.ts` (novo) | alterar / criar | T11 |

## Tarefas

| # | Tarefa | Critérios | Depende de |
|---|---|---|---|
| T1 | SPEC, PLAN e notas nas specs antigas | — | — |
| T2 | Restrições: catálogo, mapeamento da base como dado, alimento próprio e receita pelo nome, texto livre que liga grupo, "não gosta" | CA-1073, CA-1078 a CA-1080 | T1 |
| T3 | Restrição no Cobrir, nas trocas, nas sugestões por refeição e na linha do plano | CA-1074 a CA-1077, CA-1081 | T2 |
| T4 | Água pela fase de vida na folha, na missão e no campo (substituída pela T4b) | — | T1 |
| T4b | Meta de água pelo peso (correção do dono): faixas de ml/kg, peso ajustado, Holliday-Segar, gestação e lactação, 1 ml/kcal, valor editável; a DRI como referência | CA-1082 a CA-1084, CA-1090 a CA-1095 | T4, T6 |
| T5 | Campos novos da ficha: leitura segura, ordem, gestação e lactação | CA-1039, CA-1040, CA-1087 a CA-1089 | T1 |
| T6 | O plano lê a ficha: idade na data, condição, nome, ocupação, diagnóstico, divergência, duplicar sem peso | CA-1030 a CA-1035, CA-1041 a CA-1044, CA-1072 (domínio) | T5 |
| T7 | Anamnese 3: blocos, regras, tipos, migração, data da resposta, nível sugerido | CA-1047 a CA-1053, CA-1060 a CA-1063, CA-1065 (domínio) | T5 |
| T8 | A ficha na tela | CA-1038, CA-1045 a CA-1065 | T5, T7 |
| T9 | A etapa 1 na tela e o caso que vale em todas as etapas | CA-1033, CA-1036, CA-1037, CA-1066 a CA-1072 | T4, T6, T7 |
| T10 | Textos restantes das tabelas §3.10 e §3.15 | CA-1085 | T8, T9 |
| T11 | e2e: os testes de antes com os rótulos novos e o teste novo da ficha única (360 px) | CA-1086 e os de tela | T8, T9 |

Cada tarefa vai num commit (Conventional Commits, em português), com o teste antes do código.

## Riscos e decisões para o dono revisar

1. **Junção com `alimentos-e-gramaturas`:** `cobrir.ts`, `trocas.ts`, `LinhaItem.tsx`, `SugestoesDaRefeicao.tsx`,
   `FolhaDieta.tsx`, `DialogoImprimir.tsx` e `CartaoIdentificacao.tsx` (Quantidades) mudam nas duas frentes. Aqui as
   mudanças são pequenas e localizadas (a restrição e a água); na junção, a escolha de quantidade sai do cartão
   "Orientações e documento" da etapa 1.
2. **Junção com `textos-e-promessas`:** o item 111 (Configurações › Quem assina) e as mensagens de missão de água.
3. As listas do Apêndice A e os cortes de idade dependem da conferência da parceira (SPEC, seção 9).

## Desvios na execução (21/10/2026)

- **Água (T4b).** Depois da T4 (AI da DRI como meta, decisão 5 do coordenador), o dono corrigiu: a meta sai do peso,
  ajustada pela idade e pela situação. A spec mudou primeiro (D-355, seção 4, CA-1082 a CA-1084 e CA-1090 a CA-1095) e
  a T4b refez a conta; a AI da DRI ficou como linha de referência.
- **T7 e T8 num commit só.** O roteiro da versão 3 muda os blocos que a tela da ficha desenha: separados, o commit
  da T7 deixaria o teste de tela da anamnese vermelho. Os dois foram juntos.
- **Resumo do link no Retorno** saiu num arquivo próprio (`src/domain/adesaoNoRetorno.ts`), para não mexer em
  `acompanhamento.ts`, que é da frente de textos e da tela Adesão.
- **T9 e T10 num commit só.** Os textos da tabela §3.10 caem nos mesmos componentes da etapa 1 que a T9 refez
  (`CampoMetaEnergia`, a etapa sem paciente, "Mudar para atendimento completo"); o item 111 (Configurações › Quem
  assina, "Preceptor(a)") e o texto da prescrição rápida no "Novo plano" (P-31) foram junto.
- **Etapa 1 em três cartões novos** (`CartaoIdentificacao` refeito, `CartaoMedidas` no lugar de `CartaoPessoa`, e
  `CartaoDocumento`), com `ResumoDoPaciente` e `CamposDoPlanoSemPaciente`. A composição corporal foi para Medidas e
  energia, que é onde a medida mora.

## Correção B (22/10/2026): regras da ficha, adequação, português e menores da revisão de código

**Spec:** `./SPEC.md`, seção 10 (D-450 a D-465, CA-1270 a CA-1300, CB-420 a CB-426). Notas datadas em
`specs/painel-lateral-enxuto` (CA-685, CA-692, CA-697, D-205), `specs/pdf-e-telas-limpas` (CA-338) e
`specs/planejador-metanutri` (CA-04). Corre ao lado da correção A (alimentos, medidas, Cobrir, PDF, `globals.css`):
nada aqui toca `busca.ts`, `cobrir.ts`, `produtos.ts`, `trocas.ts`, `folhaDieta.ts`, `FolhaDieta.tsx`, `LinhaItem.tsx`,
`EntradaRapida.tsx`, `TelaAlimentos.tsx` nem `globals.css`. Em `GavetaCobrir.tsx` e `DialogoImprimir.tsx`, só uma linha
de texto cada.

**Suposições (para revisar):** a pergunta muda de texto pela idade só quando a conta não a renomeou (D-453, D-458);
"Peito e outros alimentos" chega ao plano num campo opcional da condição de lactante (`amamentacao: 'mista'`), que o
plano sem paciente não pede.

| # | Tarefa | Arquivos | Critérios |
|---|---|---|---|
| B1 | Spec e plano | `specs/ficha-unica/SPEC.md`, `PLAN.md`, notas nas specs acima | — |
| B2 | SOP de 12 anos em diante | `src/domain/doencas.ts`, `src/ui/pacientes/CamposDaSaude.tsx`, testes | CA-1270 |
| B3 | Histórico do peso e dietas pela idade | `src/domain/anamnese.ts`, testes | CA-1271 |
| B4 | Saúde da mulher pela idade e pela menstruação | `src/domain/anamnese.ts`, `src/ui/pacientes/PerguntaDaAnamnese.tsx`, testes | CA-1272 a CA-1274, CB-421 |
| B5 | "Com quem mora" sai; dica em Pessoas que moram na casa | `src/domain/anamnese.ts`, `src/ui/pacientes/CartaoDadosDoPaciente.tsx`, testes | CA-1275 |
| B6 | Lactante é quem amamenta; mista muda a energia; acima de 60 meses avisa | `src/domain/momentoDeVida.ts`, `src/domain/tipos.ts`, `src/domain/energia.ts`, `src/domain/fichaNoPlano.ts`, `src/ui/pacientes/CampoGestacaoLactacao.tsx`, testes | CA-1276 a CA-1278, CB-422, CB-423 |
| B7 | Rotina, atividade, escola e dobras pela idade | `src/domain/anamnese.ts`, `src/domain/regrasDaFicha.ts`, `src/domain/camposVisiveis.ts`, `src/ui/pacientes/CartaoDadosDoPaciente.tsx`, `src/ui/caso/CartaoMedidas.tsx`, `src/ui/caso/CamposComposicao.tsx`, testes | CA-1279 a CA-1282 |
| B8 | Adequação "28% da referência" | `src/ui/adequacao/estiloAdequacao.ts`, `TelaAdequacao.tsx`, `ItemListaAdequacao.tsx`, `MicrosDoDia.tsx`, `GavetaCobrir.tsx` (a descrição), testes e e2e | CA-1283 |
| B9 | Panturrilha pelo corte brasileiro | `src/data/antropometria.json`, `src/domain/antropometria.ts`, testes | CA-1284 |
| B10 | Português | `src/domain/energia.ts`, `antropometria.ts`, `adequacao.ts`, `descreverEstagio.ts`, `receitas.ts`, `src/ui/adequacao/*`, `src/ui/resumo/ResumoDoDia.tsx`, `src/export/memorial-docx.ts`, `aconselhamento-docx.ts`, `src/ui/caso/PainelAntropometria.tsx`, `CartaoDocumento.tsx`, `src/ui/exportar/DialogoImprimir.tsx` (uma linha), `src/ui/produtos/TelaProdutos.tsx` (uma linha), `src/ui/publico/*`, `src/seo/paginas.ts`, testes | CA-1285 a CA-1293 |
| B11 | Título do plano | `src/ui/AreaDeTrabalho.tsx`, teste | CA-1294 |
| B12 | Dado de versão futura | `src/domain/persistencia.ts`, `src/domain/momentoDeVida.ts`, `src/domain/pacientes.ts`, testes | CA-1295, CA-1296, CB-424 |
| B13 | Linha da água escrita à mão | `src/ui/caso/CampoAgua.tsx`, teste | CA-1297, CB-425 |
| B14 | Pergunta própria de bloco da versão 2 | `src/domain/anamnese.ts`, testes | CA-1298, CB-426 |
| B15 | Testes que faltavam | `src/domain/copiaDaConta.test.ts`, `src/domain/anamnese.test.ts` | CA-1299, CA-1300 |
| B16 | Os 4 pacientes de novo e os prints | e2e da ficha | CA-1282 |

Cada tarefa vai num commit, com o teste antes do código. Riscos: os cortes de idade novos (12 anos na SOP, 40 e 56 na
menopausa, 14 no anticoncepcional, 3 anos na atividade, 18 nas dobras) e o valor da amamentação mista pedem a
conferência da parceira pela tela.
