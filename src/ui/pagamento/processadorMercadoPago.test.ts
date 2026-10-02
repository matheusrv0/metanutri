import { ErroDoCartao, type EventoDosCampos, type MontagemDosCampos } from './processadorCartao.ts'
import {
  carregarSdk,
  chavePublicaDoPagamento,
  codigosDoErro,
  criarProcessadorMercadoPago,
  esquecerSdk,
  lerMetodoDoCartao,
  URL_DO_SDK,
  type ConstrutorDoSdk,
} from './processadorMercadoPago.ts'

/** Um campo seguro de mentira: guarda o que o adaptador pediu e deixa o teste disparar os eventos. */
class CampoFalso {
  readonly tipo: string
  readonly opcoes: Record<string, unknown>
  readonly ouvintes = new Map<string, (dados: unknown) => void>()
  readonly atualizacoes: Record<string, unknown>[] = []
  alvo: string | null = null
  desmontado = false
  focos = 0

  constructor(tipo: string, opcoes: Record<string, unknown>) {
    this.tipo = tipo
    this.opcoes = opcoes
  }

  mount(alvo: string) {
    this.alvo = alvo
    return this
  }

  unmount() {
    this.desmontado = true
  }

  on(evento: string, callback: (dados: unknown) => void) {
    this.ouvintes.set(evento, callback)
    return this
  }

  update(propriedades: Record<string, unknown>) {
    this.atualizacoes.push(propriedades)
  }

  focus() {
    this.focos += 1
  }

  emitir(evento: string, dados: unknown = {}) {
    this.ouvintes.get(evento)?.(dados)
  }
}

const sdk = {
  campos: [] as CampoFalso[],
  construidos: [] as { readonly chave: string; readonly locale: string }[],
  bins: [] as string[],
  tokens: [] as unknown[],
  metodos: async (): Promise<unknown> => ({ results: [] }),
  token: async (): Promise<unknown> => ({ id: 'tok_teste_1', last_four_digits: '3311' }),
}

class MercadoPagoFalso {
  readonly fields = {
    create: (tipo: string, opcoes: Record<string, unknown>) => {
      const campo = new CampoFalso(tipo, opcoes)
      sdk.campos.push(campo)
      return campo
    },
    createCardToken: (dados: unknown) => {
      sdk.tokens.push(dados)
      return sdk.token()
    },
  }

  constructor(chave: string, opcoes: { readonly locale: string }) {
    sdk.construidos.push({ chave, locale: opcoes.locale })
  }

  getPaymentMethods(filtro: { readonly bin: string }) {
    sdk.bins.push(filtro.bin)
    return sdk.metodos()
  }
}

const carregar = async () => MercadoPagoFalso as unknown as ConstrutorDoSdk

const MONTAGEM: MontagemDosCampos = {
  alvos: { numero: 'cartao-numero', validade: 'cartao-validade', codigo: 'cartao-codigo' },
  estilo: { color: '#1c222a', fontFamily: 'Manrope', height: '100%' },
  placeholders: { numero: '0000 0000 0000 0000', validade: 'MM/AA', codigo: '•••' },
  rotulos: { numero: 'Número do cartão', validade: 'Validade', codigo: 'Código de segurança' },
}

const MASTERCARD = {
  results: [{ id: 'master', name: 'Mastercard', payment_type_id: 'credit_card', settings: [{ card_number: { length: 16 }, security_code: { length: 3, mode: 'mandatory' } }] }],
}

/** O campo do tipo pedido que ainda está na página. */
const naTela = (tipo: string): CampoFalso => {
  const campo = sdk.campos.filter((c) => c.tipo === tipo && !c.desmontado).at(-1)
  if (!campo) throw new Error(`sem campo ${tipo}`)
  return campo
}

async function abrir(opcoes: { readonly tempoLimiteMs?: number } = {}) {
  const eventos: EventoDosCampos[] = []
  const processador = criarProcessadorMercadoPago('APP_USR-chave-de-teste', { carregar, ...opcoes })
  const montagem = processador.montar(MONTAGEM, (evento) => {
    eventos.push(evento)
  })
  // A recusa pode chegar antes de o teste olhar: marcar como tratada evita o aviso de rejeição solta.
  void montagem.catch(() => undefined)
  await vi.waitFor(() => expect(sdk.campos.filter((c) => !c.desmontado)).toHaveLength(3))
  return { processador, montagem, eventos }
}

