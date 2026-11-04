// Spec marca-no-link (DP-ML-16): os três componentes da marca da nutricionista.
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { CampoCor } from '@ds/componentes/forms/CampoCor.tsx'
import { EscolhaDeCor } from '@ds/componentes/forms/EscolhaDeCor.tsx'
import { PlacaLogo } from '@ds/componentes/display/PlacaLogo.tsx'

const LOGO = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='

const CORES = [
  { nome: 'Azul', valor: '#1f4e8c' },
  { nome: 'Verde-folha', valor: '#3f5f2a' },
  { nome: 'Vinho', valor: '#7a2944' },
]

describe('PlacaLogo (D-957)', () => {
  it('a logo vai numa placa branca nos dois temas, com o texto alternativo', () => {
    render(<PlacaLogo src={LOGO} alt="Sua logo" />)
    const logo = screen.getByRole('img', { name: 'Sua logo' })
    expect(logo).toHaveAttribute('src', LOGO)
    expect(logo.parentElement?.className).toContain('bg-linkplaca')
  })

  it('CA-1972: no tamanho do link, cabe em 40 × 200 px sem deformar (lado maior limitado, o outro automático)', () => {
    render(<PlacaLogo src={LOGO} alt="Sua logo" tamanho="link" />)
    const classes = screen.getByRole('img').className
    expect(classes).toContain('max-h-10')
    expect(classes).toContain('max-w-50')
    expect(classes).toContain('object-contain')
    expect(classes).toMatch(/\bw-auto\b/)
    expect(classes).toMatch(/\bh-auto\b/)
  })

  it('CA-1973: a imagem que não abre avisa quem usa', async () => {
    const falhou = vi.fn()
    render(<PlacaLogo src="data:image/png;base64,lixo" alt="Sua logo" aoFalhar={falhou} />)
    screen.getByRole('img').dispatchEvent(new Event('error'))
    expect(falhou).toHaveBeenCalledTimes(1)
  })
})

describe('EscolhaDeCor (D-953, CA-1980)', () => {
  function Escolha({ inicial = '#3f5f2a' }: { readonly inicial?: string }) {
    const [cor, setCor] = useState(inicial)
    return (
      <>
        <span id="titulo-cor">Cor</span>
        <EscolhaDeCor rotuloId="titulo-cor" opcoes={CORES} valor={cor} aoEscolher={setCor} />
        <output>{cor}</output>
      </>
    )
  }

  it('CA-1980: é um grupo de opções com nome, e cada cor tem nome e código', () => {
    render(<Escolha />)
    expect(screen.getByRole('radiogroup', { name: 'Cor' })).toBeInTheDocument()
    expect(screen.getAllByRole('radio').map((r) => r.getAttribute('aria-label'))).toEqual(['Azul, #1F4E8C', 'Verde-folha, #3F5F2A', 'Vinho, #7A2944'])
    expect(screen.getByRole('radio', { name: 'Verde-folha, #3F5F2A' })).toBeChecked()
  })

  it('CA-1957: escolher uma cor muda a escolha na hora', async () => {
    render(<Escolha />)
    await userEvent.setup().click(screen.getByRole('radio', { name: 'Vinho, #7A2944' }))
    expect(screen.getByText('#7a2944')).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Vinho, #7A2944' })).toBeChecked()
  })

  it('CA-1980: só com o teclado: as setas andam entre as cores', async () => {
    render(<Escolha />)
    const usuario = userEvent.setup()
    await usuario.tab()
    expect(screen.getByRole('radio', { name: 'Verde-folha, #3F5F2A' })).toHaveFocus()
    await usuario.keyboard('{ArrowRight}')
    expect(screen.getByText('#7a2944')).toBeInTheDocument()
  })

  it('a escolhida tem marca além da cor (um sinal que não depende de ver a cor)', () => {
    const { container } = render(<Escolha />)
    expect(container.querySelectorAll('[data-escolhida="true"] svg')).toHaveLength(1)
  })

  it('outra cor, fora das prontas: nenhuma fica marcada', () => {
    render(<Escolha inicial="#123456" />)
    for (const radio of screen.getAllByRole('radio')) expect(radio).not.toBeChecked()
  })
})

describe('CampoCor ("Outra cor", CA-1958, CB-954)', () => {
  function Campo({ inicial = '#3f5f2a' }: { readonly inicial?: string }) {
    const [cor, setCor] = useState(inicial)
    return (
      <>
        <CampoCor rotulo="Outra cor" valor={cor} aoEscolher={setCor} descricaoId="contraste" />
        <p id="contraste">Contraste 7,29:1</p>
        <output>{cor}</output>
        <button type="button" onClick={() => setCor('#7a2944')}>
          Escolher vinho
        </button>
      </>
    )
  }

  it('CA-1958: digitar #1f4e8c, com ou sem #, em maiúscula ou minúscula, vale', async () => {
    const usuario = userEvent.setup()
    for (const digitado of ['#1f4e8c', '1F4E8C', '#1F4e8c']) {
      const { unmount } = render(<Campo />)
      const campo = screen.getByRole('textbox', { name: 'Outra cor' })
      await usuario.clear(campo)
      await usuario.type(campo, digitado)
      expect(screen.getByText('#1f4e8c')).toBeInTheDocument()
      expect(screen.queryByText('Use o formato #RRGGBB.')).not.toBeInTheDocument()
      unmount()
    }
  })

  it('CA-1958: fora do formato, "Use o formato #RRGGBB." junto do campo, e a cor anterior continua', async () => {
    render(<Campo />)
    const usuario = userEvent.setup()
    const campo = screen.getByRole('textbox', { name: 'Outra cor' })
    await usuario.clear(campo)
    await usuario.type(campo, '#12zz56')
    expect(screen.getByText('Use o formato #RRGGBB.')).toBeInTheDocument()
    expect(campo).toHaveAttribute('aria-invalid', 'true')
    expect(campo).toHaveAccessibleDescription(/Use o formato #RRGGBB\./)
    expect(screen.getByText('#3f5f2a')).toBeInTheDocument()
  })

  it('não acusa erro no meio da digitação; acusa ao sair do campo', async () => {
    render(<Campo />)
    const usuario = userEvent.setup()
    const campo = screen.getByRole('textbox', { name: 'Outra cor' })
    await usuario.clear(campo)
    await usuario.type(campo, '#1f4')
    expect(screen.queryByText('Use o formato #RRGGBB.')).not.toBeInTheDocument()
    await usuario.tab()
    expect(screen.getByText('Use o formato #RRGGBB.')).toBeInTheDocument()
  })

  it('CA-1980: a descrição de fora (o contraste e a recusa) fica ligada ao campo', () => {
    render(<Campo />)
    expect(screen.getByRole('textbox', { name: 'Outra cor' })).toHaveAccessibleDescription('Contraste 7,29:1')
  })

  it('a cor escolhida fora do campo (uma amostra, a sugestão) aparece no campo, em maiúscula', async () => {
    render(<Campo />)
    expect(screen.getByRole('textbox', { name: 'Outra cor' })).toHaveValue('#3F5F2A')
    await userEvent.setup().click(screen.getByRole('button', { name: 'Escolher vinho' }))
    expect(screen.getByRole('textbox', { name: 'Outra cor' })).toHaveValue('#7A2944')
  })

  it('CB-954: o seletor do navegador escolhe a cor; sem ele, o campo de texto continua', async () => {
    render(<Campo />)
    const seletor = screen.getByLabelText('Escolher outra cor no seletor')
    expect(seletor).toHaveAttribute('type', 'color')
    expect(seletor).toHaveValue('#3f5f2a')
  })
})
