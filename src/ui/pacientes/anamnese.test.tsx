// A ficha única na tela (spec ficha-unica, US-FU2 e US-FU3; spec anamnese-e-prescricoes, US-AP1).
import { cleanup, render, screen, within } from '@testing-library/react'
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

/** 21/10/2026, meio-dia: as idades e as semanas dos testes são as deste dia. */
const AGORA = new Date(2026, 9, 21, 12, 0, 0)

const HOMEM_35: Partial<Paciente> = { sexo: 'M', nascimento: '1991-03-10' }
const MULHER_28: Partial<Paciente> = { sexo: 'F', nascimento: '1998-01-10' }
const GESTANTE_28: Partial<Paciente> = { ...MULHER_28, momentoDeVida: { tipo: 'gestante', semanas: 24, semanasEm: '2026-10-21', pesoPreGestacionalKg: 60 } }
const MENINA_6: Partial<Paciente> = { sexo: 'F', nascimento: '2020-05-01' }
const MULHER_68: Partial<Paciente> = { sexo: 'F', nascimento: '1958-02-01' }

function montar(ajuste: Partial<Paciente> = HOMEM_35, opcoes: { readonly arm?: MemoriaFalsa; readonly comPlano?: boolean } = {}) {
  const arm = opcoes.arm ?? new MemoriaFalsa()
  const pacientes = criarRepositorioPacientes(arm, { agora: relogio(), gerarId: () => 'p1' })
  const criado = pacientes.criar('Maria')
  pacientes.salvar({ ...criado, ...ajuste })
  const casos = criarRepositorio(arm, { agora: relogio() })
  if (opcoes.comPlano) {
    const plano = casos.criar('Maria')
    casos.salvar({ ...plano, caso: { ...plano.caso, pacienteId: 'p1', dataConsulta: '2026-09-10', pesoKg: 82 } })
  }
  const antes = arm.getItem('metanutri:pacientes')
  render(
    <ContextoArmazenamento.Provider value={arm}>
      <ProvedorCasos repositorio={casos}>
        <ProvedorPacientes repositorio={pacientes}>
          <TelaPaciente pacienteId="p1" aoAbrirPlano={vi.fn()} aoNovoPlano={vi.fn()} aoVoltar={vi.fn()} agora={AGORA} />
        </ProvedorPacientes>
      </ProvedorCasos>
    </ContextoArmazenamento.Provider>,
  )
  return { arm, pacientes, antes, usuario: userEvent.setup() }
}

const anamnese = () => within(screen.getByRole('region', { name: 'Anamnese' }))
const bloco = (titulo: string) => anamnese().getByRole('button', { name: new RegExp(`^${titulo}`) })
const titulos = () =>
  anamnese()
    .getAllByRole('button', { expanded: false })
    .map((b) => b.querySelector('span > span')?.textContent ?? '')
const dados = () => within(screen.getByRole('heading', { name: 'Dados do paciente' }).closest('[data-slot="card"]') as HTMLElement)

