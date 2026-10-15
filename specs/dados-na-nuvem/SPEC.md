# SPEC — Dados na nuvem, presos à conta

Status: **aprovada pelo dono** em 08/10/2026. Pedido: "nada deve ser salvo no aparelho, e sim na nuvem ou em algo que
prenda a conta, tem que existir apenas sair". Decisões dele no mesmo dia: "Dados em qualquer aparelho" sai da comparação
de planos (vale para todos) e, sem internet, o site trava.

**Nota de 15/10/2026 (integração das novidades):** entram D-170, D-171, CA-590 a CA-595, CB-170 e CB-171. A revisão das
frentes `anamnese-e-prescricoes` e `whatsapp-e-retorno` achou dois problemas comuns: uma versão antiga do site apagava
as chaves novas da conta (roteiro de anamnese e modelos de suplemento) em todos os aparelhos, e salvar um paciente
remarcava todos os outros como mudados agora, o que deixava um aparelho desatualizado passar por cima de edições feitas
em outro. Vale para todas as contas, desde a publicação das novidades.

**Revisão final de 15/10/2026:** o D-170 ganha a regra da hora (só volta para a nuvem o valor daqui que é o mais novo),
e entram D-172 (aviso de versão nova), CA-598 a CA-603.

**Rodada 3 de 15/10/2026:** a revisão focada achou dois caminhos em que o valor mais velho ainda voltava para a nuvem
(a lista inteira subindo com um item velho, e o roteiro velho subindo depois de recarregar). Entram D-173, CA-604 a
CA-609 e CB-172.

**Rodada 4 de 15/10/2026:** entra o CA-610 (a edição da pessoa no valor retido vale mesmo com o relógio atrasado).

**Hoje:** os dados (planos, pacientes, produtos, modelos, perfil, acompanhamentos) ficam no navegador, separados por conta
(spec `dados-por-conta`), com uma cópia na nuvem enviada à mão em Configurações. Sair pergunta se apaga os dados do
aparelho.

## 1. Decisões

| # | Decisão |
|---|---|
| D-128 | **Os dados ficam na nuvem, presos à conta.** Entrar em qualquer aparelho mostra os mesmos dados. O navegador só guarda uma cópia de trabalho enquanto a pessoa está dentro |
| D-129 | **Toda mudança vai para a nuvem sozinha**, em poucos segundos. A tela mostra "Salvo" ou "Salvando…" |
| D-130 | **Sem internet, o site trava:** a área de trabalho fica coberta por "Sem internet. Suas últimas mudanças ainda não foram salvas na nuvem. Conecte-se para continuar." e não deixa editar. Quando a internet volta, o que faltava vai para a nuvem e a área destrava sozinha |
| D-131 | **Só existe "Sair".** Ao sair, a cópia de trabalho do navegador é apagada sozinha. Somem "Só sair", "Sair e apagar os meus dados deste aparelho", "Apagar todos os seus dados deste aparelho" e os botões de enviar e trazer a cópia na nuvem em Configurações. Exportar e importar o backup em arquivo continuam |
| D-132 | **Dois aparelhos ao mesmo tempo não se apagam.** Antes de salvar, o site confere se a nuvem mudou desde a última vez; se mudou, junta as duas versões item por item (a mudança mais nova de cada item vence) e só então salva. O que foi excluído num aparelho continua excluído no outro |
| D-133 | **Na primeira entrada depois desta mudança**, o que já está no navegador vai para a nuvem: sem cópia na nuvem, sobe como está; com cópia na nuvem, as duas são juntadas como no D-132. Nada se perde |
| D-134 | **"Dados em qualquer aparelho" sai da comparação de planos e da lista de recursos dos planos**, porque vale para todas as contas |
| D-170 | **Uma versão antiga do site não apaga o que não conhece.** Uma aba aberta antes de uma atualização (ou o aplicativo instalado que ainda não se atualizou) salva a cópia sem os dados que ela não conhece, como o roteiro de anamnese e os modelos de suplemento. O aparelho que conhece esses dados não os apaga ao receber essa cópia: eles ficam e voltam sozinhos para a nuvem. Só uma exclusão de verdade, feita por uma versão que conhece o dado, apaga em todos os aparelhos. *(15/10/2026)* **Revisão final:** só volta para a nuvem o valor daqui que é igual ou mais novo que a última mudança que a cópia conhece; o valor daqui mais velho fica aqui, sem subir, porque outro aparelho tem o mais novo e o devolve. Uma aba nova devolve as chaves logo ao abrir, sem esperar uma edição |
| D-171 | **Salvar um item não mexe nos outros.** Criar, editar ou apagar um paciente, um link, um produto, um modelo de plano ou um modelo de suplemento conta como mudança só daquele item. Os outros continuam com a hora da última mudança de verdade, para um aparelho desatualizado não passar por cima de uma edição feita em outro. *(15/10/2026)* |
| D-172 | **Versão nova do site avisa, sem recarregar sozinha.** Quando uma versão nova do MetaNutri passa a valer no navegador, a área de trabalho mostra no topo, no fluxo da página (sem cobrir nada), "Há uma versão nova do MetaNutri." com "Atualizar", que recarrega a página. Nada recarrega sozinho, para não perder o que a pessoa está digitando. Assim uma aba aberta antes de uma publicação não fica dias com a versão velha. *(revisão final de 15/10/2026)* |
| D-173 | **Um aparelho nunca sobe um valor mais velho que a última mudança que a nuvem conhece dele.** Quando a cópia da nuvem não traz um valor (a chave inteira, ou um item de uma lista) e sabe de uma mudança mais nova dele, o valor mais velho deste aparelho fica só aqui, retido: não volta para a nuvem nem quando o aparelho salva outra coisa, recarrega ou abre outra aba, e a nuvem continua sabendo da mudança mais nova, para o aparelho que a tem devolvê-la. O valor retido sai dessa situação quando o valor mais novo chega ou quando a pessoa edita o valor aqui (aí a edição dela é a mais nova e sobe como qualquer edição). Com todos os aparelhos na mesma versão nada muda: o que a cópia traz é o que vale aqui, mesmo que a hora deste aparelho seja mais nova (um relógio atrasado não faz perder edição). *(rodada 3, 15/10/2026)* |

