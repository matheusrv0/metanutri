// Os componentes que nasceram com a importação de pacientes (spec importar-pacientes, DP-IP-26): Passos, CaixaDeMarcar e
// ListaNativa.
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CaixaDeMarcar } from '@ds/componentes/forms/CaixaDeMarcar.tsx'
import { ListaNativa } from '@ds/componentes/forms/ListaNativa.tsx'
import { Passos } from '@ds/componentes/navigation/Passos.tsx'

const PASSOS = [
  { valor: 'arquivo', rotulo: 'Arquivo' },
  { valor: 'colunas', rotulo: 'Colunas' },
  { valor: 'previa', rotulo: 'Prévia' },
] as const

describe('Passos', () => {
  it('o atual é marcado como passo atual; o feito é botão; o que não foi alcançado é só texto', async () => {
    const aoEscolher = vi.fn()
    render(<Passos rotulo="Passos da importação" passos={PASSOS} atual="colunas" aoEscolher={aoEscolher} />)
    const navegacao = screen.getByRole('navigation', { name: 'Passos da importação' })
    expect(navegacao.querySelector('[aria-current="step"]')).toHaveTextContent('Passo 2: Colunas')
    await userEvent.click(screen.getByRole('button', { name: 'Passo 1, feito: Arquivo' }))
    expect(aoEscolher).toHaveBeenCalledWith('arquivo')
    expect(screen.queryByRole('button', { name: /Prévia/ })).toBeNull()
    expect(screen.queryByRole('button', { name: /Colunas/ })).toBeNull()
  })

  it('o passo já alcançado depois do atual também é botão (voltar e avançar sem refazer)', async () => {
    const aoEscolher = vi.fn()
    render(<Passos rotulo="Passos" passos={PASSOS} atual="arquivo" alcancados={['colunas', 'previa']} aoEscolher={aoEscolher} />)
    await userEvent.click(screen.getByRole('button', { name: 'Passo 3: Prévia' }))
    expect(aoEscolher).toHaveBeenCalledWith('previa')
  })

  it('sem passo atual, todos estão feitos', () => {
    render(<Passos rotulo="Passos" passos={PASSOS} atual={null} aoEscolher={vi.fn()} />)
    expect(screen.getAllByRole('button').map((b) => b.textContent)).toEqual(['Passo 1, feito: Arquivo', 'Passo 2, feito: Colunas', 'Passo 3, feito: Prévia'])
  })
})

describe('CaixaDeMarcar', () => {
  it('marca e desmarca pelo rótulo, que pode ficar só para o leitor de tela', async () => {
    const aoMudar = vi.fn()
    render(<CaixaDeMarcar rotulo="Importar Ana Souza" rotuloOculto marcada={false} aoMudar={aoMudar} />)
    await userEvent.click(screen.getByRole('checkbox', { name: 'Importar Ana Souza' }))
    expect(aoMudar).toHaveBeenCalledWith(true)
  })

  it('"misto" é o estado de algumas marcadas; desativada não muda', async () => {
    const aoMudar = vi.fn()
    const { rerender } = render(<CaixaDeMarcar rotulo="Marcar todas" marcada="misto" aoMudar={aoMudar} />)
    const caixa = screen.getByRole<HTMLInputElement>('checkbox', { name: 'Marcar todas' })
    expect(caixa.indeterminate).toBe(true)
    rerender(<CaixaDeMarcar rotulo="Marcar todas" marcada desativada aoMudar={aoMudar} />)
    expect(caixa.indeterminate).toBe(false)
    expect(caixa).toBeChecked()
    expect(caixa).toBeDisabled()
    await userEvent.click(caixa)
    expect(aoMudar).not.toHaveBeenCalled()
  })

  it('a caixa é descrita pelo texto que a explica', () => {
    render(
      <>
        <CaixaDeMarcar rotulo="Importar Bia" rotuloOculto marcada={false} aoMudar={vi.fn()} descritaPor="motivo" />
        <span id="motivo">Sexo vazio</span>
      </>,
    )
    expect(screen.getByRole('checkbox', { name: 'Importar Bia' })).toHaveAccessibleDescription('Sexo vazio')
  })

  it('o rótulo é a área de toque: 44 px no celular e no toque do tablet (D-802)', () => {
    const { container } = render(<CaixaDeMarcar rotulo="x" marcada={false} aoMudar={vi.fn()} />)
    const rotulo = container.querySelector('label')
    expect(rotulo?.className).toContain('min-h-11')
    expect(rotulo?.className).toContain('sm:pointer-coarse:min-h-11')
  })
})

describe('ListaNativa', () => {
  it('é a lista do navegador, com a altura do campo e a volta ao toque (M-018)', async () => {
    const aoMudar = vi.fn()
    render(
      <ListaNativa aria-label="Vai para" value="nao" onChange={(e) => aoMudar(e.target.value)}>
        <option value="nome">Nome</option>
        <option value="nao">Não importar</option>
      </ListaNativa>,
    )
    const lista = screen.getByRole('combobox', { name: 'Vai para' })
    expect(lista.tagName).toBe('SELECT')
    expect(lista.className).toContain('sm:h-10')
    expect(lista.className).toContain('sm:pointer-coarse:h-11')
    await userEvent.selectOptions(lista, 'nome')
    expect(aoMudar).toHaveBeenCalledWith('nome')
  })
})
