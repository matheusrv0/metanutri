import { PLANOS } from '@/domain/conta.ts'
import { LIMITE_DE_LINKS } from '@/domain/fonteSupabase.ts'
import { LIMITE_DE_COMPROVANTES } from '@/domain/pedidoEstudante.ts'
import sql003 from '../../supabase/003-assinaturas.sql?raw'
import sql from '../../supabase/011-seguranca-lote-2.sql?raw'

const corpoDa = (nome: string) => sql.split(`create or replace function public.${nome}(`)[1]?.split('$$;')[0] ?? ''
const cabecalhoDa = (nome: string) => sql.split(`create or replace function public.${nome}(`)[1]?.split('as $$')[0] ?? ''
/** O que roda direto quando o arquivo roda: o SQL sem o corpo das funções. */
const foraDasFuncoes = sql.replace(/\$\$[\s\S]*?\$\$/g, '')
const inicioDaTabela = sql.indexOf('create table if not exists public.chamadas_da_cobranca (')
/** Só o bloco da tabela de chamadas. */
const tabela = sql.slice(inicioDaTabela, sql.indexOf(');', inicioDaTabela))
const ASSINATURA_DA_CHAMADA = 'public.anotar_chamada_da_cobranca(uuid, text, integer, timestamptz)'

describe('banco: segurança, lote 2 (011)', () => {
  it('pode rodar de novo: nenhum dado é apagado, cada trava sai pelo nome antes de entrar, e tabela e índices só nascem se faltam', () => {
    expect(foraDasFuncoes).not.toMatch(/\b(drop table|truncate|delete from)\b/i)
    const travas = [...sql.matchAll(/add constraint (\w+) check/g)].map((m) => m[1] ?? '')
    expect(travas).toHaveLength(6)
    for (const nome of travas) {
      const sai = sql.indexOf(`drop constraint if exists ${nome};`)
      expect(sai, nome).toBeGreaterThan(-1)
      expect(sai, nome).toBeLessThan(sql.indexOf(`add constraint ${nome} check`))
    }
    const criacoes = sql.split('\n').filter((linha) => /^\s*create (table|index)/i.test(linha))
    expect(criacoes).toHaveLength(3)
    for (const linha of criacoes) expect(linha).toMatch(/if not exists/i)
    expect(sql).toContain('drop trigger if exists conferir_link_do_paciente on public.acompanhamentos;')
    expect(sql).toContain('drop policy if exists "estudante envia o proprio comprovante" on storage.objects;')
  })

  describe('D-107: o tamanho do que a conta guarda na nuvem', () => {
    it('CA-445 e CB-113: a cópia completa vai até 5 MB, medida como o banco guarda; 5 MB exatos passam', () => {
      expect(sql).toContain('alter table public.copias add constraint copias_dados_tamanho check (pg_column_size(dados) <= 5242880);')
      expect(5242880).toBe(5 * 1024 * 1024)
    })

    it('CA-446 e CB-113: missões até 256 KB, marcações até 1 MB, nome até 120 e códigos de caso e de paciente até 64; o limite exato passa', () => {
      expect(sql).toContain('alter table public.acompanhamentos add constraint acompanhamentos_missoes_tamanho check (pg_column_size(missoes) <= 262144);')
      expect(sql).toContain('alter table public.acompanhamentos add constraint acompanhamentos_marcacoes_tamanho check (pg_column_size(marcacoes) <= 1048576);')
      expect(sql).toContain('alter table public.acompanhamentos add constraint acompanhamentos_nome_tamanho check (char_length(nome) <= 120);')
      expect(sql).toContain('alter table public.acompanhamentos add constraint acompanhamentos_caso_id_tamanho check (char_length(caso_id) <= 64);')
      expect(sql).toContain('alter table public.acompanhamentos add constraint acompanhamentos_paciente_id_tamanho check (char_length(paciente_id) <= 64);')
      expect([262144, 1048576]).toEqual([256 * 1024, 1024 * 1024])
    })

    it('CB-112: a trava é da própria tabela, sem gatilho nem limpeza antes de gravar: a cópia recusada deixa a anterior como estava', () => {
      expect(sql).not.toMatch(/on public\.copias\s+for each row/i)
      expect(sql).not.toMatch(/delete from public\.copias/i)
    })
  })

  describe('CA-447: no máximo 1000 links por conta, em qualquer plano', () => {
    const corpo = corpoDa('conferir_link_do_paciente')

    it('os limites de cada plano continuam os de limiteLinksPaciente', () => {
      expect(corpo).toContain("v_limite := case coalesce(v_plano, 'free')")
      for (const plano of PLANOS) {
        if (plano.id === 'free') expect(corpo).toMatch(new RegExp(`else ${plano.limiteLinksPaciente}\\s+end;`))
        else expect(corpo, plano.id).toContain(`when '${plano.id}' then ${plano.limiteLinksPaciente ?? 'null'}`)
      }
    })

    it('o plano sem limite fica com o teto de 1000, e nenhum plano passa dele', () => {
      const teto = corpo.indexOf('v_limite := least(coalesce(v_limite, 1000), 1000);')
      expect(teto).toBeGreaterThan(corpo.indexOf("v_limite := case coalesce(v_plano, 'free')"))
    })

    it('CB-113: com 999 links o milésimo passa; com 1000, o próximo é recusado com a frase que a tela já traduz (CA-422)', () => {
      expect(corpo).toMatch(/if v_links >= v_limite then\s+raise exception 'Você chegou ao limite de links do seu plano\.' using errcode = 'P0001';/)
      expect(corpo).toContain(`'${LIMITE_DE_LINKS}'`)
    })

    it('a contagem vale em todo plano, com a trava contra duas abas antes de contar', () => {
      expect(corpo).not.toContain('if v_limite is not null then')
      const trava = corpo.indexOf("perform pg_advisory_xact_lock(hashtext('links:' || new.nutricionista_id::text));")
      expect(trava).toBeGreaterThan(corpo.indexOf('v_limite := least('))
      expect(trava).toBeLessThan(corpo.indexOf('select count(*) into v_links from public.acompanhamentos where nutricionista_id = new.nutricionista_id;'))
    })

    it('o resto do gatilho do 010 continua: o aviso de estudante, só link novo conta, antes de criar e de alterar', () => {
      expect(corpo).toMatch(/if exists \(select 1 from public\.perfis where id = new\.nutricionista_id and situacao = 'estudante'\) then\s+new\.uso_nao_comercial := true;/)
      expect(corpo).toContain("if tg_op = 'INSERT' and not exists (select 1 from public.acompanhamentos where id = new.id) then")
      expect(sql).toMatch(/create trigger conferir_link_do_paciente\s+before insert or update on public\.acompanhamentos\s+for each row execute function public\.conferir_link_do_paciente\(\);/)
      expect(sql).not.toMatch(/(revoke|grant)[^;]*function public\.conferir_link_do_paciente\(/)
    })
  })

  describe('D-108: as chamadas de cada conta à cobrança', () => {
    const corpo = corpoDa('anotar_chamada_da_cobranca')

    it('a tabela guarda só a conta, o tipo (cartao ou conferir) e a hora', () => {
      expect(inicioDaTabela).toBeGreaterThan(-1)
      expect(tabela).toContain('id bigint generated always as identity primary key,')
      expect(tabela).toContain('nutricionista_id uuid not null references auth.users (id) on delete cascade,')
      expect(tabela).toContain("tipo text not null check (tipo in ('cartao', 'conferir')),")
      expect(tabela).toContain('quando timestamptz not null default now()')
      expect(tabela).not.toMatch(/email|\bip\b|endereco|cartao_final|token/i)
    })

    it('índices pela conta, pelo tipo e pela hora (para contar) e pela hora (para apagar as antigas)', () => {
      expect(sql).toContain('create index if not exists chamadas_da_cobranca_por_conta on public.chamadas_da_cobranca (nutricionista_id, tipo, quando);')
      expect(sql).toContain('create index if not exists chamadas_da_cobranca_por_data on public.chamadas_da_cobranca (quando);')
    })

    it('só o servidor: RLS ligado, nada para anon e authenticated, e a função só para service_role', () => {
      expect(sql).toContain('alter table public.chamadas_da_cobranca enable row level security;')
      expect(sql).toContain('revoke all on public.chamadas_da_cobranca from anon, authenticated;')
      expect(sql).toContain(`revoke all on function ${ASSINATURA_DA_CHAMADA} from public, anon, authenticated;`)
      expect(sql).toContain(`grant execute on function ${ASSINATURA_DA_CHAMADA} to service_role;`)
      expect(sql).not.toMatch(/create policy [^;]*chamadas_da_cobranca/i)
    })

    it('a função roda com as permissões de quem chama (sem security definer) e com search_path fixo', () => {
      const cabecalho = cabecalhoDa('anotar_chamada_da_cobranca')
      expect(cabecalho).toContain('returns boolean')
      expect(cabecalho).toContain('set search_path = public')
      expect(cabecalho).not.toContain('security definer')
    })

    it('CB-115: conta e anota num passo só, com a conta e o tipo travados antes de contar', () => {
      const trava = corpo.indexOf("perform pg_advisory_xact_lock(hashtext('chamadas:' || p_tipo || ':' || p_conta::text));")
      const conta = corpo.indexOf('select count(*) into v_chamadas from public.chamadas_da_cobranca')
      const anota = corpo.indexOf('insert into public.chamadas_da_cobranca (nutricionista_id, tipo) values (p_conta, p_tipo);')
      expect(trava).toBeGreaterThan(-1)
      expect(trava).toBeLessThan(conta)
      expect(conta).toBeLessThan(anota)
    })

    it('CB-113: só recusa com o limite já cheio, numa janela estrita (o 10º e o 20º passam); recusada, nada é anotado', () => {
      expect(corpo).toContain('where nutricionista_id = p_conta and tipo = p_tipo and quando > p_desde;')
      expect(corpo).toMatch(/if v_chamadas >= p_limite then\s+return false;\s+end if;\s+insert into/)
      expect(corpo).toMatch(/values \(p_conta, p_tipo\);\s+return true;/)
    })
  })

  describe('D-111: só estudante com e-mail de faculdade confirmado envia comprovante', () => {
    const corpo = corpoDa('conferir_envio_de_comprovante')

    it('CA-452: confere a situação, depois o e-mail confirmado e de faculdade, depois os arquivos', () => {
      const estudante = corpo.indexOf("if auth.uid() is null or not exists (select 1 from public.perfis where id = auth.uid() and situacao = 'estudante') then")
      const email = corpo.indexOf('if v_confirmado is null or not public.eh_email_de_faculdade(v_email) then')
      const arquivos = corpo.indexOf(`if public.comprovantes_da_conta() >= ${LIMITE_DE_COMPROVANTES} then`)
      expect(estudante).toBeGreaterThan(-1)
      expect(estudante).toBeLessThan(email)
      expect(email).toBeLessThan(arquivos)
      expect(corpo).toContain('select email, email_confirmed_at into v_email, v_confirmado from auth.users where id = auth.uid();')
      expect([...corpo.matchAll(/return '([a-z-]+)';/g)].map((m) => m[1])).toEqual(['nao-estudante', 'sem-email-de-faculdade', 'demais', 'ok'])
    })

    it('CA-452: a política de envio usa a mesma conferência, na pasta da própria pessoa', () => {
      expect(sql).toMatch(
        /create policy "estudante envia o proprio comprovante" on storage\.objects\s+for insert to authenticated\s+with check \(\s+bucket_id = 'comprovantes'\s+and \(storage\.foldername\(name\)\)\[1\] = auth\.uid\(\)::text\s+and public\.conferir_envio_de_comprovante\(\) = 'ok'\s+\);/,
      )
    })

    it('a conferência é security definer com search_path fixo, e só quem está logado a executa', () => {
      const cabecalho = cabecalhoDa('conferir_envio_de_comprovante')
      expect(cabecalho).toContain('returns text')
      expect(cabecalho).toContain('security definer')
      expect(cabecalho).toContain('set search_path = public')
      expect(sql).toContain('revoke execute on function public.conferir_envio_de_comprovante() from public, anon;')
      expect(sql).toContain('grant execute on function public.conferir_envio_de_comprovante() to authenticated;')
    })

    it('é a única política que este arquivo cria, e nada é concedido a anon nem a public', () => {
      expect([...sql.matchAll(/create policy "([^"]+)" on ([\w.]+)/g)].map((m) => `${m[2]}:${m[1]}`)).toEqual(['storage.objects:estudante envia o proprio comprovante'])
      expect(sql).not.toMatch(/grant [^;]*\bto [^;]*\b(anon|public)\b/i)
    })
  })

  describe('CA-453: a função das vagas de fundador não existe mais', () => {
    it('o 011 apaga a função de quem já a tinha', () => {
      expect(sql).toContain('drop function if exists public.vagas_de_fundador_usadas();')
    })

    it('o 003 não a cria mais', () => {
      expect(sql003).toContain('create table if not exists public.assinaturas (')
      expect(sql003).not.toContain('vagas_de_fundador_usadas')
    })
  })

  it('a conferência depois de rodar mostra as travas, a função apagada e a tabela nova', () => {
    expect(sql).toMatch(/^-- select conname from pg_constraint where conname like '%tamanho' order by conname;/m)
    expect(sql).toMatch(/^-- select to_regprocedure\('public\.vagas_de_fundador_usadas\(\)'\) as vagas;/m)
    expect(sql).toMatch(/^-- select relname, relrowsecurity from pg_class where oid = 'public\.chamadas_da_cobranca'::regclass;/m)
  })
})
