# SPEC — Dados por conta no aparelho

Status: **aprovada pelo dono** em 07/10/2026 ("apenas arrume logo"). Pedido do dono, depois de ver a tela "Este aparelho tem dados de
outra conta": "mudou de conta, já era, tem que salvar por conta".

**Hoje:** o navegador guarda um conjunto só de planos e pacientes, com um dono (spec `estilo-spora`, D-24). Quando outra
conta entra, o site trava na tela "Este aparelho tem dados de outra conta" e oferece sair ou apagar tudo (CA-152, CA-153).

## 1. Decisões

| # | Decisão |
|---|---|
| D-120 | **Cada conta tem os próprios dados no aparelho:** planos, pacientes, casos, produtos, modelos, perfil, acompanhamentos, sugestões e impressão. Quem entra vê só os dados da própria conta; uma conta que nunca usou o aparelho começa vazia |
| D-121 | **Trocar de conta não apaga nada.** Os dados da conta que saiu ficam guardados e escondidos, e voltam quando ela entrar de novo |
| D-122 | **A tela "Este aparelho tem dados de outra conta" deixa de existir.** Substitui o CA-152 e o CA-153 da `estilo-spora` |
| D-123 | **Os dados que já estão no aparelho continuam com quem é dono deles hoje.** Dados sem dono (de antes da conta obrigatória) vão para a primeira conta que entrar, como já acontece (CA-151) |
| D-124 | **"Sair e apagar os meus dados deste aparelho" apaga só os dados da conta que está saindo.** Os de outras contas continuam. O mesmo vale para "Apagar todos os seus dados deste aparelho", em Configurações. Os textos falam dos dados de quem está dentro e não contam que outra conta usa o aparelho: "Outras pessoas usam este computador? Apague os seus pacientes e planos guardados neste navegador.", "Apagar os seus dados deste aparelho?" e "Seus dados foram apagados deste aparelho. Recarregue a página." A Política de privacidade muda junto (dados separados por conta; o que some com "Apagar tudo" ou "Sair e apagar"), e a versão dos termos e da política passa a ser a de 08/10/2026 |
| D-125 | **Exportar e importar o backup e a cópia na nuvem valem só para a conta que está dentro** |
| D-126 | **O que é do aparelho continua do aparelho:** o tema claro ou escuro e o e-mail esperando confirmação |
| D-127 | **Conflito na migração não esconde nada.** Quando um dado de antes já existe na conta com outro valor, os dois são juntados: planos diferentes ficam os dois (o mais novo pelo `atualizadoEm` fica com o id; o outro ganha id novo e entra no índice); o mesmo paciente fica com a versão mais nova pelo `atualizadoEm` (sem data, a da conta); produtos e modelos diferentes com o mesmo id ficam os dois (o de fora ganha id novo); o mesmo link de acompanhamento fica com o da conta, a menos que só o de fora tenha mudança que ainda não foi para a nuvem; configurações ficam com o valor da conta; nenhum dado é escondido. Acrescentada em 08/10/2026, na revisão final, e refinada no mesmo dia (pacientes pela data; produtos e modelos com id novo) |

## 2. Critérios de aceite

- **CA-465** · Dado a conta A com pacientes neste aparelho, quando a conta B entra, então B não vê nenhum dado de A e a tela "Este aparelho tem dados de outra conta" não aparece.
- **CA-466** · Dado que B criou um paciente neste aparelho, quando A entra de novo, então A vê os próprios dados, como deixou, e nenhum dado de B.
- **CA-467** · Dado um aparelho com dados de antes desta mudança, quando a conta dona deles entra, então ela vê tudo como antes: nada some.
- **CA-468** · Dado um aparelho com dados sem dono, quando uma conta entra, então esses dados passam a ser dela.
- **CA-469** · Dado A e B com dados no aparelho, quando A sai escolhendo "Sair e apagar os meus dados deste aparelho", então somem só os dados de A, e os de B continuam.
- **CA-470** · Dado o backup (exportar e importar) e a cópia na nuvem, então eles leem e gravam só os dados da conta que está dentro.
- **CA-471** · Dado o tema escolhido, então ele continua o mesmo para qualquer conta neste aparelho.
- **CA-472** · Dado uma aba antiga do site que grava depois da migração, quando a conta entra de novo, então a edição feita naquela aba aparece (D-127).
- **CA-473** · Dado o navegador sem espaço no meio da migração, então a conta vê exatamente o que já foi movido, com os planos no índice, e a tela avisa: "Parte dos dados guardados antes neste aparelho ainda não apareceu: o armazenamento do navegador está cheio. Feche outras abas do MetaNutri e recarregue a página."
- **CA-474** · Dado uma leitura da nuvem em andamento, quando a conta troca, então nenhum dado de uma conta é gravado ou enviado na outra.

## 3. Casos de borda

- **CB-120** · Sair e entrar com outra conta na mesma aba, sem fechar o site: nenhum dado da conta anterior aparece, nem por um instante.
- **CB-121** · Navegador que não deixa guardar nada (aba anônima bloqueada): o site funciona como hoje.
- **CB-122** · Uma conta que nunca usou o aparelho entra: começa vazia, sem erro, e o aviso de primeiro acesso aparece para ela.

## 4. Fora de escopo

- Juntar os dados de duas contas, ou passar dados de uma conta para outra.
- Limite de quantas contas podem usar o mesmo aparelho.
- Sincronizar entre aparelhos: continua sendo a cópia na nuvem.
