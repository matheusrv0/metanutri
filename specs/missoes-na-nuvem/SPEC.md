# SPEC — O link do paciente na nuvem

Status: **correção de defeito**, sem decisão nova de produto. Achado em 07/10/2026 durante o lote de segurança.

**O defeito:** a US-2.5 da `estilo-spora` diz que o paciente vê e marca as missões **no celular dele**. Mas, ao criar o
link, a tela da nutricionista grava o acompanhamento só no navegador dela (o `salvar` local do provedor), e a tela de
Adesão lê só esse navegador. Resultado: o paciente abre o link no celular e não acha nada, e o que ele marcaria não
chegaria à nutricionista. O lado do paciente já usa a nuvem (`missoes_por_token` e `marcar_missoes`).

## 1. Decisões

| # | Decisão |
|---|---|
| D-103 | Com conta, criar, gerar de novo ou mudar o link grava o acompanhamento **na nuvem e no aparelho**; remover apaga **nos dois**. Sem servidor (desenvolvimento), continua só no aparelho |
| D-104 | A tela de Adesão (e o cartão do link no plano) **lê os links da conta na nuvem** ao abrir e ao voltar para a aba: as marcações do paciente vêm de lá. A cópia do aparelho continua para abrir sem internet |
| D-105 | Links que só existem neste aparelho (criados antes desta correção) **sobem sozinhos** para a nuvem na primeira leitura com conta |

## 2. Critérios de aceite

- **CA-438** · Dado uma conta, quando a nutricionista cria o link do paciente, então o acompanhamento fica na nuvem (o paciente abre o link em outro aparelho e vê as missões).
- **CA-439** · Dado que a nuvem recusa ou não responde ao salvar, então a tela diz "Não consegui salvar o link na nuvem. O paciente ainda não consegue abrir. Tente de novo." com o botão "Tentar de novo"; a cópia do aparelho fica.
- **CA-440** · Dado "remover o link", então ele some da nuvem e do aparelho; falhando a nuvem, a tela avisa e o link continua.
- **CA-441** · Dado que o paciente marcou missões no celular dele, quando a nutricionista abre Adesão, então as marcações aparecem.
- **CA-442** · Dado o limite de links do plano no servidor, quando a nutricionista passa dele, então aparece "Você chegou ao limite de links do seu plano." e nada fica pela metade.
- **CA-443** · Dado links que só existem neste aparelho, quando Adesão lê a nuvem com conta, então eles sobem para a nuvem; os que não sobem (limite do plano, por exemplo) ficam marcados na tela com o motivo.
- **CA-444** · Sem servidor configurado, tudo funciona como hoje, só no aparelho.

## 3. Casos de borda

- **CB-105** · O mesmo link mudado em dois aparelhos da nutricionista: vale o que está na nuvem.
- **CB-106** · Sem internet ao abrir Adesão: mostra a cópia do aparelho e avisa que não conseguiu atualizar.
