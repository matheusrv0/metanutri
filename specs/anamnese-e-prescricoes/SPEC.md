# SPEC — Anamnese com roteiro, suplementos e pedido de exames

Status: **aprovada pelo dono em 14/10/2026 ("implemente as novidades")**. Escrita em 14/10/2026, a partir dos itens 4
e 5 da seção 3 de `docs/pesquisa/dietbox-comparativo.md` e da seção 4 do mesmo arquivo (o que não copiar).

**Rodada da revisão (15/10/2026):** a revisão do coordenador pediu ajustes de tela, de folha e de dado. Mudaram
D-162, D-169, as seções 2 e 3, CA-563 a CA-565, CA-571 a CA-581, CA-587, CB-162 e R-162, e entrou o CA-589. Dois
pontos da revisão valem para as três frentes e ficam para depois da junção, fora desta spec: a versão antiga do app
apagar chave nova da conta ao enviar a cópia, e salvar um paciente remarcar todos.

**Integração (15/10/2026):** os dois pontos comuns entraram na spec `dados-na-nuvem` (D-170 e D-171). A Política de
privacidade passa a dizer que a ficha também guarda as respostas da anamnese, os suplementos e os pedidos de exame, e
a versão dos termos passa a `2026-10-15` (a mesma mudança de versão da spec `dieta-no-link`). Entra o CA-597.

**Hoje:** a ficha do paciente (`src/ui/pacientes/TelaPaciente.tsx`) tem a anamnese como um campo de texto livre
("Anotações") e um campo "Observações". Não existe suplemento nem pedido de exame. A anamnese não sai em documento
nenhum.

**Objetivo:** toda consulta começa pela anamnese, com um roteiro de perguntas prontas; e o que a comida não fecha vira
suplemento ou exame, escrito pelo nutricionista, num documento curto com a assinatura de quem atende.

**Conduta da nutricionista parceira (20/10/2026).** O roteiro passa a ter 10 blocos, com "Intolerâncias e alergias"
e "Gestação" antes do recordatório, e a Água ganha "Cor da urina" (spec `conduta-da-nutricionista`, D-299, que
substitui o número de blocos do D-160 e do CA-560). Roteiro salvo antes ganha os blocos e a pergunta novos.

**Ficha única (21/10/2026).** A spec `ficha-unica` substitui o D-160 (os blocos passam a 16, na ordem do Processo de
Cuidado em Nutrição, mais o Retorno, e os de fase de vida só aparecem para quem vale), a seção 2 (o roteiro padrão
passa à versão 3), o CA-560 e o CA-565 (os blocos da ficha e da janela) e o CA-569 (o cartão "Restrições e saúde"
deixa de existir: as restrições vão para Alimentação, em escolhas; condições clínicas e medicamentos, para Saúde). O
D-168 continua (a anamnese não sai em documento), mas gestação, restrições, atividade e água passam a alimentar o
plano. O cartão "Suplementos" passa a se chamar "Suplementação prescrita" e o "Apagar paciente", "Excluir paciente".

## 1. Decisões

