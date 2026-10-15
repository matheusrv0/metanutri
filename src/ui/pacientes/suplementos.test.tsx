// Spec anamnese-e-prescricoes, US-AP2 e US-AP4: os suplementos na ficha e a folha de suplementação.
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { AssinaturaDoPlano } from '@/domain/assinaturaDoPlano.ts'
import { dataDeHoje } from '@/domain/documentoDoPaciente.ts'
import { dataPorExtenso } from '@/domain/formatarData.ts'
import { criarRepositorioPacientes, type Paciente } from '@/domain/pacientes.ts'
import { criarRepositorio, type Armazenamento } from '@/domain/persistencia.ts'
import { CHAVE_MODELOS_SUPLEMENTO, criarRepositorioModelosSuplemento, type Suplemento } from '@/domain/suplementos.ts'
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

const vitD: Suplemento = { id: 's1', nome: 'Vitamina D3', dose: '1 cápsula de 2.000 UI', horario: 'No almoço', duracao: '3 meses', observacao: 'Com uma refeição que tenha gordura' }

function montar(ajuste: Partial<Paciente> = {}, assinatura: AssinaturaDoPlano | null = ANA, arm = new MemoriaFalsa()) {
  const pacientes = criarRepositorioPacientes(arm, { agora: relogio(), gerarId: () => 'p1' })
  const criado = pacientes.criar('Maria Silva')
  pacientes.salvar({ ...criado, ...ajuste })
  const casos = criarRepositorio(arm, { agora: relogio() })
  render(
    <ContextoArmazenamento.Provider value={arm}>
      <ProvedorCasos repositorio={casos}>
        <ProvedorPacientes repositorio={pacientes}>
          <TelaPaciente pacienteId="p1" assinatura={assinatura} aoAbrirPlano={vi.fn()} aoNovoPlano={vi.fn()} aoVoltar={vi.fn()} />
        </ProvedorPacientes>
      </ProvedorCasos>
    </ContextoArmazenamento.Provider>,
  )
  return { arm, pacientes, usuario: userEvent.setup() }
}

const cartao = () => within(screen.getByRole('region', { name: 'Suplementos' }))

