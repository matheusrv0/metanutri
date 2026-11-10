// Hoje, no link do paciente (spec lado-do-paciente, D-1203 a D-1205, D-1208, D-1209; CA-2201 a CA-2207, CA-2212, CA-2214,
// CB-1217, CB-1218 e CB-1227).
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { act, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { abrirLink, DIETA, HOJE, linkDeTeste, MISSOES } from './linkDeTeste.test-utils.tsx'

const ANTES = Node.DOCUMENT_POSITION_FOLLOWING
const vemAntes = (a: Element, b: Element): boolean => (a.compareDocumentPosition(b) & ANTES) !== 0

beforeEach(() => {
  localStorage.clear()
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('CA-2201: a ordem de Hoje', () => {
  it('CA-2201: aviso de estágio, data, título, barra do dia, mensagem, missões, linha da semana e cartão Instalar', () => {
    abrirLink(linkDeTeste({ usoNaoComercial: true, mensagem: 'Foco no café da manhã.', mensagemEm: '2026-11-03T13:00:00Z' }), {
      instalar: <section aria-label="Instalar o Meu plano" />,
    })
    const ordem = [
      screen.getByText(/estágio de nutrição/),
      screen.getByText('terça-feira, 3 de novembro'),
      screen.getByRole('heading', { level: 1, name: 'Suas missões de hoje, Juliana' }),
      screen.getByRole('progressbar'),
      screen.getByRole('region', { name: 'Mensagem de Ana Lima' }),
      screen.getByRole('list', { name: 'Missões de hoje' }),
      screen.getByRole('button', { name: /de 7 dias nesta semana/ }),
      screen.getByRole('region', { name: 'Instalar o Meu plano' }),
    ]
    for (let i = 1; i < ordem.length; i++) expect(vemAntes(ordem[i - 1] as Element, ordem[i] as Element), `${i}`).toBe(true)
  })
})

describe('CA-2202: a barra do dia em segmentos', () => {
  it('CA-2202: 4 missões e 2 feitas: 4 segmentos, 2 cheios, "2 de 4 feitas"', () => {
    const quatro = MISSOES.slice(0, 4)
    abrirLink(linkDeTeste({ missoes: quatro, marcacoes: [{ dia: HOJE, feitas: ['refeicao-cafe', 'refeicao-almoco'] }] }))
    const barra = screen.getByRole('progressbar')
    expect(barra.children).toHaveLength(4)
    expect(Array.from(barra.children, (s) => s.childElementCount)).toEqual([1, 1, 0, 0])
    expect(barra).toHaveAttribute('aria-valuetext', '2 de 4 feitas')
    expect(screen.getByText(/de 4/).closest('p')).toHaveTextContent('2 de 4 feitas')
  })

  it('CA-2202: 0 missões: "Seu plano ainda não tem missões." e nenhuma barra', () => {
    abrirLink(linkDeTeste({ missoes: [] }))
    expect(screen.getByText('Seu plano ainda não tem missões.')).toBeInTheDocument()
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
  })
})

describe('CA-2203 e CA-2205: marcar', () => {
  it('CA-2203: tocar marca (verde, visto, aria-pressed), o segmento enche e o número muda; tocar de novo volta', async () => {
    const aoAlternar = vi.fn()
    abrirLink(linkDeTeste(), { aoAlternar })
    const usuario = userEvent.setup()
    const agua = screen.getByRole('button', { name: /litros de água/ })
    await usuario.click(agua)
    expect(agua).toHaveAttribute('aria-pressed', 'true')
    expect(agua).toHaveAccessibleName('Beber cerca de 2,2 litros de água, feita')
    expect(agua.closest('li')?.className).toContain('bg-lightsuccess')
    expect(agua.querySelector('svg path')).not.toBeNull()
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '1')
    expect(screen.getByRole('progressbar').firstElementChild?.firstElementChild?.className).toContain('mp-segmento-novo')
    expect(aoAlternar).toHaveBeenLastCalledWith('agua', true)

    await usuario.click(agua)
    expect(agua).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0')
    expect(aoAlternar).toHaveBeenLastCalledWith('agua', false)
  })

  it('CA-2203: no Android, marcar vibra 10 ms; desmarcar não', async () => {
    const vibrar = vi.fn()
    vi.stubGlobal('navigator', { ...navigator, vibrate: vibrar })
    abrirLink()
    const usuario = userEvent.setup()
    await usuario.click(screen.getByRole('button', { name: /litros de água/ }))
    expect(vibrar).toHaveBeenCalledWith(10)
    await usuario.click(screen.getByRole('button', { name: /litros de água/ }))
    expect(vibrar).toHaveBeenCalledTimes(1)
  })

  it('CA-2205: com "reduzir movimento", nada vibra nem brilha, e o CSS desliga as animações', async () => {
    const vibrar = vi.fn()
    vi.stubGlobal('navigator', { ...navigator, vibrate: vibrar })
    vi.stubGlobal('matchMedia', (consulta: string) => ({ matches: consulta.includes('reduced-motion'), addEventListener: () => undefined, removeEventListener: () => undefined }))
    abrirLink(linkDeTeste({ marcacoes: [{ dia: HOJE, feitas: MISSOES.slice(0, 5).map((m) => m.id) }] }))
    await userEvent.setup().click(screen.getByRole('button', { name: /litros de água/ }))
    expect(vibrar).not.toHaveBeenCalled()
    expect(screen.getByRole('progressbar').className).not.toContain('mp-brilha')
    // Nada fica escondido esperando animação: o título do dia completo já está lá.
    expect(screen.getByRole('heading', { level: 1, name: 'Dia completo, Juliana.' })).toBeVisible()
    const css = readFileSync(join(process.cwd(), 'src', 'ui', 'missoes', 'link', 'movimento.css'), 'utf8')
    const reduzido = css.slice(css.indexOf('@media (prefers-reduced-motion: reduce)'))
    for (const classe of ['.mp-segmento-novo', '.mp-numero', '.mp-pulso', '.mp-visto path']) expect(reduzido).toContain(classe)
    expect(reduzido).toContain('animation: none')
    expect(reduzido).toContain('.mp-brilha::after')
  })
})

describe('CA-2204 e CB-1217: o dia completo', () => {
  it('CA-2204: a última missão deixa a barra verde, o título vira "Dia completo, Juliana." e o brilho passa uma vez', async () => {
    abrirLink(linkDeTeste({ marcacoes: [{ dia: HOJE, feitas: MISSOES.slice(0, 5).map((m) => m.id) }] }))
    const usuario = userEvent.setup()
    await usuario.click(screen.getByRole('button', { name: /litros de água/ }))
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Dia completo, Juliana.')
    const barra = screen.getByRole('progressbar')
    expect(barra.className).toContain('mp-brilha')
    expect(Array.from(barra.children, (s) => s.firstElementChild?.className.includes('bg-stateok'))).toEqual(Array(6).fill(true))
    expect(screen.getByText('Tudo feito hoje')).toBeInTheDocument()

    // Desmarcar e marcar de novo no mesmo dia: sem brilho.
    await usuario.click(screen.getByRole('button', { name: /litros de água/ }))
    await usuario.click(screen.getByRole('button', { name: /litros de água/ }))
    expect(screen.getByRole('progressbar').className).not.toContain('mp-brilha')
  })

  it('CB-1217: dia completo e o plano ganha uma missão: o título volta, sem brilho', () => {
    const completo = linkDeTeste({ marcacoes: [{ dia: HOJE, feitas: MISSOES.map((m) => m.id) }] })
    const { unmount } = abrirLink(completo)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Dia completo, Juliana.')
    unmount()
    abrirLink({ ...completo, missoes: [...MISSOES, { id: 'vegetais', texto: 'Comer as verduras e os legumes do plano', origem: 'Verduras' }] })
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Suas missões de hoje, Juliana')
    expect(screen.getByRole('progressbar').children).toHaveLength(7)
    expect(screen.getByRole('progressbar').className).not.toContain('mp-brilha')
  })

  it('CB-1227: sem primeiro nome, "Suas missões de hoje" e "Dia completo.", sem vírgula sobrando', async () => {
    abrirLink(linkDeTeste({ nome: '', marcacoes: [{ dia: HOJE, feitas: MISSOES.slice(0, 5).map((m) => m.id) }] }))
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/^Suas missões de hoje$/)
    await userEvent.setup().click(screen.getByRole('button', { name: /litros de água/ }))
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/^Dia completo\.$/)
  })
})

