import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
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
