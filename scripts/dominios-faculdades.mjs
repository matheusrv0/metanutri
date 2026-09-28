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

writeFileSync('src/data/dominios-faculdades-br.json', `${JSON.stringify(dominios, null, 2)}\n`)

const valores = dominios.map((d) => `  ('${d}')`).join(',\n')
writeFileSync(
  'supabase/005-estudante.sql',
  `-- MetaNutri — plano Estudante aprovado sozinho pelo e-mail da faculdade (spec estilo-spora, D-28).
-- GERADO por scripts/dominios-faculdades.mjs: não edite à mão, rode o script de novo.
-- Rode no Supabase: SQL Editor > New query > cole tudo > Run. Pode rodar de novo sem estragar nada.
--
-- Como funciona: quem cria a conta marcando o Estudante grava "plano_desejado" no
-- cadastro. Quando o e-mail é confirmado, o gatilho confere se o domínio é de
-- faculdade e, se for, dá o plano Estudante por 12 meses. O navegador não consegue
-- se dar o plano: ele não escreve em "assinaturas" (RLS, 003-assinaturas.sql).

alter table public.assinaturas add column if not exists expira_em timestamptz;

create table if not exists public.dominios_faculdade (dominio text primary key);
-- Ninguém lê nem escreve pelo navegador: só a função abaixo consulta.
alter table public.dominios_faculdade enable row level security;

create or replace function public.eh_email_de_faculdade(email text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    split_part(lower(trim(email)), '@', 2) like '%.edu.br'
    or exists (
      select 1 from public.dominios_faculdade d
      where split_part(lower(trim(email)), '@', 2) = d.dominio
         or split_part(lower(trim(email)), '@', 2) like ('%.' || d.dominio)
    ),
    false
  );
$$;

revoke all on function public.eh_email_de_faculdade(text) from public;

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
    where public.assinaturas.status <> 'ativa';
  return new;
end;
$$;

drop trigger if exists aprovar_estudante_ao_confirmar on auth.users;
create trigger aprovar_estudante_ao_confirmar
  after insert or update of email_confirmed_at on auth.users
  for each row execute function public.aprovar_estudante();

-- Para aceitar uma faculdade que falta: insert into public.dominios_faculdade values ('dominio.br');
insert into public.dominios_faculdade (dominio) values
${valores}
on conflict (dominio) do nothing;
`,
)

console.log(`${dominios.length} domínios gravados.`)
