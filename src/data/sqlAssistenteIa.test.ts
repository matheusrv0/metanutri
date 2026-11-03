// O 016 (spec assistente-ia, D-1318 e D-1319) conferido pelo texto. O comportamento no banco de verdade (RLS, as duas
// abas ao mesmo tempo e a cascata) é atacado no Supabase local (testes/seguranca/ia.test.ts, `npm run test:seguranca`).
import sql from '../../supabase/016-assistente-ia.sql?raw'

const semComentarios = sql
  .split('\n')
  .filter((linha) => !linha.trimStart().startsWith('--'))
  .join('\n')
const corpoDa = (nome: string) => semComentarios.split(`create or replace function public.${nome}(`)[1]?.split('$$;')[0] ?? ''
/** O que roda direto quando o arquivo roda: o SQL sem comentários e sem o corpo das funções. */
const foraDasFuncoes = semComentarios.replace(/\$\$[\s\S]*?\$\$/g, '')
const tabela = semComentarios.split('create table if not exists public.uso_da_ia (')[1]?.split(');')[0] ?? ''

const FUNCOES = [
  'reservar_uso_da_ia(uuid, text, boolean, integer, timestamptz, integer)',
  'concluir_uso_da_ia(bigint, text, text, integer, integer, integer, integer, bigint, integer)',
  'uso_da_ia_no_mes(uuid, timestamptz)',
  'custo_da_ia_desde(timestamptz)',
] as const

