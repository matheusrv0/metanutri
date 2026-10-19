// D-263 e D-264 (spec seguranca-lote-5): a limpeza dos comprovantes no banco de verdade do Supabase local.
// Os prazos são vistos pela data de referência da função (DP-L5-4), sem mexer no relógio.
import type { SupabaseClient } from '@supabase/supabase-js'
import { randomUUID } from 'node:crypto'
import { beforeAll, describe, expect, it } from 'vitest'
import { sqlNoBancoLocal } from './bancoLocal.ts'
import { arquivoPdf, BALDE, barrado, prepararCenario, type Cenario } from './preparo.ts'

let c: Cenario

beforeAll(async () => {
  c = await prepararCenario()
})

const UM_DIA_MS = 24 * 60 * 60 * 1000
const daqui = (dias: number): string => new Date(Date.now() + dias * UM_DIA_MS).toISOString()

async function vencidos(agora: string, limite = 1000): Promise<string[]> {
  const r = await c.servico.rpc('comprovantes_vencidos', { p_agora: agora, p_limite: limite })
  expect(r.error).toBeNull()
  return Array.isArray(r.data) ? r.data.map((linha: { caminho: string }) => linha.caminho) : []
}

/** Um pedido já decidido (agora), com um arquivo novo no balde, gravado como o administrador grava. */
async function pedidoDecididoComArquivo(conta: { readonly id: string; readonly cliente: SupabaseClient }): Promise<{ readonly id: string; readonly arquivo: string }> {
  const arquivo = `${conta.id}/decidido-${randomUUID()}.pdf`
  expect((await conta.cliente.storage.from(BALDE).upload(arquivo, arquivoPdf(arquivo), { contentType: 'application/pdf' })).error).toBeNull()
  const r = await c.servico
    .from('pedidos_estudante')
    .insert({ usuario: conta.id, instituicao: 'Faculdade decidida', matricula: '1111111', periodo: 4, formatura: '2030-12-01', status: 'recusado', motivo: 'ilegível', decidido_em: new Date().toISOString(), arquivo })
    .select('id')
    .single()
  expect(r.error).toBeNull()
  return { id: String(r.data?.id ?? ''), arquivo }
}

describe('CA-850: as funções da limpeza são só do servidor', () => {
  it.each([
    ['comprovantes_vencidos', {}],
    ['anotar_comprovantes_apagados', { p_caminhos: ['x/y.pdf'] }],
    ['conferir_chave_da_limpeza', { p_chave: 'x'.repeat(64) }],
    ['pedir_limpeza_dos_comprovantes', {}],
  ] as const)('CA-850: %s é recusada para visitante, conta comum e administrador', async (funcao, args) => {
    for (const cliente of [c.anonimo, c.atacante.cliente, c.admin.cliente]) barrado(await cliente.rpc(funcao, args))
  })

  it('CA-850: pedir a limpeza nem o servidor chama; só o agendamento', async () => {
    barrado(await c.servico.rpc('pedir_limpeza_dos_comprovantes'))
  })
})

describe('D-263: o que está vencido', () => {
  it('CA-844 e CA-845: hoje, nada do que acabou de chegar está vencido', async () => {
    const lista = await vencidos(new Date().toISOString())
    for (const caminho of [c.vitima.arquivo, c.vitima.segundoArquivo, c.atacante.arquivo]) expect(lista).not.toContain(caminho)
  })

  it('CA-845: o arquivo sem pedido vence 1 dia depois de enviado; o do pedido em análise nunca', async () => {
    const lista = await vencidos(daqui(2))
    expect(lista).toContain(c.vitima.segundoArquivo)
    expect(lista).toContain(c.atacante.arquivo)
    expect(lista).not.toContain(c.vitima.arquivo)
    expect(await vencidos(daqui(60))).not.toContain(c.vitima.arquivo)
  })

  it('CA-843 e CA-844: o arquivo do pedido decidido vence só depois de 30 dias da decisão', async () => {
    const decidido = await pedidoDecididoComArquivo(c.atacante)
    expect(await vencidos(daqui(29))).not.toContain(decidido.arquivo)
    expect(await vencidos(daqui(31))).toContain(decidido.arquivo)
  })

  it('CB-265: no máximo 1000 por vez, mesmo pedindo mais', async () => {
    expect(await vencidos(daqui(2), 1)).toHaveLength(1)
    const r = await c.servico.rpc('comprovantes_vencidos', { p_agora: daqui(2), p_limite: 5000 })
    expect(r.error).toBeNull()
    expect(Array.isArray(r.data) ? r.data.length : -1).toBeLessThanOrEqual(1000)
  })
})

