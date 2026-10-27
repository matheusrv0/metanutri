import type { ArmazenamentoListavel } from '@/domain/persistencia.ts'
import { criarRemetente, type JanelaDoSite } from './remetente.ts'

/** Um navegador: as chaves listáveis, como o `localStorage`. */
class Navegador implements ArmazenamentoListavel {
  readonly dados = new Map<string, string>()
  get length() {
    return this.dados.size
  }
  key(i: number) {
    return [...this.dados.keys()][i] ?? null
  }
  getItem(k: string) {
    return this.dados.get(k) ?? null
  }
  setItem(k: string, v: string) {
    this.dados.set(k, v)
  }
  removeItem(k: string) {
    this.dados.delete(k)
  }
}

const APP = 'https://app.metanutri.com.br'
const PENDENTE = JSON.stringify({ versao: 'v1', mudancas: 5, salvas: 3, itens: 1, motor: 2 })

/** A aba do site: abre a aba nova (falsa) e recebe as mensagens que o teste manda. */
function janelaDoSite(aberta: { postMessage: ReturnType<typeof vi.fn> } | null = { postMessage: vi.fn() }) {
  let ouvinte: ((evento: MessageEvent) => void) | null = null
  const janela: JanelaDoSite = {
    open: vi.fn(() => aberta as unknown as Window),
    addEventListener: (_tipo: 'message', fazer: (evento: MessageEvent) => void) => {
      ouvinte = fazer
    },
    removeEventListener: () => {
      ouvinte = null
    },
  }
  const receber = (dados: unknown, { origem = APP, de = aberta as unknown }: { readonly origem?: string; readonly de?: unknown } = {}) =>
    ouvinte?.({ origin: origem, source: de, data: dados } as MessageEvent)
  return { janela, aberta, receber }
}

function enderecoAntigo(): Navegador {
  const n = new Navegador()
  n.setItem('metanutri:conta:u1:nuvem', PENDENTE)
  n.setItem('metanutri:conta:u1:pacientes', '[{"id":"p1"}]')
  n.setItem('metanutri:conta:u2:nuvem', PENDENTE)
  n.setItem('metanutri:tema', 'escuro')
  return n
}

/** O código que o remetente pôs no endereço da aba nova. */
function codigoDaAba(janela: JanelaDoSite): string {
  const endereco = String(vi.mocked(janela.open).mock.calls.at(-1)?.[0])
  const codigo = /#\/mudanca\/([0-9a-f]{32})$/.exec(endereco)?.[1]
  if (!codigo) throw new Error(`sem código em ${endereco}`)
  return codigo
}

