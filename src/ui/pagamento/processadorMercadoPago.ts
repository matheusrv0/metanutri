// Os campos seguros da operadora de pagamento (spec checkout-proprio, D-66, R-35).
//
// O script vem de https://sdk.mercadopago.com/js/v2, carregado uma vez, só quando o
// formulário do cartão abre (nenhum pacote npm). Os três campos (número, validade e
// código) são iframes da operadora: o número do cartão nunca passa pela página nem pelo
// servidor do MetaNutri. O que volta é o código de uso único, os 4 últimos números e a
// bandeira.
//
// A pesquisa de 02/10/2026 confirmou no SDK os nomes dos métodos e dos eventos. O formato
// dos erros e o da busca da bandeira não estão confirmados: tudo o que vem da operadora é
// lido sem confiar no formato, e o que não se reconhece vira "não sei" (foco 3).
import type { CampoSeguro, DadosDoCartao } from '@/domain/cartao.ts'
import {
  ErroDoCartao,
  URL_DA_FONTE,
  type CriarProcessador,
  type EventoDosCampos,
  type InfoDoCartao,
  type MontagemDosCampos,
  type ProcessadorCartao,
} from './processadorCartao.ts'

export const URL_DO_SDK = 'https://sdk.mercadopago.com/js/v2'

/** O pedaço do SDK que o MetaNutri usa, escrito à mão. */
interface CampoDoSdk {
  mount(idDoAlvo: string): unknown
  unmount(): void
  on(evento: string, callback: (dados: unknown) => void): unknown
  update(propriedades: Record<string, unknown>): void
  readonly focus?: (() => void) | undefined
}

interface InstanciaDoSdk {
  readonly fields: {
    create(tipo: 'cardNumber' | 'expirationDate' | 'securityCode', opcoes: Record<string, unknown>): CampoDoSdk
    createCardToken(dados: { readonly cardholderName: string; readonly identificationType: 'CPF'; readonly identificationNumber: string }): Promise<unknown>
  }
  getPaymentMethods(filtro: { readonly bin: string }): Promise<unknown>
}

export type ConstrutorDoSdk = new (chave: string, opcoes: { readonly locale: 'pt-BR' }) => InstanciaDoSdk

const construtorGlobal = (): ConstrutorDoSdk | null => {
  const construtor: unknown = (globalThis as unknown as { readonly MercadoPago?: unknown }).MercadoPago
  return typeof construtor === 'function' ? (construtor as ConstrutorDoSdk) : null
}

let carregando: Promise<ConstrutorDoSdk> | null = null
/** Uma instância por chave: a operadora pede para criar uma só. */
const instancias = new Map<string, InstanciaDoSdk>()

/** Põe o script na página uma vez só. Se falhar ou demorar demais, a próxima chamada tenta de novo (CB-88). */
export function carregarSdk(tempoLimiteMs = 20_000): Promise<ConstrutorDoSdk> {
  const pronto = construtorGlobal()
  if (pronto) return Promise.resolve(pronto)
  if (carregando) return carregando
  carregando = new Promise<ConstrutorDoSdk>((resolver, rejeitar) => {
    const script = document.createElement('script')
    const falhar = () => {
      clearTimeout(relogio)
      script.remove()
      carregando = null
      rejeitar(new Error('O script dos campos seguros não carregou.'))
    }
    const relogio = setTimeout(falhar, tempoLimiteMs)
    script.src = URL_DO_SDK
    script.async = true
    script.addEventListener('error', falhar)
    script.addEventListener('load', () => {
      const construtor = construtorGlobal()
      if (!construtor) {
        falhar()
        return
      }
      clearTimeout(relogio)
      resolver(construtor)
    })
    document.head.append(script)
  })
  return carregando
}

/** Só para os testes: esquece o script e as instâncias. */
export function esquecerSdk(): void {
  carregando = null
  instancias.clear()
}

const objeto = (valor: unknown): Record<string, unknown> | null => (typeof valor === 'object' && valor !== null ? (valor as Record<string, unknown>) : null)
const texto = (valor: unknown): string | null => (typeof valor === 'string' && valor.trim() !== '' ? valor.trim() : null)

/** `validityChange`: lista de erros vazia é campo válido. */
const semErros = (dados: unknown): boolean => {
  const lista = objeto(dados)?.['errorMessages']
  return Array.isArray(lista) && lista.length === 0
}

/** O método de pagamento que vale para o cartão: o de crédito, quando o cartão é múltiplo (foco 2). */
function metodoDoCartao(resposta: unknown): Record<string, unknown> | null {
  const lista = objeto(resposta)?.['results']
  if (!Array.isArray(lista)) return null
  const metodos = lista.map(objeto).filter((metodo): metodo is Record<string, unknown> => metodo !== null)
  return metodos.find((metodo) => metodo['payment_type_id'] === 'credit_card') ?? metodos[0] ?? null
}