describe('Os blocos para cada pessoa (CA-1047 a CA-1052)', () => {
  it('CA-1047 e CA-1048: homem de 35 anos, na ordem do PCN, sem gestação, saúde da mulher, infância e pessoa idosa', () => {
    montar(HOMEM_35)
    expect(titulos()).toEqual([
      'Motivo da consulta',
      'Saúde',
      'Digestão',
      'Rotina e sono',
      'Atividade física',
      'Hidratação',
      'Álcool e tabagismo',
      'Alimentação',
      'Recordatório de 24 horas',
      'Exames recentes',
      'Outras anotações',
    ])
    expect(dados().queryByRole('radiogroup', { name: 'Gestação ou lactação' })).not.toBeInTheDocument()
    expect(dados().getByLabelText('Ocupação')).toBeInTheDocument()
    expect(dados().queryByLabelText('Responsável')).not.toBeInTheDocument()
  })

  it('CA-1049: mulher de 28 anos gestante tem Gestação, e não Saúde da mulher', () => {
    montar(GESTANTE_28)
    const blocos = titulos()
    expect(blocos).toContain('Gestação')
    for (const fora of ['Lactação', 'Saúde da mulher', 'Infância', 'Pessoa idosa']) expect(blocos).not.toContain(fora)
    expect(dados().getByRole('radio', { name: 'Gestante' })).toHaveAttribute('aria-checked', 'true')
  })

  it('CA-1050: menina de 6 anos tem Infância, Escola e ano e Responsável, e não Álcool nem Gestação', async () => {
    const { usuario } = montar(MENINA_6)
    const blocos = titulos()
    expect(blocos).toContain('Infância')
    for (const fora of ['Álcool e tabagismo', 'Gestação', 'Lactação', 'Saúde da mulher', 'Pessoa idosa']) expect(blocos).not.toContain(fora)
    expect(dados().getByLabelText('Escola e ano')).toBeInTheDocument()
    expect(dados().getByLabelText('Responsável')).toBeInTheDocument()
    expect(dados().queryByRole('radiogroup', { name: 'Gestação ou lactação' })).not.toBeInTheDocument()
    await usuario.click(bloco('Rotina e sono'))
    expect(anamnese().getByLabelText('Tempo de tela por dia')).toBeInTheDocument()
  })

  it('CA-1051: mulher de 68 anos tem Saúde da mulher e Pessoa idosa; a mastigação lembra prótese e engasgos', async () => {
    const { usuario } = montar(MULHER_68)
    const blocos = titulos()
    expect(blocos).toContain('Saúde da mulher')
    expect(blocos).toContain('Pessoa idosa')
    for (const fora of ['Gestação', 'Lactação', 'Infância']) expect(blocos).not.toContain(fora)
    expect(dados().queryByRole('radiogroup', { name: 'Gestação ou lactação' })).not.toBeInTheDocument()
    await usuario.click(bloco('Digestão'))
    expect(anamnese().getByLabelText('Mastigação e deglutição')).toHaveAccessibleDescription('Prótese, dificuldade para mastigar ou engasgos.')
  })

  it('CA-1052: sem sexo ou sem data de nascimento, só os blocos de todos e a frase', () => {
    montar({ sexo: 'F', nascimento: null })
    expect(screen.getByText('Preencha sexo e data de nascimento para ver as perguntas da fase de vida.')).toBeInTheDocument()
    expect(titulos()).not.toContain('Álcool e tabagismo')
  })

  it('CA-1053: bloco fora da regra com resposta fica à vista, com o aviso; "Não gestante" antigo não segura o bloco', async () => {
    const { usuario } = montar({
      ...HOMEM_35,
      respostasAnamnese: [
        { perguntaId: 'gestacao-enjoo', blocoId: 'gestacao', pergunta: 'Náusea ou vômito', resposta: 'Sim' },
        { perguntaId: 'gestacao-trimestre', blocoId: 'gestacao', pergunta: 'Trimestre', resposta: 'Não gestante' },
      ],
    })
    await usuario.click(bloco('Gestação'))
    expect(anamnese().getByText('Este bloco vale só para gestante. As respostas continuam guardadas.')).toBeInTheDocument()
    cleanup()
    montar({ ...HOMEM_35, respostasAnamnese: [{ perguntaId: 'gestacao-trimestre', blocoId: 'gestacao', pergunta: 'Trimestre', resposta: 'Não gestante' }] })
    expect(titulos()).not.toContain('Gestação')
  })

  it('CA-1064: com um plano, o Retorno vem antes de todos', () => {
    montar(HOMEM_35, { comPlano: true })
    expect(titulos()[0]).toBe('Retorno')
  })
})

