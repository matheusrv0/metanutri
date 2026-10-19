// D-260 a D-262 (spec seguranca-lote-5): o banco só reconhece o administrador numa sessão confirmada pelo
// código do app autenticador (aal2). A mesma conta, entrando só com a senha (aal1), é uma conta comum: não usa
// as funções do administrador nem lê o que é de outra conta. E o 014 não roda enquanto houver administrador
// sem o app, para o dono não ficar trancado do lado de fora.
import { readFileSync } from 'node:fs'
import { fileURLToPath, URL } from 'node:url'
import { createClient } from '@supabase/supabase-js'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'
import { sqlNoBancoLocal } from './bancoLocal.ts'
import { BALDE, barrado, barradoOuVazio, fotografar, prepararCenario, recusado, semNadaDaVitima, type Cenario } from './preparo.ts'

let c: Cenario
let foto: string

beforeAll(async () => {
  c = await prepararCenario()
  foto = await fotografar(c)
})

afterEach(async () => {
  expect(await fotografar(c), 'a sessão sem o código mudou dado da vítima ou do que é fechado').toBe(foto)
})

/** As nove funções do administrador, com argumentos que mirariam a vítima. */
const DO_ADMINISTRADOR = (): readonly [string, Readonly<Record<string, unknown>>][] => [
  ['pedidos_em_analise', {}],
  ['crn_para_conferir', {}],
  ['comprovantes_para_apagar', {}],
  ['painel_contas', {}],
  ['painel_historico_assinaturas', {}],
  ['painel_uso', {}],
  ['decidir_pedido', { p_pedido: c.vitima.pedidoId, p_aprovar: false, p_motivo: 'recusado sem o código' }],
  ['decidir_crn', { p_usuario: c.admin.id, p_status: 'nao_encontrado' }],
  ['marcar_comprovantes_apagados', { p_caminhos: [c.vitima.arquivo, c.vitima.segundoArquivo] }],
]

describe('CA-830: o administrador sem o código do app não usa as funções do administrador', () => {
  it.each(['pedidos_em_analise', 'crn_para_conferir', 'comprovantes_para_apagar', 'painel_contas', 'painel_historico_assinaturas', 'painel_uso', 'decidir_pedido', 'decidir_crn', 'marcar_comprovantes_apagados'])(
    'CA-830: %s é recusada na sessão aal1 e não devolve nada',
    async (funcao) => {
      const args = DO_ADMINISTRADOR().find(([nome]) => nome === funcao)?.[1] ?? {}
      const r = await c.adminSemCodigo.rpc(funcao, args)
      barrado(r)
      semNadaDaVitima(c, r)
    },
  )

  it('CA-830: eh_admin diz não na sessão aal1', async () => {
    const r = await c.adminSemCodigo.rpc('eh_admin')
    expect(r.error).toBeNull()
    expect(r.data).toBe(false)
  })
})

describe('CA-831: o administrador sem o código não lê nem mexe no que é de outra conta', () => {
  it('CA-831: perfis e pedidos da vítima não aparecem; o próprio perfil continua legível', async () => {
    const perfis = await c.adminSemCodigo.from('perfis').select('*').eq('id', c.vitima.id)
    barradoOuVazio(perfis)
    semNadaDaVitima(c, perfis)
    const pedidos = await c.adminSemCodigo.from('pedidos_estudante').select('*').eq('usuario', c.vitima.id)
    barradoOuVazio(pedidos)
    semNadaDaVitima(c, pedidos)
    const proprio = await c.adminSemCodigo.from('perfis').select('id').eq('id', c.admin.id)
    expect(proprio.error).toBeNull()
    expect(proprio.data).toEqual([{ id: c.admin.id }])
  })

  it('CA-831: o comprovante da vítima não é baixado, listado, assinado nem apagado', async () => {
    const balde = c.adminSemCodigo.storage.from(BALDE)
    recusado(await balde.download(c.vitima.arquivo))
    recusado(await balde.createSignedUrl(c.vitima.arquivo, 60))
    const lista = await balde.list(c.vitima.id)
    expect(lista.data ?? []).toEqual([])
    const apagado = await balde.remove([c.vitima.arquivo])
    expect(apagado.data ?? []).toEqual([])
  })
})

describe('CA-832: com o código do app (aal2), o administrador usa tudo como antes', () => {
  it('CA-832: as filas, a leitura e o comprovante da vítima chegam', async () => {
    const fila = await c.admin.cliente.rpc('pedidos_em_analise')
    expect(fila.error).toBeNull()
    expect(JSON.stringify(fila.data)).toContain(c.vitima.pedidoId)
    expect((await c.admin.cliente.rpc('eh_admin')).data).toBe(true)
    const perfis = await c.admin.cliente.from('perfis').select('id').eq('id', c.vitima.id)
    expect(perfis.data).toEqual([{ id: c.vitima.id }])
    const link = await c.admin.cliente.storage.from(BALDE).createSignedUrl(c.vitima.arquivo, 60)
    expect(link.error).toBeNull()
  })
})