| # | Decisão | Motivo |
|---|---|---|
| D-160 | O roteiro tem **8 blocos fixos**, nesta ordem: Objetivo e queixa; Rotina e sono; Intestino; Água; Álcool e fumo; Atividade física; Preferências e aversões; Recordatório de 24 horas. O nutricionista edita **as perguntas** de cada bloco (acrescenta, renomeia, tira). Os blocos não mudam nesta versão | Primeira versão pequena. Bloco novo é anamnese por especialidade, que fica fora |
| D-161 | **Um roteiro por conta**, guardado como dado da conta (chave `metanutri:roteiro-anamnese`) e levado para a nuvem. Entre dois aparelhos, o roteiro inteiro vale como um item só: fica a edição mais nova | É uma configuração. Juntar pergunta por pergunta criaria um roteiro que ninguém escreveu |
| D-162 | **O texto livre de antes não é movido nem reescrito.** O campo continua o mesmo e aparece no último bloco, "Outras anotações", com o rótulo "Anamnese de antes", só quando tem texto; o mesmo bloco tem o campo "Observações" da ficha. Abrir a ficha não grava nada | Nada se perde, nem num aparelho com a versão antiga, e abrir a mesma ficha em dois aparelhos não cria conflito na nuvem. Revisão de 15/10: sem dois campos com o mesmo sentido na ficha nova |
| D-163 | **A resposta guarda o texto da pergunta.** Pergunta tirada do roteiro não apaga resposta de paciente: ela continua no bloco, marcada "Fora do roteiro" | Editar o roteiro nunca apaga dado de paciente |
| D-164 | **Nada é sugerido.** Suplementos começam vazios, a conta começa sem modelo de suplemento e nenhum exame vem marcado. O cobrir não cria suplemento nem exame | O plano de negócio pede cuidado com sugestão automática que pareça prescrição |
| D-165 | **Suplementos e pedido de exames moram na ficha do paciente**, não no plano. A lista de suplementos sai também na dieta impressa e no Word de aconselhamento do plano ligado ao paciente | O suplemento acompanha o paciente entre os retornos; o plano duplicado não precisa copiá-lo |
| D-166 | **Modelos de suplemento são dado da conta** (chave `metanutri:modelos-suplemento`), juntados item por item entre aparelhos, como os modelos de plano, e o modelo apagado não volta. Salvar como modelo um suplemento com o mesmo nome de um modelo troca esse modelo | Reusar sem digitar de novo, sem criar dois modelos com o mesmo nome |
| D-167 | **Conta de estudante:** as duas folhas se chamam "Proposta de suplementação" e "Proposta de solicitação de exames", trazem a frase "Proposta do estágio para avaliação do(a) preceptor(a). Só vale com a assinatura do(a) preceptor(a)." e duas linhas de assinatura. Quem decide é a situação da conta (a mesma que escolhe quem assina a dieta), não o plano de assinatura. Na dieta e no Word de plano de estágio, a seção de suplementos leva a mesma frase | É a regra de uso não comercial da conta de estudante, e o que a Lei 8.234/1991 pede de quem ainda não tem CRN |
| D-168 | **A anamnese continua sem sair em documento**, como hoje | Hoje ela não sai em nenhum; imprimir a anamnese fica para depois |
| D-169 | **Pedido de exames:** 15 exames para marcar (seção 3), um campo livre "Outros exames" (um por linha), "Limpar pedido" e a data do dia em que se imprime. Fica guardado só o pedido atual de cada paciente | Primeira versão pequena; histórico de pedidos fica para depois. Os 5 exames a mais vieram da revisão de 15/10 |

## 2. O roteiro padrão

| Bloco | Perguntas |
|---|---|
| Objetivo e queixa | Queixa principal · Histórico do peso · Dietas que já fez · Suplementos que já usa · Doenças na família |
| Rotina e sono | Rotina de trabalho ou estudo · Quem prepara as refeições e onde come · Óleo, sal e açúcar por mês em casa · Horário de dormir e de acordar · Qualidade do sono |
| Intestino | Frequência de evacuação · Consistência das fezes (com a dica da escala de Bristol embaixo do rótulo) · Gases, estufamento ou desconforto |
| Água | Quanta água bebe por dia · Outras bebidas ao longo do dia |
| Álcool e fumo | Bebida alcoólica: o quê e quanto · Fumo |
| Atividade física | Atividade que pratica · Frequência e duração · Horário |
| Preferências e aversões | Alimentos de que gosta · Alimentos de que não gosta · Vontade de doce ou salgado · Apetite e mastigação |
| Recordatório de 24 horas | Ao acordar · Café da manhã · Lanche da manhã · Almoço · Lanche da tarde · Jantar · Ceia |

O "Objetivo" da identificação continua onde está; o bloco "Objetivo e queixa" não o repete. As quatro perguntas
novas e a dica de Bristol (revisão de 15/10) só aparecem para quem ainda não salvou o próprio roteiro: um roteiro
salvo é da conta e não muda sozinho. A dica: "Escala de Bristol: de 1 (bolinhas duras) a 7 (líquida); 3 e 4 são o
esperado."

## 3. Os exames da lista

Hemograma completo · Ferritina · Vitamina D (25-OH) · Vitamina B12 · Ácido fólico · Glicemia de jejum · Insulina de
jejum · Hemoglobina glicada (HbA1c) · Perfil lipídico · TSH · Creatinina · Ureia · Ácido úrico · TGO e TGP · Albumina.

## 4. Histórias e critérios de aceite