## 2. Critérios de aceite

- **CA-475** · Dado uma conta com dados, quando ela entra em outro navegador, então vê os mesmos planos, pacientes, produtos, modelos e perfil.
- **CA-476** · Dado uma mudança feita, então em poucos segundos ela está na nuvem e a tela mostra "Salvo".
- **CA-477** · Dado que a internet cai, então a área de trabalho fica coberta pela mensagem do D-130 e não deixa editar; quando volta, o que faltava é salvo e a área destrava sozinha.
- **CA-478** · Dado "Sair", então não há pergunta sobre apagar: a pessoa sai, e o navegador não guarda mais os dados dela.
- **CA-479** · Dado mudança ainda não salva na nuvem (sem internet), quando a pessoa clica em "Sair", então o site avisa "Há mudanças que ainda não foram salvas na nuvem. Se sair agora, elas se perdem." com "Ficar" (padrão) e "Sair mesmo assim".
- **CA-480** · Dado dois aparelhos da mesma conta mudando itens diferentes, então nenhum apaga a mudança do outro; dado o mesmo item mudado nos dois, fica a mudança mais nova; dado um item excluído num aparelho, ele não volta pelo outro.
- **CA-481** · Dado um navegador com dados de antes desta mudança, quando a conta entra, então eles vão para a nuvem (juntando com a cópia que já existir) e nada some.
- **CA-482** · Dado Configurações, então não existem os botões de apagar dados do aparelho nem os de enviar e trazer a cópia na nuvem; exportar e importar o backup em arquivo continuam.
- **CA-483** · Dado a página de preços, então "Dados em qualquer aparelho" não aparece na comparação nem nos recursos dos planos.
- **CA-484** · Dado que a entrada não consegue trazer os dados da nuvem (sem internet), então a tela diz "Sem internet. Conecte-se para abrir seus dados." e tenta de novo quando a internet volta.
- **CA-590** · Dado um aparelho aberto com o roteiro de anamnese e modelos de suplemento, quando chega da nuvem uma cópia salva por uma versão antiga do site (sem essas duas chaves), então o roteiro e os modelos continuam no aparelho e, em poucos segundos, voltam para a nuvem, junto com a mudança que a versão antiga fez. *(15/10/2026)*
- **CA-591** · Dado o mesmo caso do CA-590 com o aparelho fechado, quando ele abre de novo, então o roteiro e os modelos continuam e voltam para a nuvem. *(15/10/2026)*
- **CA-592** · Dado o roteiro ou um modelo de suplemento excluídos de verdade em outro aparelho, quando a cópia chega (mesmo que salva depois por uma versão antiga), então eles saem daqui também e não voltam para a nuvem. *(15/10/2026)*
- **CA-593** · Dado dois pacientes guardados por uma versão anterior (sem os campos novos da ficha), quando um deles é salvo, então só ele conta como mudado; o outro fica exatamente como estava guardado. *(15/10/2026)*
- **CA-594** · Dado a ficha da Ana editada no aparelho A e o aparelho B, desatualizado, salvando a ficha da Bia, quando as duas cópias se juntam, então a edição da Ana feita em A continua. *(15/10/2026)*
- **CA-595** · Dado links, modelos de suplemento, produtos e modelos de plano guardados, quando um deles é salvo, criado ou apagado, então só ele conta como mudado. *(15/10/2026)*
- **CA-598** · Dado fichas gravadas por esta versão, quando uma aba da versão de antes das novidades salva só uma delas, então as outras continuam com o mesmo texto e não contam como mudadas. *(revisão final de 15/10/2026)*
- **CA-599** · Dado dois aparelhos com roteiros diferentes e a cópia de uma versão antiga sem o roteiro, mas com a hora do roteiro mais novo, quando os dois aplicam essa cópia, então só o aparelho com o roteiro mais novo o devolve à nuvem; o outro fica com o dele sem subir e recebe o mais novo depois. *(revisão final de 15/10/2026)*
- **CA-600** · Dado uma aba antiga que salvou sem as chaves novas, quando uma aba nova abre no mesmo navegador (ou confere a nuvem depois de a aba antiga salvar), então o roteiro e os modelos voltam para a nuvem sem esperar uma edição. *(revisão final de 15/10/2026)*
- **CA-601** · Dado um link igual no aparelho e na nuvem, quando a lista de links vem da nuvem, então o link do aparelho não é regravado nem conta como mudado. *(revisão final de 15/10/2026)*
- **CA-602** · Dado o site aberto na área de trabalho, quando uma versão nova do aplicativo passa a valer, então aparece no topo "Há uma versão nova do MetaNutri." com "Atualizar"; a página não recarrega sozinha, e "Atualizar" recarrega. *(revisão final de 15/10/2026)*
- **CA-603** · Dado o aviso de versão nova, então o site continua sem script escrito dentro da página e o aplicativo continua instalando e ligando o service worker sem violar a regra de conteúdo (CSP). *(revisão final de 15/10/2026)*
- **CA-604** · Dado o aparelho N2 que editou o modelo de suplemento "a" e fechou, e a cópia de uma versão antiga sem os modelos, quando o aparelho N1 (com o "a" velho e o "b" igual) aplica essa cópia, então o "a" velho não volta para a nuvem, N2 continua com o "a" novo e um aparelho novo recebe o "a" novo. *(rodada 3)*
- **CA-605** · Dado o aparelho N1 com o roteiro mais velho que a cópia sem o roteiro conhece, quando N1 aplica a cópia, recarrega, abre uma aba nova e confere de novo, então nada disso faz o roteiro velho subir, e no fim N2 e um aparelho novo ficam com o roteiro novo. *(rodada 3)*
- **CA-606** · Dado N1 com o roteiro velho retido, quando a pessoa edita um paciente em N1 e a cópia sobe, então o roteiro velho não vai junto; depois que N2 abre, a nuvem volta a ter o roteiro novo, e o paciente editado em N1 também fica. *(rodada 3)*
- **CA-607** · Dado N2 com o modelo "a" novo e N3 com o modelo "b" novo, e a cópia de uma versão antiga sem os modelos, quando os dois abrem, então a nuvem fica com o "a" e o "b" novos. *(rodada 3)*
- **CA-608** · Dado todos os aparelhos na mesma versão e um aparelho X com o relógio atrasado, quando X edita depois de N2 (com uma hora menor) e N2 aplica a cópia, então N2 fica com a edição de X. *(rodada 3)*
- **CA-609** · Dado N1 com o roteiro velho retido, quando a pessoa edita o roteiro em N1, então a edição dela sobe como qualquer edição. *(rodada 3)*
- **CA-610** · Dado N1 com o roteiro retido e o relógio atrasado (a hora de N1 é menor que a marca que o roteiro retido guarda), quando a pessoa edita o roteiro em N1 e o salvar cai numa junção, então a edição dela não volta a ficar retida: ela fica com uma hora logo depois da marca que substituiu e sobe. *(rodada 4)*