/** A bandeira e o tipo, lidos da busca pelos primeiros números. */
export function lerMetodoDoCartao(resposta: unknown, bin: string): InfoDoCartao | null {
  const metodo = metodoDoCartao(resposta)
  const bandeira = metodo ? (texto(metodo['name']) ?? texto(metodo['id'])) : null
  return metodo && bandeira ? { bandeira, tipo: texto(metodo['payment_type_id']), bin } : null
}

/**
 * O que o SDK v2 devolve de verdade (conferido no navegador em 02/10/2026): uma lista de
 * `{ cause, message, field }` sem `code`. O campo vira o código da documentação que o
 * `campoDoErroDoToken` (domain/cartao.ts) já conhece.
 */
const CODIGO_DO_CAMPO: Readonly<Record<string, string>> = {
  cardNumber: 'E301',
  expirationDate: '208',
  expirationMonth: '208',
  expirationYear: '208',
  securityCode: 'E302',
  cardholderName: '221',
  identificationNumber: '214',
}

/** Os códigos do erro do gerador do código do cartão, em qualquer dos formatos conhecidos, sem repetir. */
export function codigosDoErro(erro: unknown): string[] {
  const codigos: string[] = []
  const visitar = (valor: unknown): void => {
    if (Array.isArray(valor)) {
      valor.forEach(visitar)
      return
    }
    const o = objeto(valor)
    if (!o) return
    const codigo = o['code']
    const campo = o['field']
    if (typeof codigo === 'string' || typeof codigo === 'number') codigos.push(String(codigo))
    else if (typeof campo === 'string' && campo in CODIGO_DO_CAMPO) codigos.push(CODIGO_DO_CAMPO[campo] ?? '')
    if (typeof o['cause'] === 'object') visitar(o['cause'])
  }
  visitar(erro)
  return [...new Set(codigos.filter((codigo) => codigo !== ''))]
}

const TIPO_NO_SDK: Readonly<Record<CampoSeguro, 'cardNumber' | 'expirationDate' | 'securityCode'>> = {
  numero: 'cardNumber',
  validade: 'expirationDate',
  codigo: 'securityCode',
}
const CAMPOS: readonly CampoSeguro[] = ['numero', 'validade', 'codigo']

interface OpcoesDoProcessador {
  /** Os testes trocam o script por um construtor de mentira. */
  readonly carregar?: (() => Promise<ConstrutorDoSdk>) | undefined
  /** Quanto esperar os três campos ficarem prontos antes de desistir (CB-88). */
  readonly tempoLimiteMs?: number | undefined
}