describe('Gestação ou lactação na ficha (CA-1038 a CA-1040)', () => {
  it('CA-1039: as semanas informadas antes avançam sozinhas', () => {
    montar({ ...MULHER_28, momentoDeVida: { tipo: 'gestante', semanas: 20, semanasEm: '2026-09-23', pesoPreGestacionalKg: 60 } })
    expect(dados().getByLabelText('Idade gestacional')).toHaveValue('24')
    expect(dados().getByLabelText('Idade gestacional')).toHaveAccessibleDescription('Avança sozinha a cada semana.')
  })

  it('CA-1039: marcar Gestante e escrever as semanas guarda o dia de hoje', async () => {
    const { pacientes, usuario } = montar(MULHER_28)
    await usuario.click(dados().getByRole('radio', { name: 'Gestante' }))
    await usuario.type(dados().getByLabelText('Idade gestacional'), '24')
    expect(pacientes.obter('p1')?.momentoDeVida).toEqual({ tipo: 'gestante', semanas: 24, semanasEm: '2026-10-21', pesoPreGestacionalKg: null })
  })

  it('CA-1040: lactante pede a data do parto e a amamentação e mostra os meses', async () => {
    const { pacientes, usuario } = montar({ ...MULHER_28, momentoDeVida: { tipo: 'lactante', dataDoParto: '2026-07-21', amamentacao: null } })
    expect(dados().getByLabelText('Data do parto')).toHaveAccessibleDescription('3 meses após o parto.')
    await usuario.click(dados().getByRole('radio', { name: 'Só no peito' }))
    expect(pacientes.obter('p1')?.momentoDeVida).toEqual({ tipo: 'lactante', dataDoParto: '2026-07-21', amamentacao: 'exclusiva' })
  })

  it('CB-341: dado fora da regra fica à vista, com o aviso', () => {
    montar({ ...HOMEM_35, momentoDeVida: { tipo: 'gestante', semanas: 10, semanasEm: '2026-10-01', pesoPreGestacionalKg: null } })
    expect(dados().getByText('Gestação e lactação valem para o sexo feminino de 14 a 50 anos. Confira o sexo e a data de nascimento.')).toBeInTheDocument()
  })
})

