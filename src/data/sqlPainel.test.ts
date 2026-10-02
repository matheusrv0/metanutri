import sql from '../../supabase/007-painel-do-dono.sql?raw'
import assinar from '../../supabase/functions/assinar/index.ts?raw'

const corpoDa = (nome: string) => sql.split(`create or replace function public.${nome}(`)[1]?.split('$$;')[0] ?? ''

describe('SQL do painel do dono (spec painel-do-dono)', () => {
  it('CA-344: toda leitura do painel confere eh_admin antes de tudo, com a frase da spec', () => {
    for (const nome of ['painel_contas', 'painel_historico_assinaturas', 'painel_uso']) {
      expect(corpoDa(nome), nome).toMatch(
        /begin\s+if not public\.eh_admin\(\) then raise exception 'Só o administrador vê estes números\.' using errcode = '42501'; end if;/,
      )
      expect(sql, nome).toContain(`revoke all on function public.${nome}() from public, anon;`)
      expect(sql, nome).toContain(`grant execute on function public.${nome}() to authenticated;`)
    }
  })

  it('D-58: o histórico não tem política nenhuma: o gatilho escreve e as funções leem', () => {
    expect(sql).toContain('alter table public.assinaturas_historico enable row level security;')
    expect(sql).not.toMatch(/create policy "[^"]+" on public\.assinaturas_historico/)
  })

  it('D-58: o gatilho grava só quando muda o que conta para a receita', () => {
    const corpo = corpoDa('registrar_mudanca_de_assinatura')
    for (const campo of ['status', 'plano', 'ciclo', 'valor_centavos', 'preco_travado']) {
      expect(corpo, campo).toContain(`old.${campo} is distinct from new.${campo}`)
    }
    expect(sql).toContain('after insert or update on public.assinaturas')
  })

  it('D-59: as assinaturas antigas ganham o ciclo pelo preço do anual', () => {
    expect(sql).toContain("set ciclo = case when valor_centavos in (29900, 59900) then 'anual' else 'mensal' end")
  })

  it('D-59: a função assinar grava o ciclo escolhido', () => {
    expect(assinar).toContain("ciclo: anual ? 'anual' : 'mensal',")
  })
})
