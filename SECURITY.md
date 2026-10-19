# Segurança do MetaNutri

## Como avisar uma falha

Achou algo que parece uma falha de segurança? Escreva para **metanutricontato@gmail.com**, com o assunto
"Segurança", e conte:

- o que você encontrou e onde (a tela ou o endereço);
- o passo a passo para repetir;
- o que dá para fazer com isso (por exemplo, ver dado de outra conta).

Pedimos três coisas:

1. **Avise só por e-mail.** Não abra uma issue pública nem publique a falha antes de ela ser corrigida.
2. **Teste só com a sua conta.** Não abra, mude ou apague dado de outra pessoa, e pare assim que confirmar o problema.
3. **Não derrube o site.** Nada de teste de carga, de envio em massa ou de tentar adivinhar a senha de alguém.

A resposta vem pelo mesmo e-mail.

## O que protege o site

Em português simples, o que já está no MetaNutri:

- **Cada conta só vê os próprios dados.** Pacientes, planos, links de missões, cópia na nuvem, assinatura e
  pedido de estudante ficam presos à conta dentro do próprio banco de dados, e não só na tela. Pedir pelo
  endereço do dado de outra conta não traz nada.
- **Só o administrador usa as funções do administrador**, e quem confere isso é o banco, a cada chamada.
- **O administrador entra com dois passos:** a senha e o código de 6 dígitos de um app autenticador no celular.
  Só com a senha, a conta dele é tratada pelo banco como uma conta comum.
- **Os comprovantes de matrícula ficam num lugar privado.** Só a própria pessoa e o administrador abrem, por um
  link que vence em minutos.
- **Os comprovantes são apagados sozinhos.** O servidor confere todo dia e apaga o arquivo 30 dias depois da
  análise; o envio que não virou pedido sai depois de 1 dia. O pedido guarda só os dados digitados e a decisão.
- **Trocar a senha pede o código que chega por e-mail**, e um endereço do site nunca abre já dentro de uma conta.
- **O link do paciente não abre o resto.** Ele tem um código aleatório; quem tem o link vê e marca só as
  missões daquele link, sem conta e sem acesso a mais nada.
- **O cartão não passa pelo MetaNutri.** O número, a validade e o código vão do navegador direto para o Mercado
  Pago, que devolve um código de uso único. Aqui ficam só a bandeira e os 4 últimos números.
- **Limite de tentativas.** As funções de cobrança limitam quantas vezes cada conta tenta um cartão e chama a
  operadora, e o banco limita o tamanho do que cada conta guarda.
- **Verificação contra robôs** no cadastro, no login e na recuperação de senha, e confirmação do e-mail por
  código.
- **Texto digitado é sempre texto.** Nome, observação, missão ou qualquer outro campo aparece como foi escrito;
  código colado num campo não roda, nem na tela, nem na folha impressa, nem no Word.
- **O site não abre dentro de outro site**, para ninguém disfarçar a tela do MetaNutri.
- **Regra de conteúdo (CSP).** O navegador só roda scripts do próprio site, dos campos do cartão do Mercado Pago e da
  verificação contra robôs do Cloudflare, e só conversa com os serviços que o site usa. O teste `npm run test:csp`
  confere isso com os scripts de verdade.
- **Pacotes conferidos.** A publicação para quando o `npm audit` acusa alerta alto ou crítico num pacote que vai para o
  site.

## Os testes de segurança

Os ataques mais comuns viraram testes automáticos (spec `specs/seguranca-lote-4`).

**`npm run check`** (lint, tipos e todos os testes) já inclui:

- código malicioso (`<script>`, `<img onerror>`, `javascript:`, `<svg onload>`) em cada campo de texto livre;
- o limite de pedidos com cartão das funções de cobrança;
- a trava que impede os testes com banco de falar com um Supabase de verdade.

**`npm run test:seguranca`** ataca um banco de verdade, mas **só um Supabase local**, que ele mesmo sobe e
derruba. Ele aplica as migrações de `supabase/` na ordem, cria duas contas e um administrador de teste e tenta,
com o login de uma conta e sem login nenhum: ler, mudar, apagar e criar dado da outra em cada tabela; chamar
cada função do banco com os dados da outra; usar as funções do administrador, inclusive com a conta do
administrador entrando só com a senha; mexer nos arquivos da outra no armazenamento; e mandar texto de SQL
injection em filtros, buscas e campos. Ele também confere a limpeza dos comprovantes, do agendamento até o
arquivo sair do armazenamento (spec `specs/seguranca-lote-5`).

Para rodar:

1. Instale e abra o **Docker Desktop** e espere ele ficar pronto.
2. Na pasta do projeto, rode `npm run test:seguranca`. Na primeira vez ele baixa o Supabase CLI e as imagens,
   e demora alguns minutos.

O que ele responde:

| Saída | Quer dizer |
|---|---|
| `0` | todos os ataques foram barrados |
| `1` | algum teste falhou: leia o relatório na tela |
| `2` | falta algo (Docker parado, CLI ou imagens que não baixaram); ele diz o quê |
| `3` | o Supabase encontrado não era local, e nada rodou |

Ele **nunca** usa a produção: não lê o `.env.local`, não usa projeto ligado e só roda em `127.0.0.1` ou
`localhost`, conferido no script e de novo dentro dos testes. A configuração do Supabase local fica em
`testes/supabase-local/`, separada de `supabase/`, para não mudar nada na publicação.
