// Spec anamnese-e-prescricoes, US-AP1: a anamnese com roteiro na ficha do paciente.
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CHAVE_ROTEIRO, lerRoteiro, ROTEIRO_PADRAO } from '@/domain/anamnese.ts'
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

function montar(ajuste: Partial<Paciente> = {}, arm = new MemoriaFalsa()) {
  const pacientes = criarRepositorioPacientes(arm, { agora: relogio(), gerarId: () => 'p1' })
  const criado = pacientes.criar('Maria')
  pacientes.salvar({ ...criado, ...ajuste })
  const casos = criarRepositorio(arm, { agora: relogio() })
  const antes = arm.getItem('metanutri:pacientes')
  render(
    <ContextoArmazenamento.Provider value={arm}>
      <ProvedorCasos repositorio={casos}>
        <ProvedorPacientes repositorio={pacientes}>
          <TelaPaciente pacienteId="p1" aoAbrirPlano={vi.fn()} aoNovoPlano={vi.fn()} aoVoltar={vi.fn()} />
        </ProvedorPacientes>
      </ProvedorCasos>
    </ContextoArmazenamento.Provider>,
  )
  return { arm, pacientes, antes, usuario: userEvent.setup() }
}

const anamnese = () => within(screen.getByRole('region', { name: 'Anamnese' }))
const bloco = (titulo: string) => anamnese().getByRole('button', { name: new RegExp(`^${titulo}`) })

describe('Anamnese com roteiro na ficha (US-AP1)', () => {
  it('CA-560: os 8 blocos, em ordem, recolhidos e com o resumo das respostas', () => {
    montar()
    const titulos = ['Objetivo e queixa', 'Rotina e sono', 'Intestino', 'Água', 'Álcool e fumo', 'Atividade física', 'Preferências e aversões', 'Recordatório de 24 horas']
    for (const titulo of titulos) {
      expect(bloco(titulo)).toHaveAttribute('aria-expanded', 'false')
      expect(bloco(titulo)).toHaveTextContent('Sem respostas')
    }
    const nomes = anamnese()
      .getAllByRole('button', { expanded: false })
      .map((b) => b.textContent ?? '')
    expect(nomes.slice(0, 8).map((n) => n.replace('Sem respostas', ''))).toEqual(titulos)
  })

  it('CA-561: o que se escreve fica salvo na ficha na hora e muda a data de alteração', async () => {
    const { pacientes, usuario } = montar()
    const antes = pacientes.obter('p1')?.atualizadoEm ?? ''
    await usuario.click(bloco('Objetivo e queixa'))
    await usuario.type(anamnese().getByLabelText('Queixa principal'), 'Cansaço')
    const salvo = pacientes.obter('p1')
    expect(salvo?.respostasAnamnese).toEqual([{ perguntaId: 'queixa', blocoId: 'objetivo', pergunta: 'Queixa principal', resposta: 'Cansaço' }])
    expect((salvo?.atualizadoEm ?? '') > antes).toBe(true)
    expect(bloco('Objetivo e queixa')).toHaveTextContent('1 de 3 respondida')
  })

  it('CA-562: o recordatório tem um campo de texto por refeição', async () => {
    const { usuario } = montar()
    await usuario.click(bloco('Recordatório de 24 horas'))
    for (const refeicao of ['Ao acordar', 'Café da manhã', 'Lanche da manhã', 'Almoço', 'Lanche da tarde', 'Jantar', 'Ceia']) {
      expect(anamnese().getByLabelText(refeicao).tagName).toBe('TEXTAREA')
    }
  })

  it('CA-563: bloco com resposta já abre aberto', () => {
    montar({ respostasAnamnese: [{ perguntaId: 'agua-dia', blocoId: 'agua', pergunta: 'Quanta água bebe por dia', resposta: '1 litro' }] })
    expect(bloco('Água')).toHaveAttribute('aria-expanded', 'true')
    expect(bloco('Água')).toHaveTextContent('1 de 2 respondida')
    expect(anamnese().getByLabelText('Quanta água bebe por dia')).toHaveValue('1 litro')
    expect(bloco('Intestino')).toHaveAttribute('aria-expanded', 'false')
  })

  it('CA-564: o texto livre de antes aparece inteiro em Observações, aberto, e abrir a ficha não grava nada', () => {
    const { arm, antes } = montar({ anamnese: 'Dorme às 2h.\nNão toma café.', observacoes: 'Vem com a mãe.' })
    expect(bloco('Observações')).toHaveAttribute('aria-expanded', 'true')
    expect(anamnese().getByLabelText('Anotações')).toHaveValue('Dorme às 2h.\nNão toma café.')
    expect(anamnese().getByLabelText('Observações')).toHaveValue('Vem com a mãe.')
    expect(arm.getItem('metanutri:pacientes')).toBe(antes)
  })

  it('CA-569: restrições, condições e medicamentos continuam em Restrições e saúde', () => {
    montar()
    const saude = within(screen.getByRole('region', { name: 'Restrições e saúde' }))
    expect(saude.getByLabelText('Não come ou não pode comer')).toBeInTheDocument()
    expect(saude.getByLabelText('Condições clínicas')).toBeInTheDocument()
    expect(saude.getByLabelText('Medicamentos')).toBeInTheDocument()
  })
})