describe('CA-2206 e CA-2207: a missão de refeição leva ao que comer', () => {
  it('CA-2206: a missão de refeição tem "Ver" ("Ver o almoço no plano"); o resto não', () => {
    abrirLink()
    expect(screen.getByRole('button', { name: 'Ver o almoço no plano' })).toHaveTextContent('Ver')
    expect(screen.getByRole('button', { name: 'Ver o café da manhã no plano' })).toBeInTheDocument()
    const agua = screen.getByRole('button', { name: /litros de água/ }).closest('li') as HTMLElement
    expect(within(agua).queryByRole('button', { name: /^Ver/ })).not.toBeInTheDocument()
  })

  it('CA-2206: "Ver" abre o Plano rolado até a refeição, e a missão não é marcada', async () => {
    const rolar = vi.fn()
    Element.prototype.scrollIntoView = rolar
    const aoAlternar = vi.fn()
    abrirLink(linkDeTeste(), { aoAlternar })
    await userEvent.setup().click(screen.getByRole('button', { name: 'Ver o jantar no plano' }))
    const jantar = screen.getByRole('region', { name: '19:30 Jantar' })
    expect(screen.getByRole('link', { name: 'Plano' })).toHaveAttribute('aria-current', 'page')
    expect(rolar.mock.contexts.at(-1)).toBe(jantar)
    expect(aoAlternar).not.toHaveBeenCalled()
  })

  it('CA-2206: sem a dieta no link, a missão de refeição não tem "Ver"', () => {
    abrirLink(linkDeTeste({ dieta: null }))
    expect(screen.queryByRole('button', { name: /^Ver/ })).not.toBeInTheDocument()
  })

  it('CA-2207: no Plano, "Marcar como feita" marca a missão de Hoje; feita, "Feita hoje" com o visto, e tocar desmarca', async () => {
    const usuario = userEvent.setup()
    abrirLink()
    await usuario.click(screen.getByRole('link', { name: 'Plano' }))
    const almoco = within(screen.getByRole('region', { name: '12:30 Almoço' }))
    await usuario.click(almoco.getByRole('button', { name: 'Marcar como feita' }))
    const feita = almoco.getByRole('button', { name: 'Feita hoje' })
    expect(feita).toHaveAttribute('aria-pressed', 'true')
    expect(feita.querySelector('svg')).not.toBeNull()
    await usuario.click(screen.getByRole('link', { name: 'Hoje' }))
    expect(screen.getByRole('button', { name: /Almoço por volta das 12h30/ })).toHaveAttribute('aria-pressed', 'true')

    await usuario.click(screen.getByRole('link', { name: 'Plano' }))
    await usuario.click(within(screen.getByRole('region', { name: '12:30 Almoço' })).getByRole('button', { name: 'Feita hoje' }))
    expect(within(screen.getByRole('region', { name: '12:30 Almoço' })).getByRole('button', { name: 'Marcar como feita' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('CA-2207: a refeição que não é missão não tem "Marcar como feita"', async () => {
    abrirLink(linkDeTeste({ missoes: MISSOES.filter((m) => m.id !== 'refeicao-lanche') }))
    await userEvent.setup().click(screen.getByRole('link', { name: 'Plano' }))
    expect(within(screen.getByRole('region', { name: '16:00 Lanche' })).queryByRole('button', { name: /Marcar como feita|Feita hoje/ })).not.toBeInTheDocument()
  })
})

describe('CA-2210: o Plano abre na refeição da hora', () => {
  it('CA-2210: às 9:41, o almoço tem "Próxima" e o Plano abre rolado até ele', async () => {
    const rolar = vi.fn()
    Element.prototype.scrollIntoView = rolar
    abrirLink(linkDeTeste(), { agora: new Date(2026, 10, 3, 9, 41) })
    await userEvent.setup().click(screen.getByRole('link', { name: 'Plano' }))
    const almoco = screen.getByRole('region', { name: '12:30 Almoço' })
    expect(within(almoco).getByText('Próxima')).toBeInTheDocument()
    expect(rolar.mock.contexts.at(-1)).toBe(almoco)
  })

  it('CA-2210: às 12:10, o almoço é "Agora"; depois da última refeição mais 1 hora, nenhuma tem rótulo e o Plano abre no topo', async () => {
    const usuario = userEvent.setup()
    const { unmount } = abrirLink(linkDeTeste(), { agora: new Date(2026, 10, 3, 12, 10) })
    await usuario.click(screen.getByRole('link', { name: 'Plano' }))
    expect(within(screen.getByRole('region', { name: '12:30 Almoço' })).getByText('Agora')).toBeInTheDocument()
    unmount()

    abrirLink(linkDeTeste(), { agora: new Date(2026, 10, 3, 21, 0) })
    await usuario.click(screen.getByRole('link', { name: 'Plano' }))
    expect(screen.queryByText(/^(Agora|Próxima)$/)).not.toBeInTheDocument()
  })
})

describe('CA-2212 e CA-2214: a mensagem e a consulta', () => {
  it('CA-2212: a mensagem com "Ana Lima" e "3 nov."; sem mensagem, nenhum cartão', () => {
    const { unmount } = abrirLink(linkDeTeste({ mensagem: 'Juliana, foco no café da manhã.', mensagemEm: '2026-11-03T13:00:00Z' }))
    const cartao = screen.getByRole('region', { name: 'Mensagem de Ana Lima' })
    expect(cartao).toHaveTextContent('Ana Lima')
    expect(cartao).toHaveTextContent('3 nov.')
    expect(cartao).toHaveTextContent('Juliana, foco no café da manhã.')
    unmount()
    abrirLink(linkDeTeste({ mensagem: null }))
    expect(screen.queryByRole('region', { name: /^Mensagem/ })).not.toBeInTheDocument()
  })

  it('CA-2212: com mais de 3 linhas, "Ler tudo" abre o resto', async () => {
    vi.spyOn(HTMLElement.prototype, 'scrollHeight', 'get').mockReturnValue(200)
    vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(72)
    abrirLink(linkDeTeste({ mensagem: 'Texto longo. '.repeat(40), mensagemEm: '2026-11-03T13:00:00Z' }))
    const texto = screen.getByText(/Texto longo/)
    expect(texto.className).toContain('line-clamp-3')
    await userEvent.setup().click(screen.getByRole('button', { name: 'Ler tudo' }))
    expect(texto.className).not.toContain('line-clamp-3')
    expect(screen.queryByRole('button', { name: 'Ler tudo' })).not.toBeInTheDocument()
  })

  it('CA-2212: com até 3 linhas, sem "Ler tudo"', () => {
    abrirLink(linkDeTeste({ mensagem: 'Curta.', mensagemEm: '2026-11-03T13:00:00Z' }))
    expect(screen.queryByRole('button', { name: 'Ler tudo' })).not.toBeInTheDocument()
  })

  it('CB-1218: mensagem com endereço ou telefone longo quebra em qualquer ponto', () => {
    const longo = 'https://wa.me/5511999999999?text=OlaAnaLimaQueroRemarcarAMinhaConsultaDeTercaFeira'
    abrirLink(linkDeTeste({ mensagem: longo }))
    expect(screen.getByText(longo).className).toContain('[overflow-wrap:anywhere]')
  })

  it('CA-2214: a próxima consulta em Hoje, abaixo da mensagem, e em Semana por extenso; passada, some', async () => {
    const usuario = userEvent.setup()
    const { unmount } = abrirLink(linkDeTeste({ mensagem: 'Oi.', proximaConsulta: '2026-11-17T14:30' }))
    const consulta = screen.getByText('Próxima consulta: ter., 17/11, às 14:30')
    expect(vemAntes(screen.getByText('Oi.'), consulta)).toBe(true)
    await usuario.click(screen.getByRole('link', { name: 'Semana' }))
    expect(screen.getByText('Próxima consulta: terça, 17 de novembro, às 14:30')).toBeInTheDocument()
    unmount()

    abrirLink(linkDeTeste({ proximaConsulta: '2026-11-02T14:30' }))
    expect(screen.queryByText(/Próxima consulta/)).not.toBeInTheDocument()
  })

  it('CA-2214: consulta sem mensagem aparece sozinha no cartão', () => {
    abrirLink(linkDeTeste({ mensagem: null, proximaConsulta: '2026-11-17' }))
    expect(screen.getByText('Próxima consulta: ter., 17/11')).toBeInTheDocument()
  })
})

describe('a linha da semana', () => {
  it('D-1203: "3 de 7 dias nesta semana" com a frase da meta, e abre Semana', async () => {
    abrirLink(
      linkDeTeste({
        marcacoes: [
          { dia: '2026-10-28', feitas: ['agua'] },
          { dia: '2026-10-30', feitas: ['agua'] },
          { dia: HOJE, feitas: ['agua'] },
        ],
      }),
    )
    const linha = screen.getByRole('button', { name: /3 de 7 dias nesta semana/ })
    expect(linha).toHaveTextContent('A meta é 4 dias.')
    await act(async () => {
      await userEvent.setup().click(linha)
    })
    expect(screen.getByRole('heading', { level: 1, name: 'Sua semana' })).toBeInTheDocument()
    expect(DIETA.refeicoes).toHaveLength(4)
  })
})
