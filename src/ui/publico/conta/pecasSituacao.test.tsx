import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { SITUACAO_VAZIA, type DadosSituacao, type ErroSituacao } from '@/domain/situacao.ts'
import { CamposSituacao } from './CamposSituacao.tsx'

function Montado({ travar = false, erro = null as ErroSituacao | null, aoMudar = vi.fn() }) {
  const [valor, setValor] = useState<DadosSituacao>(SITUACAO_VAZIA)
  return (
    <CamposSituacao
      id="t"
      valor={valor}
      erro={erro}
      travarEstudante={travar}
      aoMudar={(v) => {
        setValor(v)
        aoMudar(v)
      }}
    />
  )
}

describe('CamposSituacao', () => {
  it('CA-262: mostra os dois cartões de "Você é"', () => {
    render(<Montado />)
    expect(screen.getByRole('group', { name: 'Você é' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: /Nutricionista/ })).not.toBeChecked()
    expect(screen.getByRole('radio', { name: /Estudante de Nutrição/ })).not.toBeChecked()
  })

  it('CA-263: nutricionista mostra o CRN e a declaração', async () => {
    const aoMudar = vi.fn()
    render(<Montado aoMudar={aoMudar} />)
    const usuario = userEvent.setup()
    await usuario.click(screen.getByRole('radio', { name: /Nutricionista/ }))
    await usuario.selectOptions(screen.getByRole('combobox', { name: 'Região do CRN' }), 'CRN-6')
    await usuario.type(screen.getByRole('textbox', { name: 'Número do CRN' }), '12345')
    await usuario.click(screen.getByRole('checkbox', { name: 'Declaro que este CRN é meu e está ativo.' }))
    expect(aoMudar).toHaveBeenLastCalledWith({ situacao: 'nutricionista', regiao: 6, numero: '12345', declarouCrn: true, declarouMatricula: false })
  })

  it('CA-265: estudante mostra a declaração de matrícula, sem CRN', async () => {
    render(<Montado />)
    await userEvent.setup().click(screen.getByRole('radio', { name: /Estudante de Nutrição/ }))
    expect(screen.getByRole('checkbox', { name: 'Declaro ter matrícula ativa no curso de Nutrição.' })).toBeInTheDocument()
    expect(screen.queryByRole('textbox', { name: 'Número do CRN' })).not.toBeInTheDocument()
  })

  it('CA-267: travado no Estudante, o cartão Nutricionista fica indisponível', () => {
    render(<Montado travar />)
    expect(screen.getByRole('radio', { name: /Nutricionista/ })).toBeDisabled()
  })

  it('marca o campo com erro', async () => {
    render(<Montado erro="crn-numero" />)
    await userEvent.setup().click(screen.getByRole('radio', { name: /Nutricionista/ }))
    expect(screen.getByRole('textbox', { name: 'Número do CRN' })).toHaveAttribute('aria-invalid', 'true')
  })
})
