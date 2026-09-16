import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { criarCasoVazio } from '@/domain/caso.ts'
import { adicionarItem, criarPlanoPadrao } from '@/domain/plano.ts'
import type { Caso, Plano } from '@/domain/tipos.ts'
import { nomeDeArquivo } from './baixar.ts'
import { MenuExportar } from './MenuExportar.tsx'

let n = 0
const ids = () => `id${++n}`

const caso: Caso = { ...criarCasoVazio('c1'), nome: 'Maria, 28 anos', sexo: 'F', idadeAnos: 28, pesoKg: 60, estaturaCm: 165 }

function planoComArroz(): Plano {
  const plano = criarPlanoPadrao(ids)
  const almoco = plano.refeicoes[2]
  if (!almoco) throw new Error('sem almoço')
  return adicionarItem(plano, almoco.id, 'principal', { alimentoId: 3, gramas: 200 }, ids)
}

const abrirMenu = async (usuario: ReturnType<typeof userEvent.setup>) => {
  await usuario.click(screen.getByRole('button', { name: 'Exportar' }))
  return within(screen.getByRole('menu'))
}

describe('Exportar', () => {
  const baixados: string[] = []

  beforeEach(() => {
    baixados.length = 0
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:teste')
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      baixados.push(this.download)
    })
  })

  afterEach(() => vi.restoreAllMocks())

  it('CA-44: baixa o aconselhamento com nome de arquivo do caso', async () => {
    render(<MenuExportar caso={caso} plano={planoComArroz()} />)
    const usuario = userEvent.setup()
    await usuario.click((await abrirMenu(usuario)).getByRole('menuitem', { name: 'Aconselhamento em Word' }))
    await screen.findByText('Aconselhamento baixado.')
    expect(baixados).toEqual(['Maria-28-anos-aconselhamento.docx'])
  })

  it('CA-46: baixa o memorial de cálculo', async () => {
    render(<MenuExportar caso={caso} plano={planoComArroz()} />)
    const usuario = userEvent.setup()
    await usuario.click((await abrirMenu(usuario)).getByRole('menuitem', { name: 'Memorial de cálculo em Word' }))
    await screen.findByText('Memorial de cálculo baixado.')
    expect(baixados).toEqual(['Maria-28-anos-memorial-de-calculo.docx'])
  })

  it('CA-48: copia a tabela de adequação como HTML e texto', async () => {
    const escrito: unknown[] = []
    render(<MenuExportar caso={caso} plano={planoComArroz()} />)
    const usuario = userEvent.setup()
    // userEvent instala a própria área de transferência no setup: substituímos depois dele.
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { write: (itens: unknown[]) => (escrito.push(...itens), Promise.resolve()) },
    })
    class ClipboardItemFalso {
      constructor(readonly tipos: Record<string, Blob>) {}
    }
    vi.stubGlobal('ClipboardItem', ClipboardItemFalso)

    await usuario.click((await abrirMenu(usuario)).getByRole('menuitem', { name: 'Copiar tabela de adequação' }))
    await screen.findByText('Tabela copiada: cole no Word.')

    const item = escrito[0] as ClipboardItemFalso
    expect(Object.keys(item.tipos)).toEqual(['text/html', 'text/plain'])
  })

  it('CA-47: caso sem nome ainda gera um nome de arquivo válido', () => {
    expect(nomeDeArquivo('', 'aconselhamento')).toBe('caso-aconselhamento.docx')
    expect(nomeDeArquivo('João / Ação 3', 'memorial')).toBe('Joao-Acao-3-memorial.docx')
  })
})