describe('o remetente da mudança, na aba do site (spec separacao-site-app, D-512 e DP-SA-12)', () => {
  it('CA-1430: "Continuar" abre o app em aba nova em #/mudanca/<código>, sem noopener, e a aba do site espera', () => {
    const { janela } = janelaDoSite()
    const remetente = criarRemetente({ base: enderecoAntigo(), instalado: false, janela })
    expect(remetente.estado).toBe('parado')
    remetente.continuar()
    expect(janela.open).toHaveBeenCalledOnce()
    const chamada = vi.mocked(janela.open).mock.calls[0] ?? []
    expect(chamada[0]).toMatch(/^https:\/\/app\.metanutri\.com\.br\/#\/mudanca\/[0-9a-f]{32}$/)
    expect(chamada[1]).toBe('_blank')
    // Sem o terceiro argumento: nada de `noopener`, que cortaria o `window.opener` da aba nova.
    expect(chamada).toHaveLength(2)
    expect(remetente.estado).toBe('esperando')
  })

  it('CA-1426 e D-524: aberto pelo ícone instalado, a aba nova leva a marca', () => {
    const { janela } = janelaDoSite()
    criarRemetente({ base: enderecoAntigo(), instalado: true, janela }).continuar()
    expect(String(vi.mocked(janela.open).mock.calls[0]?.[0])).toMatch(/^https:\/\/app\.metanutri\.com\.br\/\?icone-antigo#\/mudanca\/[0-9a-f]{32}$/)
  })

  it('CB-519: o navegador bloqueou a aba nova; "Continuar" de novo tenta outra vez, com outro código', () => {
    const { janela } = janelaDoSite(null)
    const remetente = criarRemetente({ base: enderecoAntigo(), instalado: false, janela })
    const ouvir = vi.fn()
    remetente.assinar(ouvir)
    remetente.continuar()
    expect(remetente.estado).toBe('bloqueada')
    expect(ouvir).toHaveBeenCalled()
    const primeiro = codigoDaAba(janela)
    vi.mocked(janela.open).mockReturnValue({ postMessage: vi.fn() } as unknown as Window)
    remetente.continuar()
    expect(remetente.estado).toBe('esperando')
    expect(codigoDaAba(janela)).not.toBe(primeiro)
  })

  it('CA-1432: o pedido do app recebe só o espaço da conta pedida, o dado de antes dela e o tema', () => {
    const { janela, aberta, receber } = janelaDoSite()
    criarRemetente({ base: enderecoAntigo(), instalado: false, janela }).continuar()
    const codigo = codigoDaAba(janela)
    receber({ tipo: 'pedir', codigo, usuarioId: 'u1' })
    expect(aberta?.postMessage).toHaveBeenCalledWith(
      {
        tipo: 'dados',
        codigo,
        usuarioId: 'u1',
        chaves: { 'metanutri:conta:u1:nuvem': PENDENTE, 'metanutri:conta:u1:pacientes': '[{"id":"p1"}]', 'metanutri:tema': 'escuro' },
      },
      APP,
    )
  })

  it('CB-504: conta sem espaço aqui recebe "nada", e nada é apagado', () => {
    const base = enderecoAntigo()
    const { janela, aberta, receber } = janelaDoSite()
    const remetente = criarRemetente({ base, instalado: false, janela })
    remetente.continuar()
    const codigo = codigoDaAba(janela)
    receber({ tipo: 'pedir', codigo, usuarioId: 'u9' })
    expect(aberta?.postMessage).toHaveBeenCalledWith({ tipo: 'nada', codigo, usuarioId: 'u9' }, APP)
    receber({ tipo: 'recebido', codigo, usuarioId: 'u9' })
    expect(base.dados.size).toBe(4)
    expect(remetente.estado).toBe('esperando')
  })

  it('CA-1436: o app confirmou; o site apaga o que entregou e diz que pode fechar', () => {
    const base = enderecoAntigo()
    const { janela, receber } = janelaDoSite()
    const remetente = criarRemetente({ base, instalado: false, janela })
    remetente.continuar()
    const codigo = codigoDaAba(janela)
    receber({ tipo: 'pedir', codigo, usuarioId: 'u1' })
    receber({ tipo: 'recebido', codigo, usuarioId: 'u1' })
    expect([...base.dados.keys()].sort()).toEqual(['metanutri:conta:u2:nuvem', 'metanutri:tema'])
    expect(remetente.estado).toBe('pronto')
    // CB-507: a confirmação repetida não faz mal.
    receber({ tipo: 'recebido', codigo, usuarioId: 'u1' })
    expect(base.dados.size).toBe(2)
  })

  it('CA-1438: mensagem de outro endereço, de outra janela, com outro código, de tipo desconhecido ou de outra conta: ignorada', () => {
    const base = enderecoAntigo()
    const { janela, aberta, receber } = janelaDoSite()
    const remetente = criarRemetente({ base, instalado: false, janela })
    remetente.continuar()
    const codigo = codigoDaAba(janela)
    receber({ tipo: 'pedir', codigo, usuarioId: 'u1' }, { origem: 'https://metanutri-app.pages.dev' })
    receber({ tipo: 'pedir', codigo, usuarioId: 'u1' }, { de: {} })
    receber({ tipo: 'pedir', codigo: 'f'.repeat(32), usuarioId: 'u1' })
    receber({ tipo: 'apagar', codigo, usuarioId: 'u1' })
    receber('{"tipo":"pedir"}')
    expect(aberta?.postMessage).not.toHaveBeenCalled()
    // Entregue para u1, a confirmação de outra conta não apaga nada.
    receber({ tipo: 'pedir', codigo, usuarioId: 'u1' })
    receber({ tipo: 'recebido', codigo, usuarioId: 'u2' })
    receber({ tipo: 'recebido', codigo: 'f'.repeat(32), usuarioId: 'u1' })
    expect(base.dados.size).toBe(4)
    expect(remetente.estado).toBe('esperando')
  })

  it('CA-1438: antes de "Continuar", nenhuma mensagem vale', () => {
    const { janela, aberta, receber } = janelaDoSite()
    criarRemetente({ base: enderecoAntigo(), instalado: false, janela })
    receber({ tipo: 'pedir', codigo: '0'.repeat(32), usuarioId: 'u1' })
    expect(aberta?.postMessage).not.toHaveBeenCalled()
  })
})