describe('Cada dado uma vez (CA-1046, CA-1054 a CA-1059)', () => {
  it('CA-1054 e CA-1055: objetivo, suplementos, medicamentos, doenças e alergias aparecem uma vez; a prescrição é "Suplementação prescrita"', () => {
    montar(MULHER_28)
    for (const rotulo of ['Objetivo do paciente', 'Suplementos em uso', 'Medicamentos em uso', 'Doenças e diagnósticos', 'Alergias', 'Ocupação']) {
      expect(screen.getAllByText(rotulo), rotulo).toHaveLength(1)
    }
    expect(screen.queryByText('Objetivo')).not.toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Restrições e saúde' })).not.toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Suplementação prescrita' })).toBeInTheDocument()
    expect(anamnese().getByLabelText('Suplementos em uso')).toHaveAccessibleDescription('O que o paciente já toma. A suplementação que você prescreve fica em Conduta.')
    expect(screen.getByRole('heading', { name: 'Conduta' })).toBeInTheDocument()
  })

  it('CA-561 e CA-1065: a resposta fica salva na hora, com o dia, e o resumo conta o campo da ficha', async () => {
    const { pacientes, usuario } = montar(HOMEM_35)
    const antes = pacientes.obter('p1')?.atualizadoEm ?? ''
    await usuario.click(bloco('Motivo da consulta'))
    await usuario.type(anamnese().getByLabelText('Queixa principal'), 'Cansaço')
    const salvo = pacientes.obter('p1')
    expect(salvo?.respostasAnamnese).toEqual([{ perguntaId: 'queixa', blocoId: 'motivo', pergunta: 'Queixa principal', resposta: 'Cansaço', respondidaEm: '2026-10-21' }])
    expect((salvo?.atualizadoEm ?? '') > antes).toBe(true)
    expect(bloco('Motivo da consulta')).toHaveTextContent('1 de 4 respondida · 21/10/2026')
    await usuario.type(anamnese().getByLabelText('Objetivo do paciente'), 'Ganhar disposição')
    expect(pacientes.obter('p1')?.objetivo).toBe('Ganhar disposição')
    expect(bloco('Motivo da consulta')).toHaveTextContent('2 de 4 respondidas')
  })

  it('CA-1056: doenças em escolhas, com Outros diagnósticos; a síndrome dos ovários policísticos só para o sexo feminino', async () => {
    const { pacientes, usuario } = montar({ ...HOMEM_35, condicoesClinicas: 'Gastrite' })
    await usuario.click(bloco('Saúde'))
    const doencas = anamnese().getByRole('group', { name: 'Doenças e diagnósticos' })
    expect(within(doencas).queryByRole('checkbox', { name: 'Síndrome dos ovários policísticos' })).not.toBeInTheDocument()
    await usuario.click(within(doencas).getByRole('checkbox', { name: 'Hipertensão' }))
    expect(pacientes.obter('p1')?.doencas).toEqual(['hipertensao'])
    expect(within(doencas).getByRole('checkbox', { name: 'Hipertensão' })).toHaveAttribute('aria-checked', 'true')
    expect(anamnese().getByLabelText('Outros diagnósticos')).toHaveValue('Gastrite')
  })

  it('CA-1057: alergias, intolerâncias e escolhas marcadas; o texto de antes em Outros alimentos; a doença celíaca avisa', async () => {
    const { pacientes, usuario } = montar({ ...MULHER_28, restricoes: 'camarão', doencas: ['celiaca'] })
    await usuario.click(bloco('Alimentação'))
    await usuario.click(within(anamnese().getByRole('group', { name: 'Alergias' })).getByRole('checkbox', { name: 'Leite e derivados' }))
    await usuario.click(within(anamnese().getByRole('group', { name: 'Intolerâncias' })).getByRole('checkbox', { name: 'Lactose' }))
    await usuario.click(within(anamnese().getByRole('group', { name: 'Não come por escolha' })).getByRole('checkbox', { name: 'Vegetariano' }))
    expect(pacientes.obter('p1')?.restricoesMarcadas).toEqual(['leite', 'lactose', 'vegetariano'])
    expect(anamnese().getByLabelText('Outros alimentos que não come')).toHaveValue('camarão')
    expect(anamnese().getByLabelText('Outros alimentos que não come')).toHaveAccessibleDescription('Um por linha. Esses alimentos não aparecem nas sugestões nem no Cobrir.')
    expect(anamnese().getByText('A doença celíaca, marcada em Saúde, já tira o glúten das sugestões.')).toBeInTheDocument()
  })

  it('CA-1058: óleo, sal e açúcar por pessoa por dia', async () => {
    const { usuario } = montar({ ...HOMEM_35, pessoasNaCasa: 4 })
    await usuario.click(bloco('Alimentação'))
    await usuario.type(anamnese().getByLabelText('Óleo'), '0,9')
    await usuario.type(anamnese().getByLabelText('Sal'), '1')
    await usuario.type(anamnese().getByLabelText('Açúcar'), '1')
    expect(anamnese().getByText('≈ 8 ml de óleo, 8 g de sal e 8 g de açúcar por pessoa por dia.')).toBeInTheDocument()
  })

  it('CA-1059: exames recentes, com adicionar e tirar', async () => {
    const { pacientes, usuario } = montar(HOMEM_35)
    await usuario.click(bloco('Exames recentes'))
    await usuario.click(anamnese().getByRole('button', { name: 'Adicionar exame' }))
    const exame = within(anamnese().getByRole('group', { name: 'Exame 1' }))
    await usuario.type(exame.getByLabelText('Exame'), 'Ferritina')
    await usuario.type(exame.getByLabelText('Valor'), '12 ng/mL')
    expect(pacientes.obter('p1')?.examesRecentes).toMatchObject([{ exame: 'Ferritina', valor: '12 ng/mL' }])
    expect(bloco('Exames recentes')).toHaveTextContent('1 exame')
    await usuario.click(anamnese().getByRole('button', { name: 'Tirar o exame 1' }))
    expect(pacientes.obter('p1')?.examesRecentes).toEqual([])
  })

  it('CA-564: a anamnese anterior aparece em Outras anotações, e abrir a ficha não grava nada', async () => {
    const { arm, antes, usuario } = montar({ ...HOMEM_35, anamnese: 'Dorme às 2h.', observacoes: 'Vem com a mãe.' })
    expect(bloco('Outras anotações')).toHaveTextContent('Com anotações')
    await usuario.click(bloco('Outras anotações'))
    expect(anamnese().getByLabelText('Anamnese anterior')).toHaveValue('Dorme às 2h.')
    expect(anamnese().getByLabelText('Outras anotações')).toHaveValue('Vem com a mãe.')
    expect(arm.getItem('metanutri:pacientes')).toBe(antes)
  })
})

