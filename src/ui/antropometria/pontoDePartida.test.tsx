// "Ponto de partida do plano" (spec antropometria-telas, D-1418 a D-1421 e D-1467 a D-1469).
import { screen, within } from '@testing-library/react'
import { criarCasoVazio } from '@/domain/caso.ts'
import { calcularEnergia } from '@/domain/energia.ts'
import { criarPacienteVazio, type Paciente } from '@/domain/pacientes.ts'
import type { Caso } from '@/domain/tipos.ts'
import { formatarNumero } from '@/export/copiar-tabela.ts'
import { abrirAvaliacao, casoDe } from './apoioDaVista.test-utils.tsx'

const cartao = () => within(screen.getByRole('region', { name: 'Ponto de partida do plano' }))
/** O bloco pelo título (h3): o gasto, a proteína, a prioridade, a meta. */
const bloco = (nome: string) => {
  const titulo = cartao().getByRole('heading', { name: nome })
  const caixa = titulo.parentElement?.parentElement
  if (!caixa) throw new Error(nome)
  return within(caixa)
}
const perfil = () => cartao().getByRole('combobox', { name: 'Perfil de atividade' })

/** A paciente de exemplo do protótipo, com as dobras de JP 7 (29,5%). */
const DADOS_DA_RENATA = {
  sexo: 'F',
  idadeAnos: 34,
  dataConsulta: '2026-11-03',
  pesoKg: 71.5,
  estaturaCm: 164,
  circunferenciaCinturaCm: 84,
  medidasCorporais: { pontoDaCintura: 'ponto-medio', quadrilCm: 104 },
  composicao: { protocolo: 'jackson-pollock-7' },
  dobras: { tricipital: 24, subescapular: 20.5, peitoral: 12, axilarMedia: 16, suprailiacaAnt: 21, abdominal: 30, coxa: 34.5 },
} as const satisfies Parameters<typeof casoDe>[0]
const RENATA = casoDe(DADOS_DA_RENATA)

const comFicha = (nascimento: string, doencas: readonly string[], sexo: Paciente['sexo'] = 'M'): Paciente => ({ ...criarPacienteVazio('p', '2026-01-01T00:00:00.000Z'), nome: 'Paciente', sexo, nascimento, doencas })

