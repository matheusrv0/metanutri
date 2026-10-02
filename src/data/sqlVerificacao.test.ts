import sql005 from '../../supabase/005-estudante.sql?raw'
import sql from '../../supabase/006-verificacao.sql?raw'
import webhook from '../../supabase/functions/webhook-mercadopago/index.ts?raw'

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

  it('CB-63: aprovar não passa por cima de assinatura paga ativa e limpa o preapproval_id velho', () => {
    const corpo = corpoDa('decidir_pedido')
    expect(corpo).toMatch(
      /set plano = 'estudante', status = 'ativa', expira_em = excluded\.expira_em, preapproval_id = null, atualizado_em = now\(\)\s+where not \(public\.assinaturas\.status = 'ativa' and public\.assinaturas\.plano in \('solo', 'pro', 'clinica'\)\);/,
    )
    expect(corpo).not.toContain('where public.assinaturas.preapproval_id is null')
  })

  it('CB-63: o webhook só atualiza a linha da mesma assinatura do Mercado Pago', () => {
    expect(webhook).toContain(".update(mudanca).eq('nutricionista_id', dono).eq('preapproval_id', id).select('nutricionista_id')")
  })

  it('CB-63: pagamento ativo que não acha a linha deixa rastro no registro e responde 200', () => {
    expect(webhook).toMatch(/status === 'ativa' && \(!linhas \|\| linhas\.length === 0\)/)
    expect(webhook).toContain("console.error('Pagamento ativo sem assinatura com este preapproval_id; conferir à mão:', id, dono)")
    expect(webhook.split("conferir à mão:', id, dono)")[1]).toMatch(/^\s*}\s*\n\s*return ok\(\)/)
  })

  it('D-27 e CA-169: o webhook só grava o status; o plano pedido continua na linha', () => {
    // Um aviso de "pendente" antes da autorização não pode deixar quem pagou no Free,
    // e o "Tentar de novo" reabre o plano que está na linha.
    expect(webhook).toContain('const mudanca = { status, atualizado_em: new Date().toISOString() }')
    expect(webhook).not.toMatch(/mudanca\[['"]plano['"]\]/)
    expect(webhook).not.toMatch(/plano:\s*'free'/)
  })

  it('a previsão de formatura compara com o mês de agora no fuso do Brasil', () => {
    expect(corpoDa('enviar_pedido_estudante')).toContain("date_trunc('month', p_formatura) < date_trunc('month', now() at time zone 'America/Sao_Paulo')")
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