describe('Perguntas de escolha (CA-1062, CA-1063, CA-934)', () => {
  it('CA-1062: com "Não" em Prática de exercício, só ela fica', async () => {
    const { usuario } = montar(HOMEM_35)
    await usuario.click(bloco('Atividade física'))
    await usuario.click(within(anamnese().getByRole('radiogroup', { name: 'Prática de exercício' })).getByRole('radio', { name: 'Não' }))
    expect(anamnese().queryByLabelText('Vezes por semana')).not.toBeInTheDocument()
    await usuario.click(within(anamnese().getByRole('radiogroup', { name: 'Prática de exercício' })).getByRole('radio', { name: 'Sim' }))
    expect(anamnese().getByLabelText('Vezes por semana')).toBeInTheDocument()
  })

  it('CA-1063: a consistência das fezes é a escala de Bristol, de escolha única, com a dica', async () => {
    const { pacientes, usuario } = montar(HOMEM_35)
    await usuario.click(bloco('Digestão'))
    const bristol = anamnese().getByRole('radiogroup', { name: 'Consistência das fezes' })
    expect(within(bristol).getAllByRole('radio')).toHaveLength(7)
    await usuario.click(within(bristol).getByRole('radio', { name: '4 · Salsicha lisa e macia' }))
    expect(pacientes.obter('p1')?.respostasAnamnese[0]?.resposta).toBe('4 · Salsicha lisa e macia')
  })

  it('CA-934: a cor da urina grava "3 · Amarelo-claro"; tocar de novo apaga', async () => {
    const { pacientes, usuario } = montar(HOMEM_35)
    await usuario.click(bloco('Hidratação'))
    const escala = anamnese().getByRole('radiogroup', { name: 'Cor da urina' })
    expect(escala).toHaveAccessibleDescription('Escala de Armstrong: de 1 (quase incolor) a 8 (marrom); de 1 a 3, boa hidratação.')
    await usuario.click(within(escala).getByRole('radio', { name: '3 · Amarelo-claro' }))
    expect(pacientes.obter('p1')?.respostasAnamnese[0]).toMatchObject({ perguntaId: 'cor-da-urina', blocoId: 'agua', resposta: '3 · Amarelo-claro' })
    await usuario.click(within(escala).getByRole('radio', { name: '3 · Amarelo-claro' }))
    expect(pacientes.obter('p1')?.respostasAnamnese).toEqual([])
  })

  it('CB-297: resposta que não é da escala aparece num campo de texto', async () => {
    const { usuario } = montar({ ...HOMEM_35, respostasAnamnese: [{ perguntaId: 'cor-da-urina', blocoId: 'agua', pergunta: 'Cor da urina', resposta: 'clara' }] })
    await usuario.click(bloco('Hidratação'))
    expect(anamnese().queryByRole('radiogroup', { name: 'Cor da urina' })).not.toBeInTheDocument()
    expect(anamnese().getByLabelText('Cor da urina')).toHaveValue('clara')
  })

  it('CA-1061: a resposta antiga de alergia aparece em Alimentação, fora do roteiro', async () => {
    const { usuario } = montar({ ...HOMEM_35, respostasAnamnese: [{ perguntaId: 'alergias-alimentares', blocoId: 'intolerancias', pergunta: 'Alergias alimentares', resposta: 'Camarão' }] })
    await usuario.click(bloco('Alimentação'))
    const campo = anamnese().getByLabelText('Alergias alimentares')
    expect(campo).toHaveValue('Camarão')
    expect(within(campo.closest('div[data-pergunta]') ?? document.body).getByText('Fora do roteiro')).toBeInTheDocument()
  })
})

