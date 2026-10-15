import sql004 from '../../supabase/004-uso-nao-comercial.sql?raw'
import sql from '../../supabase/012-dieta-no-link.sql?raw'

/** O que roda direto quando o arquivo roda: o SQL sem o corpo das funções. */
const foraDasFuncoes = sql.replace(/\$\$[\s\S]*?\$\$/g, '')
const inicioDaFuncao = sql.indexOf('create function public.missoes_por_token(p_token text)')
/** A função do paciente, do cabeçalho até o fim do corpo. */
const funcao = sql.slice(inicioDaFuncao, sql.indexOf('$$;', inicioDaFuncao))
const cabecalho = funcao.split('as $$')[0] ?? ''
const corpo = funcao.split('as $$')[1] ?? ''

/** As colunas que a função do 004 devolve, na ordem. */
const colunasDo004 = (sql004.split('returns table (')[1]?.split(')')[0] ?? '')
  .split(',')
  .map((c) => c.trim().split(/\s+/)[0])

describe('banco: a dieta no link do paciente (012, spec dieta-no-link)', () => {
  it('CA-550: pode rodar de novo, e nada é apagado', () => {
    expect(foraDasFuncoes).not.toMatch(/\b(drop table|truncate|delete from|drop column)\b/i)
    expect(sql).toContain('alter table public.acompanhamentos add column if not exists dieta jsonb;')
    const sai = sql.indexOf('alter table public.acompanhamentos drop constraint if exists acompanhamentos_dieta_tamanho;')
    expect(sai).toBeGreaterThan(-1)
    expect(sai).toBeLessThan(sql.indexOf('add constraint acompanhamentos_dieta_tamanho check'))
    expect(sql.indexOf('drop function if exists public.missoes_por_token(text);')).toBeLessThan(inicioDaFuncao)
  })

  it('D-152: a coluna é opcional (desligar a dieta deixa a coluna vazia) e não tem valor padrão', () => {
    const coluna = sql.split('\n').find((linha) => linha.includes('add column if not exists dieta')) ?? ''
    expect(coluna).not.toMatch(/not null|default/i)
  })

  it('D-156: a dieta vai até 256 KB, medida como o banco guarda, o mesmo teto das missões no 011', () => {
    expect(sql).toContain('alter table public.acompanhamentos add constraint acompanhamentos_dieta_tamanho check (pg_column_size(dieta) <= 262144);')
    expect(262144).toBe(256 * 1024)
  })

  it('CA-548: a função do paciente devolve as colunas de antes, na mesma ordem, e a dieta no fim', () => {
    expect(inicioDaFuncao).toBeGreaterThan(-1)
    const colunas = (cabecalho.split('returns table (')[1]?.split(')')[0] ?? '').split(',').map((c) => c.trim())
    expect(colunas.map((c) => c.split(/\s+/)[0])).toEqual([...colunasDo004, 'dieta'])
    expect(colunas.at(-1)).toBe('dieta jsonb')
    expect(corpo).toContain('a.uso_nao_comercial, a.dieta')
  })

  it('CA-548: continua lendo uma linha só, pelo token, sem devolver o dono', () => {
    expect(corpo).toMatch(/from public\.acompanhamentos a\s+where a\.token = p_token\s+limit 1;/)
    expect(funcao).not.toContain('nutricionista_id')
  })

  it('CA-550: as proteções da função continuam: security definer, search_path fixo, só anon e authenticated executam', () => {
    expect(cabecalho).toContain('language sql')
    expect(cabecalho).toContain('security definer')
    expect(cabecalho).toContain('set search_path = public')
    const revoga = sql.indexOf('revoke all on function public.missoes_por_token(text) from public;')
    const concede = sql.indexOf('grant execute on function public.missoes_por_token(text) to anon, authenticated;')
    expect(revoga).toBeGreaterThan(inicioDaFuncao)
    expect(concede).toBeGreaterThan(revoga)
    expect([...sql.matchAll(/\bgrant\b[^;]*;/gi)]).toHaveLength(1)
  })

  it('CA-549 e CB-158: a escrita do paciente não muda; o arquivo não toca em marcar_missoes nem em política de acesso', () => {
    expect(sql).not.toMatch(/function public\.marcar_missoes/)
    expect(sql).not.toMatch(/create policy|alter policy|disable row level security/i)
  })

  it('o PostgREST recarrega o esquema, para a coluna nova valer na hora', () => {
    expect(sql.trimEnd()).toMatch(/notify pgrst, 'reload schema';\s*(--[^\n]*\n?\s*)*$/)
  })

  it('a conferência depois de rodar mostra a coluna, a trava e o retorno da função', () => {
    expect(sql).toMatch(/^-- select column_name, data_type, is_nullable from information_schema\.columns/m)
    expect(sql).toMatch(/^-- select conname from pg_constraint where conname = 'acompanhamentos_dieta_tamanho';/m)
    expect(sql).toMatch(/^-- select pg_get_function_result\('public\.missoes_por_token\(text\)'::regprocedure\);/m)
  })
})
