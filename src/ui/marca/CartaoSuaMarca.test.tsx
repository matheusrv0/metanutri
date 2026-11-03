// Spec marca-no-link, CA-1950: o cartão "Sua marca" na Conta, e o cartão "Logotipo" fora de Configurações.
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { gravarPerfil, PERFIL_VAZIO } from '@/domain/perfil.ts'
import { TelaConfiguracoes } from '../config/TelaConfiguracoes.tsx'
import { CartaoSuaMarca } from './CartaoSuaMarca.tsx'

const LOGO = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='

beforeEach(() => localStorage.clear())

describe('CA-1950: o cartão "Sua marca" na Conta', () => {
  it('mostra a logo e a cor de agora, com o nome e o código, e "Editar" abre a tela', async () => {
    gravarPerfil(localStorage, { ...PERFIL_VAZIO, logo: LOGO, cor: '#3f5f2a' })
    const aoAbrir = vi.fn()
    render(<CartaoSuaMarca aoAbrir={aoAbrir} />)
    expect(screen.getByRole('heading', { name: 'Sua marca' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Sua logo' })).toHaveAttribute('src', LOGO)
    expect(screen.getByText('Verde-folha')).toBeInTheDocument()
    expect(screen.getByText('#3F5F2A')).toBeInTheDocument()
    await userEvent.setup().click(screen.getByRole('button', { name: 'Editar' }))
    expect(aoAbrir).toHaveBeenCalledTimes(1)
  })

  it('sem marca: "Sem logo" e a cor padrão do MetaNutri', () => {
    render(<CartaoSuaMarca aoAbrir={() => undefined} />)
    expect(screen.getByText('Sem logo')).toBeInTheDocument()
    expect(screen.getByText('Padrão do MetaNutri')).toBeInTheDocument()
    expect(screen.getByText('#0E3B43')).toBeInTheDocument()
  })

  it('outra cor, fora das prontas, aparece como "Outra cor"', () => {
    gravarPerfil(localStorage, { ...PERFIL_VAZIO, cor: '#123456' })
    render(<CartaoSuaMarca aoAbrir={() => undefined} />)
    expect(screen.getByText('Outra cor')).toBeInTheDocument()
    expect(screen.queryByText(/O link usa a cor do MetaNutri/)).not.toBeInTheDocument()
  })

  it('CB-966: a cor salva que não passa na regra de hoje (2,05:1) avisa que o link usa a cor do MetaNutri', () => {
    gravarPerfil(localStorage, { ...PERFIL_VAZIO, cor: '#8cc63f', marcaPublicada: true })
    render(<CartaoSuaMarca aoAbrir={() => undefined} />)
    expect(screen.getByText('O link usa a cor do MetaNutri: esta tem pouco contraste.')).toBeInTheDocument()
    // O cartão continua dizendo qual é a cor salva.
    expect(screen.getByText('#8CC63F')).toBeInTheDocument()
  })

  it('CB-966: sem cor própria não há aviso', () => {
    render(<CartaoSuaMarca aoAbrir={() => undefined} />)
    expect(screen.queryByText(/O link usa a cor do MetaNutri/)).not.toBeInTheDocument()
  })
})

describe('CA-1950: Configurações sem o cartão "Logotipo"', () => {
  it('não há mais cartão de logo nem campo de imagem em Configurações; a logo continua no perfil', () => {
    gravarPerfil(localStorage, { ...PERFIL_VAZIO, logo: LOGO })
    render(<TelaConfiguracoes />)
    expect(screen.queryByRole('heading', { name: 'Logotipo' })).not.toBeInTheDocument()
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    expect(document.querySelector('input[type="file"][accept^="image"]')).toBeNull()
    expect(JSON.parse(localStorage.getItem('metanutri:perfil') ?? '{}').logo).toBe(LOGO)
  })
})