describe('Abrir, recolher e editar o roteiro (CA-563, CA-565 a CA-568, CA-1060)', () => {
  it('CA-563: Abrir tudo e Recolher tudo', async () => {
    const { usuario } = montar(HOMEM_35)
    await usuario.click(anamnese().getByRole('button', { name: 'Abrir tudo' }))
    for (const titulo of ['Motivo da consulta', 'Hidratação', 'Exames recentes', 'Outras anotações']) expect(bloco(titulo)).toHaveAttribute('aria-expanded', 'true')
    await usuario.click(anamnese().getByRole('button', { name: 'Recolher tudo' }))
    expect(bloco('Hidratação')).toHaveAttribute('aria-expanded', 'false')
  })

  it('CA-1060: a janela mostra a regra de cada bloco e os campos da ficha; renomear, tirar e adicionar', async () => {
    const { arm, usuario } = montar({ ...HOMEM_35, respostasAnamnese: [{ perguntaId: 'agua-dia', blocoId: 'agua', pergunta: 'Água por dia', resposta: '1 litro' }] })
    await usuario.click(anamnese().getByRole('button', { name: 'Editar roteiro' }))
    const janela = within(screen.getByRole('dialog', { name: 'Roteiro da anamnese' }))
    expect(janela.getByRole('button', { name: /^Gestação/ })).toHaveTextContent('Só gestante')
    expect(janela.getByRole('button', { name: /^Pessoa idosa/ })).toHaveTextContent('A partir de 60 anos')
    await usuario.click(janela.getByRole('button', { name: /^Alimentação/ }))
    expect(janela.getByText(/Campos da ficha, sempre presentes: Alergias/)).toBeInTheDocument()
    await usuario.click(janela.getByRole('button', { name: /^Hidratação/ }))
    const primeira = janela.getByLabelText('Pergunta 1 de Hidratação')
    await usuario.clear(primeira)
    await usuario.type(primeira, 'Litros de água por dia')
    await usuario.click(janela.getByRole('button', { name: 'Tirar a pergunta 3 de Hidratação' }))
    await usuario.click(janela.getByRole('button', { name: 'Adicionar pergunta em Hidratação' }))
    await usuario.type(janela.getByLabelText('Pergunta 3 de Hidratação'), 'Chá por dia')
    await usuario.click(janela.getByRole('button', { name: 'Salvar roteiro' }))
    expect(lerRoteiro(arm).perguntas.agua.map((p) => p.texto)).toEqual(['Litros de água por dia', 'Cor da urina', 'Chá por dia'])
    await usuario.click(bloco('Hidratação'))
    expect(anamnese().getByLabelText('Litros de água por dia')).toHaveValue('1 litro')
  })

  it('CA-565: a janela abre com o roteiro salvo mais recente; Cancelar descarta', async () => {
    const { arm, usuario } = montar(HOMEM_35)
    arm.setItem(CHAVE_ROTEIRO, JSON.stringify({ formato: 1, versao: 3, blocos: { agua: [{ id: 'x', texto: 'Salva em outra aba' }] } }))
    await usuario.click(anamnese().getByRole('button', { name: 'Editar roteiro' }))
    const janela = within(screen.getByRole('dialog', { name: 'Roteiro da anamnese' }))
    await usuario.click(janela.getByRole('button', { name: /^Hidratação/ }))
    expect(janela.getByRole('textbox', { name: 'Pergunta 1 de Hidratação' })).toHaveValue('Salva em outra aba')
    await usuario.click(janela.getByRole('button', { name: 'Tirar a pergunta 1 de Hidratação' }))
    await usuario.click(janela.getByRole('button', { name: 'Cancelar' }))
    expect(lerRoteiro(arm).perguntas.agua).toEqual([{ id: 'x', texto: 'Salva em outra aba' }])
  })

  it('CA-567: voltar ao roteiro padrão e salvar traz a versão 3, sem perder bloco desconhecido', async () => {
    const arm = new MemoriaFalsa()
    arm.setItem(CHAVE_ROTEIRO, JSON.stringify({ formato: 1, versao: 3, blocos: { agua: [{ id: 'x', texto: 'Só esta' }], especialidade: [{ id: 'g', texto: 'Semanas' }] } }))
    const { usuario } = montar(HOMEM_35, { arm })
    await usuario.click(anamnese().getByRole('button', { name: 'Editar roteiro' }))
    const janela = within(screen.getByRole('dialog', { name: 'Roteiro da anamnese' }))
    await usuario.click(janela.getByRole('button', { name: 'Voltar ao roteiro padrão' }))
    await usuario.click(janela.getByRole('button', { name: 'Salvar roteiro' }))
    expect(lerRoteiro(arm).perguntas).toEqual(ROTEIRO_PADRAO.perguntas)
    expect(lerRoteiro(arm).outros).toEqual({ especialidade: [{ id: 'g', texto: 'Semanas' }] })
  })

  it('CA-568: a pergunta tirada continua na ficha com a resposta, Fora do roteiro, e pode ser apagada', async () => {
    const arm = new MemoriaFalsa()
    arm.setItem(CHAVE_ROTEIRO, JSON.stringify({ formato: 1, versao: 3, blocos: { 'alcool-fumo': [{ id: 'alcool', texto: 'Álcool' }] } }))
    const { pacientes, usuario } = montar({ ...HOMEM_35, respostasAnamnese: [{ perguntaId: 'fumo', blocoId: 'alcool-fumo', pergunta: 'Tabagismo', resposta: 'Parou em 2020' }] }, { arm })
    expect(bloco('Álcool e tabagismo')).toHaveTextContent('1 de 2 respondida')
    await usuario.click(bloco('Álcool e tabagismo'))
    const campo = anamnese().getByLabelText('Tabagismo')
    expect(within(campo.closest('div[data-pergunta]') ?? document.body).getByText('Fora do roteiro')).toBeInTheDocument()
    await usuario.clear(campo)
    expect(pacientes.obter('p1')?.respostasAnamnese).toEqual([])
  })
})

