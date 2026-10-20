# SPEC — A dieta no celular do paciente

Status: **aprovada pelo dono em 14/10/2026 ("implemente as novidades")**. Origem: item 1 da seção 3 de
`docs/pesquisa/dietbox-comparativo.md` ("Básico que falta"), com as regras da seção 4 ("O que não copiar").

**Hoje:** o link do paciente (`#/missoes/<token>`) mostra só as missões do dia ("Almoço por volta das 12:00"). A dieta
vai em PDF (`src/ui/exportar/FolhaDieta.tsx`). O paciente que quer saber o que comer no almoço precisa achar o PDF.

**Depois:** o mesmo link ganha uma segunda parte, "Meu plano", com o que a folha impressa mostra: as refeições por
horário, em medida caseira, com os substitutos como "ou", e as orientações. Sem kcal e sem tabela de nutriente.

**Conduta da nutricionista parceira (20/10/2026).** "Meu plano" mostra uma quantidade só, pela escolha do plano entre
"Medida caseira" e "Gramas" (spec `conduta-da-nutricionista`, D-297): a medida caseira sem o peso ao lado, ou só o
peso. Em "Gramas", a cópia do link vai com a medida vazia.

## 1. Decisões

| # | Decisão |
|---|---|
| D-150 | **"Meu plano" mostra o conteúdo da folha impressa que serve ao paciente:** as refeições na ordem do plano (horário e nome), cada alimento com a medida caseira em destaque e o peso ao lado ("6 colheres de sopa · 150 g"; sem medida caseira, só o peso), os substitutos separados por "ou", as orientações e as receitas. **Não entram:** kcal, macro, nutriente, a lista "No dia a dia" (as mesmas frases já estão nas missões), a assinatura, a lista de compras, as trocas e os suplementos da ficha (spec `anamnese-e-prescricoes`; revisão final de 15/10/2026) |
| D-151 | **A dieta do link é uma cópia em texto**, feita na hora: ao gerar o link, ao ligar a dieta, ao "Atualizar a dieta no link" e ao "Gerar link novo". Ela guarda o nome do alimento e a medida já escritos, sem depender da tabela de alimentos do aparelho do paciente: o produto próprio do nutricionista não existe lá, e o paciente não vê a dieta trocar debaixo do pé quando a base muda |
| D-152 | **"Mostrar a dieta no link" é uma caixa no cartão do link, marcada por padrão.** Decisão do dono, **a revisar**: com a caixa marcada por padrão, todo link novo leva o plano alimentar, que é dado de saúde. Desmarcar tira a cópia da dieta da linha na nuvem (a coluna fica vazia); marcar de novo copia o plano de agora. Nos dois casos o endereço do link não muda e as marcações ficam |
| D-153 | **"Atualizar a dieta no link"** aparece só quando a dieta está no link e o plano mudou em algo que o paciente vê (refeição, horário, alimento, quantidade, substituto, orientações ou receitas). Atualiza a dieta **e as missões** com o plano de agora, com o mesmo endereço. As marcações do paciente ficam: a missão de cada refeição tem o id da refeição, e as de frutas, vegetais e água têm id fixo, então o que já foi marcado continua marcado. "Gerar link novo" continua trocando o endereço e as missões, e leva a dieta de agora quando ela está ligada. *Revisto em 14/10/2026, na revisão da frente: antes, atualizava só a dieta* |
| D-154 | **Na tela do paciente, as duas partes ficam em duas abas, "Missões" e "Meu plano"**, logo abaixo da logo, com trilho visível sobre a mesa cinza e o comportamento de abas (setas do teclado mudam de aba; cada aba controla a sua parte). A página abre em "Missões", como hoje. Link sem dieta (desligada, criado antes desta versão ou banco sem o 012) não tem abas: é a tela de hoje, igual |
| D-155 | **O que o paciente não usa não entra na cópia:** refeição sem nenhum alimento não aparece; opção vazia não vira um "ou" solto; orientações e receitas vazias não viram seção |
| D-156 | **Onde fica:** uma coluna nova e opcional `dieta` (jsonb) em `acompanhamentos`, de até 256 KB (o mesmo teto das missões no 011), no arquivo novo `supabase/012-dieta-no-link.sql`, que pode rodar de novo. A função do paciente `missoes_por_token` passa a devolver a coluna, com as mesmas proteções (security definer, search_path fixo, quem executa). A função `marcar_missoes`, a única escrita do paciente, não muda e não toca na dieta. **Ordem:** o dono roda o 012 antes de publicar o site desta versão. Se o site for ao ar antes, ele continua funcionando: o link é salvo sem a dieta e o paciente vê só as missões |
| D-157 | **Privacidade:** a Política de privacidade ganha um item dizendo que o link do paciente pode mostrar o plano alimentar quando o nutricionista liga essa opção, e as frases sobre o link passam a falar da dieta. A versão dos termos e da política passa a `2026-10-14`, mostrada como "14 de outubro de 2026" (na integração de 15/10/2026, `2026-10-15`, "15 de outubro de 2026", ver CA-552). A pergunta de autorização no cartão, antes do primeiro link, diz que o link também mostra o plano alimentar quando a caixa está marcada, e o rascunho de consentimento (`docs/lgpd-rascunhos.md`) passa a citar o plano alimentar no link |
| D-158 | **A cópia guarda o dia em que foi feita** (o dia de Brasília, o mesmo "hoje" do Painel; revisão final de 15/10/2026), e o paciente vê "Atualizada em 14 de outubro de 2026." no fim de "Meu plano": é como ele sabe se o link já tem o plano da última consulta |
| D-159 | **O cartão passa a se chamar "Link do paciente"**, e o botão, "Gerar link do paciente": o link leva missões e dieta. O campo do endereço passa a "Endereço do link", para não repetir o título. Ligar a dieta num link que já existe pede a mesma confirmação de autorização do primeiro link, numa linha, antes de gravar. *Acrescentada em 14/10/2026, na revisão da frente* |

