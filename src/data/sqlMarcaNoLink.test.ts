// Spec marca-no-link: o texto do 015 (DP-ML-1 e DP-ML-2). O comportamento no banco de verdade está em
// testes/seguranca/marca.test.ts (npm run test:seguranca, Supabase local).
import sql012 from '../../supabase/012-dieta-no-link.sql?raw'
import sql from '../../supabase/015-marca-no-link.sql?raw'
import { LOGO_MAX_BYTES, PREFIXO_DA_LOGO } from '@/domain/logoDaMarca.ts'

/** O que roda direto quando o arquivo roda: o SQL sem o corpo das funções. */
const foraDasFuncoes = sql.replace(/\$\$[\s\S]*?\$\$/g, '')
const inicioDaFuncao = sql.indexOf('create function public.missoes_por_token(p_token text)')
const funcao = sql.slice(inicioDaFuncao, sql.indexOf('$$;', inicioDaFuncao))
const cabecalho = funcao.split('as $$')[0] ?? ''
const corpo = funcao.split('as $$')[1] ?? ''

/** As colunas que a função do 012 devolve, na ordem. */
const colunasDo012 = (sql012.split('returns table (')[1]?.split(')')[0] ?? '').split(',').map((c) => c.trim().split(/\s+/)[0])

describe('banco: a marca da nutricionista no link (015, spec marca-no-link)', () => {
  it('pode rodar de novo, e nada é apagado', () => {
    expect(foraDasFuncoes).not.toMatch(/\b(drop table|truncate|delete from|drop column)\b/i)
    expect(sql).toContain('create table if not exists public.marcas (')
    for (const trava of ['marcas_logo_png', 'marcas_cor_formato']) {
      const sai = sql.indexOf(`alter table public.marcas drop constraint if exists ${trava};`)
      expect(sai, trava).toBeGreaterThan(-1)
      expect(sai, trava).toBeLessThan(sql.indexOf(`add constraint ${trava} check`))
    }
    expect(sql.indexOf('drop function if exists public.missoes_por_token(text);')).toBeLessThan(inicioDaFuncao)
  })

  it('DP-ML-1 e CA-1976: uma linha por conta, que sai junto com a conta', () => {
    expect(sql).toContain('nutricionista_id uuid primary key references auth.users (id) on delete cascade,')
  })

  it('CA-1975 e DP-ML-2: a logo só PNG em data URI, com a assinatura do PNG, só base64 e até 150 KB', () => {
    const caracteres = PREFIXO_DA_LOGO.length + Math.ceil(LOGO_MAX_BYTES / 3) * 4
    expect(caracteres).toBe(204822)
    expect(sql).toContain(`char_length(logo) <= ${caracteres}`)
    expect(sql).toContain("logo like 'data:image/png;base64,iVBORw0KGgo%'")
    expect(sql).toContain("logo ~ '^data:image/png;base64,[A-Za-z0-9+/]+={0,2}$'")
  })

  it('CA-1975: a cor só no formato #rrggbb', () => {
    expect(sql).toContain("check (cor is null or cor ~ '^#[0-9a-f]{6}$')")
  })

  it('DP-ML-1: RLS ligada, as quatro regras só do dono e nada para quem não tem conta', () => {
    expect(sql).toContain('alter table public.marcas enable row level security;')
    const politicas = [...sql.matchAll(/create policy "([^"]+)" on public\.marcas\s+for (\w+) to (\w+)/g)].map((m) => [m[1], m[2], m[3]])
    expect(politicas).toEqual([
      ['dono le', 'select', 'authenticated'],
      ['dono escreve', 'insert', 'authenticated'],
      ['dono atualiza', 'update', 'authenticated'],
      ['dono apaga', 'delete', 'authenticated'],
    ])
    expect(sql.match(/auth\.uid\(\) = nutricionista_id/g)).toHaveLength(5)
    expect(sql).toContain('revoke all on public.marcas from anon;')
    expect(sql).not.toMatch(/to anon[^,]/)
  })

  it('CA-1974: a função do paciente devolve as colunas do 012, na mesma ordem, e a marca no fim', () => {
    const colunas = (cabecalho.split('returns table (')[1]?.split(')')[0] ?? '').split(',').map((c) => c.trim())
    expect(colunas.map((c) => c.split(/\s+/)[0])).toEqual([...colunasDo012, 'marca_logo', 'marca_cor'])
    expect(colunas.slice(-2)).toEqual(['marca_logo text', 'marca_cor text'])
  })

  it('CA-1974: lê uma linha só, pelo token, e a marca vem pelo dono do link sem que o dono saia', () => {
    expect(corpo).toMatch(/from public\.acompanhamentos a\s+left join public\.marcas m on m\.nutricionista_id = a\.nutricionista_id\s+where a\.token = p_token\s+limit 1;/)
    const selecionado = corpo.split('from public.acompanhamentos')[0] ?? ''
    expect(selecionado).not.toContain('nutricionista_id')
    expect(selecionado).toContain('m.logo, m.cor')
  })

  it('as proteções da função continuam: security definer, search_path fixo, só anon e authenticated executam', () => {
    expect(cabecalho).toContain('language sql')
    expect(cabecalho).toContain('security definer')
    expect(cabecalho).toContain('set search_path = public')
    const revoga = sql.indexOf('revoke all on function public.missoes_por_token(text) from public;')
    expect(revoga).toBeGreaterThan(inicioDaFuncao)
    expect(sql.indexOf('grant execute on function public.missoes_por_token(text) to anon, authenticated;')).toBeGreaterThan(revoga)
  })

  it('a escrita do paciente não muda: o arquivo não toca em marcar_missoes', () => {
    expect(sql).not.toMatch(/function public\.marcar_missoes/)
  })

  it('tudo roda numa transação só: begin é o primeiro comando e commit, o último', () => {
    const comandos = sql
      .replace(/\$\$[\s\S]*?\$\$/g, '$$$$')
      .split('\n')
      .filter((linha) => linha.trim() !== '' && !linha.trim().startsWith('--'))
      .join('\n')
      .split(';')
      .map((c) => c.trim())
      .filter(Boolean)
    expect(comandos[0]).toBe('begin')
    expect(comandos.at(-1)).toBe('commit')
    expect(comandos.filter((c) => c === 'begin' || c === 'commit')).toHaveLength(2)
  })

  it('o PostgREST recarrega o esquema logo antes do commit, e a conferência mostra tabela, travas, regras e função', () => {
    expect(sql).toMatch(/notify pgrst, 'reload schema';\s*commit;\s*(--[^\n]*\n?\s*)*$/)
    expect(sql).toMatch(/^-- select relname, relrowsecurity from pg_class where oid = 'public\.marcas'::regclass;/m)
    expect(sql).toMatch(/^-- select pg_get_function_result\('public\.missoes_por_token\(text\)'::regprocedure\);/m)
  })

  it('R-ML-2: o topo avisa que rodar o 004 ou o 012 de novo pede este logo depois', () => {
    expect(sql.split('begin;')[0]).toContain('Se rodar o 004 ou o 012 de novo, rode este logo')
  })
})
