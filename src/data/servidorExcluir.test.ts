// @vitest-environment node
// O núcleo da função excluir-conta (spec exclusao-de-conta, D-251 a D-256), com o banco e a operadora de mentira
// (src/data/servidorFalsos.test-utils.ts) e uma porta de exclusão de mentira, aqui mesmo.
import { EM_ANDAMENTO, RESERVA_VENCE_MS } from '../../supabase/functions/_shared/assinar.ts'
import { MUITAS_CHAMADAS } from '../../supabase/functions/_shared/chamadas.ts'
import {
  ADMINISTRADOR,
  CONFIRME_A_SENHA,
  EXCLUSAO_FALHOU,
  EXCLUSAO_FALHOU_CANCELADA,
  excluirConta,
  horaDaSenha,
  SEM_SESSAO,
  SENHA_VALE_MS,
  type PedidoDeExclusao,
  type PortaDaExclusao,
  type QuemPedeAExclusao,
} from '../../supabase/functions/_shared/excluirConta.ts'
import { AGORA, cenario, linhaDe, responde, type Cenario } from './servidorFalsos.test-utils.ts'

const CONTA = { id: 'u1', email: 'ana@exemplo.com' }
const MINUTO_MS = 60_000
const minutosAntes = (n: number) => new Date(AGORA.getTime() - n * MINUTO_MS)
const QUEM: QuemPedeAExclusao = { tipo: 'conta', conta: CONTA, senhaEm: minutosAntes(1) }
const PEDIDO: PedidoDeExclusao = { quem: QUEM, corpo: { acao: 'excluir' } }
const comSenhaEm = (senhaEm: Date | null): PedidoDeExclusao => ({ quem: { tipo: 'conta', conta: CONTA, senhaEm }, corpo: { acao: 'excluir' } })

const ATIVA = { nutricionista_id: 'u1', plano: 'solo', status: 'ativa', ciclo: 'mensal', preapproval_id: 'pre-1', cartao_final: '6351', proxima_cobranca: '2026-11-06T15:00:00.000Z' }
const GET = 'GET /preapproval/pre-1'
const PUT = 'PUT /preapproval/pre-1'
const COBRADA = { status: 'authorized', summarized: { charged_quantity: 1 }, next_payment_date: '2026-11-06T15:00:00.000Z' }
const CANCELADA_LA = { ...COBRADA, status: 'cancelled' }
const BEM = { [GET]: [responde(200, COBRADA)], [PUT]: [responde(200)] }

const EXCLUIDA = { status: 200, corpo: { excluida: true } }
const FALHOU = { status: 502, corpo: { erro: EXCLUSAO_FALHOU } }
/** L5 da revisão (CA-809): a falha depois de o mesmo pedido cancelar a assinatura. */
const FALHOU_CANCELADA = { status: 502, corpo: { erro: EXCLUSAO_FALHOU_CANCELADA, codigo: 'assinatura-cancelada' } }
const MUITAS = { status: 429, corpo: { erro: MUITAS_CHAMADAS, codigo: 'muitas-chamadas' } }
/** D-256: o pedido anotado no limite (e as chamadas antigas apagadas). */
const LIMITE = ['anotarChamada', 'apagarChamadasAntesDe'] as const

interface OpcoesDaPorta {
  readonly admin?: boolean | 'falha'
  /** Quantas vezes cada passo falha antes de dar certo. */
  readonly falhasDosArquivos?: number
  readonly falhasDoLogin?: number
  /** L4: uma reserva já feita (pagamento ou outra exclusão em andamento), feita em `desde`; ou a reserva que falha. */
  readonly reservaDesde?: string | 'falha'
}

