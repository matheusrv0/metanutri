// Spec anamnese-e-prescricoes, US-AP3: o pedido de exames na ficha e a folha de solicitação.
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { AssinaturaDoPlano } from '@/domain/assinaturaDoPlano.ts'
import { dataDeHoje } from '@/domain/documentoDoPaciente.ts'
import { EXAMES } from '@/domain/exames.ts'
import { dataPorExtenso } from '@/domain/formatarData.ts'
import { criarRepositorioPacientes, type Paciente } from '@/domain/pacientes.ts'
import { criarRepositorio, type Armazenamento } from '@/domain/persistencia.ts'
import { ContextoArmazenamento } from '../estado/contextoArmazenamento.ts'
import { ProvedorCasos } from '../estado/ProvedorCasos.tsx'
import { ProvedorPacientes } from '../estado/ProvedorPacientes.tsx'
import { TelaPaciente } from './TelaPaciente.tsx'

class MemoriaFalsa implements Armazenamento {
  readonly dados = new Map<string, string>()
  getItem(k: string) {
    return this.dados.get(k) ?? null
  }
  setItem(k: string, v: string) {
    this.dados.set(k, v)
  }
  removeItem(k: string) {
    this.dados.delete(k)
  }
}

const relogio = () => {
  let ms = Date.UTC(2026, 9, 14, 12, 0, 0)
  return () => new Date((ms += 60_000)).toISOString()
}

const ANA: AssinaturaDoPlano = { situacao: 'nutricionista', linhaNutricionista: 'Ana Souza · CRN-6 12345', origem: 'conta', nome: 'Ana Souza', responsavelTecnico: '' }
const JULIA: AssinaturaDoPlano = { situacao: 'estudante', linhaNutricionista: null, origem: 'conta', nome: 'Júlia Martins', responsavelTecnico: 'Carla Mendes' }

function montar(ajuste: Partial<Paciente> = {}, assinatura: AssinaturaDoPlano | null = ANA) {
  const arm = new MemoriaFalsa()
  const pacientes = criarRepositorioPacientes(arm, { agora: relogio(), gerarId: () => 'p1' })
  const criado = pacientes.criar('Maria Silva')
  pacientes.salvar({ ...criado, ...ajuste })
  render(
    <ContextoArmazenamento.Provider value={arm}>
      <ProvedorCasos repositorio={criarRepositorio(arm, { agora: relogio() })}>
        <ProvedorPacientes repositorio={pacientes}>
          <TelaPaciente pacienteId="p1" assinatura={assinatura} aoAbrirPlano={vi.fn()} aoNovoPlano={vi.fn()} aoVoltar={vi.fn()} />
        </ProvedorPacientes>
      </ProvedorCasos>
    </ContextoArmazenamento.Provider>,
  )
  return { pacientes, usuario: userEvent.setup() }
}

const cartao = () => within(screen.getByRole('region', { name: 'Pedido de exames' }))

