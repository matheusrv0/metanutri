// Gera a lista de domínios de e-mail de faculdades brasileiras do plano Estudante
// (spec estilo-spora, D-28) e o SQL que aprova a conta sozinho no servidor.
//
// Fonte: Hipo/university-domains-list (licença MIT), mais um complemento revisado à
// mão com universidades que faltam na fonte. Qualquer .edu.br também vale: só
// instituição de ensino registra esse domínio.
//
// Saídas: src/data/dominios-faculdades-br.json (a tela avisa antes do cadastro) e
// supabase/005-estudante.sql (o servidor decide). Uso: node scripts/dominios-faculdades.mjs
import { writeFileSync } from 'node:fs'

const FONTE = 'https://raw.githubusercontent.com/Hipo/university-domains-list/master/world_universities_and_domains.json'

const COMPLEMENTO = [
  'unifesp.br', 'unesp.br', 'ufrgs.br', 'ufc.br', 'ufpr.br', 'ufg.br', 'ufv.br', 'ufla.br', 'uff.br', 'uerj.br',
  'ufscar.br', 'unirio.br', 'ufjf.br', 'ufop.br', 'ufu.br', 'ufrn.br', 'ufpb.br', 'ufal.br', 'ufs.br', 'ufpi.br',
  'ufma.br', 'ufpa.br', 'ufmt.br', 'ufms.br', 'ufes.br', 'ufsm.br', 'uel.br', 'uem.br', 'unioeste.br', 'uepg.br',
  'uece.br', 'uefs.br', 'uneb.br', 'upe.br', 'uenf.br', 'unip.br', 'mackenzie.br', 'pucsp.br', 'pucrs.br',
  'pucpr.br', 'pucminas.br', 'unisinos.br', 'ulbra.br', 'univali.br', 'unisul.br', 'fmu.br', 'usjt.br',
  'unicsul.br', 'unaerp.br', 'unifor.br', 'unicap.br', 'ucsal.br',
]

// Domínios genéricos demais para entrar na lista: se a fonte pública ou o
// complemento trouxer um destes, é sinal de erro (domínio truncado, ou a fonte
// listou o provedor de e-mail de alguém em vez do domínio da universidade), e o
// script para para alguém olhar antes de aprovar meio-mundo como Estudante.
const BLOQUEADOS = new Set([
  'com.br', 'org.br', 'net.br', 'edu.br', 'gov.br',
  'gmail.com', 'hotmail.com', 'outlook.com', 'yahoo.com', 'yahoo.com.br',
  'bol.com.br', 'uol.com.br', 'terra.com.br', 'icloud.com',
])

const resposta = await fetch(FONTE)
if (!resposta.ok) throw new Error(`Fonte fora do ar: ${resposta.status}`)
const universidades = await resposta.json()

const valido = (d) => /^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(d)
const dominios = [
  ...new Set(
    [...universidades.filter((u) => u.country === 'Brazil').flatMap((u) => u.domains ?? []), ...COMPLEMENTO]
      .map((d) => String(d).trim().toLowerCase())
      .filter(valido),
  ),
].sort()

for (const bloqueado of BLOQUEADOS) {
  if (dominios.includes(bloqueado)) {
    throw new Error(
      `Domínio genérico demais na lista final: "${bloqueado}". A fonte pública ou o complemento trouxe algo ` +
        'errado (domínio truncado, ou um provedor de e-mail em vez de uma universidade). Corrija antes de gerar o SQL.',
    )
  }
}

const foraDoBr = dominios.filter((d) => !d.endsWith('.br'))
console.log(`${foraDoBr.length} domínio(s) fora de .br: ${foraDoBr.length > 0 ? foraDoBr.join(', ') : '(nenhum)'}`)

writeFileSync('src/data/dominios-faculdades-br.json', `${JSON.stringify(dominios, null, 2)}\n`)