/** A porta de mentira: anota cada passo em `c.ordem`, como o banco e a operadora de mentira. */
function portaFalsa(c: Cenario, { admin = false, falhasDosArquivos = 0, falhasDoLogin = 0, reservaDesde }: OpcoesDaPorta = {}) {
  const estado = {
    arquivosApagados: 0,
    loginApagado: false,
    faltamArquivos: falhasDosArquivos,
    faltamLogin: falhasDoLogin,
    reserva: reservaDesde === 'falha' ? null : (reservaDesde ?? null),
    vencidasAntesDe: [] as string[],
  }
  const porta: PortaDaExclusao = {
    async reservar(_conta, antesDe) {
      c.ordem.push('reservar')
      estado.vencidasAntesDe.push(antesDe)
      if (reservaDesde === 'falha') return { tipo: 'falhou', mensagem: 'reserva fora' }
      if (estado.reserva !== null && estado.reserva >= antesDe) return { tipo: 'ocupada' }
      estado.reserva = AGORA.toISOString()
      return { tipo: 'reservada' }
    },
    async soltarReserva() {
      c.ordem.push('soltarReserva')
      estado.reserva = null
      return null
    },
    async ehAdmin() {
      c.ordem.push('ehAdmin')
      if (admin === 'falha') throw new Error('administradores fora')
      return admin
    },
    async apagarArquivos() {
      c.ordem.push('apagarArquivos')
      if (estado.faltamArquivos > 0) {
        estado.faltamArquivos -= 1
        return 'armazenamento fora'
      }
      estado.arquivosApagados += 1
      return null
    },
    async apagarLogin() {
      c.ordem.push('apagarLogin')
      if (estado.faltamLogin > 0) {
        estado.faltamLogin -= 1
        return 'login fora'
      }
      estado.loginApagado = true
      return null
    },
  }
  return { porta, estado }
}

function montar(linhas: Parameters<typeof cenario>[0] = [], rotas: Parameters<typeof cenario>[1] = BEM, opcoes: OpcoesDaPorta = {}) {
  const c = cenario(linhas, rotas)
  const { porta, estado } = portaFalsa(c, opcoes)
  return { c, estado, deps: { ...c.deps, exclusao: porta } }
}

/** Um token com esta carga, como o servidor de login assina (a assinatura não importa aqui: a porta da função confere). */
const token = (carga: unknown): string => {
  const parte = (valor: unknown) => Buffer.from(JSON.stringify(valor)).toString('base64url')
  return `${parte({ alg: 'HS256', typ: 'JWT' })}.${parte(carga)}.assinatura`
}

describe('horaDaSenha: a hora da última entrada, lida no token (D-251)', () => {
  const SEGUNDOS = Math.floor(AGORA.getTime() / 1000)

  it('a entrada com senha vira a hora dela', () => {
    expect(horaDaSenha(token({ sub: 'u1', amr: [{ method: 'password', timestamp: SEGUNDOS }] }))).toEqual(new Date(SEGUNDOS * 1000))
  })

  it('com mais de uma entrada na sessão, vale a mais nova', () => {
    const amr = [
      { method: 'password', timestamp: SEGUNDOS - 600 },
      { method: 'otp', timestamp: SEGUNDOS - 30 },
    ]
    expect(horaDaSenha(token({ amr }))).toEqual(new Date((SEGUNDOS - 30) * 1000))
  })

  it('a carga com caracteres do base64url (- e _) é lida', () => {
    const carga = { amr: [{ method: 'password', timestamp: SEGUNDOS }], nome: '>>>???~~~ÿÿÿ' }
    const lido = token(carga)
    expect(lido.split('.')[1]).toMatch(/[-_]/)
    expect(horaDaSenha(lido)).toEqual(new Date(SEGUNDOS * 1000))
  })

  it.each<[string, string]>([
    ['sem amr', token({ sub: 'u1' })],
    ['amr que não é lista', token({ amr: 'password' })],
    ['amr vazia', token({ amr: [] })],
    ['hora que não é número', token({ amr: [{ method: 'password', timestamp: '1792451340' }] })],
    ['hora zero ou negativa', token({ amr: [{ method: 'password', timestamp: 0 }, { method: 'otp', timestamp: -5 }] })],
    ['carga que não é JSON', 'eyJhbGciOiJIUzI1NiJ9.nao-e-json.assinatura'],
    ['texto que não é token', 'nada'],
    ['vazio', ''],
  ])('%s: nula (o pedido pede a senha de novo)', (_caso, jwt) => {
    expect(horaDaSenha(jwt)).toBeNull()
  })
})