## 2. Critérios de aceite

### A tela do paciente

- **CA-530** · Dado um link com a dieta, quando o paciente abre o link, então aparecem as abas "Missões" e "Meu plano", com "Missões" escolhida, e a tela de missões é a de hoje; com o foco numa aba, as setas do teclado passam para a outra.
- **CA-531** · Dado "Meu plano" escolhido, então cada refeição aparece na ordem do plano, com o horário e o nome, e cada alimento com a medida caseira em destaque, o peso ao lado ("6 colheres de sopa · 150 g") e o nome do alimento. *(19/10/2026: o nome e o peso seguem a folha impressa, na hora de desenhar — nome para o paciente e o peso só ao lado da medida vaga; spec `revisao-geral-publica`, D-231 e CA-748 a CA-750. A cópia guardada não muda.)*
- **CA-532** · Dado uma refeição com substitutos, então as opções aparecem uma depois da outra, separadas por "ou", na ordem principal, substituto 1, substituto 2. *(15/10/2026: com os rótulos "Opção 1" e "ou · Opção 2", como a folha impressa — spec `impressao-do-plano`, CA-645.)*
- **CA-533** · Dado um plano com orientações e receitas, então elas aparecem em "Orientações" e "Receitas", com as quebras de linha que o nutricionista escreveu.
- **CA-534** · "Meu plano" não mostra kcal, macro nem nutriente: a cópia não guarda esses dados, e o que chegar da nuvem além do formato da dieta é descartado.
- **CA-535** · Dado um celular de 360 px de largura, então "Meu plano" cabe sem rolar para o lado, mesmo com um endereço longo (um link do Google Drive) nas orientações, os alimentos têm letra de 16 px ou mais e as abas têm alvos de toque de 44 px.
- **CA-536** · Dado um link sem dieta (desligada, criado antes desta versão ou banco sem o 012), então a tela é a de missões de hoje, sem as abas.
- **CA-537** · Dado um link de conta de estudante, quando o paciente escolhe "Meu plano", então o aviso de estágio continua no topo.
- **CA-538** · Dado "Meu plano", então o fim da parte diz "Atualizada em" e o dia da cópia por extenso ("Atualizada em 14 de outubro de 2026.").

