# SPEC — Segurança, lote 2

Status: **aprovado pelo dono** em 07/10/2026, com o teto de 1000 links (R-40) aceito. Vem da auditoria de segurança de 07/10/2026 (Fase 1 do pacote
"Blindagem"), que não achou falha crítica nem alta. Este lote põe limites no servidor: quanto cada conta grava e
quantas vezes chama a cobrança. Em 07/10/2026 não havia nenhuma cópia na nuvem nem nenhum link gravado em produção,
então nenhum limite novo recusa dado que já existe.

## 1. Decisões

| # | Decisão |
|---|---|
| D-107 | **Tamanho máximo do que a conta guarda na nuvem.** A cópia completa vai até 5 MB. Cada link de paciente: missões até 256 KB, marcações até 1 MB (o mesmo teto que o paciente já tem), nome até 120 caracteres e os códigos de caso e de paciente até 64. No máximo 1000 links por conta, em qualquer plano (Pro e Clínica continuam sem limite de plano; 1000 é o teto técnico) |
| D-108 | **Limite de chamadas à cobrança por conta.** Até 10 pedidos com cartão por hora, somando assinar e trocar cartão, com qualquer resultado. Até 20 pedidos por hora para conferir se já houve cobrança e para cancelar. Acima disso, a função responde sem chamar a operadora. O limite de cartões recusados do D-101 continua valendo |
| D-109 | **O registro de avisos guarda no máximo 100 avisos não conferidos por hora** (sem segredo, sem id, recurso inválido ou assinatura que não confere). Acima disso, o aviso é respondido do mesmo jeito, mas não é anotado. Os avisos conferidos são sempre anotados. Muda o CA-399, o CA-436 e o CA-437 da `cobranca-em-producao` |
| D-110 | **O pedido às três funções de cobrança vai até 64 KB.** Acima disso, a função recusa sem ler o resto |
| D-111 | **Só estudante com e-mail de faculdade confirmado envia comprovante.** É a mesma condição que o pedido de estudante já exige; sem ela, o arquivo não serve para nada. O limite de 10 arquivos continua |
| D-112 | **A função antiga das vagas de fundador é apagada.** Não existe mais preço de fundador (D-78), e nada no site a usa |

## 2. Critérios de aceite

- **CA-445** · Dado uma cópia completa com mais de 5 MB, quando a conta tenta enviar para a nuvem, então o banco recusa e a tela diz "A cópia passou de 5 MB, o máximo da nuvem. ~~Seus dados continuam neste aparelho.~~ Apague o que não precisa para voltar a salvar." *(Texto trocado em 08/10/2026 pela spec `dados-na-nuvem`: os dados ficam na nuvem, e a cópia passa a ir sozinha; o que resolve é reduzir os dados, CB-123.)*
- **CA-446** · Dado um link com missões acima de 256 KB, marcações acima de 1 MB, nome acima de 120 caracteres ou código de caso ou de paciente acima de 64, quando a conta salva, então o banco recusa e a tela diz "Este link ficou grande demais. Tire algumas missões e tente de novo."
- **CA-447** · Dado uma conta com 1000 links, quando ela cria mais um, então o banco recusa e a tela diz "Você chegou ao limite de links do seu plano." (a mensagem que o CA-422 já usa).
- **CA-448** · Dado 10 pedidos com cartão na última hora na mesma conta (assinar e trocar cartão, qualquer resultado), quando ela tenta de novo, então a função responde "Muitas tentativas seguidas. Espere uma hora e tente de novo." (429) sem chamar a operadora.
- **CA-449** · Dado 20 pedidos de conferir ou de cancelar na última hora na mesma conta, quando ela tenta de novo, então a função responde a mesma mensagem do CA-448 (429) sem chamar a operadora. A janela de cancelar mostra essa mensagem no lugar de "Não consegui conferir se já houve cobrança." e continua sem deixar confirmar.
- **CA-450** · Dado 100 avisos não conferidos anotados na última hora, quando chega outro não conferido, então ele recebe a mesma resposta de hoje e não é anotado. Um aviso conferido é anotado mesmo depois desses 100.
- **CA-451** · Dado um pedido com mais de 64 KB a `assinar`, `gerenciar-assinatura` ou `webhook-mercadopago`, então a função responde 413 sem processar nada e sem chamar a operadora.
- **CA-452** · Dado uma conta de estudante sem e-mail de faculdade confirmado, quando ela tenta enviar comprovante, então o armazenamento recusa e a tela diz "Confirme o e-mail da faculdade antes de enviar o comprovante."
- **CA-453** · Dado o banco depois deste lote, então a função das vagas de fundador não existe mais.

## 3. Casos de borda

- **CB-112** · A cópia recusada por tamanho não apaga a cópia anterior da nuvem: a última que coube continua lá.
- **CB-113** · Exatamente no limite passa (5 MB, 256 KB, 1 MB, 120, 64, o 1000º link, o 10º e o 20º pedido); só o que passa do limite é recusado.
- **CB-114** · A contagem de pedidos falha: a função não chama a operadora e responde que não conseguiu falar com o servidor de cobrança, como o D-101 faz.
- **CB-115** · Pedidos de conferir ou cancelar que chegam no mesmo instante, da mesma conta, passam do limite em no máximo um.

## 4. Fora de escopo

- **Captcha no cadastro e no login:** fica para o lote 3. Precisa de uma conta sua na Cloudflare, de um pacote novo e de
  mudar o site e o painel ao mesmo tempo.
- **Regra de conteúdo no navegador (CSP):** depois, quando o checkout estiver estável, porque precisa ser testada com ele.
- **Pacotes de build com alerta (`npm audit fix`):** manutenção à parte, sem mudança de comportamento.
- **Ficam como estão, por decisão:**
  - quem tem o link do paciente regrava as marcações dele com frequência; o teto de 1 MB já existe;
  - o limite de 30 recusas por hora no site inteiro (D-101);
  - a logo vinda de um backup importado;
  - o `supabase-js` baixado do esm.sh com versão fixa.

## 5. Riscos para revisar

- **R-40** · 1000 links por conta é um teto técnico para Pro e Clínica, que a página de preços chama de "sem limite". Uma nutricionista real não chega perto disso. Se preferir outro número, diga qual.
- **R-41** · A API do Supabase pode recusar pedidos menores que 5 MB por conta própria. Se isso acontecer, o limite real da cópia é o dela, e a mensagem do CA-445 precisa aparecer também nesse caso.
- **R-42** · Envios de comprovante feitos ao mesmo tempo ainda podem passar um pouco de 10 arquivos. Com o e-mail de faculdade exigido (D-111), isso pede uma conta com e-mail institucional verdadeiro, e a limpeza de arquivos sem pedido continua igual.