describe('excluirConta: quem pede (CA-815, CA-821)', () => {
  it('CA-815: sem sessão, 401 e nada é feito', async () => {
    const { c, deps } = montar([ATIVA])
    expect(await excluirConta({ quem: { tipo: 'ninguem' }, corpo: { acao: 'excluir' } }, deps)).toEqual({ status: 401, corpo: { erro: SEM_SESSAO } })
    expect(c.ordem).toEqual([])
    expect(c.pedidos).toEqual([])
  })

  it('CA-821 e CB-250: o login já não existe (pedido repetido depois de excluir), 200 "já excluída" e nada é feito', async () => {
    const { c, deps } = montar([ATIVA])
    expect(await excluirConta({ quem: { tipo: 'apagada' }, corpo: { acao: 'excluir' } }, deps)).toEqual(EXCLUIDA)
    expect(c.ordem).toEqual([])
    expect(c.pedidos).toEqual([])
  })

  it.each<[string, unknown]>([
    ['corpo nulo', null],
    ['sem ação', {}],
    ['outra ação', { acao: 'cancelar' }],
    ['uma lista', ['excluir']],
  ])('%s: 400 e nada é feito', async (_caso, corpo) => {
    const { c, deps } = montar([ATIVA])
    expect((await excluirConta({ quem: QUEM, corpo }, deps)).status).toBe(400)
    expect(c.ordem).toEqual([])
  })
})

describe('excluirConta: a senha conferida há pouco (D-251, CA-816)', () => {
  it.each<[string, Date | null]>([
    ['sem hora de entrada no token', null],
    ['entrada há 10 minutos e 1 segundo', new Date(AGORA.getTime() - SENHA_VALE_MS - 1000)],
    ['entrada há uma hora', minutosAntes(60)],
  ])('CA-816: %s, 401 "Confirme sua senha de novo." e nada é feito', async (_caso, senhaEm) => {
    const { c, deps } = montar([ATIVA])
    expect(await excluirConta(comSenhaEm(senhaEm), deps)).toEqual({ status: 401, corpo: { erro: CONFIRME_A_SENHA, codigo: 'login-antigo' } })
    expect(c.ordem).toEqual([])
    expect(c.pedidos).toEqual([])
  })

  it.each<[string, Date]>([
    ['exatamente 10 minutos', new Date(AGORA.getTime() - SENHA_VALE_MS)],
    ['agora', AGORA],
    ['um minuto no futuro (o relógio do servidor de login adiantado)', new Date(AGORA.getTime() + MINUTO_MS)],
  ])('%s: passa', async (_caso, senhaEm) => {
    const { deps } = montar()
    expect(await excluirConta(comSenhaEm(senhaEm), deps)).toEqual(EXCLUIDA)
  })

  it('a senha vale 10 minutos', () => {
    expect(SENHA_VALE_MS).toBe(10 * MINUTO_MS)
  })
})

describe('excluirConta: administrador (D-254, CA-817)', () => {
  it('CA-817: conta de administrador, 403 com a frase do bloco, e nada é feito', async () => {
    const { c, deps, estado } = montar([ATIVA], BEM, { admin: true })
    expect(await excluirConta(PEDIDO, deps)).toEqual({ status: 403, corpo: { erro: ADMINISTRADOR, codigo: 'administrador' } })
    expect(c.ordem).toEqual(['ehAdmin'])
    expect(c.chamadas).toEqual([])
    expect(estado.loginApagado).toBe(false)
    expect(ADMINISTRADOR).toBe('Conta de administrador não é excluída pelo site.')
  })

  it('sem conseguir saber se é administrador, 502 e nada é feito', async () => {
    const { c, deps } = montar([ATIVA], BEM, { admin: 'falha' })
    expect(await excluirConta(PEDIDO, deps)).toEqual(FALHOU)
    expect(c.ordem).toEqual(['ehAdmin'])
    expect(c.log).toHaveBeenCalledWith('Não consegui saber se a conta é de administrador:', 'administradores fora')
  })
})

describe('excluirConta: o limite de pedidos (D-256, CA-822)', () => {
  it('CA-822: com 5 pedidos na última hora, 429 e nada é feito', async () => {
    const { c, deps, estado } = montar([ATIVA])
    c.semearChamadas('u1', 'excluir', 5, minutosAntes(30))
    expect(await excluirConta(PEDIDO, deps)).toEqual(MUITAS)
    expect(c.ordem).toEqual(['ehAdmin', 'anotarChamada'])
    expect(c.pedidos).toEqual([])
    expect(estado.loginApagado).toBe(false)
  })

  it('CB-114: sem conseguir contar, 502 e nada é feito', async () => {
    const { c, deps } = montar([ATIVA])
    c.falhar('anotarChamada')
    expect(await excluirConta(PEDIDO, deps)).toEqual(FALHOU)
    expect(c.ordem).toEqual(['ehAdmin', 'anotarChamada'])
  })

  it('cada pedido que passa da senha e do administrador fica anotado como excluir', async () => {
    const { c, deps } = montar()
    await excluirConta(PEDIDO, deps)
    expect(c.chamadas.map((ch) => [ch.conta, ch.tipo])).toEqual([['u1', 'excluir']])
  })
})