describe('Suplementos na ficha (US-AP2)', () => {
  it('CA-585: paciente novo não tem suplemento, e a conta não tem modelo', async () => {
    const { usuario } = montar()
    expect(cartao().getByText('Nenhum suplemento.')).toBeInTheDocument()
    expect(cartao().getByRole('button', { name: 'Imprimir' })).toBeDisabled()
    await usuario.click(cartao().getByRole('button', { name: 'Modelos' }))
    expect(within(screen.getByRole('dialog', { name: 'Modelos de suplemento' })).getByText('Nenhum modelo ainda. Use “Salvar como modelo” num suplemento da lista.')).toBeInTheDocument()
  })

  it('CA-571: acrescentar um suplemento e preencher os cinco campos salva na ficha na hora', async () => {
    const { pacientes, usuario } = montar()
    const antes = pacientes.obter('p1')?.atualizadoEm ?? ''
    await usuario.click(cartao().getByRole('button', { name: 'Acrescentar suplemento' }))
    const item = within(cartao().getByRole('group', { name: 'Suplemento 1' }))
    await usuario.type(item.getByLabelText('Nome'), 'Ferro')
    await usuario.type(item.getByLabelText('Dose'), '1 comprimido')
    await usuario.type(item.getByLabelText('Horário'), 'Em jejum')
    await usuario.type(item.getByLabelText('Por quanto tempo'), '2 meses')
    await usuario.type(item.getByLabelText('Observação'), 'Com suco de laranja')
    const salvo = pacientes.obter('p1')
    expect(salvo?.suplementos).toEqual([expect.objectContaining({ nome: 'Ferro', dose: '1 comprimido', horario: 'Em jejum', duracao: '2 meses', observacao: 'Com suco de laranja' })])
    expect((salvo?.atualizadoEm ?? '') > antes).toBe(true)
    expect(cartao().getByRole('group', { name: 'Ferro' })).toBeInTheDocument()
  })

  it('CA-572: Tirar remove o suplemento', async () => {
    const { pacientes, usuario } = montar({ suplementos: [vitD, { ...vitD, id: 's2', nome: 'Ômega 3' }] })
    await usuario.click(within(cartao().getByRole('group', { name: 'Vitamina D3' })).getByRole('button', { name: 'Tirar' }))
    expect(pacientes.obter('p1')?.suplementos.map((s) => s.nome)).toEqual(['Ômega 3'])
  })

  it('CA-573: Salvar como modelo guarda na conta e avisa; o mesmo nome troca; sem nome, desligado', async () => {
    const { arm, usuario } = montar({ suplementos: [vitD, { ...vitD, id: 's2', nome: '' }] })
    await usuario.click(within(cartao().getByRole('group', { name: 'Vitamina D3' })).getByRole('button', { name: 'Salvar como modelo' }))
    expect(cartao().getByRole('status')).toHaveTextContent('Modelo salvo.')
    expect(within(cartao().getByRole('group', { name: 'Suplemento 2' })).getByRole('button', { name: 'Salvar como modelo' })).toBeDisabled()
    const item = within(cartao().getByRole('group', { name: 'Vitamina D3' }))
    await usuario.clear(item.getByLabelText('Dose'))
    await usuario.type(item.getByLabelText('Dose'), '2 cápsulas')
    await usuario.click(within(cartao().getByRole('group', { name: 'Vitamina D3' })).getByRole('button', { name: 'Salvar como modelo' }))
    const modelos = criarRepositorioModelosSuplemento(arm).listar()
    expect(modelos.map((m) => [m.nome, m.dose])).toEqual([['Vitamina D3', '2 cápsulas']])
    expect(JSON.parse(arm.getItem(CHAVE_MODELOS_SUPLEMENTO) ?? '[]')).toHaveLength(1)
  })

  it('CA-574: os modelos em ordem de nome; Usar acrescenta uma cópia e fecha; Apagar tira o modelo', async () => {
    const arm = new MemoriaFalsa()
    const repo = criarRepositorioModelosSuplemento(arm)
    repo.salvarDe({ ...vitD, nome: 'Zinco', dose: '30 mg' })
    repo.salvarDe({ ...vitD, nome: 'Magnésio' })
    const { pacientes, usuario } = montar({}, ANA, arm)
    await usuario.click(cartao().getByRole('button', { name: 'Modelos' }))
    const janela = within(screen.getByRole('dialog', { name: 'Modelos de suplemento' }))
    expect(janela.getAllByRole('listitem').map((li) => li.textContent ?? '')).toEqual([expect.stringContaining('Magnésio'), expect.stringContaining('Zinco')])
    await usuario.click(janela.getByRole('button', { name: 'Apagar o modelo Magnésio' }))
    expect(repo.listar().map((m) => m.nome)).toEqual(['Zinco'])
    await usuario.click(janela.getByRole('button', { name: 'Usar Zinco' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(pacientes.obter('p1')?.suplementos).toEqual([expect.objectContaining({ nome: 'Zinco', dose: '30 mg' })])
    expect(cartao().getByRole('group', { name: 'Zinco' })).toBeInTheDocument()
  })
})

describe('Folha de suplementação (CA-576, CA-578, CA-582, CA-583)', () => {
  const abrirFolha = async (usuario: ReturnType<typeof userEvent.setup>) => {
    await usuario.click(cartao().getByRole('button', { name: 'Imprimir' }))
    return within(screen.getByRole('dialog', { name: 'Suplementos para imprimir' }))
  }

  it('CA-576 e CA-578: nutricionista: título, paciente, data do dia, lista e assinatura com nome e CRN; sem nome não sai', async () => {
    const { usuario } = montar({ suplementos: [vitD, { ...vitD, id: 's2', nome: '', dose: 'esquecido' }, { ...vitD, id: 's3', nome: 'Magnésio', dose: '', horario: '', duracao: '', observacao: '' }] })
    const janela = await abrirFolha(usuario)
    const folha = within(janela.getByRole('article', { name: 'Suplementação' }))
    expect(folha.getByRole('heading', { name: 'Suplementação' })).toBeInTheDocument()
    expect(folha.getByText(`Maria Silva · ${dataPorExtenso(dataDeHoje())}`)).toBeInTheDocument()
    const itens = folha.getAllByRole('listitem')
    expect(itens).toHaveLength(2)
    expect(itens[0]).toHaveTextContent('Vitamina D3')
    expect(itens[0]).toHaveTextContent('Dose: 1 cápsula de 2.000 UI · Horário: No almoço · Por quanto tempo: 3 meses')
    expect(itens[0]).toHaveTextContent('Com uma refeição que tenha gordura')
    expect(itens[1]).toHaveTextContent('Magnésio')
    expect(folha.queryByText(/esquecido/)).not.toBeInTheDocument()
    expect(folha.getAllByText('Ana Souza · CRN-6 12345')).toHaveLength(2)
    expect(within(folha.getByRole('group', { name: 'Assinaturas' })).getByText('Nutricionista')).toBeInTheDocument()
    expect(folha.queryByText(/Proposta/)).not.toBeInTheDocument()
    expect(janela.getByRole('button', { name: 'Imprimir ou salvar em PDF' })).toBeInTheDocument()
  })

  it('CA-578: sem nenhum suplemento com nome, Imprimir fica desligado', () => {
    montar({ suplementos: [{ ...vitD, nome: '  ' }] })
    expect(cartao().getByRole('button', { name: 'Imprimir' })).toBeDisabled()
  })

  it('CA-582: estudante: proposta do estágio, com a frase e as duas assinaturas', async () => {
    const { usuario } = montar({ suplementos: [vitD] }, JULIA)
    const janela = await abrirFolha(usuario)
    const folha = within(janela.getByRole('article', { name: 'Proposta de suplementação' }))
    expect(folha.getByText('Proposta do estágio para avaliação do(a) preceptor(a). Só vale com a assinatura do(a) preceptor(a).')).toBeInTheDocument()
    const assinaturas = within(folha.getByRole('group', { name: 'Assinaturas' }))
    expect(assinaturas.getByText('Estagiário(a)')).toBeInTheDocument()
    expect(assinaturas.getByText('Júlia Martins')).toBeInTheDocument()
    expect(assinaturas.getByText('Preceptor(a)')).toBeInTheDocument()
    expect(assinaturas.getByText('Carla Mendes')).toBeInTheDocument()
  })

  it('CA-583: nutricionista sem nome ou CRN sai com a linha "Nutricionista", nunca "null"', async () => {
    const { usuario } = montar({ suplementos: [vitD] }, { ...ANA, linhaNutricionista: null })
    const janela = await abrirFolha(usuario)
    const folha = janela.getByRole('article', { name: 'Suplementação' })
    expect(within(within(folha).getByRole('group', { name: 'Assinaturas' })).getByText('Nutricionista')).toBeInTheDocument()
    expect(folha.textContent).not.toMatch(/null|undefined/)
  })

  it('CA-583: conta sem situação (administrador): uma linha "Assinatura", sem a frase de estágio', async () => {
    const { usuario } = montar({ suplementos: [vitD] }, { ...ANA, situacao: null, linhaNutricionista: null })
    const janela = await abrirFolha(usuario)
    const folha = within(janela.getByRole('article', { name: 'Suplementação' }))
    expect(within(folha.getByRole('group', { name: 'Assinaturas' })).getByText('Assinatura')).toBeInTheDocument()
    expect(folha.queryByText(/Proposta do estágio/)).not.toBeInTheDocument()
  })
})