describe('Pedido de exames na ficha (US-AP3)', () => {
  it('CA-579 e CA-585: os 15 exames para marcar, nenhum marcado, e o campo Outros exames', () => {
    montar()
    const caixas = cartao().getAllByRole('checkbox')
    expect(caixas.map((c) => c.closest('label')?.textContent ?? '')).toEqual(EXAMES.map((e) => e.nome))
    expect(caixas).toHaveLength(15)
    for (const c of caixas) expect(c).not.toBeChecked()
    expect(cartao().getByLabelText('Outros exames')).toHaveValue('')
  })

  it('CA-579: marcar e escrever em Outros salva na ficha na hora', async () => {
    const { pacientes, usuario } = montar()
    await usuario.click(cartao().getByRole('checkbox', { name: 'Ferritina' }))
    await usuario.click(cartao().getByRole('checkbox', { name: 'Vitamina B12' }))
    await usuario.type(cartao().getByLabelText('Outros exames'), 'Ácido fólico')
    expect(pacientes.obter('p1')?.pedidoExames).toEqual({ marcados: ['ferritina', 'vitamina-b12'], outros: 'Ácido fólico' })
    await usuario.click(cartao().getByRole('checkbox', { name: 'Ferritina' }))
    expect(pacientes.obter('p1')?.pedidoExames.marcados).toEqual(['vitamina-b12'])
  })

  it('CA-579: Limpar pedido desmarca tudo e esvazia Outros; sem nada no pedido, fica desligado', async () => {
    const { pacientes, usuario } = montar({ pedidoExames: { marcados: ['tsh', 'ferritina'], outros: 'Selênio' } })
    await usuario.click(cartao().getByRole('button', { name: 'Limpar pedido' }))
    expect(pacientes.obter('p1')?.pedidoExames).toEqual({ marcados: [], outros: '' })
    for (const caixa of cartao().getAllByRole('checkbox')) expect(caixa).not.toBeChecked()
    expect(cartao().getByLabelText('Outros exames')).toHaveValue('')
    expect(cartao().getByRole('button', { name: 'Limpar pedido' })).toBeDisabled()
  })

  it('CA-581: sem nada marcado nem escrito, "Imprimir pedido" fica desligado e o cartão diz o porquê', async () => {
    const { usuario } = montar()
    expect(cartao().getByRole('button', { name: 'Imprimir pedido' })).toBeDisabled()
    expect(cartao().getByText('Marque um exame ou escreva em Outros exames.')).toBeInTheDocument()
    await usuario.type(cartao().getByLabelText('Outros exames'), 'Insulina')
    expect(cartao().getByRole('button', { name: 'Imprimir pedido' })).toBeEnabled()
    expect(cartao().queryByText('Marque um exame ou escreva em Outros exames.')).not.toBeInTheDocument()
  })

  it('CA-580: a folha traz os marcados na ordem da lista, as linhas de Outros, a data e a assinatura com CRN', async () => {
    const { usuario } = montar({ nascimento: '1994-03-10', pedidoExames: { marcados: ['tsh', 'hemograma'], outros: 'Selênio\n\nZinco sérico' } })
    await usuario.click(cartao().getByRole('button', { name: 'Imprimir pedido' }))
    const janela = within(screen.getByRole('dialog', { name: 'Pedido de exames para imprimir' }))
    const folha = within(janela.getByRole('article', { name: 'Solicitação de exames' }))
    expect(folha.getByText(`Maria Silva · ${dataPorExtenso(dataDeHoje())}`)).toBeInTheDocument()
    expect(folha.getByText('Data de nascimento: 10/03/1994')).toBeInTheDocument()
    expect(folha.getAllByRole('listitem').map((li) => li.textContent)).toEqual(['Hemograma completo', 'TSH', 'Selênio', 'Zinco sérico'])
    expect(folha.getAllByText('Ana Souza · CRN-6 12345')).toHaveLength(2)
    expect(janela.getByRole('button', { name: 'Imprimir ou salvar em PDF' })).toBeInTheDocument()
  })

  it('CA-580: sem data de nascimento na ficha, a folha não mostra a linha', async () => {
    const { usuario } = montar({ pedidoExames: { marcados: ['tsh'], outros: '' } })
    await usuario.click(cartao().getByRole('button', { name: 'Imprimir pedido' }))
    expect(within(screen.getByRole('article', { name: 'Solicitação de exames' })).queryByText(/Data de nascimento/)).not.toBeInTheDocument()
  })

  it('CA-582: estudante: proposta de solicitação, com a frase e as duas assinaturas', async () => {
    const { usuario } = montar({ pedidoExames: { marcados: ['ferritina'], outros: '' } }, JULIA)
    await usuario.click(cartao().getByRole('button', { name: 'Imprimir pedido' }))
    const folha = within(screen.getByRole('article', { name: 'Proposta de solicitação de exames' }))
    expect(folha.getByText('Proposta do estágio para avaliação do(a) preceptor(a). Só vale com a assinatura do(a) preceptor(a).')).toBeInTheDocument()
    expect(within(folha.getByRole('group', { name: 'Assinaturas' })).getByText('Preceptor(a)')).toBeInTheDocument()
  })
})
