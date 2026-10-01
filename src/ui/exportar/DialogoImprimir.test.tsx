import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { AssinaturaDoPlano } from '@/domain/assinaturaDoPlano.ts'
import { criarCasoVazio } from '@/domain/caso.ts'
import { adicionarItem, criarPlanoPadrao } from '@/domain/plano.ts'
import type { Caso, Plano } from '@/domain/tipos.ts'
import { DialogoImprimir } from './DialogoImprimir.tsx'
import { MenuExportar } from './MenuExportar.tsx'

let n = 0
const ids = () => `id${++n}`
const caso: Caso = { ...criarCasoVazio('c1'), nome: 'Maria, 28 anos', sexo: 'F', idadeAnos: 28, pesoKg: 60, estaturaCm: 165 }
const ANA: AssinaturaDoPlano = { situacao: 'nutricionista', linhaNutricionista: 'Ana Souza · CRN-6 12345', origem: 'conta', nome: 'Ana Souza', responsavelTecnico: '' }

function plano(): Plano {
  const p = criarPlanoPadrao(ids)
  const almoco = p.refeicoes[2]
  if (!almoco) throw new Error('sem almoço')
  return adicionarItem(p, almoco.id, 'principal', { alimentoId: 3, gramas: 150 }, ids)
}

const abrir = () => render(<DialogoImprimir aberto caso={caso} plano={plano()} assinatura={ANA} aoFechar={vi.fn()} />)
const janela = () => within(screen.getByRole('dialog', { name: 'Dieta para imprimir' }))

beforeEach(() => localStorage.clear())

describe('Janela de imprimir (CA-317, CA-320)', () => {
  it('CA-317: lista de compras e trocas começam desmarcadas e mudam a prévia na hora', async () => {
    abrir()
    const usuario = userEvent.setup()
    const compras = janela().getByRole('switch', { name: 'Lista de compras' })
    const trocas = janela().getByRole('switch', { name: 'Trocas' })
    expect(compras).toHaveAttribute('aria-checked', 'false')
    expect(trocas).toHaveAttribute('aria-checked', 'false')
    expect(janela().queryByRole('heading', { name: 'Lista de compras' })).not.toBeInTheDocument()

    await usuario.click(compras)
    expect(janela().getByRole('heading', { name: 'Lista de compras' })).toBeInTheDocument()
    await usuario.click(trocas)
    expect(janela().getByRole('heading', { name: 'Trocas' })).toBeInTheDocument()
  })

  it('CA-320: o que foi marcado volta marcado na próxima vez', async () => {
    const { unmount } = abrir()
    await userEvent.setup().click(janela().getByRole('switch', { name: 'Trocas' }))
    unmount()

    abrir()
    expect(janela().getByRole('switch', { name: 'Trocas' })).toHaveAttribute('aria-checked', 'true')
    expect(janela().getByRole('switch', { name: 'Lista de compras' })).toHaveAttribute('aria-checked', 'false')
  })

  it('a folha sai com quem assina o plano', () => {
    abrir()
    expect(janela().getAllByText('Ana Souza · CRN-6 12345').length).toBeGreaterThan(0)
  })

  it('clicar no texto da opção alterna o switch', async () => {
    abrir()
    const usuario = userEvent.setup()
    const textoCompras = janela().getByText('Os alimentos do dia com as quantidades.')
    expect(janela().getByRole('switch', { name: 'Lista de compras' })).toHaveAttribute('aria-checked', 'false')
    await usuario.click(textoCompras)
    expect(janela().getByRole('switch', { name: 'Lista de compras' })).toHaveAttribute('aria-checked', 'true')
  })

  it('o menu Exportar leva a assinatura até a folha de imprimir', async () => {
    render(<MenuExportar caso={caso} plano={plano()} assinatura={ANA} />)
    const usuario = userEvent.setup()
    await usuario.click(screen.getByRole('button', { name: 'Exportar' }))
    await usuario.click(within(screen.getByRole('menu')).getByRole('menuitem', { name: /Dieta para imprimir/ }))
    expect(janela().getAllByText('Ana Souza · CRN-6 12345').length).toBeGreaterThan(0)
    expect(janela().getByRole('button', { name: /Imprimir ou salvar em PDF/ })).toBeInTheDocument()
  })
})