describe('o ponto de partida (spec antropometria-telas, CA-2436 a CA-2445)', () => {
  it('CA-2436: a adulta de 80 kg com 25% pelas dobras, sedentária: a faixa do gasto, a equação, a massa magra e a origem do %', async () => {
    const { usuario } = abrirAvaliacao(
      casoDe({ sexo: 'F', idadeAnos: 30, pesoKg: 80, estaturaCm: 165, composicao: { protocolo: 'faulkner-4' }, dobras: { tricipital: 31.4, subescapular: 31.4, suprailiaca: 31.4, abdominal: 31.4 } }),
    )
    expect(bloco('Gasto de repouso').getByText('Escolha o perfil de atividade.')).toBeInTheDocument()
    expect(within(perfil()).getAllByRole('option').map((o) => o.textContent)).toEqual(['Perfil de atividade', 'Sedentária', 'Ativa', 'Atleta'])
    await usuario.selectOptions(perfil(), 'Sedentária')
    const gasto = bloco('Gasto de repouso')
    expect(gasto.getByText('1.510 – 1.820')).toBeInTheDocument()
    expect(gasto.getByText('Cunningham, 1991, pela massa magra de 60,0 kg (% de gordura: Faulkner (Yuhasz), 4 dobras).')).toBeInTheDocument()
    expect(gasto.getByText('Evidência limitada')).toBeInTheDocument()
  })

  it('CA-2437: ganhar massa muscular com 70 kg: a faixa, a base e a fonte; "Manter o peso" sedentário dá o motivo, sem número', async () => {
    const { usuario, gravado } = abrirAvaliacao(casoDe({ sexo: 'M', idadeAnos: 30, pesoKg: 70, estaturaCm: 175, objetivo: 'ganhar', avaliacao: { perfil: 'ativo' } }))
    const proteina = bloco('Proteína')
    expect(proteina.getByText('112 – 154')).toBeInTheDocument()
    expect(proteina.getByText('1,6 a 2,2 g/kg de peso · Morton et al., 2018')).toBeInTheDocument()
    await usuario.selectOptions(cartao().getByRole('combobox', { name: 'Objetivo do plano' }), 'Manter o peso')
    await usuario.selectOptions(perfil(), 'Sedentário')
    expect(gravado().objetivo).toBe('manter')
    expect(bloco('Proteína').getByText('Sem número conferido para este perfil: a RDA de 0,8 g/kg não foi conferida na pesquisa.')).toBeInTheDocument()
    expect(bloco('Proteína').queryByText('g/dia')).not.toBeInTheDocument()
  })

  it('CA-2438: emagrecer com IMC de 31 pede o peso de referência; sem escolha, sem g/dia; o peso ajustado dá a faixa e fica gravado', async () => {
    const { usuario, gravado } = abrirAvaliacao(casoDe({ sexo: 'F', idadeAnos: 40, pesoKg: 89.6, estaturaCm: 170, objetivo: 'emagrecer', avaliacao: { perfil: 'ativo' } }))
    const base = bloco('Proteína').getByRole('combobox', { name: 'Peso de referência' })
    const opcoes = within(base).getAllByRole('option') as HTMLOptionElement[]
    expect(opcoes.map((o) => o.textContent)).toEqual(['Escolha o peso de referência', 'Peso ideal · 62,9 kg', 'Peso ajustado · 76,6 kg', 'Massa magra · —'])
    expect(opcoes[3]?.disabled).toBe(true)
    expect(bloco('Proteína').queryByText('g/dia')).not.toBeInTheDocument()
    expect(cartao().getByRole('button', { name: 'Levar para o plano' })).toBeDisabled()
    await usuario.selectOptions(base, 'peso-ajustado')
    expect(bloco('Proteína').getByText('92 – 115')).toBeInTheDocument()
    expect(gravado().avaliacao.baseDaProteina).toBe('peso-ajustado')
  })

  it('CA-2439: o idoso de 70 anos com hipertensão na ficha tem a faixa do PROT-AGE para doença; sem doença, 1,0 a 1,2', () => {
    abrirAvaliacao(casoDe({ pacienteId: 'p', pesoKg: 70, estaturaCm: 170, avaliacao: { perfil: 'sedentario' } }), [comFicha('1956-05-12', ['hipertensao'])])
    expect(bloco('Proteína').getByText(/^1,2 a 1,5 g\/kg de peso · PROT-AGE, 2013; ESPEN, 2014$/)).toBeInTheDocument()
    expect(bloco('Proteína').getByText('Com doença na ficha: a faixa do PROT-AGE para doença aguda ou crônica.')).toBeInTheDocument()
  })

  it('CA-2439: sem doença na ficha, 1,0 a 1,2 g/kg', () => {
    abrirAvaliacao(casoDe({ pacienteId: 'p', pesoKg: 70, estaturaCm: 170, avaliacao: { perfil: 'sedentario' } }), [comFicha('1956-05-12', [])])
    expect(bloco('Proteína').getByText(/^1,0 a 1,2 g\/kg de peso/)).toBeInTheDocument()
    expect(bloco('Proteína').queryByText(/Com doença na ficha/)).not.toBeInTheDocument()
  })

  it('CA-2440: com doença renal crônica na ficha, a pergunta da TFGe; "Sim" troca a faixa pelo alerta do PROT-AGE', async () => {
    const { usuario, gravado } = abrirAvaliacao(casoDe({ pacienteId: 'p', pesoKg: 70, estaturaCm: 170, avaliacao: { perfil: 'sedentario' } }), [comFicha('1956-05-12', ['doenca-renal'])])
    await usuario.selectOptions(bloco('Proteína').getByRole('combobox', { name: 'TFGe abaixo de 30, sem diálise' }), 'Sim')
    expect(gravado().avaliacao.doencaRenalGrave).toBe(true)
    expect(bloco('Proteína').getByText('TFGe abaixo de 30 sem diálise: faixa alta de proteína não sugerida. Pode ser preciso limitar a proteína (PROT-AGE 2013).')).toBeInTheDocument()
    expect(bloco('Proteína').queryByText('g/dia')).not.toBeInTheDocument()
  })

  it('CA-2440: sem a doença renal na ficha, a pergunta não aparece', () => {
    abrirAvaliacao(casoDe({ pacienteId: 'p', pesoKg: 70, estaturaCm: 170, avaliacao: { perfil: 'sedentario' } }), [comFicha('1956-05-12', ['diabetes'])])
    expect(cartao().queryByRole('combobox', { name: 'TFGe abaixo de 30, sem diálise' })).not.toBeInTheDocument()
  })

  it('CA-2441: IMC 26,58 e cintura 84 na mulher de 34 anos: nível 1, os gatilhos com a fonte e "Proposta do app"', () => {
    abrirAvaliacao(RENATA)
    const prioridade = bloco('Prioridade clínica')
    expect(prioridade.getByText('Nível 1 de 4 · Aumentado')).toBeInTheDocument()
    expect(prioridade.getByText('IMC de 25 a 29,99 (NHLBI, 2000)')).toBeInTheDocument()
    expect(prioridade.getByText('Razão cintura/estatura de 0,50 a 0,59 (ABESO, 2016)')).toBeInTheDocument()
    expect(prioridade.getByText('Proposta do app (sem diretriz)')).toBeInTheDocument()
  })

  it('CA-2442: a meta de 71,5 kg, o teto e o déficit; a gordura alvo de 25% dá os pesos-alvo e o prazo, e fica gravada', async () => {
    const { usuario, gravado } = abrirAvaliacao(RENATA)
    const meta = bloco('Meta de perda')
    expect(meta.getByText('3,6 a 7,2 kg em cerca de 6 meses')).toBeInTheDocument()
    expect(meta.getByText(/sem passar de 0,7 kg por semana\. Déficit de 300 a 500 kcal\/dia/)).toBeInTheDocument()
    await usuario.type(meta.getByRole('textbox', { name: 'Gordura alvo, definida por você' }), '25')
    expect(gravado().avaliacao.gorduraAlvoPct).toBe(25)
    expect(bloco('Meta de perda').getByText('se a massa magra for preservada')).toBeInTheDocument()
    expect(bloco('Meta de perda').getByText('na perda típica, com um quarto do peso perdido em massa magra')).toBeInTheDocument()
    expect(bloco('Meta de perda').getByText(/^Prazo mínimo: \d+ a \d+ semanas/)).toBeInTheDocument()
  })

  it('CA-2443: a energia sugerida é o gasto do plano menos o déficit', () => {
    abrirAvaliacao(RENATA)
    const caso: Caso = { ...criarCasoVazio('av'), ...RENATA, modo: 'completo' }
    const get = calcularEnergia(caso, { fator: caso.energia.fator, formula: caso.energia.formula, getManual: caso.energia.getManual }).get ?? 0
    const kcal = (v: number) => formatarNumero(Math.round(v), 0)
    expect(bloco('Meta de perda').getByText(`Energia sugerida: ${kcal(get - 500)} a ${kcal(get - 300)} kcal/dia, pelo gasto do plano de ${kcal(get)} kcal/dia.`)).toBeInTheDocument()
  })

  it('CA-2443: com o gasto do plano de 1.000 kcal, a sugestão para em 800 e o aviso aparece', () => {
    abrirAvaliacao({ ...RENATA, energia: { fator: 1.2, formula: 'mifflin', getManual: 1000 } })
    expect(bloco('Meta de perda').getByText('Energia sugerida: 800 a 800 kcal/dia, pelo gasto do plano de 1.000 kcal/dia.')).toBeInTheDocument()
    expect(bloco('Meta de perda').getByText('Abaixo de 800 kcal/dia, só com supervisão médica (ABESO 2016): a sugestão para em 800.')).toBeInTheDocument()
  })

  it('CA-2444: "Levar para o plano" grava a meta de proteína em g/kg e diz onde', async () => {
    const { usuario, gravado } = abrirAvaliacao(casoDe({ sexo: 'M', idadeAnos: 30, dataConsulta: '2026-11-03', pesoKg: 70, estaturaCm: 175, objetivo: 'ganhar', avaliacao: { perfil: 'ativo' } }))
    await usuario.click(cartao().getByRole('button', { name: 'Levar para o plano' }))
    expect(gravado().metasMacros.proteina).toEqual({ tipo: 'g_kg', min: 1.6, max: 2.2 })
    expect(cartao().getByRole('status')).toHaveTextContent('No plano de 03/11 como sugestão. Você ajusta lá.')
  })

  it('CA-2444: sem faixa fechada, o botão fica desligado e diz por quê', () => {
    abrirAvaliacao(casoDe({ sexo: 'F', idadeAnos: 30, pesoKg: 70, estaturaCm: 170 }))
    expect(cartao().getByRole('button', { name: 'Levar para o plano' })).toBeDisabled()
    expect(cartao().getByRole('button', { name: 'Levar para o plano' })).toHaveAccessibleDescription('Escolha o perfil de atividade.')
  })

  it('CA-2445: aos 17 anos, e na gestação, o cartão diz para quem o ponto de partida vale', () => {
    abrirAvaliacao(casoDe({ sexo: 'F', idadeAnos: 17, pesoKg: 60, estaturaCm: 165 }))
    expect(cartao().getByText('O ponto de partida vale de 18 anos em diante, fora da gestação.')).toBeInTheDocument()
    expect(cartao().queryByRole('combobox', { name: 'Perfil de atividade' })).not.toBeInTheDocument()
  })

  it('CA-2445: na gestante adulta, o mesmo', () => {
    abrirAvaliacao(casoDe({ sexo: 'F', idadeAnos: 30, pesoKg: 60, estaturaCm: 165, condicao: { tipo: 'gestante', semanasGestacao: 20, pesoPreGestacionalKg: 58 } }))
    expect(cartao().getByText('O ponto de partida vale de 18 anos em diante, fora da gestação.')).toBeInTheDocument()
  })

  it('CA-2445: na lactante adulta, o gasto e a prioridade aparecem; a proteína e a meta dizem o motivo', () => {
    abrirAvaliacao(casoDe({ ...DADOS_DA_RENATA, condicao: { tipo: 'lactante', mesesPosParto: 3 }, avaliacao: { perfil: 'sedentario' } }))
    expect(bloco('Gasto de repouso').getByText('kcal/dia')).toBeInTheDocument()
    expect(bloco('Prioridade clínica').getByText('Nível 1 de 4 · Aumentado')).toBeInTheDocument()
    // CB-1449: o motivo é o do motor, não um texto da tela.
    expect(bloco('Proteína').getByText('Nenhuma fonte conferida trata da proteína na lactação.')).toBeInTheDocument()
    expect(bloco('Meta de perda').getByText('Nenhuma fonte conferida trata da meta de perda na lactação.')).toBeInTheDocument()
  })
})