### O cartão do link (nutricionista)

- **CA-539** · Dado um plano sem link, então o cartão mostra a caixa "Mostrar a dieta no link" já marcada, acima do botão de gerar.
- **CA-540** · Dado a caixa marcada, quando o nutricionista gera o link, então o link leva a cópia da dieta do plano de agora.
- **CA-541** · Dado a caixa desmarcada, quando o nutricionista gera o link, então o link sai sem a dieta.
- **CA-542** · Dado a caixa marcada, quando o nutricionista pede para gerar o link, então a pergunta de autorização diz que o link também mostra o plano alimentar; desmarcada, a pergunta não fala da dieta.
- **CA-543** · Dado um link com a dieta, quando o nutricionista desmarca "Mostrar a dieta no link", então o link é salvo sem a dieta (na nuvem, a coluna fica vazia), com o mesmo endereço e as mesmas marcações.
- **CA-544** · Dado um link sem a dieta, quando o nutricionista marca a caixa, então aparece numa linha "Com a dieta, o link também mostra o plano alimentar a quem tiver o endereço. O paciente autorizou?", com "Já tenho a autorização, mostrar a dieta" e "Agora não"; nada é gravado antes de confirmar. Confirmando, a dieta do plano de agora é copiada para o link, com o mesmo endereço; "Agora não" deixa o link sem dieta.
- **CA-545** · Dado um link com a dieta e um plano que mudou em algo que o paciente vê, então o cartão diz "O plano mudou. O paciente ainda vê a dieta anterior." com o botão "Atualizar a dieta no link"; tocar no botão copia a dieta e as missões de agora, com o mesmo endereço e as marcações do paciente, e o aviso some. Se a cópia guardada estiver vazia (nada para o paciente ver), o aviso diz "O paciente ainda não vê a dieta."
- **CA-546** · Dado um link com a dieta e um plano que não mudou no que o paciente vê (por exemplo, só a meta de kcal ou as medidas do paciente), então o aviso e o botão não aparecem.
- **CA-547** · Dado um link com a dieta, quando o nutricionista toca em "Gerar link novo", então o link novo leva a dieta de agora; com a dieta desligada, o link novo continua sem ela.
- **CA-555** · Dado um link com marcações de hoje e um plano que ganhou uma refeição, quando o nutricionista toca em "Atualizar a dieta no link", então a missão nova aparece, as missões já marcadas continuam marcadas e o endereço não muda.

### A nuvem e os dados

- **CA-548** · Dado uma conta, quando o nutricionista salva o link com a dieta, então a linha da nuvem leva a dieta, e o link aberto em outro aparelho mostra "Meu plano" (a função `missoes_por_token` devolve a dieta).
- **CA-549** · Dado o paciente marcando missões, então só as marcações são gravadas: a dieta do link não muda.
- **CA-550** · O `supabase/012-dieta-no-link.sql` cria a coluna `dieta` opcional, com a trava de 256 KB pelo nome, refaz `missoes_por_token` devolvendo a dieta com security definer, search_path fixo e execução só para `anon` e `authenticated`, não mexe em `marcar_missoes`, não apaga dado, roda numa transação só (`begin` e `commit`: a função do paciente nunca fica sem existir para quem abre o link no meio) e pode rodar de novo.
- **CA-551** · Dado o link com a dieta guardado no aparelho, quando a dieta muda, então o link é marcado como mudado na cópia da conta e vai para a nuvem da conta como qualquer outra mudança (sem chave nova).
- **CA-552** · A Política de privacidade diz que o link do paciente pode mostrar o plano alimentar quando o nutricionista liga a opção, e a data da versão é "14 de outubro de 2026". *(Integração de 15/10/2026: com a frase da ficha da spec `anamnese-e-prescricoes`, CA-597, a versão passa a `2026-10-15`, "15 de outubro de 2026"; quem publica acerta a data no dia da publicação.)*
- **CA-553** · Dado o cartão do link, então o título é "Link do paciente", o botão de gerar é "Gerar link do paciente" e o campo do endereço é "Endereço do link"; a caixa e o rascunho de consentimento listam o mesmo conteúdo da Política: refeições, substitutos, orientações e receitas.
- **CA-554** · Dado um texto sem espaço maior que a tela (um endereço longo) no nome da refeição, no alimento, nas orientações ou nas receitas, então ele quebra dentro do cartão, sem empurrar a página para o lado.