describe('excluirConta: a ordem dos passos (D-252, CA-812, CA-814)', () => {
  it('CA-812: conta sem assinatura paga: confere, anota, lê a assinatura, apaga os arquivos e depois o login', async () => {
    const { c, deps, estado } = montar([])
    expect(await excluirConta(PEDIDO, deps)).toEqual(EXCLUIDA)
    expect(c.ordem).toEqual(['ehAdmin', ...LIMITE, 'reservar', 'lerDaConta', 'apagarArquivos', 'apagarLogin', 'soltarReserva'])
    expect(c.pedidos).toEqual([])
    expect(estado).toMatchObject({ arquivosApagados: 1, loginApagado: true })
  })

  it('CA-814: assinatura paga ativa: cancela na operadora pelo caminho do "Cancelar assinatura" antes de apagar qualquer coisa', async () => {
    const { c, deps, estado } = montar([ATIVA])
    expect(await excluirConta(PEDIDO, deps)).toEqual(EXCLUIDA)
    expect(c.ordem).toEqual(['ehAdmin', ...LIMITE, 'reservar', 'lerDaConta', 'lerDaConta', ...LIMITE, GET, PUT, 'mudar', 'apagarArquivos', 'apagarLogin', 'soltarReserva'])
    expect(c.pedidos.map((p) => [p.metodo, p.corpo])).toEqual([
      ['GET', undefined],
      ['PUT', { status: 'cancelled' }],
    ])
    expect(c.assinaturas.get('u1')).toMatchObject({ status: 'cancelada', encerrada_por: 'pessoa', encerrada_em: AGORA.toISOString() })
    expect(c.chamadas.map((ch) => ch.tipo)).toEqual(['excluir', 'conferir'])
    expect(estado.loginApagado).toBe(true)
  })

  it.each([
    ['pendente', { ...ATIVA, status: 'pendente' }],
    ['pausada', { ...ATIVA, status: 'pausada' }],
  ])('CA-814: assinatura %s do cartão também é cancelada lá antes', async (_caso, linha) => {
    const { c, deps } = montar([linha], { [GET]: [responde(200, { status: _caso === 'pausada' ? 'paused' : 'pending' })], [PUT]: [responde(200)] })
    expect(await excluirConta(PEDIDO, deps)).toEqual(EXCLUIDA)
    expect(c.pedidos.map((p) => p.metodo)).toEqual(['GET', 'PUT'])
    expect(c.ordem.indexOf(PUT)).toBeLessThan(c.ordem.indexOf('apagarArquivos'))
  })

  it.each([
    ['já cancelada aqui (CB-251)', { ...ATIVA, status: 'cancelada', expira_em: '2026-11-06T02:59:59.000Z', encerrada_por: 'pessoa' }],
    ['Estudante, sem assinatura no Mercado Pago', { nutricionista_id: 'u1', plano: 'estudante', status: 'ativa', expira_em: '2027-06-30T02:59:59.000Z' }],
    ['plano pago sem código da operadora', { ...ATIVA, preapproval_id: null }],
    ['Free', { nutricionista_id: 'u1', plano: 'free', status: 'pendente' }],
  ])('%s: não chama a operadora e exclui', async (_caso, linha) => {
    const { c, deps, estado } = montar([linha])
    expect(await excluirConta(PEDIDO, deps)).toEqual(EXCLUIDA)
    expect(c.pedidos).toEqual([])
    expect(estado.loginApagado).toBe(true)
  })

  it('CA-814: a operadora fora: 502 com a frase do CA-809, e nada é apagado', async () => {
    const { c, deps, estado } = montar([ATIVA], { [GET]: [null] })
    expect(await excluirConta(PEDIDO, deps)).toEqual(FALHOU)
    expect(c.ordem).not.toContain('apagarArquivos')
    expect(c.ordem).not.toContain('apagarLogin')
    expect(c.assinaturas.get('u1')).toEqual(linhaDe(ATIVA))
    expect(estado).toMatchObject({ arquivosApagados: 0, loginApagado: false })
    expect(c.log).toHaveBeenCalledWith('A assinatura não foi cancelada; nada foi apagado. Status:', 502)
  })

  it('CA-810: o limite de conferir e cancelar cheio: 429, e nada é apagado', async () => {
    const { c, deps, estado } = montar([ATIVA])
    c.semearChamadas('u1', 'conferir', 20, minutosAntes(30))
    expect(await excluirConta(PEDIDO, deps)).toEqual(MUITAS)
    expect(c.pedidos).toEqual([])
    expect(estado.loginApagado).toBe(false)
  })

  it('CB-251: cancelada lá e não gravada aqui: 502 sem apagar, dizendo que a assinatura foi cancelada; o pedido seguinte não cancela de novo e termina', async () => {
    const { c, deps, estado } = montar([ATIVA], { [GET]: [responde(200, COBRADA), responde(200, CANCELADA_LA)], [PUT]: [responde(200)] })
    c.falhar('mudar', 2)
    expect(await excluirConta(PEDIDO, deps)).toEqual(FALHOU_CANCELADA)
    expect(estado.loginApagado).toBe(false)
    expect(c.pedidos.filter((p) => p.metodo === 'PUT')).toHaveLength(1)
    expect(await excluirConta(PEDIDO, deps)).toEqual(EXCLUIDA)
    expect(c.pedidos.filter((p) => p.metodo === 'PUT')).toHaveLength(1)
    expect(c.assinaturas.get('u1')?.status).toBe('cancelada')
    expect(estado.loginApagado).toBe(true)
  })

  it('a assinatura mudou entre as duas leituras e deixou de ser paga (409 do cancelamento): segue e exclui', async () => {
    const { c, deps, estado } = montar([ATIVA])
    let leituras = 0
    const banco = {
      ...c.banco,
      lerDaConta: async (conta: string) => {
        leituras += 1
        const lida = await c.banco.lerDaConta(conta)
        return leituras === 1 ? lida : { linha: linhaDe({ nutricionista_id: 'u1', plano: 'free', status: 'pendente' }), falha: null }
      },
    }
    expect(await excluirConta(PEDIDO, { ...deps, banco })).toEqual(EXCLUIDA)
    expect(c.pedidos).toEqual([])
    expect(estado.loginApagado).toBe(true)
  })

  it('sem conseguir ler a assinatura, 502 e nada é apagado', async () => {
    const { c, deps, estado } = montar([ATIVA])
    c.falhar('lerDaConta')
    expect(await excluirConta(PEDIDO, deps)).toEqual(FALHOU)
    expect(c.pedidos).toEqual([])
    expect(estado).toMatchObject({ arquivosApagados: 0, loginApagado: false })
    expect(c.log).toHaveBeenCalledWith('Não consegui ler a assinatura da conta:', 'banco fora')
  })
})

