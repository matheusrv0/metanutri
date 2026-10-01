import sql005 from '../../supabase/005-estudante.sql?raw'
import sql from '../../supabase/006-verificacao.sql?raw'

const corpoDa = (nome: string) => sql.split(`create or replace function public.${nome}(`)[1]?.split('$$;')[0] ?? ''

describe('SQL da verificação (spec conta-e-verificacao)', () => {
  it('CA-269 e CA-297: perfil e pedido só têm política de leitura', () => {
    const politicas = [...sql.matchAll(/create policy "[^"]+" on public\.(perfis|pedidos_estudante)\s+for (\w+)/g)].map((m) => `${m[1]}:${m[2]}`)
    expect(politicas).toEqual(['perfis:select', 'pedidos_estudante:select'])
  })

  it('CA-297: toda função de administrador confere eh_admin antes de tudo', () => {
    for (const nome of ['pedidos_em_analise', 'decidir_pedido', 'crn_para_conferir', 'decidir_crn', 'comprovantes_para_apagar', 'marcar_comprovantes_apagados']) {
      expect(corpoDa(nome), nome).toMatch(/begin\s+if not public\.eh_admin\(\) then raise exception/)
    }
  })

  it('CA-297: as funções de quem usa exigem sessão', () => {
    for (const nome of ['informar_situacao', 'me_formei', 'corrigir_crn', 'enviar_pedido_estudante']) {
      expect(corpoDa(nome), nome).toMatch(/if auth\.uid\(\) is null then raise exception/)
    }
  })

  it('CA-298: o balde dos comprovantes é privado, com 5 MB e só PDF, JPG e PNG', () => {
    expect(sql).toContain("('comprovantes', 'comprovantes', false, 5242880, array['application/pdf', 'image/jpeg', 'image/png'])")
  })

  it('CB-63: aprovar não passa por cima de assinatura paga', () => {
    expect(corpoDa('decidir_pedido')).toContain('where public.assinaturas.preapproval_id is null')
  })

  it('D-42: a validade é 12 meses ou o fim do mês da formatura, o que vier antes', () => {
    expect(corpoDa('decidir_pedido')).toContain("least(now() + interval '12 months', (v_formatura + interval '1 month')::timestamptz - interval '1 second')")
  })

  it('D-41: o 005 não aprova estudante sozinho', () => {
    expect(sql005).not.toMatch(/create trigger/i)
    expect(sql005).toContain('drop trigger if exists aprovar_estudante_ao_confirmar on auth.users;')
    expect(sql005).toContain('drop function if exists public.aprovar_estudante();')
  })
})
