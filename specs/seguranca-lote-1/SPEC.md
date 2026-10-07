# SPEC — Segurança, lote 1

Status: **pedido do dono** em 06/10/2026 ("veja questões de segurança") e aprovado em 07/10/2026 ("faça o lote de
segurança"). Vem da revisão de segurança de 06/10/2026, que não achou falha crítica: aqui entram as correções de código
de prioridade média e baixa que não dependem do painel.

## 1. Decisões

| # | Decisão |
|---|---|
| D-94 | **"Apagar tudo" apaga também a cópia completa na nuvem.** A mensagem só diz "na nuvem" quando as duas partes foram apagadas |
| D-95 | **O servidor garante o aviso de uso não comercial e o limite de links por plano.** Conta de estudante sempre gera link com o aviso, tenha ou não o plano Estudante aprovado; e o banco recusa link além do limite do plano que vale para a conta. O navegador continua avisando antes, como hoje |
| D-96 | **Sair da conta pergunta se o computador é compartilhado.** "Sair e apagar os dados deste aparelho" apaga pacientes e planos guardados no navegador; "Só sair" mantém. Quando houver mudança que ainda não foi para a nuvem, a janela avisa antes de apagar |
| D-97 | **Endurecimento do servidor:** as funções do servidor só aceitam chamadas vindas de `https://metanutri.com.br`; o banco recusa marcações de missão grandes demais, token de link fora do padrão e envio de comprovante por quem não é estudante (no máximo 3 arquivos por conta); funções internas deixam de ser chamáveis sem login |
| D-98 | **Erros do banco não aparecem crus na tela**: passam pela tradução de mensagens que o resto do app já usa |
| D-99 | **O site não abre dentro de outro site** (moldura/iframe): se for aberto assim, mostra só um aviso com o link para abrir direto |
| D-100 | **O processo de publicação usa versões fixas** das ações do GitHub (pelo identificador do commit), não etiquetas que podem mudar |

## 2. Critérios de aceite

- **CA-420** · Dado "Apagar tudo" com conta, então somem os acompanhamentos e a cópia completa da nuvem; se uma das duas falhar, a mensagem diz o que ficou e nada diz "tudo apagado".
- **CA-421** · Dado uma conta de estudante (aprovada ou não), quando ela cria ou altera um link de paciente, então o link fica com o aviso de uso não comercial, mesmo que o pedido tente gravar sem.
- **CA-422** · Dado uma conta no limite de links do plano que vale para ela (Free 2, Estudante 3, Solo 25; Pro e Clínica sem limite), quando tenta criar mais um, então o banco recusa com uma mensagem que a tela traduz ("Você chegou ao limite de links do seu plano.").
- **CA-423** · Dado o botão "Sair", então abre a janela com "Sair e apagar os dados deste aparelho" e "Só sair"; apagar remove os pacientes e planos guardados neste navegador e sai.
- **CA-424** · Dado mudança ainda não enviada para a nuvem, quando a pessoa escolhe apagar, então a janela avisa que essa mudança se perde e pede confirmação.
- **CA-425** · Dado uma chamada às funções do servidor vinda de outro endereço que não `https://metanutri.com.br`, então o navegador não recebe permissão (o cabeçalho de origem não é `*`).
- **CA-426** · Dado marcações de missão com mais de 64 KB ou mais de 400 itens, então o banco recusa.
- **CA-427** · Dado um link de paciente com token fora de 12 a 64 letras minúsculas e números, então o banco recusa.
- **CA-428** · Dado uma conta que não é de estudante, quando tenta enviar comprovante, então o armazenamento recusa; dado estudante com 3 arquivos, o quarto é recusado.
- **CA-429** · Dado as funções internas do banco desta área (verificação, aprovações), então nenhuma é executável sem login.
- **CA-430** · Dado um erro do banco ao salvar ou apagar na nuvem, então a tela mostra a mensagem traduzida, não o texto técnico.
- **CA-431** · Dado o site aberto dentro de uma moldura de outro site, então só aparece "Abra o MetaNutri direto no navegador." com o link.
- **CA-432** · Dado o arquivo de publicação, então cada ação do GitHub está fixada pelo identificador do commit, com a versão num comentário.

## 3. Fora de escopo

- O que depende do painel do Supabase ou de conta externa (captcha, segundo fator do administrador): fica para depois.
- Regras da cobrança: ficam na `cobranca-em-producao`.