describe('excluirConta: a reserva da conta (L4 da revisão, CB-253)', () => {
  it('CB-253: com um pagamento (ou outra exclusão) em andamento, 409 com a frase de pagamento em andamento, e nada é feito', async () => {
    const { c, deps, estado } = montar([ATIVA], BEM, { reservaDesde: AGORA.toISOString() })
    expect(await excluirConta(PEDIDO, deps)).toEqual({ status: 409, corpo: { erro: EM_ANDAMENTO, codigo: 'em-andamento' } })
    expect(c.ordem).toEqual(['ehAdmin', ...LIMITE, 'reservar'])
    expect(c.pedidos).toEqual([])
    expect(estado.loginApagado).toBe(false)
    // A reserva do outro pedido continua: quem a fez solta.
    expect(estado.reserva).toBe(AGORA.toISOString())
  })

  it('CB-253: a reserva de uma função que morreu há mais de 5 minutos vence, e a exclusão segue', async () => {
    const { deps, estado } = montar([], BEM, { reservaDesde: new Date(AGORA.getTime() - 6 * MINUTO_MS).toISOString() })
    expect(await excluirConta(PEDIDO, deps)).toEqual(EXCLUIDA)
    expect(estado.vencidasAntesDe).toEqual([new Date(AGORA.getTime() - RESERVA_VENCE_MS).toISOString()])
  })

  it('sem conseguir reservar, 502 e nada é feito', async () => {
    const { c, deps, estado } = montar([ATIVA], BEM, { reservaDesde: 'falha' })
    expect(await excluirConta(PEDIDO, deps)).toEqual(FALHOU)
    expect(c.ordem).toEqual(['ehAdmin', ...LIMITE, 'reservar'])
    expect(estado.loginApagado).toBe(false)
    expect(c.log).toHaveBeenCalledWith('Não consegui reservar a conta para a exclusão:', 'reserva fora')
  })

  it('a reserva sai também quando um passo falha (o pedido seguinte reserva de novo)', async () => {
    const { c, deps, estado } = montar([ATIVA], { [GET]: [null] })
    expect(await excluirConta(PEDIDO, deps)).toEqual(FALHOU)
    expect(c.ordem.at(-1)).toBe('soltarReserva')
    expect(estado.reserva).toBeNull()
  })
})