const valores = dominios.map((d) => `  ('${d}')`).join(',\n')
writeFileSync(
  'supabase/005-estudante.sql',
  `-- MetaNutri — plano Estudante aprovado sozinho pelo e-mail da faculdade (spec estilo-spora, D-28).
-- GERADO por scripts/dominios-faculdades.mjs: não edite à mão, rode o script de novo.
-- Rode no Supabase: SQL Editor > New query > cole tudo > Run. Pode rodar de novo sem estragar nada.
--
-- ############################################################################
-- # PRÉ-REQUISITO: Supabase > Authentication > Sign In / Providers > Email > #
-- # "Confirm email" LIGADO. Desligado, qualquer um que digitar um e-mail de  #
-- # faculdade ganha o plano Estudante sem ter a caixa de entrada.           #
-- ############################################################################
--
-- Como funciona: quem cria a conta marcando o Estudante grava "plano_desejado" no
-- cadastro. Quando o e-mail é confirmado, o gatilho confere se o domínio é de
-- faculdade e, se for, dá o plano Estudante por 12 meses. O navegador não consegue
-- se dar o plano: ele não escreve em "assinaturas" (RLS, 003-assinaturas.sql).

alter table public.assinaturas add column if not exists expira_em timestamptz;

create table if not exists public.dominios_faculdade (
  dominio text primary key check (dominio ~ '^[a-z0-9-]+(\\.[a-z0-9-]+)+$')
);
-- Ninguém lê nem escreve pelo navegador: só a função abaixo consulta.
alter table public.dominios_faculdade enable row level security;

-- Quem já rodou a versão anterior desta migração (sem o check acima): acrescenta
-- a restrição agora. Em instalação nova a tabela já nasce com ela, e o nome da
-- restrição abaixo é o mesmo que o Postgres dá automaticamente ao check da coluna
-- — por isso o "duplicate_object" cobre os dois casos.
do $$
begin
  alter table public.dominios_faculdade
    add constraint dominios_faculdade_dominio_check check (dominio ~ '^[a-z0-9-]+(\\.[a-z0-9-]+)+$');
exception
  when duplicate_object then null;
end $$;

create or replace function public.eh_email_de_faculdade(email text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  with normalizado as (
    select lower(trim(email)) as endereco
  ),
  dominio as (
    select split_part(endereco, '@', 2) as dom
    from normalizado
    -- Só um "@", com algo antes e depois: bate com dominioDoEmail do TypeScript.
    where endereco ~ '^[^@]+@[^@]+$'
  )
  select coalesce(
    (
      select
        right(dom, 7) = '.edu.br'
        or exists (
          select 1 from public.dominios_faculdade d
          where dom = d.dominio
             or right(dom, length(d.dominio) + 1) = '.' || d.dominio
        )
      from dominio
    ),
    false
  );
$$;

revoke all on function public.eh_email_de_faculdade(text) from public;
-- O Supabase concede execução a "anon" e "authenticated" por padrão; tira dos
-- dois. Quem chama esta função é só o gatilho abaixo, como "security definer".
revoke execute on function public.eh_email_de_faculdade(text) from anon, authenticated;

create or replace function public.aprovar_estudante()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.email_confirmed_at is null then return new; end if;
  if tg_op = 'UPDATE' and old.email_confirmed_at is not null then return new; end if;
  if coalesce(new.raw_user_meta_data ->> 'plano_desejado', '') <> 'estudante' then return new; end if;
  if not public.eh_email_de_faculdade(new.email) then return new; end if;

  insert into public.assinaturas (nutricionista_id, plano, status, expira_em, atualizado_em)
  values (new.id, 'estudante', 'ativa', now() + interval '12 months', now())
  on conflict (nutricionista_id) do update
    set plano = 'estudante', status = 'ativa', expira_em = excluded.expira_em, atualizado_em = now()
    where public.assinaturas.status <> 'ativa' and public.assinaturas.preapproval_id is null;
  return new;
end;
$$;

drop trigger if exists aprovar_estudante_ao_confirmar on auth.users;
create trigger aprovar_estudante_ao_confirmar
  after insert or update of email_confirmed_at on auth.users
  for each row execute function public.aprovar_estudante();

-- Para aceitar uma faculdade que falta: acrescente o domínio em COMPLEMENTO, em
-- scripts/dominios-faculdades.mjs, rode o script e rode este SQL de novo.
insert into public.dominios_faculdade (dominio) values
${valores}
on conflict (dominio) do nothing;

-- Conferência (comentada: fica registrada aqui, mas não roda sozinha; copie e
-- cole no SQL Editor depois de rodar o script acima).
-- select
--   public.eh_email_de_faculdade('maria@usp.br')          as usp,             -- true
--   public.eh_email_de_faculdade('maria@aluno.ufrj.br')    as aluno_ufrj,      -- true
--   public.eh_email_de_faculdade('joao@alguma.edu.br')     as edu_br,          -- true
--   public.eh_email_de_faculdade('maria@falsausp.br')      as falsa_usp,       -- false
--   public.eh_email_de_faculdade('maria@usp.br.golpe.com') as usp_golpe,       -- false
--   public.eh_email_de_faculdade('maria@gmail.com')        as gmail;           -- false
--
-- Depois de um cadastro real marcando Estudante com e-mail de faculdade
-- confirmado, confira a linha da pessoa em public.assinaturas: "plano" deve ser
-- 'estudante', "status" 'ativa' e "expira_em" por volta de 12 meses à frente.
`,
)

console.log(`${dominios.length} domínios gravados.`)
