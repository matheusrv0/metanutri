// Quando o link oferece "Instalar o Meu plano" (spec lado-do-paciente, D-1219, DP-LP-22, CA-2229 a CA-2232, CB-1219 e
// CB-1220).
import {
  ESTADO_INICIAL,
  gravarEstadoDoInstalar,
  instalou,
  lerEstadoDoInstalar,
  marcou,
  mostrarCartaoInstalar,
  oferecerNaFolha,
  plataformaDoAgente,
  podeInstalar,
  recusou,
  usou,
  type ContextoDoInstalar,
} from './instalarMeuPlano.ts'
import type { Armazenamento } from './persistencia.ts'

const ANDROID = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36'
const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1'
const INSTAGRAM = `${IPHONE} Instagram 350.0.0.0 (iPhone15,2; iOS 18_0; pt_BR)`
const WHATSAPP_ANDROID = `${ANDROID} WhatsApp/2.24`
const COMPUTADOR = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36'

const contexto = (extra: Partial<ContextoDoInstalar> = {}): ContextoDoInstalar => ({ hoje: '2026-11-03', plataforma: 'android', temPedido: true, noAppInstalado: false, ...extra })

describe('DP-LP-22: de onde o link foi aberto', () => {
  it('CA-2229, CA-2230 e CA-2231: Android, iPhone e o navegador de dentro do WhatsApp e do Instagram', () => {
    expect(plataformaDoAgente(ANDROID)).toBe('android')
    expect(plataformaDoAgente(IPHONE)).toBe('iphone')
    expect(plataformaDoAgente(INSTAGRAM)).toBe('dentro-de-app')
    expect(plataformaDoAgente(WHATSAPP_ANDROID)).toBe('dentro-de-app')
    expect(plataformaDoAgente(COMPUTADOR)).toBe('outro')
  })
})

describe('CA-2232: quando o cartão Instalar aparece', () => {
  it('CA-2232: na primeira abertura, não aparece', () => {
    expect(mostrarCartaoInstalar(usou(ESTADO_INICIAL, '2026-11-03'), contexto())).toBe(false)
  })

  it('CA-2232: depois da primeira marcação, aparece', () => {
    expect(mostrarCartaoInstalar(marcou(usou(ESTADO_INICIAL, '2026-11-03')), contexto())).toBe(true)
  })

  it('CA-2232: no segundo dia de uso, aparece sem marcação', () => {
    expect(mostrarCartaoInstalar(usou(ESTADO_INICIAL, '2026-11-02'), contexto())).toBe(true)
  })

  it('CA-2232: "Agora não" esconde por 14 dias', () => {
    const recusado = recusou(marcou(usou(ESTADO_INICIAL, '2026-11-03')), '2026-11-03')
    expect(mostrarCartaoInstalar(recusado, contexto({ hoje: '2026-11-16' }))).toBe(false)
    expect(mostrarCartaoInstalar(recusado, contexto({ hoje: '2026-11-17' }))).toBe(true)
  })

  it('CA-2232: depois de duas recusas, só a folha "Meu plano" oferece', () => {
    const duas = recusou(recusou(marcou(usou(ESTADO_INICIAL, '2026-10-01')), '2026-10-01'), '2026-10-20')
    expect(mostrarCartaoInstalar(duas, contexto({ hoje: '2026-12-01' }))).toBe(false)
    expect(oferecerNaFolha(duas, contexto({ hoje: '2026-12-01' }))).toBe(true)
  })

  it('CA-2232: no app instalado, nunca, nem na folha', () => {
    const estado = marcou(usou(ESTADO_INICIAL, '2026-11-01'))
    expect(mostrarCartaoInstalar(estado, contexto({ noAppInstalado: true }))).toBe(false)
    expect(oferecerNaFolha(estado, contexto({ noAppInstalado: true }))).toBe(false)
  })

  it('CA-2229: instalado pelo pedido do Chrome, o cartão some e não volta', () => {
    const estado = instalou(marcou(usou(ESTADO_INICIAL, '2026-11-01')))
    expect(mostrarCartaoInstalar(estado, contexto({ hoje: '2027-01-01' }))).toBe(false)
  })

  it('CB-1220: o pedido recusado no Android conta como "Agora não"', () => {
    const recusado = recusou(marcou(usou(ESTADO_INICIAL, '2026-11-03')), '2026-11-03')
    expect(recusado.recusas).toBe(1)
    expect(mostrarCartaoInstalar(recusado, contexto({ hoje: '2026-11-04' }))).toBe(false)
  })

  it('CA-2230 e CA-2231: no iPhone e dentro de outro app, instala pela folha, sem o pedido do navegador', () => {
    expect(podeInstalar(contexto({ plataforma: 'iphone', temPedido: false }))).toBe(true)
    expect(podeInstalar(contexto({ plataforma: 'dentro-de-app', temPedido: false }))).toBe(true)
  })

  it('CB-1219: no computador (e no Android sem o pedido), "Instalar" só aparece se o navegador oferecer', () => {
    const estado = marcou(usou(ESTADO_INICIAL, '2026-11-01'))
    expect(mostrarCartaoInstalar(estado, contexto({ plataforma: 'outro', temPedido: false }))).toBe(false)
    expect(mostrarCartaoInstalar(estado, contexto({ plataforma: 'outro', temPedido: true }))).toBe(true)
    expect(mostrarCartaoInstalar(estado, contexto({ plataforma: 'android', temPedido: false }))).toBe(false)
  })
})

describe('CB-1226: o estado no aparelho', () => {
  it('CB-1226: sem armazenamento, começa do zero e não quebra', () => {
    expect(lerEstadoDoInstalar(null)).toEqual(ESTADO_INICIAL)
    expect(() => gravarEstadoDoInstalar(null, ESTADO_INICIAL)).not.toThrow()
  })

  it('o estado vai e volta; guardado estragado conta como o inicial', () => {
    const dados = new Map<string, string>()
    const a: Armazenamento = { getItem: (c) => dados.get(c) ?? null, setItem: (c, v) => void dados.set(c, v), removeItem: (c) => void dados.delete(c) }
    const estado = recusou(marcou(usou(ESTADO_INICIAL, '2026-11-03')), '2026-11-03')
    gravarEstadoDoInstalar(a, estado)
    expect(lerEstadoDoInstalar(a)).toEqual(estado)
    dados.set('metanutri:instalar-meu-plano', '"x"')
    expect(lerEstadoDoInstalar(a)).toEqual(ESTADO_INICIAL)
  })
})
