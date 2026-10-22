// O plano lê a ficha (spec ficha-unica, D-340 a D-344): o caso como ele vale para os cálculos e os documentos. O que é
// da pessoa (nome, sexo, idade, gestação ou lactação, ocupação, doenças) vem da ficha, na data da consulta do plano;
// o que é da consulta (medidas, energia, documento) continua no plano. Plano sem paciente fica como está (D-366).
import { textoDasDoencas } from './doencas.ts'
import { FAIXAS } from './caso.ts'
import { condicaoNaData, lerDia, semanasNaData } from './momentoDeVida.ts'
import { idadeNaData, type Paciente } from './pacientes.ts'
import { podeGestarOuLactar, type PerfilDaFicha } from './regrasDaFicha.ts'
import { montarRestricoes, type RestricoesDoPaciente } from './restricoes.ts'
import type { Caso, CondicaoFisiologica } from './tipos.ts'

export type DadoQueFalta = 'sexo' | 'nascimento'

export interface PlanoComFicha {
  /** O caso como vale: é ele que vai para a energia, a DRI, as curvas, a folha, o Word e o link. */
  readonly caso: Caso
  readonly comPaciente: boolean
  /** O dia em que a idade, as semanas e os meses são contados: a data da consulta, ou hoje. */
  readonly dia: string
  /** CA-1032: o que a ficha ainda não tem; enquanto falta, vale o gravado no plano. */
  readonly faltaNaFicha: readonly DadoQueFalta[]
  /** D-344: o plano antigo gravou outra condição; até a nutricionista escolher, vale a dele. */
  readonly condicaoDivergente: { readonly doPlano: CondicaoFisiologica; readonly daFicha: CondicaoFisiologica } | null
  /** Frases para a etapa 1 (CA-1042). */
  readonly avisos: readonly string[]
}

const mesmaCondicao = (a: CondicaoFisiologica, b: CondicaoFisiologica): boolean => {
  if (a.tipo === 'gestante' && b.tipo === 'gestante') return a.semanasGestacao === b.semanasGestacao && a.pesoPreGestacionalKg === b.pesoPreGestacionalKg
  if (a.tipo === 'lactante' && b.tipo === 'lactante') return a.mesesPosParto === b.mesesPosParto
  return a.tipo === b.tipo
}

export function casoComFicha(caso: Caso, paciente: Paciente | null, hoje: string): PlanoComFicha {
  const dia = caso.dataConsulta !== null && lerDia(caso.dataConsulta) ? caso.dataConsulta : hoje
  if (paciente === null) return { caso, comPaciente: false, dia, faltaNaFicha: [], condicaoDivergente: null, avisos: [] }

  const idade = idadeNaData(paciente.nascimento, dia)
  const faltaNaFicha: DadoQueFalta[] = []
  if (paciente.sexo === null) faltaNaFicha.push('sexo')
  if (idade === null) faltaNaFicha.push('nascimento')

  const daFicha = condicaoNaData(paciente.momentoDeVida, dia)
  const doPlano = caso.condicao
  const divergente = doPlano.tipo !== 'nenhuma' && !mesmaCondicao(doPlano, daFicha)

  const avisos: string[] = []
  const momento = paciente.momentoDeVida
  if (momento?.tipo === 'gestante') {
    const semanas = semanasNaData(momento, dia)
    if (semanas !== null && semanas > FAIXAS.semanasGestacao.max) {
      avisos.push(`Pela data informada na ficha, a gestação passou de ${FAIXAS.semanasGestacao.max} semanas. Atualize a ficha.`)
    }
  }

  return {
    caso: {
      ...caso,
      nome: paciente.nome.trim() || caso.nome,
      sexo: paciente.sexo ?? caso.sexo,
      idadeAnos: idade?.anos ?? caso.idadeAnos,
      idadeMesesAdicionais: idade ? idade.meses : caso.idadeMesesAdicionais,
      condicao: divergente ? doPlano : daFicha,
      ocupacao: paciente.ocupacao.trim() || caso.ocupacao,
      diagnosticoClinico: textoDasDoencas(paciente) || caso.diagnosticoClinico,
    },
    comPaciente: true,
    dia,
    faltaNaFicha,
    condicaoDivergente: divergente ? { doPlano, daFicha } : null,
    avisos,
  }
}

/**
 * D-358: o peso da última consulta do mesmo paciente antes desta, para a dica do retorno ("Última: 82 kg em
 * 10/09/2026"). Plano sem data conta pela ordem de quem tem data; sem nenhum peso anterior, `null`.
 */
export function pesoAnterior(atual: Caso, registros: readonly { readonly caso: Caso }[]): { readonly pesoKg: number; readonly data: string } | null {
  if (atual.pacienteId === null) return null
  const candidatos = registros
    .map((r) => r.caso)
    .filter((c) => c.id !== atual.id && c.pacienteId === atual.pacienteId && c.pesoKg !== null && c.dataConsulta !== null && lerDia(c.dataConsulta) !== null)
    .filter((c) => atual.dataConsulta === null || (c.dataConsulta ?? '') < atual.dataConsulta)
    .sort((a, b) => (b.dataConsulta ?? '').localeCompare(a.dataConsulta ?? ''))
  const ultimo = candidatos[0]
  return ultimo && ultimo.pesoKg !== null && ultimo.dataConsulta !== null ? { pesoKg: ultimo.pesoKg, data: ultimo.dataConsulta } : null
}

/**
 * O perfil que decide as perguntas da ficha (spec ficha-unica, seção 3): sexo, idade de hoje e gestação ou lactação,
 * que só conta para quem pode gestar (R1); `temPlano` liga o Retorno (R12).
 */
export function perfilDaFicha(paciente: Paciente, hoje: string, temPlano: boolean): PerfilDaFicha {
  const idade = idadeNaData(paciente.nascimento, hoje)
  const base = { sexo: paciente.sexo, idadeAnos: idade?.anos ?? null }
  const momento = paciente.momentoDeVida?.tipo ?? null
  return { ...base, momento: momento !== null && momento !== 'nenhum' && !podeGestarOuLactar(base) ? null : momento, temPlano }
}

/** As restrições da ficha (spec ficha-unica, D-351 a D-354): as marcadas, o texto, a doença celíaca e o que não gosta. */
export function restricoesDaFicha(paciente: Paciente): RestricoesDoPaciente {
  return montarRestricoes({
    marcadas: paciente.restricoesMarcadas,
    texto: paciente.restricoes,
    doencas: paciente.doencas,
    naoGosta: paciente.respostasAnamnese.find((r) => r.perguntaId === 'nao-gosta')?.resposta ?? '',
  })
}