Pessoas: **nutricionista**, **estudante** (conta de estágio) e **paciente** (quem recebe a folha).

### US-AP1 · Anamnese com roteiro (5 pts)

Como nutricionista, quero um roteiro de perguntas na ficha, para não esquecer nada na primeira consulta.

- **CA-560** · Dado a ficha do paciente, então o cartão "Anamnese" mostra os 8 blocos do roteiro, na ordem da seção 2, cada um numa linha que abre com um clique e diz quantas perguntas têm resposta ("2 de 3 respondidas") ou "Sem respostas".
- **CA-561** · Dado um bloco aberto, então cada pergunta tem um campo de texto; o que se escreve fica salvo na ficha na hora, e a ficha ganha a data de alteração nova (é o que leva a mudança para a nuvem).
- **CA-562** · Dado o bloco "Recordatório de 24 horas", então cada refeição é um campo de texto, sem cálculo.
- **CA-563** · Dado a ficha aberta, então todos os blocos começam recolhidos, com o resumo das respostas à vista; um botão "Abrir tudo" abre todos e vira "Recolher tudo" quando todos estão abertos.
- **CA-564** · Dado um paciente com texto na anamnese de antes, então o texto aparece inteiro no último bloco, "Outras anotações", no campo "Anamnese de antes", e o resumo do bloco diz "Com anotações"; sem esse texto, o campo não aparece e o bloco tem só "Observações". Abrir a ficha não grava nada.
- **CA-565** · Dado "Editar roteiro", então abre uma janela com o roteiro salvo mais recente (também o salvo em outra aba ou aparelho), com os 8 blocos e as perguntas de cada um em campos editáveis, "Tirar" em cada pergunta e "Acrescentar pergunta" em cada bloco. "Salvar roteiro" grava; "Cancelar" ou fechar descarta.
- **CA-566** · Dado o roteiro salvo, então as fichas de todos os pacientes da conta mostram as perguntas novas, e a pergunta renomeada continua com as respostas que já tinha.
- **CA-567** · Dado "Voltar ao roteiro padrão" na janela, então as perguntas voltam às da seção 2 (vale depois de "Salvar roteiro"), e nenhuma resposta guardada se perde.
- **CA-568** · Dado uma pergunta tirada do roteiro que tinha resposta num paciente, então na ficha dele a resposta continua no mesmo bloco, com o texto da pergunta e a marca "Fora do roteiro", e pode ser editada ou apagada.
- **CA-569** · Dado a ficha, então restrições, condições clínicas e medicamentos continuam no cartão "Restrições e saúde", e as restrições continuam filtrando o cobrir, como hoje.
- **CA-570** · Dado o roteiro, então ele é dado da conta: está em `CHAVES_DE_DADOS`, entra no backup e na cópia da nuvem, e, entre dois aparelhos, fica o roteiro salvo por último.

### US-AP2 · Suplementos (5 pts)

Como nutricionista, quero escrever os suplementos do paciente e entregar numa folha assinada.