describe('CA-833 e CA-834: quem é administrador sem o código', () => {
  it('CA-834: admin_sem_segundo_fator diz sim só para o administrador sem o código', async () => {
    expect((await c.adminSemCodigo.rpc('admin_sem_segundo_fator')).data).toBe(true)
    expect((await c.admin.cliente.rpc('admin_sem_segundo_fator')).data).toBe(false)
  })

  it('CA-833: a conta comum não é administradora em nenhuma das duas perguntas', async () => {
    expect((await c.atacante.cliente.rpc('eh_admin')).data).toBe(false)
    expect((await c.atacante.cliente.rpc('admin_sem_segundo_fator')).data).toBe(false)
  })

  it('CA-834: sem login, admin_sem_segundo_fator é recusada', async () => {
    barrado(await c.anonimo.rpc('admin_sem_segundo_fator'))
  })
})

describe('CA-841: o 014 não roda com administrador sem o app', () => {
  const sql014 = readFileSync(fileURLToPath(new URL('../../supabase/014-seguranca-lote-5.sql', import.meta.url)), 'utf8')

  it('CA-841: com um administrador sem o app, o arquivo para com a frase e nada muda; sem ele, roda de novo', async () => {
    // Um administrador novo, cadastrado sem o app, como o dono antes de ativar.
    const email = `novo.admin.${Date.now()}@exemplo.com`
    const criado = await c.servico.auth.admin.createUser({ email, password: `Senha-${Date.now()}`, email_confirm: true })
    expect(criado.error).toBeNull()
    const id = criado.data.user?.id ?? ''
    expect((await c.servico.from('administradores').insert({ usuario: id })).error).toBeNull()
    try {
      const antes = sqlNoBancoLocal("select md5(pg_get_functiondef('public.eh_admin()'::regprocedure));")
      expect(antes.ok, antes.erro).toBe(true)
      // Uma mudança que o arquivo desfaria se rodasse: a versão antiga do eh_admin, sem o código.
      const velha = sqlNoBancoLocal(
        "create or replace function public.eh_admin() returns boolean language sql stable security definer set search_path = public as $$ select exists (select 1 from public.administradores where usuario = auth.uid()); $$;",
      )
      expect(velha.ok, velha.erro).toBe(true)
      const parado = sqlNoBancoLocal(sql014)
      expect(parado.ok).toBe(false)
      expect(parado.erro).toContain('Antes de rodar este arquivo, cada administrador precisa ativar a verificação em duas etapas no site (Aprovações). Nada foi mudado.')
      // Nada mudou: a versão antiga continua lá.
      const depois = sqlNoBancoLocal("select pg_get_functiondef('public.eh_admin()'::regprocedure);")
      expect(depois.saida).not.toContain('aal')
    } finally {
      await c.servico.from('administradores').delete().eq('usuario', id)
      await c.servico.auth.admin.deleteUser(id)
    }
    // Sem o administrador sem app, o arquivo roda de novo e o código volta a ser exigido.
    const rodado = sqlNoBancoLocal(sql014)
    expect(rodado.ok, rodado.erro).toBe(true)
    expect((await c.adminSemCodigo.rpc('eh_admin')).data).toBe(false)
    expect((await c.admin.cliente.rpc('eh_admin')).data).toBe(true)
  })

  it('CA-841: o fator só cadastrado, sem confirmar, não conta como app ativado', async () => {
    const email = `meio.admin.${Date.now()}@exemplo.com`
    const senha = `Senha-${Date.now()}`
    const criado = await c.servico.auth.admin.createUser({ email, password: senha, email_confirm: true })
    const id = criado.data.user?.id ?? ''
    expect((await c.servico.from('administradores').insert({ usuario: id })).error).toBeNull()
    const cliente = createClient(c.ambiente.url, c.ambiente.anon, { auth: { persistSession: false, autoRefreshToken: false } })
    try {
      expect((await cliente.auth.signInWithPassword({ email, password: senha })).error).toBeNull()
      expect((await cliente.auth.mfa.enroll({ factorType: 'totp' })).error).toBeNull()
      const parado = sqlNoBancoLocal(sql014)
      expect(parado.ok).toBe(false)
      expect(parado.erro).toContain('Nada foi mudado.')
    } finally {
      await c.servico.from('administradores').delete().eq('usuario', id)
      await c.servico.auth.admin.deleteUser(id)
    }
  })
})
