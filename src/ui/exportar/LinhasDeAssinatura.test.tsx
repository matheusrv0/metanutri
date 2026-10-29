import { render, screen } from '@testing-library/react'
import { LinhasDeAssinatura } from './LinhasDeAssinatura.tsx'

describe('LinhasDeAssinatura (spec ajustes-mobile)', () => {
  it('M-026: o nome de quem assina fica centralizado sob a linha, como o papel, também quando quebra', () => {
    render(<LinhasDeAssinatura assinatura={{ tipo: 'nutricionista', linha: 'Maria Aparecida dos Santos Wiśniewska-Kowalczyk — CRN-3 123456' }} />)
    expect(screen.getByText('Maria Aparecida dos Santos Wiśniewska-Kowalczyk — CRN-3 123456').className).toContain('text-center')
  })

  it('M-026: no estágio, os dois nomes também', () => {
    render(<LinhasDeAssinatura assinatura={{ tipo: 'estagio', estagiario: 'Ana Estagiária', preceptor: 'Bia Preceptora' }} />)
    for (const nome of ['Ana Estagiária', 'Bia Preceptora']) expect(screen.getByText(nome).className).toContain('text-center')
  })
})