- **CA-571** · Dado a ficha, então o cartão "Suplementos" lista os suplementos do paciente, cada um com Nome, Dose, Horário, Por quanto tempo e Observação (esta em várias linhas); "Acrescentar suplemento" cria um vazio; tudo fica salvo na ficha na hora.
- **CA-572** · Dado um suplemento vazio, então "Tirar" o remove na hora; com algum campo preenchido, "Tirar" pede confirmação ("Tirar mesmo" ou "Cancelar") antes de remover.
- **CA-573** · Dado um suplemento com nome, então "Salvar como modelo" o guarda nos modelos da conta e avisa "Modelo salvo."; se já existe modelo com o mesmo nome (sem diferenciar maiúscula e acento), ele é trocado e o aviso é "Modelo atualizado.". Sem nome, o botão fica desligado.
- **CA-574** · Dado "Modelos", então abre a lista dos modelos da conta, em ordem de nome, cada um com o nome, a dose, o horário, por quanto tempo e a observação, "Usar" (acrescenta uma cópia ao paciente e fecha a janela) e "Apagar". Sem modelo, a janela diz "Nenhum modelo ainda. Use “Salvar como modelo” num suplemento da lista."
- **CA-575** · Dado os modelos de suplemento, então eles são dado da conta: estão em `CHAVES_DE_DADOS`, entram no backup e na cópia da nuvem, juntam por modelo entre dois aparelhos, e o modelo apagado num aparelho não volta pelo outro.
- **CA-576** · Dado "Imprimir" nos suplementos, então a prévia mostra uma folha com a logo (a de Configurações, se houver), o título "Suplementação", o nome do paciente e a data do dia por extenso, a lista (o nome em destaque; dose, horário e por quanto tempo na linha de baixo, só o que foi preenchido; a observação embaixo) e, para nutricionista, o nome e o CRN no topo e numa linha de assinatura. "Imprimir ou salvar em PDF" abre a impressão do navegador. Impressa, a folha não deixa a assinatura sozinha numa página (ela vai junto com o último item) e, se passar de uma página, as seguintes trazem no topo o título, o paciente e quem assina, como a dieta (CA-316).
- **CA-577** · Dado um plano ligado a um paciente com suplementos, então a janela "Dieta para imprimir" tem a opção "Suplementos da ficha", ligada ao abrir, e com ela a dieta impressa traz a seção "Suplementos" logo depois de "Orientações"; o Word de aconselhamento traz a seção "SUPLEMENTAÇÃO" logo depois das orientações, com o nome e o detalhe separados por " · ", como na dieta. Sem suplemento, ou plano sem paciente, a opção não aparece e a dieta e o Word saem como hoje.
- **CA-578** · Dado um suplemento sem nome, então ele não sai em folha nenhuma; sem nenhum suplemento com nome, "Imprimir" fica desligado e o cartão diz o porquê: "Nenhum suplemento." com a lista vazia, ou "Escreva o nome de um suplemento para imprimir." Com o exportar bloqueado pelo CRN (CA-290), "Imprimir" também fica desligado, com o mesmo aviso da dieta.

### US-AP3 · Pedido de exames (3 pts)

Como nutricionista, quero pedir exames de laboratório numa folha pronta.

- **CA-579** · Dado a ficha, então o cartão "Pedido de exames" tem os 15 exames da seção 3 para marcar e o campo "Outros exames"; tudo fica salvo na ficha na hora. "Limpar pedido" desmarca tudo e esvazia "Outros exames"; sem nada no pedido, ele fica desligado.
- **CA-580** · Dado "Imprimir pedido", então a prévia mostra uma folha com a logo, o título "Solicitação de exames", o nome do paciente e a data do dia por extenso, a data de nascimento quando a ficha tem, os exames marcados na ordem da lista seguidos de cada linha de "Outros exames", e, para nutricionista, o nome e o CRN no topo e numa linha de assinatura. A impressão segue as regras de página do CA-576.
- **CA-581** · Dado nenhum exame marcado e "Outros exames" vazio, então "Imprimir pedido" fica desligado e o cartão diz "Marque um exame ou escreva em Outros exames." Com o exportar bloqueado pelo CRN (CA-290), "Imprimir pedido" também fica desligado, com o mesmo aviso da dieta.

### US-AP4 · Estudante, segurança e telas (3 pts)

