import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useRef, useState } from 'react'
import type { LugarDaGaveta } from './GavetaIa.tsx'
import { GavetaIa } from './GavetaIa.tsx'

describe('GavetaIa (spec assistente-ia, D-1302 e D-1350)', () => {
  it('CA-2361: ao lado ou no fluxo, é uma região com o título do botão, o corpo e o rodapé; "Fechar" fecha', async () => {
    const aoFechar = vi.fn()
    render(<GavetaIa titulo="Sugerir plano com IA" lugar="lado" aoFechar={aoFechar} corpo={<p>corpo</p>} rodape={<p>rodapé</p>} />)
    const gaveta = screen.getByRole('complementary', { name: 'Sugerir plano com IA' })
    expect(gaveta).toHaveTextContent('corpo')
    expect(gaveta).toHaveTextContent('rodapé')
    await userEvent.setup().click(screen.getByRole('button', { name: 'Fechar' }))
    expect(aoFechar).toHaveBeenCalled()
  })

  it('CA-2381: abaixo de 640 px, a folha de baixo do sistema (um diálogo com o título)', () => {
    render(<GavetaIa titulo="Adequar com IA" lugar="folha" aoFechar={vi.fn()} corpo={<p>corpo</p>} rodape={<p>rodapé</p>} />)
    expect(screen.getByRole('dialog', { name: 'Adequar com IA' })).toHaveTextContent('rodapé')
  })
})

describe('GavetaIa: o foco ao abrir (CA-2407, D-1357)', () => {
  it.each(['lado', 'fluxo'] as const)('em "%s", o título recebe o foco ao abrir', (lugar) => {
    render(<GavetaIa titulo="Sugerir plano com IA" lugar={lugar} aoFechar={vi.fn()} corpo={<p>corpo</p>} rodape={<p>rodapé</p>} />)
    expect(document.activeElement).toBe(screen.getByRole('heading', { name: 'Sugerir plano com IA' }))
  })
})

/** Quem abre a gaveta: o botão guarda a referência, como os botões da etapa. */
function ComBotao({ lugar }: { readonly lugar: LugarDaGaveta }) {
  const [aberta, setAberta] = useState(false)
  const quemAbriu = useRef<HTMLElement | null>(null)
  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          quemAbriu.current = e.currentTarget
          setAberta(true)
        }}
      >
        Sugerir plano com IA
      </button>
      {aberta ? <GavetaIa titulo="Sugerir plano com IA" lugar={lugar} aoFechar={() => setAberta(false)} quemAbriu={quemAbriu} corpo={<p>corpo</p>} rodape={<p>rodapé</p>} /> : null}
    </>
  )
}

describe('GavetaIa: o foco volta ao botão que abriu (CA-2408, D-1359)', () => {
  it('CA-2408: na folha do celular, o Esc fecha e o foco volta ao botão', async () => {
    const usuario = userEvent.setup()
    render(<ComBotao lugar="folha" />)
    const botao = screen.getByRole('button', { name: 'Sugerir plano com IA' })
    await usuario.click(botao)
    expect(screen.getByRole('dialog', { name: 'Sugerir plano com IA' })).toBeInTheDocument()
    await usuario.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    await waitFor(() => expect(document.activeElement).toBe(botao))
  })

  it.each(['lado', 'fluxo'] as const)('CA-2408: em "%s", o X fecha e o foco volta ao botão', async (lugar) => {
    const usuario = userEvent.setup()
    render(<ComBotao lugar={lugar} />)
    const botao = screen.getByRole('button', { name: 'Sugerir plano com IA' })
    await usuario.click(botao)
    await usuario.click(screen.getByRole('button', { name: 'Fechar' }))
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument()
    await waitFor(() => expect(document.activeElement).toBe(botao))
  })
})
