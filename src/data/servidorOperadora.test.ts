// @vitest-environment node
import { cancelarNaOperadora, criarOperadora } from '../../supabase/functions/_shared/operadora.ts'
import { AGORA, cenario, responde } from './servidorFalsos.test-utils.ts'

describe('a operadora de verdade (fetch padrão, D-88)', () => {
  it('manda o token, o corpo em JSON e o prazo; o POST tem o prazo maior', async () => {
    const prazo = vi.spyOn(AbortSignal, 'timeout')
    const buscar = vi.fn<typeof fetch>(async () => new Response(JSON.stringify({ id: 'pre-1', status: 'authorized' }), { status: 201 }))
    const operadora = criarOperadora('tok-servidor', { prazoMs: 10_000, prazoDoPostMs: 30_000 }, buscar)
    expect(await operadora('POST', '/preapproval', { reason: 'x' })).toEqual({ ok: true, status: 201, dados: { id: 'pre-1', status: 'authorized' } })
    expect(buscar.mock.calls[0]?.[0]).toBe('https://api.mercadopago.com/preapproval')
    expect(buscar.mock.calls[0]?.[1]).toMatchObject({ method: 'POST', headers: { Authorization: 'Bearer tok-servidor', 'Content-Type': 'application/json' }, body: '{"reason":"x"}' })
    expect(prazo).toHaveBeenLastCalledWith(30_000)
    await operadora('GET', '/preapproval/pre-1')
    expect(prazo).toHaveBeenLastCalledWith(10_000)
    expect(buscar.mock.calls[1]?.[1]).not.toHaveProperty('body')
    prazo.mockRestore()
  })

  it('sem resposta (rede caída ou prazo estourado) é null', async () => {
    const operadora = criarOperadora('t', { prazoMs: 1, prazoDoPostMs: 1 }, vi.fn<typeof fetch>(async () => { throw new TypeError('fetch failed') }))
    expect(await operadora('GET', '/preapproval/x')).toBeNull()
  })

  it('corpo que não é objeto JSON vira dados nulos, e o erro da operadora volta com o status', async () => {
    const lista = criarOperadora('t', { prazoMs: 1, prazoDoPostMs: 1 }, vi.fn<typeof fetch>(async () => new Response('[1]', { status: 200 })))
    expect(await lista('GET', '/x')).toEqual({ ok: true, status: 200, dados: null })
    const texto = criarOperadora('t', { prazoMs: 1, prazoDoPostMs: 1 }, vi.fn<typeof fetch>(async () => new Response('erro', { status: 502 })))
    expect(await texto('GET', '/x')).toEqual({ ok: false, status: 502, dados: null })
  })
})

describe('cancelar na operadora (o mesmo nas três funções)', () => {
  const PUT = 'PUT /preapproval/pre-1'
  const GET = 'GET /preapproval/pre-1'

  it('"cancelled" aceito: um pedido só', async () => {
    const c = cenario([], { [PUT]: [responde(200)] })
    expect(await cancelarNaOperadora(c.operadora, 'pre-1')).toBe(true)
    expect(c.pedidos).toEqual([{ metodo: 'PUT', caminho: '/preapproval/pre-1', corpo: { status: 'cancelled' } }])
  })

  it('a palavra recusada (4xx): tenta "canceled", como a documentação em português escreve', async () => {
    const c = cenario([], { [PUT]: [responde(400), responde(200)] })
    expect(await cancelarNaOperadora(c.operadora, 'pre-1')).toBe(true)
    expect(c.pedidos.map((p) => p.corpo)).toEqual([{ status: 'cancelled' }, { status: 'canceled' }])
  })

  it('CB-93: as duas recusadas, mas a leitura diz cancelada (a resposta se perdeu): conta como cancelada', async () => {
    const c = cenario([], { [PUT]: [responde(400)], [GET]: [responde(200, { status: 'cancelled' })] })
    expect(await cancelarNaOperadora(c.operadora, 'pre-1')).toBe(true)
  })

  it('sem resposta e sem leitura: não cancelou', async () => {
    const c = cenario()
    expect(await cancelarNaOperadora(c.operadora, 'pre-1')).toBe(false)
  })

  it('401/403 é a nossa credencial: não tenta a outra palavra', async () => {
    const c = cenario([], { [PUT]: [responde(401)], [GET]: [responde(401)] })
    expect(await cancelarNaOperadora(c.operadora, 'pre-1')).toBe(false)
    expect(c.pedidos.filter((p) => p.metodo === 'PUT')).toHaveLength(1)
  })

  it('o id vai codificado no caminho: um aviso forjado não navega pela API', async () => {
    const c = cenario()
    await cancelarNaOperadora(c.operadora, '../v1/payments')
    expect(c.pedidos[0]?.caminho).toBe('/preapproval/..%2Fv1%2Fpayments')
  })
})

describe('as tentativas de cartão no banco de mentira (R4, R6, R7)', () => {
  const HORA = 3_600_000
  const antes = (h: number) => new Date(AGORA.getTime() - h * HORA)

  it('conta as recusas da conta em 24 h, as seguidas desde o último sucesso e as do site na última hora', async () => {
    const c = cenario()
    c.semearTentativas('c1', [
      { quando: antes(30), recusada: true },
      { quando: antes(10), recusada: true },
      { quando: antes(5), recusada: false },
      { quando: antes(3), recusada: true },
      { quando: antes(0.5), recusada: true },
    ])
    c.semearTentativas('c2', [
      { quando: antes(0.2), recusada: true },
      { quando: antes(2), recusada: true },
    ])
    expect(await c.banco.contarRecusas('c1', AGORA)).toEqual({ daConta24h: 3, seguidasDaConta: 2, doSite1h: 2 })
    expect(await c.banco.contarRecusas('c2', AGORA)).toEqual({ daConta24h: 2, seguidasDaConta: 2, doSite1h: 2 })
  })

  it('anota a tentativa e apaga as antigas', async () => {
    const c = cenario()
    c.semearTentativas('c1', [{ quando: antes(24 * 8), recusada: true }])
    await c.banco.anotarTentativa('c1', true)
    await c.banco.apagarTentativasAntesDe(antes(24 * 7))
    expect(c.tentativas).toHaveLength(1)
    expect(await c.banco.contarRecusas('c1', AGORA)).toEqual({ daConta24h: 1, seguidasDaConta: 1, doSite1h: 1 })
  })
})
