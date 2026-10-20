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
  it('CA-560 e CA-935: os 10 blocos, em ordem, recolhidos e com o resumo das respostas', () => {
    montar()
    const titulos = [
      'Objetivo e queixa',
      'Rotina e sono',
      'Intestino',
      'Água',
      'Álcool e fumo',
      'Atividade física',
      'Preferências e aversões',
      'Intolerâncias e alergias',
      'Gestação',
      'Recordatório de 24 horas',
    ]
    for (const titulo of titulos) {
      expect(bloco(titulo)).toHaveAttribute('aria-expanded', 'false')
      expect(bloco(titulo)).toHaveTextContent('Sem respostas')
    }
    const nomes = anamnese()
      .getAllByRole('button', { expanded: false })
      .map((b) => b.textContent ?? '')
    expect(nomes.slice(0, 10).map((n) => n.replace('Sem respostas', ''))).toEqual(titulos)
  })

  it('CA-561: o que se escreve fica salvo na ficha na hora e muda a data de alteração', async () => {
    const { pacientes, usuario } = montar()
    const antes = pacientes.obter('p1')?.atualizadoEm ?? ''
    await usuario.click(bloco('Objetivo e queixa'))
    await usuario.type(anamnese().getByLabelText('Queixa principal'), 'Cansaço')
    const salvo = pacientes.obter('p1')
    expect(salvo?.respostasAnamnese).toEqual([{ perguntaId: 'queixa', blocoId: 'objetivo', pergunta: 'Queixa principal', resposta: 'Cansaço' }])
    expect((salvo?.atualizadoEm ?? '') > antes).toBe(true)
    expect(bloco('Objetivo e queixa')).toHaveTextContent('1 de 5 respondida')
  })

  it('seção 2: a consistência das fezes mostra a dica da escala de Bristol', async () => {
    const { usuario } = montar()
    await usuario.click(bloco('Intestino'))
    expect(anamnese().getByLabelText('Consistência das fezes')).toHaveAccessibleDescription('Escala de Bristol: de 1 (bolinhas duras) a 7 (líquida); 3 e 4 são o esperado.')
  })

  it('CA-562: o recordatório tem um campo de texto por refeição', async () => {
    const { usuario } = montar()
    await usuario.click(bloco('Recordatório de 24 horas'))
    for (const refeicao of ['Ao acordar', 'Café da manhã', 'Lanche da manhã', 'Almoço', 'Lanche da tarde', 'Jantar', 'Ceia']) {
      expect(anamnese().getByLabelText(refeicao).tagName).toBe('TEXTAREA')
    }
  })

  it('CA-563: todo bloco começa recolhido, com o resumo à vista; Abrir tudo e Recolher tudo', async () => {
    const { usuario } = montar({ respostasAnamnese: [{ perguntaId: 'agua-dia', blocoId: 'agua', pergunta: 'Quanta água bebe por dia', resposta: '1 litro' }] })
    expect(bloco('Água')).toHaveAttribute('aria-expanded', 'false')
    expect(bloco('Água')).toHaveTextContent('1 de 3 respondida')
    await usuario.click(anamnese().getByRole('button', { name: 'Abrir tudo' }))
    for (const titulo of ['Objetivo e queixa', 'Água', 'Recordatório de 24 horas', 'Outras anotações']) expect(bloco(titulo)).toHaveAttribute('aria-expanded', 'true')
    expect(anamnese().getByLabelText('Quanta água bebe por dia')).toHaveValue('1 litro')
    await usuario.click(anamnese().getByRole('button', { name: 'Recolher tudo' }))
    for (const titulo of ['Objetivo e queixa', 'Água', 'Outras anotações']) expect(bloco(titulo)).toHaveAttribute('aria-expanded', 'false')
    // Um bloco aberto à mão: ainda falta abrir os outros.
    await usuario.click(bloco('Intestino'))
    expect(anamnese().getByRole('button', { name: 'Abrir tudo' })).toBeInTheDocument()
  })

  it('CA-564: o texto livre de antes aparece inteiro em Outras anotações, como "Anamnese de antes", e abrir a ficha não grava nada', async () => {
    const { arm, antes, usuario } = montar({ anamnese: 'Dorme às 2h.\nNão toma café.', observacoes: 'Vem com a mãe.' })
    expect(bloco('Outras anotações')).toHaveTextContent('Com anotações')
    await usuario.click(bloco('Outras anotações'))
    expect(anamnese().getByLabelText('Anamnese de antes')).toHaveValue('Dorme às 2h.\nNão toma café.')
    expect(anamnese().getByLabelText('Observações')).toHaveValue('Vem com a mãe.')
    expect(arm.getItem('metanutri:pacientes')).toBe(antes)
  })

  it('CA-564: sem texto de antes, o bloco tem só Observações', async () => {
    const { usuario } = montar()
    expect(bloco('Outras anotações')).toHaveTextContent('Sem anotações')
    await usuario.click(bloco('Outras anotações'))
    expect(anamnese().queryByLabelText('Anamnese de antes')).not.toBeInTheDocument()
    expect(anamnese().getByLabelText('Observações')).toHaveValue('')
  })

  it('CA-569: restrições, condições e medicamentos continuam em Restrições e saúde', () => {
    montar()
    const saude = within(screen.getByRole('region', { name: 'Restrições e saúde' }))
    expect(saude.getByLabelText('Não come ou não pode comer')).toBeInTheDocument()
    expect(saude.getByLabelText('Condições clínicas')).toBeInTheDocument()
    expect(saude.getByLabelText('Medicamentos')).toBeInTheDocument()
  })
})

