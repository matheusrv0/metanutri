// Spec base-ampliada, CA-1717 e CB-704: o plano com alimento da base ampliada espera a base.
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { EsperaDaBase } from './EsperaDaBase.tsx'

describe('EsperaDaBase', () => {
  it('carregando: diz que está carregando, sem botão', () => {
    render(<EsperaDaBase estado="carregando" aoTentarDeNovo={() => undefined} />)
    expect(screen.getByRole('status')).toHaveTextContent('Carregando a base de alimentos…')
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('erro: diz o que aconteceu e o que fazer, e "Tentar de novo" tenta', async () => {
    const tentar = vi.fn()
    render(<EsperaDaBase estado="erro" aoTentarDeNovo={tentar} />)
    expect(screen.getByRole('alert')).toHaveTextContent('Não foi possível carregar a base de alimentos. Confira a conexão e tente de novo.')
    await userEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }))
    expect(tentar).toHaveBeenCalledTimes(1)
  })
})