describe('Correção B: cada pergunta para quem vale (spec ficha-unica, seção 10)', () => {
  const escolhasDeDoenca = async (ajuste: Partial<Paciente>) => {
    const { usuario } = montar(ajuste)
    await usuario.click(bloco('Saúde(?! da mulher)'))
    return anamnese()
      .getAllByRole('checkbox')
      .map((c) => c.getAttribute('aria-label') ?? c.textContent ?? '')
  }

  it('CA-1270: a menina de 6 anos não vê a SOP; a mulher de 68 vê', async () => {
    expect((await escolhasDeDoenca(MENINA_6)).join(' ')).not.toMatch(/ovários policísticos/)
    cleanup()
    expect((await escolhasDeDoenca(MULHER_68)).join(' ')).toMatch(/ovários policísticos/)
  })

  it('CA-1271: a menina de 6 anos tem o histórico do crescimento e não tem "Dietas que já fez"', async () => {
    const { usuario } = montar(MENINA_6)
    await usuario.click(bloco('Motivo da consulta'))
    expect(anamnese().getByLabelText('Histórico do peso')).toHaveAccessibleDescription('Peso ao nascer e como o peso e a estatura vêm mudando (caderneta de saúde).')
    expect(anamnese().queryByLabelText('Dietas que já fez')).not.toBeInTheDocument()
  })

  it('CA-1272 a CA-1274: a mulher de 68 anos vê "Menopausa" e "Ainda menstrua", sem fluxo, e a reposição hormonal', async () => {
    const { usuario } = montar(MULHER_68)
    await usuario.click(bloco('Saúde da mulher'))
    const menstruacao = anamnese().getByRole('radiogroup', { name: 'Menstruação' })
    expect(within(menstruacao).getAllByRole('radio').map((r) => r.textContent)).toEqual(['Menopausa', 'Ainda menstrua'])
    expect(anamnese().queryByText('Fluxo menstrual intenso')).not.toBeInTheDocument()
    expect(anamnese().getByLabelText('Reposição hormonal')).toBeInTheDocument()
    await usuario.click(within(menstruacao).getByRole('radio', { name: 'Ainda menstrua' }))
    expect(anamnese().getByRole('radiogroup', { name: 'Fluxo menstrual intenso' })).toBeInTheDocument()
    expect(anamnese().getByLabelText('Anticoncepcional ou reposição hormonal')).toBeInTheDocument()
  })

  it('CA-1275: Pessoa idosa não pergunta com quem mora; "Pessoas que moram na casa" diz que 1 é morar só', async () => {
    const { usuario } = montar(MULHER_68)
    await usuario.click(bloco('Pessoa idosa'))
    expect(anamnese().queryByLabelText('Com quem mora')).not.toBeInTheDocument()
    expect(dados().getByLabelText('Pessoas que moram na casa')).toHaveAccessibleDescription('Contando o paciente: 1 quer dizer que mora só.')
  })

  it('CA-1276: a lactante escolhe "Só no peito" ou "Peito e outros alimentos", sem "Não amamenta"', () => {
    montar({ ...MULHER_28, momentoDeVida: { tipo: 'lactante', dataDoParto: '2026-07-21', amamentacao: 'exclusiva' } })
    const amamentacao = dados().getByRole('radiogroup', { name: 'Amamentação' })
    expect(within(amamentacao).getAllByRole('radio').map((r) => r.textContent)).toEqual(['Só no peito', 'Peito e outros alimentos'])
  })

  it('CA-1278: a ficha de lactante com o parto há mais de 60 meses avisa', () => {
    montar({ sexo: 'F', nascimento: '1990-01-10', momentoDeVida: { tipo: 'lactante', dataDoParto: '2020-01-15', amamentacao: 'mista' } })
    expect(dados().getByText('Pela data do parto, já se passaram mais de 60 meses. Se a amamentação terminou, marque Não.')).toBeInTheDocument()
  })

  it('CA-1279 e CA-1280: a menina de 6 anos tem a rotina da escola; aos 4 anos, "Escola ou creche"; aos 2, sem Atividade física', async () => {
    const { usuario } = montar(MENINA_6)
    await usuario.click(bloco('Rotina e sono'))
    expect(anamnese().getByLabelText('Rotina da escola ou da creche')).toBeInTheDocument()
    cleanup()
    montar({ sexo: 'F', nascimento: '2022-05-01' })
    expect(dados().getByLabelText('Escola ou creche')).toBeInTheDocument()
    cleanup()
    montar({ sexo: 'M', nascimento: '2024-03-01' })
    expect(titulos()).not.toContain('Atividade física')
  })
})