describe('banco: assistente de IA (016)', () => {
  it('roda numa transação só, pode rodar de novo e não apaga nada fora das funções', () => {
    expect(semComentarios.trim().startsWith('begin;')).toBe(true)
    expect(semComentarios.trim().endsWith('commit;')).toBe(true)
    expect(foraDasFuncoes).not.toMatch(/\b(drop table|truncate|delete from)\b/i)
    expect(semComentarios).toContain("notify pgrst, 'reload schema';")
    expect(sql).toContain('-- Rode DEPOIS do 001 ao 015.')
    expect(sql).toContain('-- Rode ANTES de publicar a função sugerir-plano')
  })

  describe('D-1319: a tabela uso_da_ia', () => {
    it('guarda conta, modo, modelo, resultado, consentimento, tokens, custo e duração; nenhum dado do paciente', () => {
      expect(tabela).toContain('nutricionista_id uuid not null references auth.users (id) on delete cascade')
      expect(tabela).toContain("modo text not null check (modo in ('gerar', 'ajustar'))")
      expect(tabela).toContain("status text not null default 'reservado' check (status in ('reservado', 'ok', 'recusa', 'erro'))")
      expect(tabela).toContain('consentimento_declarado boolean not null check (consentimento_declarado)')
      for (const coluna of ['tokens_entrada', 'tokens_cache_gravados', 'tokens_cache_lidos', 'tokens_saida', 'duracao_ms']) {
        expect(tabela).toContain(`${coluna} integer check (${coluna} >= 0)`)
      }
      expect(tabela).toContain('custo_microdolares bigint check (custo_microdolares >= 0)')
      expect(tabela).toContain('criado_em timestamptz not null default now()')
      expect(tabela).toContain('concluido_em timestamptz')
      expect(tabela).not.toMatch(/nome|email|telefone|nascimento|paciente|pedido|resposta|texto/i)
    })

    it('CA-2322: RLS ligado e nenhum acesso de anon e authenticated', () => {
      expect(semComentarios).toContain('alter table public.uso_da_ia enable row level security;')
      expect(semComentarios).toContain('revoke all on public.uso_da_ia from anon, authenticated;')
      expect(semComentarios).not.toMatch(/create policy[^;]*uso_da_ia/i)
      expect(semComentarios).toContain('create index if not exists uso_da_ia_por_conta on public.uso_da_ia (nutricionista_id, criado_em);')
      expect(semComentarios).toContain('create index if not exists uso_da_ia_por_data on public.uso_da_ia (criado_em);')
    })
  })

  describe('as funções do servidor', () => {
    it.each(FUNCOES)('CA-2322: %s só roda com a chave de serviço e sem security definer', (assinatura) => {
      expect(semComentarios).toContain(`revoke all on function public.${assinatura} from public, anon, authenticated;`)
      expect(semComentarios).toContain(`grant execute on function public.${assinatura} to service_role;`)
      const nome = assinatura.split('(')[0] ?? ''
      const cabecalho = semComentarios.split(`create or replace function public.${nome}(`)[1]?.split('as $$')[0] ?? ''
      expect(cabecalho).toContain('set search_path = public')
      expect(cabecalho).not.toContain('security definer')
    })

    it('CA-2323: reservar trava a conta e conta e anota num passo só', () => {
      const corpo = corpoDa('reservar_uso_da_ia')
      expect(semComentarios).toMatch(/returns table \(reserva bigint, motivo text\)/)
      const trava = corpo.indexOf("perform pg_advisory_xact_lock(hashtext('uso_da_ia:' || p_conta::text));")
      expect(trava).toBeGreaterThan(-1)
      expect(trava).toBeLessThan(corpo.indexOf('select count(*)'))
      expect(corpo.indexOf('insert into public.uso_da_ia')).toBeGreaterThan(corpo.lastIndexOf('select count(*)'))
    })

    it('D-1318 e CA-2308: o mês conta os usos ok e as reservas de menos de 10 minutos desde o início do mês', () => {
      const corpo = corpoDa('reservar_uso_da_ia')
      expect(corpo).toContain('u.nutricionista_id = p_conta and u.criado_em >= p_inicio_mes')
      expect(corpo).toContain("(u.status = 'ok' or (u.status = 'reservado' and u.criado_em > now() - interval '10 minutes'))")
      expect(corpo).toContain("if v_mes >= p_limite_mes then")
      expect(corpo).toContain("return query select null::bigint, 'limite-mes'::text;")
      // O contador da gaveta conta igual.
      expect(corpoDa('uso_da_ia_no_mes')).toContain("(u.status = 'ok' or (u.status = 'reservado' and u.criado_em > now() - interval '10 minutes'))")
    })

    it('DP-IA-7 e CA-2309: a hora conta todo pedido à IA, com qualquer resultado', () => {
      const corpo = corpoDa('reservar_uso_da_ia')
      expect(corpo).toContain("u.nutricionista_id = p_conta and u.criado_em > now() - interval '1 hour';")
      expect(corpo).toContain("return query select null::bigint, 'limite-hora'::text;")
    })

    it('D-1304: sem a autorização do paciente, nada é anotado', () => {
      const corpo = corpoDa('reservar_uso_da_ia')
      expect(corpo.indexOf("if p_consentimento is not true then raise exception 'Sem a autorização do paciente.' using errcode = '22023'; end if;")).toBeLessThan(
        corpo.indexOf('insert into public.uso_da_ia'),
      )
    })

    it('CA-2324: cada reserva apaga os usos de mais de 13 meses', () => {
      expect(corpoDa('reservar_uso_da_ia')).toContain("delete from public.uso_da_ia u where u.criado_em < now() - interval '13 months';")
    })

    it('CA-2324: concluir só muda o uso que ainda está reservado, e diz se mudou', () => {
      const corpo = corpoDa('concluir_uso_da_ia')
      expect(semComentarios).toMatch(/concluir_uso_da_ia\([^)]*\)\s+returns boolean/)
      expect(corpo).toContain("if p_status not in ('ok', 'recusa', 'erro') then raise exception 'Resultado de uso desconhecido.' using errcode = '22023'; end if;")
      expect(corpo).toContain("where u.id = p_reserva and u.status = 'reservado';")
      expect(corpo).toContain('concluido_em = now()')
      expect(corpo).toContain('return found;')
    })

    it('CA-2310: o custo das últimas 24 h soma todas as contas, sem nulo', () => {
      const corpo = corpoDa('custo_da_ia_desde')
      expect(corpo).toContain('select coalesce(sum(u.custo_microdolares), 0)::bigint from public.uso_da_ia u where u.criado_em > p_desde;')
    })
  })

  it('a conferência no fim mostra a tabela fechada e as funções só do servidor', () => {
    expect(sql).toContain("-- select relname, relrowsecurity from pg_class where oid = 'public.uso_da_ia'::regclass;")
    expect(sql).toContain("-- select has_function_privilege('authenticated', 'public.reservar_uso_da_ia(uuid, text, boolean, integer, timestamptz, integer)', 'execute') as logado_reserva;")
  })
})
