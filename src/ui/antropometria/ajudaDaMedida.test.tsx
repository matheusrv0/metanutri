// A ajuda "Como medir" de cada medida (spec antropometria-telas, D-1415, CA-2427 e CA-2428).
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { AJUDAS } from './ajudas.ts'
import { ContextoDaAjudaAberta } from './ajudaAberta.ts'
import { AjudaDaMedida } from './AjudaDaMedida.tsx'

/** Duas ajudas na mesma tela, como na vista Avaliação: uma aberta por vez. */
function Duas() {
  const [aberta, abrir] = useState<string | null>(null)
  return (
    <ContextoDaAjudaAberta.Provider value={{ aberta, abrir }}>
      <div className="relative">
        <span>Tríceps</span>
        <AjudaDaMedida nome="Tríceps" ajuda={AJUDAS.tricipital} />
      </div>
      <div className="relative">
        <span>Bíceps</span>
        <AjudaDaMedida nome="Bíceps" ajuda={AJUDAS.bicipital} />
      </div>
      <input aria-label="Outro campo" />
    </ContextoDaAjudaAberta.Provider>
  )
}

const CREDITO_CDC_2007 = 'Fonte: CDC/NCHS – NHANES Anthropometry Procedures Manual (2007). Domínio público; disponível gratuitamente em cdc.gov. O uso não implica endosso do CDC.'

describe('a ajuda de cada medida (spec antropometria-telas, D-1415)', () => {
  it('CA-2427: o "?" do tríceps abre o título, a imagem, o crédito embaixo dela e o texto da técnica', async () => {
    const usuario = userEvent.setup()
    render(<Duas />)
    const botao = screen.getByRole('button', { name: 'Como medir: Tríceps' })
    expect(botao).toHaveAttribute('aria-expanded', 'false')
    await usuario.click(botao)
    expect(botao).toHaveAttribute('aria-expanded', 'true')
    const ajuda = screen.getByRole('dialog', { name: 'Como medir: Tríceps' })
    expect(within(ajuda).getByText('Tríceps')).toBeInTheDocument()
    const imagem = within(ajuda).getByRole('img', { name: 'Adipômetro na dobra do tríceps' })
    expect(imagem).toHaveAttribute('src', '/imagens/antropometria/dobra-triceps-foto-cdc-2007.webp')
    const figura = imagem.closest('figure')
    expect(figura).not.toBeNull()
    expect(within(figura as HTMLElement).getByText(CREDITO_CDC_2007).tagName).toBe('FIGCAPTION')
    expect(within(ajuda).getByText('Vertical, na face posterior do braço, no ponto médio entre acrômio e olécrano.')).toBeInTheDocument()
  })

  it('CA-2427: uma ajuda aberta por vez; abrir outra fecha a primeira', async () => {
    const usuario = userEvent.setup()
    render(<Duas />)
    await usuario.click(screen.getByRole('button', { name: 'Como medir: Tríceps' }))
    await usuario.click(screen.getByRole('button', { name: 'Como medir: Bíceps' }))
    expect(screen.queryByRole('dialog', { name: 'Como medir: Tríceps' })).not.toBeInTheDocument()
    expect(screen.getByRole('dialog', { name: 'Como medir: Bíceps' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Como medir: Tríceps' })).toHaveAttribute('aria-expanded', 'false')
  })

  it('CA-2427: Esc fecha e o foco volta ao "?"', async () => {
    const usuario = userEvent.setup()
    render(<Duas />)
    const botao = screen.getByRole('button', { name: 'Como medir: Tríceps' })
    await usuario.click(botao)
    await usuario.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Fechar a ajuda' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(botao).toHaveFocus()
    await usuario.click(botao)
    await usuario.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(botao).toHaveFocus()
  })

  it('CA-2427: tocar fora da ajuda fecha, sem mexer no foco de quem foi tocado', async () => {
    const usuario = userEvent.setup()
    render(<Duas />)
    await usuario.click(screen.getByRole('button', { name: 'Como medir: Tríceps' }))
    await usuario.click(screen.getByRole('textbox', { name: 'Outro campo' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Outro campo' })).toHaveFocus()
  })

  it('CA-2428: a do peso dá o crédito da CC BY 4.0, com o link da licença', async () => {
    const usuario = userEvent.setup()
    render(<AjudaDaMedida nome="Peso" ajuda={AJUDAS.peso} />)
    await usuario.click(screen.getByRole('button', { name: 'Como medir: Peso' }))
    const ajuda = screen.getByRole('dialog', { name: 'Como medir: Peso' })
    const legenda = within(ajuda).getByRole('img', { name: 'Balança de plataforma digital' }).closest('figure')?.querySelector('figcaption')
    expect(legenda?.textContent).toBe('Foto: Navazob / Wikimedia Commons, CC BY 4.0.')
    expect(within(ajuda).getByRole('link', { name: 'CC BY 4.0' })).toHaveAttribute('href', 'https://creativecommons.org/licenses/by/4.0/deed.pt-br')
  })

  it('CA-2428: a de uma medida sem imagem (antebraço) só tem o título e o texto', async () => {
    const usuario = userEvent.setup()
    render(<AjudaDaMedida nome="Antebraço" ajuda={AJUDAS.antebraco} />)
    await usuario.click(screen.getByRole('button', { name: 'Como medir: Antebraço' }))
    const ajuda = screen.getByRole('dialog', { name: 'Como medir: Antebraço' })
    expect(within(ajuda).queryByRole('img')).not.toBeInTheDocument()
    expect(within(ajuda).queryByRole('figure')).not.toBeInTheDocument()
    expect(within(ajuda).getByText('Antebraço')).toBeInTheDocument()
    expect(within(ajuda).getByText(AJUDAS.antebraco.texto)).toBeInTheDocument()
  })

  it('o "?" pode ter outro nome ("Como usar a fita") e o crédito traz o que vem antes dele', async () => {
    const usuario = userEvent.setup()
    render(<AjudaDaMedida nome="Fita" rotulo="Como usar a fita" ajuda={AJUDAS.fita} />)
    await usuario.click(screen.getByRole('button', { name: 'Como usar a fita' }))
    expect(screen.getByRole('dialog', { name: 'Como usar a fita' })).toBeInTheDocument()
    render(<AjudaDaMedida nome="Estatura" ajuda={AJUDAS.estatura} />)
    await usuario.click(screen.getByRole('button', { name: 'Como medir: Estatura' }))
    expect(screen.getByText(/^Rótulos em inglês: plano de Frankfurt, ombros e calcanhares\. Fonte: CDC\/NCHS/)).toBeInTheDocument()
  })
})