describe('Editar o roteiro (CA-565 a CA-568)', () => {
  it('CA-565 e CA-566: renomear, acrescentar e tirar; salvar muda a ficha e a resposta da renomeada fica', async () => {
    const { arm, usuario } = montar({ respostasAnamnese: [{ perguntaId: 'agua-dia', blocoId: 'agua', pergunta: 'Quanta água bebe por dia', resposta: '1 litro' }] })
    await usuario.click(anamnese().getByRole('button', { name: 'Editar roteiro' }))
    const janela = within(screen.getByRole('dialog', { name: 'Roteiro da anamnese' }))
    await usuario.click(janela.getByRole('button', { name: /^Água/ }))
    const primeira = janela.getByLabelText('Pergunta 1 de Água')
    await usuario.clear(primeira)
    await usuario.type(primeira, 'Litros de água por dia')
    await usuario.click(janela.getByRole('button', { name: 'Tirar a pergunta 2 de Água' }))
    await usuario.click(janela.getByRole('button', { name: 'Acrescentar pergunta em Água' }))
    await usuario.type(janela.getByLabelText('Pergunta 2 de Água'), 'Chá por dia')
    await usuario.click(janela.getByRole('button', { name: 'Salvar roteiro' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(lerRoteiro(arm).perguntas.agua.map((p) => p.texto)).toEqual(['Litros de água por dia', 'Chá por dia'])
    expect(anamnese().getByLabelText('Litros de água por dia')).toHaveValue('1 litro')
    expect(anamnese().getByLabelText('Chá por dia')).toHaveValue('')
    expect(anamnese().queryByLabelText('Outras bebidas ao longo do dia')).not.toBeInTheDocument()
  })

  it('CA-565: Cancelar descarta o que mudou', async () => {
    const { arm, usuario } = montar()
    await usuario.click(anamnese().getByRole('button', { name: 'Editar roteiro' }))
    const janela = within(screen.getByRole('dialog', { name: 'Roteiro da anamnese' }))
    await usuario.click(janela.getByRole('button', { name: /^Intestino/ }))
    await usuario.click(janela.getByRole('button', { name: 'Tirar a pergunta 1 de Intestino' }))
    await usuario.click(janela.getByRole('button', { name: 'Cancelar' }))
    expect(arm.getItem(CHAVE_ROTEIRO)).toBeNull()
    await usuario.click(bloco('Intestino'))
    expect(anamnese().getByLabelText('Frequência de evacuação')).toBeInTheDocument()
  })

  it('CA-567: voltar ao roteiro padrão e salvar traz as perguntas do MetaNutri', async () => {
    const arm = new MemoriaFalsa()
    arm.setItem(CHAVE_ROTEIRO, JSON.stringify({ formato: 1, blocos: { agua: [{ id: 'x', texto: 'Só esta' }], gestacao: [{ id: 'g', texto: 'Semanas' }] } }))
    const { usuario } = montar({}, arm)
    await usuario.click(anamnese().getByRole('button', { name: 'Editar roteiro' }))
    const janela = within(screen.getByRole('dialog', { name: 'Roteiro da anamnese' }))
    await usuario.click(janela.getByRole('button', { name: 'Voltar ao roteiro padrão' }))
    await usuario.click(janela.getByRole('button', { name: 'Salvar roteiro' }))
    expect(lerRoteiro(arm).perguntas).toEqual(ROTEIRO_PADRAO.perguntas)
    // CA-589: o bloco que esta versão não conhece continua guardado.
    expect(lerRoteiro(arm).outros).toEqual({ gestacao: [{ id: 'g', texto: 'Semanas' }] })
  })

  it('CA-568: a pergunta tirada continua na ficha com a resposta, marcada Fora do roteiro, e pode ser apagada', async () => {
    const arm = new MemoriaFalsa()
    arm.setItem(CHAVE_ROTEIRO, JSON.stringify({ formato: 1, blocos: { 'alcool-fumo': [{ id: 'alcool', texto: 'Bebida alcoólica: o quê e quanto' }] } }))
    const { pacientes, usuario } = montar({ respostasAnamnese: [{ perguntaId: 'fumo', blocoId: 'alcool-fumo', pergunta: 'Fumo', resposta: 'Parou em 2020' }] }, arm)
    expect(bloco('Álcool e fumo')).toHaveAttribute('aria-expanded', 'true')
    const campo = anamnese().getByLabelText('Fumo')
    expect(campo).toHaveValue('Parou em 2020')
    expect(within(campo.closest('div[data-pergunta]') ?? document.body).getByText('Fora do roteiro')).toBeInTheDocument()
    await usuario.clear(campo)
    expect(pacientes.obter('p1')?.respostasAnamnese).toEqual([])
  })
})