describe('excluirConta: falha no meio e o pedido seguinte (D-252, CA-821)', () => {
  it('CA-821: os arquivos não saem: 502, o login fica; o pedido seguinte termina', async () => {
    const { c, deps, estado } = montar([], BEM, { falhasDosArquivos: 1 })
    expect(await excluirConta(PEDIDO, deps)).toEqual(FALHOU)
    expect(c.ordem.slice(-2)).toEqual(['apagarArquivos', 'soltarReserva'])
    expect(estado.loginApagado).toBe(false)
    expect(c.log).toHaveBeenCalledWith('Não consegui apagar os comprovantes; o login ficou:', 'armazenamento fora')
    expect(await excluirConta(PEDIDO, deps)).toEqual(EXCLUIDA)
    expect(estado).toMatchObject({ arquivosApagados: 1, loginApagado: true })
  })

  it('CA-821: o login não sai: 502; o pedido seguinte apaga os arquivos que sobraram e o login', async () => {
    const { c, deps, estado } = montar([], BEM, { falhasDoLogin: 1 })
    expect(await excluirConta(PEDIDO, deps)).toEqual(FALHOU)
    expect(estado.loginApagado).toBe(false)
    expect(c.log).toHaveBeenCalledWith('Não consegui apagar o login:', 'login fora')
    expect(await excluirConta(PEDIDO, deps)).toEqual(EXCLUIDA)
    expect(estado).toMatchObject({ arquivosApagados: 2, loginApagado: true })
  })

  it.each([
    ['os arquivos não saem', { falhasDosArquivos: 1 }],
    ['o login não sai', { falhasDoLogin: 1 }],
  ])('CA-809 (L5 da revisão): o pedido cancelou a assinatura e %s: a frase diz que a assinatura já foi cancelada', async (_caso, opcoes) => {
    const { deps } = montar([ATIVA], BEM, opcoes)
    expect(await excluirConta(PEDIDO, deps)).toEqual(FALHOU_CANCELADA)
    expect(EXCLUSAO_FALHOU_CANCELADA).toBe('Não foi possível concluir a exclusão. A assinatura já foi cancelada, mas os demais dados da conta continuam salvos. Tente de novo em alguns minutos.')
  })

  it('CA-809: a assinatura já estava cancelada antes deste pedido e os arquivos não saem: a frase de sempre', async () => {
    const { deps } = montar([{ ...ATIVA, status: 'cancelada', expira_em: '2026-11-06T02:59:59.000Z', encerrada_por: 'pessoa' }], BEM, { falhasDosArquivos: 1 })
    expect(await excluirConta(PEDIDO, deps)).toEqual(FALHOU)
  })

  it('nenhum registro leva o e-mail', async () => {
    const casos = [montar([ATIVA], { [GET]: [null] }), montar([], BEM, { falhasDosArquivos: 1 }), montar([], BEM, { falhasDoLogin: 1 }), montar([], BEM, { admin: 'falha' })]
    for (const { deps } of casos) await excluirConta(PEDIDO, deps)
    const registros = JSON.stringify(casos.flatMap(({ c }) => c.log.mock.calls))
    expect(registros).not.toContain('ana@exemplo.com')
  })
})
