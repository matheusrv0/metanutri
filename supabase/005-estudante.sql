-- MetaNutri — lista de domínios de faculdade (spec conta-e-verificacao, D-41).
-- GERADO por scripts/dominios-faculdades.mjs: não edite à mão, rode o script de novo.
-- Rode no Supabase: SQL Editor > New query > cole tudo > Run. Pode rodar de novo sem estragar nada.
-- Rode ANTES do 006-verificacao.sql, que usa a função eh_email_de_faculdade.
--
-- Até 30/09/2026 este arquivo dava o plano Estudante sozinho quando o e-mail era
-- confirmado. Agora quem aprova é o administrador, olhando o comprovante: por isso
-- o gatilho antigo é apagado aqui, caso alguém tenha rodado a versão anterior.

alter table public.assinaturas add column if not exists expira_em timestamptz;

create table if not exists public.dominios_faculdade (
  dominio text primary key check (dominio ~ '^[a-z0-9-]+(\.[a-z0-9-]+)+$')
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
    add constraint dominios_faculdade_dominio_check check (dominio ~ '^[a-z0-9-]+(\.[a-z0-9-]+)+$');
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
-- dois. Quem chama esta função é a enviar_pedido_estudante (006), como "security definer".
revoke execute on function public.eh_email_de_faculdade(text) from anon, authenticated;

drop trigger if exists aprovar_estudante_ao_confirmar on auth.users;
drop function if exists public.aprovar_estudante();

-- Para aceitar uma faculdade que falta: acrescente o domínio em COMPLEMENTO, em
-- scripts/dominios-faculdades.mjs, rode o script e rode este SQL de novo.
insert into public.dominios_faculdade (dominio) values
  ('aluno.cruzeirodosul.edu.br'),
  ('aluno.ifsp.edu.br'),
  ('anhembi.br'),
  ('baraodemaua.br'),
  ('brazcubas.br'),
  ('candidomendes.br'),
  ('castelobranco.br'),
  ('claretiano.edu.br'),
  ('creupi.br'),
  ('dcc.ufmg.br'),
  ('ecomp.poli.br'),
  ('emescam.br'),
  ('epm.br'),
  ('estacio.br'),
  ('faap.br'),
  ('facens.br'),
  ('faculdadedombosco.edu.br'),
  ('faculdadescuritiba.br'),
  ('fae.edu'),
  ('fatecie.edu.br'),
  ('fecap.br'),
  ('feituverava.com.br'),
  ('fho.edu.br'),
  ('fic.br'),
  ('fmu.br'),
  ('fua.br'),
  ('furb.rct-sc.br'),
  ('furg.br'),
  ('ime.eb.mil.br'),
  ('impa.br'),
  ('impacta.edu.br'),
  ('infnet.edu.br'),
  ('inpg.edu.br'),
  ('insper.edu.br'),
  ('inteli.edu.br'),
  ('ita.br'),
  ('italo.br'),
  ('mackenzie.br'),
  ('maua.br'),
  ('newtonpaiva.br'),
  ('poli.br'),
  ('pop-to.rnp.br'),
  ('puc-rio.br'),
  ('puccamp.br'),
  ('pucminas.br'),
  ('pucpr.br'),
  ('pucrs.br'),
  ('pucsp.br'),
  ('saojudas.br'),
  ('sempreceub.com'),
  ('smarcos.br'),
  ('sp.senac.br'),
  ('stcecilia.br'),
  ('toledo.br'),
  ('toledoprudente.edu.br'),
  ('ucb.br'),
  ('ucg.br'),
  ('ucp.br'),
  ('ucpel.tche.br'),
  ('ucs.tche.br'),
  ('ucsal.br'),
  ('ucsal.edu.br'),
  ('udesc.br'),
  ('uece.br'),
  ('uefs.br'),
  ('uel.br'),
  ('uem.br'),
  ('uema.br'),
  ('uenf.br'),
  ('uenp.edu.br'),
  ('uepb.edu.br'),
  ('uepg.br'),
  ('uerj.br'),
  ('uern.br'),
  ('uesb.br'),
  ('uesc.br'),
  ('uespi.br'),
  ('ufabc.edu.br'),
  ('ufac.br'),
  ('ufal.br'),
  ('ufba.br'),
  ('ufc.br'),
  ('ufcg.edu.br'),
  ('ufes.br'),
  ('uff.br'),
  ('ufg.br'),
  ('ufgd.edu.br'),
  ('ufjf.br'),
  ('ufla.br'),
  ('ufma.br'),
  ('ufmg.br'),
  ('ufms.br'),
  ('ufmt.br'),
  ('ufn.edu.br'),
  ('ufop.br'),
  ('ufpa.br'),
  ('ufpb.br'),
  ('ufpe.br'),
  ('ufpel.tche.br'),
  ('ufpi.br'),
  ('ufpr.br'),
  ('ufrgs.br'),
  ('ufrj.br'),
  ('ufrn.br'),
  ('ufrpe.br'),
  ('ufrrj.br'),
  ('ufs.br'),
  ('ufsc.br'),
  ('ufscar.br'),
  ('ufsj.edu.br'),
  ('ufsm.br'),
  ('uftm.edu.br'),
  ('ufu.br'),
  ('ufv.br'),
  ('ufvjm.edu.br'),
  ('ugf.br'),
  ('ulbra.br'),
  ('ulife.com.br'),
  ('umc.br'),
  ('unaerp.br'),
  ('unama.br'),
  ('unb.br'),
  ('uneb.br'),
  ('unesc.rct-sc.br'),
  ('unesp.br'),
  ('ung.br'),
  ('uni9.edu.br'),
  ('uniara.com.br'),
  ('uniara.edu.br'),
  ('unib.br'),
  ('uniban.br'),
  ('unibosco.br'),
  ('unibrasil.com.br'),
  ('unicamp.br'),
  ('unicap.br'),
  ('unicastelo.br'),
  ('uniceub.br'),
  ('unicid.br'),
  ('unicruz.tche.br'),
  ('unicsul.br'),
  ('unidavi.rct-sc.br'),
  ('unifacs.br'),
  ('unifap.br'),
  ('unifei.edu.br'),
  ('unifenas.br'),
  ('unifeso.edu.br'),
  ('unifesp.br'),
  ('unifor.br'),
  ('unifran.br'),
  ('unig.br'),
  ('unigoias.com.br'),
  ('unigranrio.br'),
  ('unijui.tche.br'),
  ('unimar.br'),
  ('unimep.br'),
  ('unimes.com.br'),
  ('unimonte.br'),
  ('unimontes.br'),
  ('uninove.br'),
  ('unioeste.br'),
  ('unip-objetivo.br'),
  ('unip.br'),
  ('unipe.br'),
  ('unipli.com.br'),
  ('unir.br'),
  ('unirio.br'),
  ('unisa.br'),
  ('unisantos.com.br'),
  ('unisc.br'),
  ('unisinos.br'),
  ('unisul.br'),
  ('unit.br'),
  ('unitau.br'),
  ('uniube.br'),
  ('univale.br'),
  ('univali.br'),
  ('univali.rct-sc.br'),
  ('univap.br'),
  ('univasf.edu.br'),
  ('universo.br'),
  ('univesp.br'),
  ('unochapeco.edu.br'),
  ('unoesc.edu.br'),
  ('unoeste.br'),
  ('unp.br'),
  ('upe.br'),
  ('upe.poli.br'),
  ('upf.tche.br'),
  ('upis.br'),
  ('urca.br'),
  ('urcamp.tche.br'),
  ('uri.br'),
  ('usc.br'),
  ('usf.br'),
  ('usjt.br'),
  ('usp.br'),
  ('usu.br'),
  ('utfpr.edu.br'),
  ('uva.br'),
  ('uvanet.br')
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