## 3. Casos de borda

- **CB-123** · Cópia acima de 5 MB (limite do lote 2): a tela mostra a frase do CA-445 e trava como no D-130 até a pessoa reduzir os dados. *(A trava tem "Reduzir os dados", que tira a capa para a pessoa apagar o que não precisa; crescer de novo trava de novo. Plano, DP-9.)*
- **CB-124** · Duas abas da mesma conta abertas: as mudanças de uma aparecem na outra sem apagar nada.
- **CB-125** · A sessão vence no meio do uso: o que faltava salvar não se perde; a pessoa entra de novo e continua.
- **CB-126** · O link do paciente (sem conta) continua funcionando como hoje.
- **CB-127** · Uma aba esquecida aberta enquanto outro aparelho muda um plano: quando a pessoa volta a ela e edita outro campo do mesmo plano, a mudança do outro aparelho continua. A aba confere a nuvem antes de deixar editar ("Atualizando…"). *(Acrescentado em 08/10/2026, na revisão final.)*
- **CB-170** · Plano que some da cópia da nuvem: foi excluído em outro aparelho (toda versão com a nuvem conhece os planos), então sai daqui, como antes do D-170. *(15/10/2026)*
- **CB-171** · Lista (por exemplo, os modelos de suplemento) que some da cópia com só parte dos itens excluídos de verdade: os excluídos saem; os outros ficam e voltam para a nuvem. *(15/10/2026)*
- **CB-172** · As lápides vencem em 90 dias: um aparelho fechado por mais de 90 dias pode trazer de volta uma chave ou um item (que não seja plano) que outro aparelho apagou. *(rodada 3)*

## 4. Fora de escopo

- Excluir a conta pelo site (continua por pedido no e-mail de contato, como diz a Política).
- Histórico de versões ou desfazer na nuvem.
- Uso sem internet (decisão do dono: trava).