describe('Perguntas de escolha (spec conduta-da-nutricionista, D-299)', () => {
  const ORDEM = ['1 · Quase transparente', '2 · Amarelo muito claro', '3 · Amarelo-claro', '4 · Amarelo', '5 · Amarelo-escuro', '6 · Âmbar', '7 · Âmbar-escuro', '8 · Marrom']

  it('CA-934: a cor da urina tem as 8 cores em ordem, com número e nome, e a dica de Armstrong', async () => {
    const { usuario } = montar()
    await usuario.click(bloco('Água'))
    const escala = anamnese().getByRole('radiogroup', { name: 'Cor da urina' })
    expect(escala).toHaveAccessibleDescription('Escala de Armstrong: de 1 (quase transparente) a 8 (marrom); de 1 a 3, boa hidratação.')
    const opcoes = within(escala).getAllByRole('radio')
    expect(opcoes.map((o) => o.getAttribute('aria-label'))).toEqual(ORDEM)
    // A cor sozinha não diz nada: número e nome também estão escritos.
    expect(opcoes[2]).toHaveTextContent('3')
    expect(opcoes[2]).toHaveTextContent('Amarelo-claro')
    for (const opcao of opcoes) expect(opcao).toHaveAttribute('aria-checked', 'false')
  })

  it('CA-934 e CA-937: escolher grava na ficha "3 · Amarelo-claro"; tocar de novo apaga', async () => {
    const { pacientes, usuario } = montar()
    await usuario.click(bloco('Água'))
    const escala = anamnese().getByRole('radiogroup', { name: 'Cor da urina' })
    await usuario.click(within(escala).getByRole('radio', { name: '3 · Amarelo-claro' }))
    expect(pacientes.obter('p1')?.respostasAnamnese).toEqual([{ perguntaId: 'cor-da-urina', blocoId: 'agua', pergunta: 'Cor da urina', resposta: '3 · Amarelo-claro' }])
    expect(within(escala).getByRole('radio', { name: '3 · Amarelo-claro' })).toHaveAttribute('aria-checked', 'true')
    expect(bloco('Água')).toHaveTextContent('1 de 3 respondida')
    await usuario.click(within(escala).getByRole('radio', { name: '6 · Âmbar' }))
    expect(pacientes.obter('p1')?.respostasAnamnese[0]?.resposta).toBe('6 · Âmbar')
    await usuario.click(within(escala).getByRole('radio', { name: '6 · Âmbar' }))
    expect(pacientes.obter('p1')?.respostasAnamnese).toEqual([])
  })

  it('CA-938: as opções têm 44 px de toque e quebram em duas linhas de 4 no celular', async () => {
    const { usuario } = montar()
    await usuario.click(bloco('Água'))
    const escala = anamnese().getByRole('radiogroup', { name: 'Cor da urina' })
    expect(escala).toHaveClass('grid-cols-4', 'sm:grid-cols-8')
    for (const opcao of within(escala).getAllByRole('radio')) expect(opcao).toHaveClass('min-h-11')
  })

  it('CB-297: resposta que não é da escala aparece num campo de texto, para nada sumir', async () => {
    const { usuario } = montar({ respostasAnamnese: [{ perguntaId: 'cor-da-urina', blocoId: 'agua', pergunta: 'Cor da urina', resposta: 'clara' }] })
    await usuario.click(bloco('Água'))
    expect(anamnese().queryByRole('radiogroup', { name: 'Cor da urina' })).not.toBeInTheDocument()
    expect(anamnese().getByLabelText('Cor da urina')).toHaveValue('clara')
  })

  it('CA-935: Gestação tem o trimestre de escolha única e as anotações; Intolerâncias e alergias, dois campos', async () => {
    const { pacientes, usuario } = montar()
    await usuario.click(bloco('Gestação'))
    const trimestre = anamnese().getByRole('radiogroup', { name: 'Trimestre' })
    expect(within(trimestre).getAllByRole('radio').map((o) => o.textContent)).toEqual(['Não gestante', '1º trimestre', '2º trimestre', '3º trimestre'])
    await usuario.click(within(trimestre).getByRole('radio', { name: '2º trimestre' }))
    expect(within(trimestre).getByRole('radio', { name: '2º trimestre' })).toHaveAttribute('aria-checked', 'true')
    expect(pacientes.obter('p1')?.respostasAnamnese).toEqual([{ perguntaId: 'gestacao-trimestre', blocoId: 'gestacao', pergunta: 'Trimestre', resposta: '2º trimestre' }])
    for (const opcao of within(trimestre).getAllByRole('radio')) expect(opcao).toHaveClass('min-h-11')
    expect(anamnese().getByLabelText('Anotações da gestação').tagName).toBe('TEXTAREA')

    await usuario.click(bloco('Intolerâncias e alergias'))
    expect(anamnese().getByLabelText('Intolerâncias alimentares').tagName).toBe('TEXTAREA')
    expect(anamnese().getByLabelText('Alergias alimentares')).toHaveAccessibleDescription('Para o cobrir não sugerir o alimento, escreva-o também em Restrições e saúde.')
  })

  it('CA-939: na janela do roteiro, os 10 blocos, e a pergunta de escolha se renomeia como as outras', async () => {
    const { arm, usuario } = montar()
    await usuario.click(anamnese().getByRole('button', { name: 'Editar roteiro' }))
    const janela = within(screen.getByRole('dialog', { name: 'Roteiro da anamnese' }))
    for (const titulo of ['Intolerâncias e alergias', 'Gestação']) expect(janela.getByRole('button', { name: new RegExp(`^${titulo}`) })).toBeInTheDocument()
    await usuario.click(janela.getByRole('button', { name: /^Água/ }))
    const urina = janela.getByLabelText('Pergunta 2 de Água')
    expect(urina).toHaveValue('Cor da urina')
    await usuario.clear(urina)
    await usuario.type(urina, 'Cor do xixi')
    await usuario.click(janela.getByRole('button', { name: 'Salvar roteiro' }))
    expect(lerRoteiro(arm).perguntas.agua[1]).toEqual({ id: 'cor-da-urina', texto: 'Cor do xixi' })
    await usuario.click(bloco('Água'))
    expect(anamnese().getByRole('radiogroup', { name: 'Cor do xixi' })).toBeInTheDocument()
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
    await usuario.click(janela.getByRole('button', { name: 'Tirar a pergunta 3 de Água' }))
    await usuario.click(janela.getByRole('button', { name: 'Acrescentar pergunta em Água' }))
    await usuario.type(janela.getByLabelText('Pergunta 3 de Água'), 'Chá por dia')
    await usuario.click(janela.getByRole('button', { name: 'Salvar roteiro' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(lerRoteiro(arm).perguntas.agua.map((p) => p.texto)).toEqual(['Litros de água por dia', 'Cor da urina', 'Chá por dia'])
    expect(anamnese().getByLabelText('Litros de água por dia')).toHaveValue('1 litro')
    expect(anamnese().getByLabelText('Chá por dia')).toHaveValue('')
    expect(anamnese().queryByLabelText('Outras bebidas ao longo do dia')).not.toBeInTheDocument()
  })

  it('CA-565: a janela abre com o roteiro salvo mais recente, mesmo o salvo em outra aba depois que a ficha abriu', async () => {
    const { arm, usuario } = montar()
    arm.setItem(CHAVE_ROTEIRO, JSON.stringify({ formato: 1, versao: 2, blocos: { agua: [{ id: 'x', texto: 'Salva em outra aba' }] } }))
    await usuario.click(anamnese().getByRole('button', { name: 'Editar roteiro' }))
    const janela = within(screen.getByRole('dialog', { name: 'Roteiro da anamnese' }))
    await usuario.click(janela.getByRole('button', { name: /^Água/ }))
    expect(janela.getByRole('textbox', { name: 'Pergunta 1 de Água' })).toHaveValue('Salva em outra aba')
    expect(janela.queryByRole('textbox', { name: 'Pergunta 2 de Água' })).not.toBeInTheDocument()
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
    arm.setItem(CHAVE_ROTEIRO, JSON.stringify({ formato: 1, blocos: { agua: [{ id: 'x', texto: 'Só esta' }], especialidade: [{ id: 'g', texto: 'Semanas' }] } }))
    const { usuario } = montar({}, arm)
    await usuario.click(anamnese().getByRole('button', { name: 'Editar roteiro' }))
    const janela = within(screen.getByRole('dialog', { name: 'Roteiro da anamnese' }))
    await usuario.click(janela.getByRole('button', { name: 'Voltar ao roteiro padrão' }))
    await usuario.click(janela.getByRole('button', { name: 'Salvar roteiro' }))
    expect(lerRoteiro(arm).perguntas).toEqual(ROTEIRO_PADRAO.perguntas)
    // CA-589: o bloco que esta versão não conhece continua guardado.
    expect(lerRoteiro(arm).outros).toEqual({ especialidade: [{ id: 'g', texto: 'Semanas' }] })
  })

  it('CA-568: a pergunta tirada continua na ficha com a resposta, marcada Fora do roteiro, e pode ser apagada', async () => {
    const arm = new MemoriaFalsa()
    arm.setItem(CHAVE_ROTEIRO, JSON.stringify({ formato: 1, blocos: { 'alcool-fumo': [{ id: 'alcool', texto: 'Bebida alcoólica: o quê e quanto' }] } }))
    const { pacientes, usuario } = montar({ respostasAnamnese: [{ perguntaId: 'fumo', blocoId: 'alcool-fumo', pergunta: 'Fumo', resposta: 'Parou em 2020' }] }, arm)
    expect(bloco('Álcool e fumo')).toHaveTextContent('1 de 2 respondida')
    await usuario.click(bloco('Álcool e fumo'))
    const campo = anamnese().getByLabelText('Fumo')
    expect(campo).toHaveValue('Parou em 2020')
    expect(within(campo.closest('div[data-pergunta]') ?? document.body).getByText('Fora do roteiro')).toBeInTheDocument()
    await usuario.clear(campo)
    expect(pacientes.obter('p1')?.respostasAnamnese).toEqual([])
  })
})
