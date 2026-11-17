// O texto do 019, os ajustes da rodada de melhorias de 16/11 (spec lado-do-paciente, D-1266, DP-LP-52; spec
// antropometria-telas, D-1550). O comportamento no banco de verdade está em testes/seguranca/ (npm run test:seguranca,
// Supabase local), que aplica o 001 ao 019 na ordem.
import sql from '../../supabase/019-ajustes.sql?raw'

const semComentarios = sql
  .split('\n')
  .filter((linha) => !linha.trimStart().startsWith('--'))
  .join('\n')
/** O que roda direto quando o arquivo roda: o SQL sem comentários e sem o corpo das funções. */
const foraDasFuncoes = semComentarios.replace(/\$\$[\s\S]*?\$\$/g, '')
/** O corpo de uma função, do `create or replace` até o `$$;`. */
const funcao = (nome: string) => semComentarios.split(`create or replace function public.${nome}(`)[1]?.split('$$;')[0] ?? ''
/** As consultas de conferência do fim (comentadas, para rodar depois). */
const conferencia = sql.split('commit;')[1] ?? ''

describe('banco: o 019, os ajustes da rodada de melhorias', () => {
  it('roda numa transação só e pode rodar de novo: nada é apagado, nenhuma tabela nova', () => {
    expect(semComentarios.trim().startsWith('begin;')).toBe(true)
    expect(semComentarios.trim().endsWith('commit;')).toBe(true)
    expect(foraDasFuncoes).not.toMatch(/\b(drop table|truncate|delete from|drop column|drop function|create table|alter table)\b/i)
    expect(sql).toContain('Pode rodar de novo')
  })

  it('não refaz nada do 017 nem do 018 além das duas funções', () => {
    const refeitas = [...semComentarios.matchAll(/create or replace function public\.([a-z_]+)\(/g)].map((m) => m[1])
    expect(refeitas).toContain('trocar_o_endereco')
    for (const nome of refeitas) expect(['limite_de_arquivos_da_avaliacao', 'trocar_o_endereco']).toContain(nome)
    expect(foraDasFuncoes).not.toMatch(/\bcreate trigger\b/i)
  })
})

describe('CB-1234 e D-1266: o endereço cortado nunca volta', () => {
  const troca = funcao('trocar_o_endereco')

  it('a troca guarda o resumo do token de cada link que ela corta, preso ao link de agora', () => {
    expect(troca).toContain('security definer')
    expect(troca).toContain('set search_path = public')
    // O token trocado, como no 017.
    expect(troca).toContain('insert into public.tokens_trocados (token_hash, link_id) values (public.hash_do_token(old.token), new.id)')
    // Os cortados: o update devolve o token, e o resumo entra na mesma instrução.
    expect(troca).toMatch(/cortados as \(\s*update public\.acompanhamentos a\s*set cortado_em = now\(\)[\s\S]*?returning a\.token\s*\)/)
    expect(troca).toMatch(/insert into public\.tokens_trocados \(token_hash, link_id\)\s*select public\.hash_do_token\(c\.token\), new\.id from cortados c\s*on conflict \(token_hash\) do nothing;/)
  })

  it('a troca continua devolvendo o link ao e-mail da ficha, como no 017 (D-1248)', () => {
    expect(troca).toContain("where e.link_id = new.id and e.origem = 'paciente';")
    expect(troca).toContain('update public.aceites x set saiu_em = now()')
    expect(troca).toContain("delete from public.chaves_de_aviso k where k.link_id = new.id and k.tipo = 'aceite' and k.usado_em is null;")
    expect(semComentarios).toContain('revoke all on function public.trocar_o_endereco() from public, anon, authenticated;')
  })

  it('os links já cortados antes do 019 ganham o resumo, presos ao fixo que os cortou', () => {
    const preenche = foraDasFuncoes.slice(foraDasFuncoes.indexOf('insert into public.tokens_trocados (token_hash, link_id, trocado_em)'))
    expect(preenche).toContain('select public.hash_do_token(c.token)')
    expect(preenche).toContain('where c.cortado_em is not null')
    expect(preenche).toContain('on conflict (token_hash) do nothing;')
    // O fixo que cortou: o `substituido_por` não cortado; senão o vigente do mesmo paciente; senão o próprio link.
    expect(preenche).toMatch(/coalesce\(\s*\(select f\.id from public\.acompanhamentos f where f\.id = c\.substituido_por/)
    expect(preenche).toContain('c.id')
  })

  it('a conferência do fim diz o que esperar', () => {
    expect(conferencia).toContain('cortados_sem_resumo')
    expect(conferencia).toContain('-- -- uma linha: 0')
  })
})