async function abrirPronto() {
  const aberto = await abrir()
  for (const campo of sdk.campos) campo.emitir('ready')
  await aberto.montagem
  return aberto
}

beforeEach(() => {
  esquecerSdk()
  sdk.campos = []
  sdk.construidos = []
  sdk.bins = []
  sdk.tokens = []
  sdk.metodos = async () => MASTERCARD
  sdk.token = async () => ({ id: 'tok_teste_1', last_four_digits: '3311' })
  for (const script of document.querySelectorAll('script')) script.remove()
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

describe('o script dos campos seguros (R-35, CB-88)', () => {
  it('R-35: põe o script da operadora uma vez só e devolve o construtor quando ele carrega', async () => {
    const primeiro = carregarSdk()
    const segundo = carregarSdk()
    const scripts = document.querySelectorAll(`script[src="${URL_DO_SDK}"]`)
    expect(scripts).toHaveLength(1)
    expect(segundo).toBe(primeiro)
    vi.stubGlobal('MercadoPago', MercadoPagoFalso)
    scripts[0]?.dispatchEvent(new Event('load'))
    await expect(primeiro).resolves.toBe(MercadoPagoFalso)
  })

  it('CB-88: script que não carrega rejeita, sai da página, e a próxima tentativa põe outro', async () => {
    const tentativa = carregarSdk()
    document.querySelector(`script[src="${URL_DO_SDK}"]`)?.dispatchEvent(new Event('error'))
    await expect(tentativa).rejects.toThrow()
    expect(document.querySelectorAll(`script[src="${URL_DO_SDK}"]`)).toHaveLength(0)
    vi.useFakeTimers()
    void carregarSdk().catch(() => undefined)
    expect(document.querySelectorAll(`script[src="${URL_DO_SDK}"]`)).toHaveLength(1)
  })

  it('CB-88: script que demora demais também desiste', async () => {
    vi.useFakeTimers()
    const tentativa = carregarSdk(1000)
    vi.advanceTimersByTime(1000)
    await expect(tentativa).rejects.toThrow()
  })
})

describe('os três campos (D-66, CA-368)', () => {
  it('cria número, validade e código nos alvos, com o estilo, a fonte do site e o texto de cada um', async () => {
    const { montagem } = await abrir()
    expect(sdk.construidos).toEqual([{ chave: 'APP_USR-chave-de-teste', locale: 'pt-BR' }])
    expect(sdk.campos.map((c) => [c.tipo, c.alvo])).toEqual([
      ['cardNumber', 'cartao-numero'],
      ['expirationDate', 'cartao-validade'],
      ['securityCode', 'cartao-codigo'],
    ])
    expect(naTela('cardNumber').opcoes).toMatchObject({
      placeholder: '0000 0000 0000 0000',
      style: MONTAGEM.estilo,
      srLabel: 'Número do cartão',
      ariaRequired: true,
      enableLuhnValidation: true,
      customFonts: [{ src: 'https://fonts.googleapis.com/css2?family=Manrope:wght@400;600&display=swap' }],
    })
    expect(naTela('expirationDate').opcoes).toMatchObject({ mode: 'short', placeholder: 'MM/AA' })
    for (const campo of sdk.campos) campo.emitir('ready')
    await expect(montagem).resolves.toBeUndefined()
  })

  it('CB-88: campo que dá erro antes de ficar pronto faz a montagem falhar', async () => {
    const { montagem } = await abrir()
    naTela('securityCode').emitir('error', { error: 'bloqueado' })
    await expect(montagem).rejects.toThrow()
  })

  it('CB-88: campos que não ficam prontos a tempo também', async () => {
    const { montagem } = await abrir({ tempoLimiteMs: 20 })
    await expect(montagem).rejects.toThrow()
  })

  it('validityChange vira "válido" ou "inválido" do campo', async () => {
    const { eventos } = await abrirPronto()
    naTela('cardNumber').emitir('validityChange', { field: 'cardNumber', errorMessages: [] })
    naTela('securityCode').emitir('validityChange', { field: 'securityCode', errorMessages: [{ message: 'x', cause: 'invalid_length' }] })
    expect(eventos).toEqual([
      { tipo: 'validade', campo: 'numero', valido: true },
      { tipo: 'validade', campo: 'codigo', valido: false },
    ])
  })

  it('montar depois de desmontado (o React monta duas vezes no modo estrito) não cria campo nenhum', async () => {
    const processador = criarProcessadorMercadoPago('APP_USR-chave-de-teste', { carregar })
    const montagem = processador.montar(MONTAGEM, () => undefined)
    processador.desmontar()
    await montagem
    expect(sdk.campos).toHaveLength(0)
  })

  it('reaproveita a instância da operadora para a mesma chave', async () => {
    const primeira = await abrirPronto()
    primeira.processador.desmontar()
    await abrirPronto()
    expect(sdk.construidos).toHaveLength(1)
  })
})

describe('a bandeira pelos primeiros números (CA-369)', () => {
  it('busca a bandeira, avisa crédito e ajusta o tamanho do número e do código', async () => {
    const { eventos } = await abrirPronto()
    naTela('cardNumber').emitir('binChange', { bin: '54808328', field: 'cardNumber' })
    await vi.waitFor(() => expect(eventos).toEqual([{ tipo: 'cartao', cartao: { bandeira: 'Mastercard', tipo: 'credit_card', bin: '54808328' } }]))
    expect(sdk.bins).toEqual(['54808328'])
    expect(naTela('cardNumber').atualizacoes).toEqual([{ settings: { length: 16 } }])
    expect(naTela('securityCode').atualizacoes).toEqual([{ settings: { length: 3, mode: 'mandatory' } }])
  })

  it('foco 2: cartão múltiplo (crédito e débito no mesmo número) conta como crédito', async () => {
    sdk.metodos = async () => ({
      results: [
        { id: 'debelo', name: 'Elo Débito', payment_type_id: 'debit_card' },
        { id: 'elo', name: 'Elo', payment_type_id: 'credit_card' },
      ],
    })
    const { eventos } = await abrirPronto()
    naTela('cardNumber').emitir('binChange', { bin: '50677667' })
    await vi.waitFor(() => expect(eventos).toEqual([{ tipo: 'cartao', cartao: { bandeira: 'Elo', tipo: 'credit_card', bin: '50677667' } }]))
  })

  it('CA-369: cartão só de débito chega como débito', async () => {
    sdk.metodos = async () => ({ results: [{ id: 'debelo', name: 'Elo Débito', payment_type_id: 'debit_card' }] })
    const { eventos } = await abrirPronto()
    naTela('cardNumber').emitir('binChange', { bin: '50677667' })
    await vi.waitFor(() => expect(eventos).toEqual([{ tipo: 'cartao', cartao: { bandeira: 'Elo Débito', tipo: 'debit_card', bin: '50677667' } }]))
  })

  it('o mesmo começo não busca de novo; número apagado tira a bandeira', async () => {
    const { eventos } = await abrirPronto()
    naTela('cardNumber').emitir('binChange', { bin: '54808328' })
    await vi.waitFor(() => expect(eventos).toHaveLength(1))
    naTela('cardNumber').emitir('binChange', { bin: '54808328' })
    naTela('cardNumber').emitir('binChange', { bin: null })
    expect(sdk.bins).toEqual(['54808328'])
    expect(eventos.at(-1)).toEqual({ tipo: 'cartao', cartao: null })
  })

  it('foco 3: busca que falha fica sem bandeira, sem quebrar', async () => {
    sdk.metodos = async () => {
      throw new Error('rede')
    }
    const { eventos } = await abrirPronto()
    naTela('cardNumber').emitir('binChange', { bin: '54808328' })
    await vi.waitFor(() => expect(eventos).toEqual([{ tipo: 'cartao', cartao: null }]))
  })

  it('foco 3: resposta sem "results", sem nome ou sem tipo é lida como dá', () => {
    expect(lerMetodoDoCartao({}, '54808328')).toBeNull()
    expect(lerMetodoDoCartao({ results: [] }, '54808328')).toBeNull()
    expect(lerMetodoDoCartao({ results: [{ id: 'visa' }] }, '42356477')).toEqual({ bandeira: 'visa', tipo: null, bin: '42356477' })
  })
})

describe('o código de uso único do cartão (D-66, CB-90)', () => {
  it('manda o nome e o CPF do titular e devolve o código, o final e a bandeira', async () => {
    const { processador, eventos } = await abrirPronto()
    naTela('cardNumber').emitir('binChange', { bin: '54808328' })
    await vi.waitFor(() => expect(eventos).toHaveLength(1))
    await expect(processador.gerarToken({ nome: 'APRO', cpf: '12345678909' })).resolves.toEqual({ token: 'tok_teste_1', final: '3311', bandeira: 'Mastercard' })
    expect(sdk.tokens).toEqual([{ cardholderName: 'APRO', identificationType: 'CPF', identificationNumber: '12345678909' }])
  })

  it('CB-90: cada chamada pede um código novo', async () => {
    const { processador } = await abrirPronto()
    await processador.gerarToken({ nome: 'APRO', cpf: '12345678909' })
    await processador.gerarToken({ nome: 'APRO', cpf: '12345678909' })
    expect(sdk.tokens).toHaveLength(2)
  })

  it('foco 3: o erro do gerador vira ErroDoCartao com os códigos, em qualquer formato', async () => {
    const { processador } = await abrirPronto()
    sdk.token = () => Promise.reject([{ code: '205', message: 'parameter cardNumber can not be null/empty' }])
    const falha = await processador.gerarToken({ nome: 'APRO', cpf: '12345678909' }).catch((erro: unknown) => erro)
    expect(falha).toBeInstanceOf(ErroDoCartao)
    expect((falha as ErroDoCartao).codigos).toEqual(['205'])
    expect(codigosDoErro({ cause: [{ code: 'E301' }] })).toEqual(['E301'])
    // O formato de verdade do SDK v2 (conferido no navegador): sem `code`, com `field` e `cause` em texto.
    expect(
      codigosDoErro([
        { cause: 'invalid_value', message: 'cardNumber is empty.', field: 'cardNumber' },
        { cause: 'invalid_length', message: 'cardNumber should be of length between 8 and 19.', field: 'cardNumber' },
        { cause: 'invalid_value', message: 'expirationMonth is empty.', field: 'expirationMonth' },
        { cause: 'invalid_value', message: 'securityCode is empty.', field: 'securityCode' },
      ]),
    ).toEqual(['E301', '208', 'E302'])
    expect(codigosDoErro({ message: 'Error trying to create cardToken: The iFrame does not have a window' })).toEqual([])
    expect(codigosDoErro(null)).toEqual([])
  })

  it('resposta sem os 4 últimos números não vira código', async () => {
    const { processador } = await abrirPronto()
    sdk.token = async () => ({ id: 'tok_sem_final' })
    await expect(processador.gerarToken({ nome: 'APRO', cpf: '12345678909' })).rejects.toBeInstanceOf(ErroDoCartao)
  })

  it('sem os campos abertos, não há código', async () => {
    const processador = criarProcessadorMercadoPago('APP_USR-chave-de-teste', { carregar })
    await expect(processador.gerarToken({ nome: 'APRO', cpf: '12345678909' })).rejects.toBeInstanceOf(ErroDoCartao)
  })
})

describe('depois de uma recusa, o foco e a saída', () => {
  it('CA-373: limpar o código desmonta o campo e cria outro no mesmo alvo, com o tamanho da bandeira', async () => {
    const { processador, eventos } = await abrirPronto()
    naTela('cardNumber').emitir('binChange', { bin: '54808328' })
    await vi.waitFor(() => expect(eventos).toHaveLength(1))
    const antigo = naTela('securityCode')
    processador.limparCodigo()
    expect(antigo.desmontado).toBe(true)
    const novo = naTela('securityCode')
    expect(novo).not.toBe(antigo)
    expect(novo.alvo).toBe('cartao-codigo')
    expect(novo.atualizacoes).toEqual([{ settings: { length: 3, mode: 'mandatory' } }])
  })

  it('CA-370: focar põe o foco dentro do campo seguro', async () => {
    const { processador } = await abrirPronto()
    processador.focar('validade')
    expect(naTela('expirationDate').focos).toBe(1)
  })

  it('desmontar tira os três campos da página', async () => {
    const { processador } = await abrirPronto()
    processador.desmontar()
    expect(sdk.campos.every((c) => c.desmontado)).toBe(true)
  })
})

describe('a chave pública (D-72, CB-89)', () => {
  it('vem da variável do build, sem espaço em volta', () => {
    vi.stubEnv('VITE_MERCADOPAGO_PUBLIC_KEY', ' APP_USR-chave-de-teste ')
    expect(chavePublicaDoPagamento()).toBe('APP_USR-chave-de-teste')
  })

  it('CB-89: vazia, não há pagamento no site', () => {
    vi.stubEnv('VITE_MERCADOPAGO_PUBLIC_KEY', '')
    expect(chavePublicaDoPagamento()).toBeNull()
  })
})