describe('CA-849: anotar só o que já saiu do armazenamento', () => {
  it('CA-849: o pedido cujo arquivo ainda está no balde não é marcado', async () => {
    const decidido = await pedidoDecididoComArquivo(c.atacante)
    const r = await c.servico.rpc('anotar_comprovantes_apagados', { p_caminhos: [decidido.arquivo] })
    expect(r.error).toBeNull()
    expect(r.data).toBe(0)
    const pedido = await c.servico.from('pedidos_estudante').select('arquivo').eq('id', decidido.id).single()
    expect(pedido.data?.arquivo).toBe(decidido.arquivo)
  })

  it('CA-843 e CA-849: saído o arquivo, o pedido fica com os dados e a decisão, sem o arquivo', async () => {
    const decidido = await pedidoDecididoComArquivo(c.atacante)
    expect((await c.servico.storage.from(BALDE).remove([decidido.arquivo])).error).toBeNull()
    const r = await c.servico.rpc('anotar_comprovantes_apagados', { p_caminhos: [decidido.arquivo] })
    expect(r.data).toBe(1)
    const pedido = await c.servico.from('pedidos_estudante').select('instituicao, matricula, periodo, status, motivo, decidido_em, arquivo').eq('id', decidido.id).single()
    expect(pedido.data).toMatchObject({ instituicao: 'Faculdade decidida', matricula: '1111111', periodo: 4, status: 'recusado', motivo: 'ilegível', arquivo: null })
    expect(pedido.data?.decidido_em).toBeTruthy()
  })
})

describe('D-264: a chave da limpeza', () => {
  const chaveDoCofre = (): string => {
    const r = sqlNoBancoLocal("select decrypted_secret from vault.decrypted_secrets where name = 'metanutri_chave_da_limpeza';")
    expect(r.ok, r.erro).toBe(true)
    return r.saida
  }

  it('CA-847: a chave nasceu no cofre, com 64 caracteres, e rodar o 014 de novo não a troca', () => {
    const chave = chaveDoCofre()
    expect(chave).toMatch(/^[0-9a-f]{64}$/)
    const r = sqlNoBancoLocal("select count(*) from vault.secrets where name = 'metanutri_chave_da_limpeza';")
    expect(r.saida).toBe('1')
  })

  it('CA-847: só a chave inteira e certa confere', async () => {
    const chave = chaveDoCofre()
    const conferir = async (p_chave: string | null) => (await c.servico.rpc('conferir_chave_da_limpeza', { p_chave })).data
    expect(await conferir(chave)).toBe(true)
    expect(await conferir(chave.slice(0, 63) + (chave.endsWith('0') ? '1' : '0'))).toBe(false)
    expect(await conferir(chave.slice(0, 31))).toBe(false)
    expect(await conferir('')).toBe(false)
    expect(await conferir(null)).toBe(false)
  })
})

describe('CA-846: o agendamento', () => {
  it('CA-846: existe um agendamento diário às 06:15 UTC que pede a limpeza', () => {
    const r = sqlNoBancoLocal("select schedule || ' | ' || command || ' | ' || active from cron.job where jobname = 'metanutri-limpar-comprovantes';")
    expect(r.ok, r.erro).toBe(true)
    expect(r.saida).toBe('15 6 * * * | select public.pedir_limpeza_dos_comprovantes(); | true')
  })

  it('CA-846: sem o endereço do projeto no cofre, o pedido não sai e não dá erro', () => {
    const r = sqlNoBancoLocal("delete from vault.secrets where name = 'metanutri_url_do_projeto'; select public.pedir_limpeza_dos_comprovantes() is null;")
    expect(r.ok, r.erro).toBe(true)
    expect(r.saida).toBe('t')
  })
})
