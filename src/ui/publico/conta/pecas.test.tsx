import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AvisoFormulario } from './AvisoFormulario.tsx'
import { CaixaDeclaracao } from './CaixaDeclaracao.tsx'
import { CampoSenha } from './CampoSenha.tsx'
import { LadoDoPlano } from './LadoDoPlano.tsx'
import { MolduraConta } from './MolduraConta.tsx'

describe('peças das telas de conta', () => {
  it('CA-1182: sem plano escolhido, o lado mostra os limites do Free e o que vem em todas as assinaturas', () => {
    render(<LadoDoPlano plano={null} ciclo="mensal" />)
    expect(screen.getByText('No Free, você já tem')).toBeInTheDocument()
    expect(screen.getAllByRole('listitem').map((item) => item.textContent)).toEqual([
      '2 pacientes ativos',
      '2 links do paciente',
      'Adequação de 20 vitaminas e minerais e da fibra, com o botão Cobrir',
      'Missões diárias no link do paciente e tela Adesão',
      'Plano impresso em PDF; aconselhamento e memorial em Word',
    ])
  })

  it('D-128 (spec dados-na-nuvem) e D-400: o lado do plano diz que os dados ficam salvos na conta, sem "presos"', () => {
    render(<LadoDoPlano plano={null} ciclo="mensal" />)
    expect(screen.getByText('Seus planos alimentares e pacientes ficam salvos na sua conta.')).toBeInTheDocument()
    expect(screen.queryByText('Seus planos ficam salvos no aparelho e funcionam sem internet depois do primeiro acesso.')).not.toBeInTheDocument()
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

  it('D-237 (spec revisao-geral-publica): o cartão encolhe e o subtítulo quebra em qualquer ponto (e-mail longo)', () => {
    const email = `${'maria.aparecida.dos.santos'.repeat(2)}@aluno.universidade.edu.br`
    render(
      <MolduraConta titulo="Confira seu e-mail" subtitulo={`Mandamos um código para ${email}.`}>
        <p>formulário</p>
      </MolduraConta>,
    )
    const subtitulo = screen.getByText(`Mandamos um código para ${email}.`)
    expect(subtitulo.className).toContain('[overflow-wrap:anywhere]')
    const principal = screen.getByRole('main')
    expect(principal.className).toContain('min-w-0')
    expect(principal.parentElement?.className).toContain('grid-cols-[minmax(0,1fr)]')
  })

  it('D-237 (spec revisao-geral-publica): o aviso do formulário quebra em qualquer ponto', () => {
    render(<AvisoFormulario tipo="ok">E-mail da faculdade confirmado: {'a'.repeat(80)}@x.br</AvisoFormulario>)
    expect(screen.getByRole('status').lastElementChild?.className).toContain('[overflow-wrap:anywhere]')
  })

  it('CA-759 (spec revisao-geral-publica): a caixa de aceite tem 44 px de toque sem mudar o desenho', () => {
    render(
      <CaixaDeclaracao id="aceite" marcada={false} aoMudar={vi.fn()}>
        Declaro que este CRN é meu e está ativo.
      </CaixaDeclaracao>,
    )
    const rotulo = screen.getByText('Declaro que este CRN é meu e está ativo.').closest('label')
    // A área de toque cresce 12 px para cima e para baixo; a margem negativa devolve o espaço ao formulário.
    expect(rotulo?.className).toContain('py-3')
    expect(rotulo?.className).toContain('-my-3')
  })
})
