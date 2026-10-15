# SPEC — Dados na nuvem, presos à conta

Status: **aprovada pelo dono** em 08/10/2026. Pedido: "nada deve ser salvo no aparelho, e sim na nuvem ou em algo que
prenda a conta, tem que existir apenas sair". Decisões dele no mesmo dia: "Dados em qualquer aparelho" sai da comparação
de planos (vale para todos) e, sem internet, o site trava.

**Nota de 15/10/2026 (integração das novidades):** entram D-170, D-171, CA-590 a CA-595, CB-170 e CB-171. A revisão das
frentes `anamnese-e-prescricoes` e `whatsapp-e-retorno` achou dois problemas comuns: uma versão antiga do site apagava
as chaves novas da conta (roteiro de anamnese e modelos de suplemento) em todos os aparelhos, e salvar um paciente
remarcava todos os outros como mudados agora, o que deixava um aparelho desatualizado passar por cima de edições feitas
em outro. Vale para todas as contas, desde a publicação das novidades.

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
| D-170 | **Uma versão antiga do site não apaga o que não conhece.** Uma aba aberta antes de uma atualização (ou o aplicativo instalado que ainda não se atualizou) salva a cópia sem os dados que ela não conhece, como o roteiro de anamnese e os modelos de suplemento. O aparelho que conhece esses dados não os apaga ao receber essa cópia: eles ficam e voltam sozinhos para a nuvem. Só uma exclusão de verdade, feita por uma versão que conhece o dado, apaga em todos os aparelhos. *(15/10/2026)* |
| D-171 | **Salvar um item não mexe nos outros.** Criar, editar ou apagar um paciente, um link, um produto, um modelo de plano ou um modelo de suplemento conta como mudança só daquele item. Os outros continuam com a hora da última mudança de verdade, para um aparelho desatualizado não passar por cima de uma edição feita em outro. *(15/10/2026)* |

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

## 3. Casos de borda

- **CB-123** · Cópia acima de 5 MB (limite do lote 2): a tela mostra a frase do CA-445 e trava como no D-130 até a pessoa reduzir os dados. *(A trava tem "Reduzir os dados", que tira a capa para a pessoa apagar o que não precisa; crescer de novo trava de novo. Plano, DP-9.)*
- **CB-124** · Duas abas da mesma conta abertas: as mudanças de uma aparecem na outra sem apagar nada.
- **CB-125** · A sessão vence no meio do uso: o que faltava salvar não se perde; a pessoa entra de novo e continua.
- **CB-126** · O link do paciente (sem conta) continua funcionando como hoje.
- **CB-127** · Uma aba esquecida aberta enquanto outro aparelho muda um plano: quando a pessoa volta a ela e edita outro campo do mesmo plano, a mudança do outro aparelho continua. A aba confere a nuvem antes de deixar editar ("Atualizando…"). *(Acrescentado em 08/10/2026, na revisão final.)*
- **CB-170** · Plano que some da cópia da nuvem: foi excluído em outro aparelho (toda versão com a nuvem conhece os planos), então sai daqui, como antes do D-170. *(15/10/2026)*
- **CB-171** · Lista (por exemplo, os modelos de suplemento) que some da cópia com só parte dos itens excluídos de verdade: os excluídos saem; os outros ficam e voltam para a nuvem. *(15/10/2026)*

## 4. Fora de escopo

- Excluir a conta pelo site (continua por pedido no e-mail de contato, como diz a Política).
- Histórico de versões ou desfazer na nuvem.
- Uso sem internet (decisão do dono: trava).
