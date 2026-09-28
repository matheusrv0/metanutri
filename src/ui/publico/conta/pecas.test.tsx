import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CampoSenha } from './CampoSenha.tsx'
import { LadoDoPlano } from './LadoDoPlano.tsx'
import { MolduraConta } from './MolduraConta.tsx'

describe('peças das telas de conta', () => {
  it('sem plano escolhido, o lado mostra o que o Free inclui', () => {
    render(<LadoDoPlano plano={null} ciclo="mensal" />)
    expect(screen.getByText('No Free você já tem')).toBeInTheDocument()
    expect(screen.getByText('2 pacientes ativos')).toBeInTheDocument()
  })

  it('com o Solo anual, mostra o preço do ano e o link para trocar', async () => {
    const aoTrocarPlano = vi.fn()
    render(<LadoDoPlano plano="solo" ciclo="anual" aoTrocarPlano={aoTrocarPlano} />)
    expect(screen.getByText('Plano escolhido')).toBeInTheDocument()
    expect(screen.getByText(/R\$ 299/)).toBeInTheDocument()
    await userEvent.setup().click(screen.getByRole('button', { name: 'Trocar de plano' }))
    expect(aoTrocarPlano).toHaveBeenCalledOnce()
  })

  it('o campo de senha mostra e esconde o que foi digitado', async () => {
    render(<CampoSenha id="s" rotulo="Senha" valor="segredo12" aoMudar={vi.fn()} novaSenha />)
    const campo = screen.getByLabelText('Senha')
    expect(campo).toHaveAttribute('type', 'password')
    await userEvent.setup().click(screen.getByRole('button', { name: 'Mostrar a senha' }))
    expect(campo).toHaveAttribute('type', 'text')
    expect(campo).toHaveAttribute('autocomplete', 'new-password')
  })

  it('a moldura mostra o passo quando existe', () => {
    render(
      <MolduraConta titulo="Crie sua conta" subtitulo="x" passo={{ atual: 1, total: 3 }} aoIrParaInicio={vi.fn()}>
        <p>formulário</p>
      </MolduraConta>,
    )
    expect(screen.getByRole('heading', { level: 1, name: 'Crie sua conta' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Passo 1 de 3' })).toBeInTheDocument()
  })
})