- **CA-582** · Dado uma conta de estudante, então as folhas se chamam "Proposta de suplementação" e "Proposta de solicitação de exames", trazem, logo abaixo do topo, "Proposta do estágio para avaliação do(a) preceptor(a). Só vale com a assinatura do(a) preceptor(a).", e terminam com duas linhas de assinatura: "Estagiário(a)", com o nome da conta, e "Preceptor(a)", com o responsável técnico de Configurações › Quem assina.
- **CA-583** · Dado uma conta de nutricionista sem nome ou sem CRN, então a folha sai com a linha de assinatura "Nutricionista" sem nome, nunca com "null" ou "undefined"; e uma conta sem situação (administrador) sai com uma linha "Assinatura" e sem a frase de estágio.
- **CA-584** · Dado um plano de estágio (estudante, ou plano com estagiário ou preceptor), então a seção de suplementos da dieta impressa e do Word traz a frase de proposta do CA-582.
- **CA-585** · Dado um paciente novo e uma conta nova, então os suplementos estão vazios, nenhum exame está marcado e não existe modelo de suplemento.
- **CA-586** · Dado código malicioso (script, imagem com onerror, link javascript:, svg com onload) numa resposta da anamnese, num suplemento, num modelo ou em "Outros exames", então ele aparece como texto na ficha, nas janelas e nas folhas, e nada executa.
- **CA-587** · Dado a ficha numa tela de 360 px, então nada rola para o lado e todo botão e toda caixa de marcar têm pelo menos 44 px de toque. Abaixo da tela larga (xl), "Histórico de planos" (com "Novo plano") e "Evolução do peso" vêm antes dos cartões longos, e "Apagar paciente" é o último cartão. No topo das folhas, quem assina fica alinhado à esquerda quando cai embaixo do título.
- **CA-588** · Dado uma ficha gravada antes desta mudança (sem os campos novos), então ela abre sem erro, com tudo vazio; e um campo novo estragado (por exemplo, suplementos que não são lista) vira vazio sem apagar o resto da ficha.
- **CA-589** · Dado dado que esta versão não conhece (exame de id desconhecido, resposta de bloco desconhecido, campo a mais num suplemento ou num modelo, bloco desconhecido no roteiro), então ele não aparece na tela nem nas folhas, mas continua guardado depois de ler e salvar de novo.
- **CA-597** · Dado a Política de privacidade, então "Que dados guardamos e para quê" diz, numa frase curta, que a ficha do paciente também guarda a data da próxima consulta (spec `whatsapp-e-retorno`; revisão final de 15/10/2026), as respostas da anamnese, os suplementos e os pedidos de exame, que são dados de saúde com o mesmo cuidado dos outros; e a data da versão é "15 de outubro de 2026". *(integração de 15/10)*

## 5. Casos de borda

- **CB-160** · Navegador sem armazenamento: a ficha funciona como hoje (vale só na sessão); o roteiro fica o padrão, e o roteiro salvo vale até fechar a página.
- **CB-161** · Pergunta com texto vazio ao salvar o roteiro: sai do roteiro. Bloco sem nenhuma pergunta some da ficha, a não ser que tenha resposta "Fora do roteiro".
- **CB-162** · Roteiro guardado estragado: JSON que não se lê vale o roteiro padrão; bloco desconhecido não aparece, mas fica guardado (CA-589); bloco que falta usa as perguntas padrão.
- **CB-163** · Dois aparelhos editam o roteiro: fica o salvo por último (D-161); as respostas de paciente não se perdem (D-163).
- **CB-164** · Dois aparelhos mexem na mesma ficha ao mesmo tempo: vale a regra de hoje, a ficha inteira com a alteração mais nova (ver R-160).
- **CB-165** · Modelo apagado depois de usado: o suplemento do paciente continua, porque é uma cópia.
- **CB-166** · Plano sem paciente ligado: a dieta e o Word não têm seção de suplementos.
- **CB-167** · Paciente apagado: os suplementos e o pedido de exames saem junto com a ficha.
- **CB-168** · Texto longo em observação ou em "Outros exames": a linha quebra na folha, nada é cortado.
- **CB-169** · "Outros exames" com linhas em branco: as linhas em branco não saem na folha.

## 6. Fora de escopo, explicitamente

- Anamnese por especialidade e blocos editáveis (D-160).
- Questionário pré-consulta pelo link do paciente.
- Orçamento em farmácia e fitoterápicos.
- Imprimir a anamnese (D-168) e calcular o recordatório de 24 horas.
- Qualquer sugestão automática de suplemento ou exame (D-164).
- Histórico de pedidos de exame e modelos de pedido (D-169).
- Mandar as folhas pelo WhatsApp.

## 7. Riscos para você revisar

- **R-160** · A junção entre aparelhos é por ficha inteira (CB-164): suplemento acrescentado no celular e resposta escrita no computador, na mesma ficha e antes de um aparelho receber a mudança do outro, fica só a mais nova. É a regra de hoje para qualquer campo da ficha; resolver campo por campo é outra spec.
- **R-161** · A frase de estágio (D-167) segue a situação da conta. Uma conta que fez "Me formei" passa a sair como nutricionista em todas as folhas, inclusive nas reimpressões de pacientes antigos.
- **R-162** · Os nomes dos exames e as perguntas do roteiro padrão foram escritos sem a revisão da nutricionista parceira (as perguntas e os exames acrescentados em 15/10 vieram da revisão do coordenador, também sem ela). Mudam só em código (o roteiro, cada conta pode editar).