export function criarProcessadorMercadoPago(chave: string, opcoes: OpcoesDoProcessador = {}): ProcessadorCartao {
  const carregar = opcoes.carregar ?? (() => carregarSdk())
  const tempoLimiteMs = opcoes.tempoLimiteMs ?? 20_000
  const campos: Partial<Record<CampoSeguro, CampoDoSdk>> = {}
  let sdk: InstanciaDoSdk | null = null
  let montagem: MontagemDosCampos | null = null
  let avisar: (evento: EventoDosCampos) => void = () => undefined
  let cartao: InfoDoCartao | null = null
  let ajusteDoCodigo: Record<string, unknown> | null = null
  let binAtual = ''
  let vivo = true

  const aoMudarBin = async (dados: unknown): Promise<void> => {
    const bin = texto(objeto(dados)?.['bin']) ?? ''
    if (bin.length < 6) {
      binAtual = ''
      cartao = null
      if (vivo) avisar({ tipo: 'cartao', cartao: null })
      return
    }
    if (bin === binAtual || !sdk) return
    binAtual = bin
    try {
      const resposta = await sdk.getPaymentMethods({ bin })
      if (!vivo || bin !== binAtual) return
      cartao = lerMetodoDoCartao(resposta, bin)
      // A operadora pede para ajustar o tamanho do número e do código à bandeira.
      const configuracoes = metodoDoCartao(resposta)?.['settings']
      const ajuste = Array.isArray(configuracoes) ? objeto(configuracoes[0]) : null
      const doNumero = ajuste ? objeto(ajuste['card_number']) : null
      ajusteDoCodigo = ajuste ? objeto(ajuste['security_code']) : null
      if (doNumero) campos.numero?.update({ settings: doNumero })
      if (ajusteDoCodigo) campos.codigo?.update({ settings: ajusteDoCodigo })
      avisar({ tipo: 'cartao', cartao })
    } catch {
      // Sem a bandeira, o envio continua: a operadora confere o cartão de qualquer jeito.
      if (vivo && bin === binAtual) avisar({ tipo: 'cartao', cartao: null })
    }
  }

  const criarCampo = (instancia: InstanciaDoSdk, campo: CampoSeguro, m: MontagemDosCampos, aoPronto: () => void, aoFalhar: () => void): CampoDoSdk => {
    const opcoesDoCampo: Record<string, unknown> = {
      placeholder: m.placeholders[campo],
      style: m.estilo,
      customFonts: [{ src: URL_DA_FONTE }],
      srLabel: m.rotulos[campo],
      ariaRequired: true,
    }
    if (campo === 'validade') opcoesDoCampo['mode'] = 'short'
    if (campo === 'numero') opcoesDoCampo['enableLuhnValidation'] = true
    const novo = instancia.fields.create(TIPO_NO_SDK[campo], opcoesDoCampo)
    novo.on('ready', aoPronto)
    novo.on('error', aoFalhar)
    novo.on('validityChange', (dados) => {
      if (vivo) avisar({ tipo: 'validade', campo, valido: semErros(dados) })
    })
    if (campo === 'numero') novo.on('binChange', (dados) => void aoMudarBin(dados))
    novo.mount(m.alvos[campo])
    campos[campo] = novo
    return novo
  }

  return {
    async montar(m, aoEvento) {
      montagem = m
      avisar = aoEvento
      const Construtor = await carregar()
      // O formulário pode ter fechado enquanto o script chegava (e o React monta duas vezes no modo estrito).
      if (!vivo) return
      const instancia = instancias.get(chave) ?? new Construtor(chave, { locale: 'pt-BR' })
      instancias.set(chave, instancia)
      sdk = instancia
      await new Promise<void>((resolver, rejeitar) => {
        const prontos = new Set<CampoSeguro>()
        let terminou = false
        const fim = (falha: Error | null) => {
          if (terminou) return
          terminou = true
          clearTimeout(relogio)
          if (falha) rejeitar(falha)
          else resolver()
        }
        const relogio = setTimeout(() => fim(new Error('Os campos seguros não ficaram prontos.')), tempoLimiteMs)
        try {
          for (const campo of CAMPOS) {
            criarCampo(
              instancia,
              campo,
              m,
              () => {
                prontos.add(campo)
                if (prontos.size === CAMPOS.length) fim(null)
              },
              () => fim(new Error('Um campo seguro falhou ao abrir.')),
            )
          }
        } catch (falha) {
          fim(falha instanceof Error ? falha : new Error('Os campos seguros não abriram.'))
        }
      })
    },

    async gerarToken(titular): Promise<DadosDoCartao> {
      if (!sdk) throw new ErroDoCartao([])
      let resposta: unknown
      try {
        resposta = await sdk.fields.createCardToken({ cardholderName: titular.nome, identificationType: 'CPF', identificationNumber: titular.cpf })
      } catch (erro) {
        throw new ErroDoCartao(codigosDoErro(erro))
      }
      const token = texto(objeto(resposta)?.['id'])
      const final = texto(objeto(resposta)?.['last_four_digits'])
      if (!token || !final || !/^\d{4}$/.test(final)) throw new ErroDoCartao(codigosDoErro(resposta))
      return { token, final, bandeira: cartao?.bandeira ?? 'Cartão' }
    },

    limparCodigo() {
      const atual = campos.codigo
      if (!sdk || !montagem || !atual) return
      try {
        atual.unmount()
      } catch {
        // o iframe já tinha saído
      }
      const novo = criarCampo(sdk, 'codigo', montagem, () => undefined, () => undefined)
      if (ajusteDoCodigo) novo.update({ settings: ajusteDoCodigo })
    },

    focar(campo) {
      const alvo = campos[campo]
      if (alvo?.focus) {
        alvo.focus()
        return
      }
      // Sem o focus do SDK, o foco vai para o iframe, e o navegador entrega ao campo de dentro.
      const id = montagem?.alvos[campo]
      const iframe = id ? document.getElementById(id)?.querySelector('iframe') : null
      iframe?.focus()
    },

    desmontar() {
      vivo = false
      for (const campo of CAMPOS) {
        try {
          campos[campo]?.unmount()
        } catch {
          // o iframe já tinha saído
        }
        Reflect.deleteProperty(campos, campo)
      }
    },
  }
}

/** D-72: a chave pública vem do build (`VITE_MERCADOPAGO_PUBLIC_KEY`). Sem ela, não há pagamento no site (CB-89). */
export function chavePublicaDoPagamento(): string | null {
  const chave = import.meta.env['VITE_MERCADOPAGO_PUBLIC_KEY']
  return typeof chave === 'string' && chave.trim() !== '' ? chave.trim() : null
}

let doSite: CriarProcessador | null | undefined

/** O processador do site, sempre o mesmo objeto (o formulário recria os campos quando ele muda), ou nulo sem a chave. */
export function processadorDoSite(): CriarProcessador | null {
  if (doSite === undefined) {
    const chave = chavePublicaDoPagamento()
    doSite = chave ? () => criarProcessadorMercadoPago(chave) : null
  }
  return doSite
}