> Desde a revisão de 14/10/2026 (D-159), o cartão se chama "Link do paciente" e o botão, "Gerar link do paciente": os
> critérios do cartão valem com os nomes novos.

## 3. Casos de borda

- **CB-150** · Link guardado no aparelho antes desta versão, sem o campo da dieta: lê como link sem dieta e nada quebra.
- **CB-151** · Banco sem o 012: a função antiga não devolve a dieta, e o paciente vê só as missões. Ao salvar o link, o servidor recusa a coluna que não conhece; o site manda de novo sem a dieta, e o link salva como antes.
- **CB-152** · Dieta grande demais para o link (mais de 256 KB, quase sempre orientações ou receitas enormes): o banco recusa pela trava, e o cartão diz "A dieta passou do tamanho que o link guarda. Encurte as orientações ou as receitas, ou desmarque "Mostrar a dieta no link"." Sem "Tentar de novo", porque a mesma dieta seria recusada de novo.
- **CB-153** · Dieta estragada vinda da nuvem ou do aparelho (formato inesperado): conta como link sem dieta; a tela do paciente nunca quebra. Campo desconhecido dentro da dieta é descartado.
- **CB-154** · Sem internet ao ligar, desligar ou atualizar a dieta: a cópia do aparelho fica com a mudança, o cartão mostra o aviso de sempre ("Não consegui salvar o link na nuvem…") com "Tentar de novo", e a próxima leitura da nuvem não desfaz a mudança (CB-108 da `missoes-na-nuvem`).
- **CB-155** · Produto próprio do nutricionista na dieta: vai o nome dele em texto, e o paciente vê mesmo sem a tabela do nutricionista. Alimento que saiu da tabela vira "Alimento removido", como na folha. *(Mudado em 20/10/2026 pelo D-248 da `revisao-geral-trabalho`: o item cujo alimento não existe mais, como o produto apagado, fica de fora da dieta do link e da folha.)*
- **CB-156** · Alimento sem medida caseira conhecida: só o peso ("80 g"), como na folha.
- **CB-157** · O mesmo link mudado em dois aparelhos do nutricionista: vale o que está na nuvem (CB-105), a dieta junto.
- **CB-158** · Aba velha do paciente, ou o nutricionista testando o link no próprio aparelho: marcar missão grava só as marcações pela função do paciente e não desfaz a dieta nem o endereço.
- **CB-159** · Dieta só com orientações, sem nenhuma refeição com alimento (o nutricionista apagou os alimentos depois): "Meu plano" mostra só as orientações. Dieta sem refeição, sem orientação e sem receita conta como link sem dieta, sem seletor.

## 4. Fora de escopo

- O paciente trocar alimento sozinho, ver trocas equivalentes ou montar a refeição.
- Lista de compras para marcar.
- Foto de prato ou do alimento.
- kcal, macros, nutrientes e qualquer número que não seja a quantidade do alimento.
- Atualizar a dieta sozinha quando o plano muda (sempre é um toque do nutricionista).
- Avisar o paciente de que a dieta mudou (WhatsApp é outra frente).
- PDF ou impressão a partir do link.
