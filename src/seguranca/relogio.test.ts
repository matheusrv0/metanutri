// @vitest-environment node
// Rodada de melhorias (16/11), infraestrutura: nos testes de ataque, o pedido recusado com "JWT issued at future"
// (PGRST303) não chegou à regra do banco. O relógio do Docker andou para trás depois que o login assinou o token:
// esperar 10 s não basta quando o salto passa disso. O pedido é repetido com um token novo, assinado na hora do
// relógio de agora; sem sessão para renovar, ele espera como antes. Puro: sem rede.
import { fetchQueAcertaORelogio } from '../../testes/seguranca/relogio.ts'

const DO_FUTURO = () => new Response(JSON.stringify({ code: 'PGRST303', message: 'JWT issued at future' }), { status: 401 })
const CERTO = () => new Response('[]', { status: 200 })
const RECUSADO = () => new Response(JSON.stringify({ code: '42501', message: 'permission denied' }), { status: 403 })

interface Pedido {
  readonly url: string
  readonly autorizacao: string | null
  readonly apikey: string | null
  readonly corpo: unknown
}

/** Um servidor falso que responde a lista na ordem e anota cada pedido. */
function servidor(respostas: readonly (() => Response)[]) {
  const pedidos: Pedido[] = []
  const base: typeof fetch = async (entrada, opcoes) => {
    pedidos.push({ url: String(entrada), autorizacao: new Headers(opcoes?.headers).get('Authorization'), apikey: new Headers(opcoes?.headers).get('apikey'), corpo: opcoes?.body })
    const proxima = respostas[Math.min(pedidos.length - 1, respostas.length - 1)]
    if (!proxima) throw new Error('sem resposta')
    return proxima()
  }
  return { base, pedidos }
}

const semEsperar = async () => undefined
const OPCOES = { method: 'POST', headers: { Authorization: 'Bearer velho', apikey: 'anon' }, body: '{"a":1}' }

describe('o pedido recusado pelo relógio do Docker', () => {
  it('é repetido uma vez com o token renovado, e a resposta certa volta', async () => {
    const { base, pedidos } = servidor([DO_FUTURO, CERTO])
    let renovacoes = 0
    const renovar = async () => {
      renovacoes++
      return 'novo'
    }
    const resposta = await fetchQueAcertaORelogio(base, renovar, semEsperar)('http://127.0.0.1:55421/rest/v1/copias', OPCOES)
    expect(resposta.status).toBe(200)
    expect(renovacoes).toBe(1)
    expect(pedidos.map((p) => p.autorizacao)).toEqual(['Bearer velho', 'Bearer novo'])
    expect(pedidos.map((p) => p.corpo)).toEqual(['{"a":1}', '{"a":1}'])
    expect(pedidos.map((p) => p.apikey)).toEqual(['anon', 'anon'])
  })

  it('sem sessão para renovar, espera e repete, como antes', async () => {
    const { base, pedidos } = servidor([DO_FUTURO, DO_FUTURO, CERTO])
    let esperas = 0
    const esperar = async () => {
      esperas++
    }
    const resposta = await fetchQueAcertaORelogio(base, async () => null, esperar)('http://127.0.0.1:55421/rest/v1/copias', OPCOES)
    expect(resposta.status).toBe(200)
    expect(esperas).toBe(2)
    expect(pedidos.map((p) => p.autorizacao)).toEqual(['Bearer velho', 'Bearer velho', 'Bearer velho'])
  })

  it('renova uma vez só; se o token novo também vier do futuro, espera', async () => {
    const { base, pedidos } = servidor([DO_FUTURO, DO_FUTURO, CERTO])
    let renovacoes = 0
    const renovar = async () => `novo-${++renovacoes}`
    const resposta = await fetchQueAcertaORelogio(base, renovar, semEsperar)('http://127.0.0.1:55421/rest/v1/copias', OPCOES)
    expect(resposta.status).toBe(200)
    expect(renovacoes).toBe(1)
    expect(pedidos.map((p) => p.autorizacao)).toEqual(['Bearer velho', 'Bearer novo-1', 'Bearer novo-1'])
  })

  it('desiste depois de 40 tentativas e devolve a recusa como veio', async () => {
    const { base, pedidos } = servidor([DO_FUTURO])
    const resposta = await fetchQueAcertaORelogio(base, async () => null, semEsperar)('http://127.0.0.1:55421/rest/v1/copias', OPCOES)
    expect(resposta.status).toBe(401)
    expect(await resposta.text()).toContain('PGRST303')
    expect(pedidos).toHaveLength(40)
  })

  it.each([
    ['a resposta certa', CERTO, 200],
    ['a recusa da regra do banco', RECUSADO, 403],
  ])('%s volta como veio, sem renovar nem repetir', async (_nome, resposta, status) => {
    const { base, pedidos } = servidor([resposta])
    let renovacoes = 0
    const r = await fetchQueAcertaORelogio(
      base,
      async () => {
        renovacoes++
        return 'novo'
      },
      semEsperar,
    )('http://127.0.0.1:55421/rest/v1/copias', OPCOES)
    expect(r.status).toBe(status)
    expect(renovacoes).toBe(0)
    expect(pedidos).toHaveLength(1)
  })

  it('o pedido sem login (só a chave) não ganha um token que não tinha', async () => {
    const { base, pedidos } = servidor([DO_FUTURO, CERTO])
    await fetchQueAcertaORelogio(base, async () => 'novo', semEsperar)('http://127.0.0.1:55421/rest/v1/copias', { headers: { apikey: 'anon' } })
    expect(pedidos.map((p) => p.autorizacao)).toEqual([null, null])
  })
})
