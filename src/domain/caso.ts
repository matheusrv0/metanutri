// Criação e validação do caso (SPEC CA-01, CB-01, CB-02, CB-02a, CB-02b, CB-03, CB-12).
import type { Caso } from './tipos.ts'

export type CampoCaso = keyof Caso

export interface ResultadoValidacao {
  /** Mensagem por campo inválido. */
  readonly erros: Partial<Record<CampoCaso, string>>
  /** Campos obrigatórios para os cálculos que ainda estão vazios, na ordem do formulário. */
  readonly faltando: readonly CampoCaso[]
  /** Dados que não bloqueiam o cálculo básico, mas limitam algum resultado. */
  readonly avisos: readonly string[]
  /** Verdadeiro quando energia, IMC e referências podem ser calculados. */
  readonly podeCalcular: boolean
}

export const FAIXAS = {
  idadeAnos: { min: 1, max: 120 },
  pesoKg: { min: 5, max: 350 },
  estaturaCm: { min: 45, max: 250 },
  circunferenciaCinturaCm: { min: 30, max: 250 },
  circunferenciaPanturrilhaCm: { min: 10, max: 80 },
  semanasGestacao: { min: 1, max: 42 },
  mesesPosParto: { min: 0, max: 60 },
  idadeGestacaoLactacao: { min: 14, max: 50 },
} as const

export function criarCasoVazio(id: string): Caso {
  return {
    id,
    nome: '',
    diagnosticoClinico: '',
    dataConsulta: null,
    sexo: null,
    idadeAnos: null,
    idadeMesesAdicionais: 0,
    pesoKg: null,
    estaturaCm: null,
    ocupacao: '',
    estagiario: '',
    preceptor: '',
    objetivo: null,
    observacoes: '',
    circunferenciaCinturaCm: null,
    circunferenciaPanturrilhaCm: null,
    condicao: { tipo: 'nenhuma' },
    energia: { fator: 1.2, formula: 'mifflin', getManual: null },
    metasMacros: {},
    adequacao: { preset: { tipo: 'individual' }, porcaoMaximaG: 200, incluirIngredientes: false, ocultos: [] },
    orientacoes: '',
    receitas: '',
  }
}

/**
 * Converte o texto digitado em número aceitando vírgula decimal (CB-12).
 * "68,5" e "68.5" viram 68,5; "1.234,5" vira 1234,5. Texto inválido ou vazio vira `null`.
 */
export function lerNumero(texto: string): number | null {
  let s = texto.trim()
  if (s === '') return null
  const temPonto = s.includes('.')
  const temVirgula = s.includes(',')
  if (temPonto && temVirgula) {
    s = s.replace(/\./g, '').replace(',', '.')
  } else if (temVirgula) {
    s = s.replace(',', '.')
  }
  if (!/^-?\d+(\.\d+)?$/.test(s)) return null
  return Number(s)
}

const fora = (valor: number, faixa: { readonly min: number; readonly max: number }) => valor < faixa.min || valor > faixa.max

export function validarCaso(caso: Caso): ResultadoValidacao {
  const erros: Partial<Record<CampoCaso, string>> = {}
  const faltando: CampoCaso[] = []
  const avisos: string[] = []

  if (caso.sexo === null) faltando.push('sexo')

  if (caso.idadeAnos === null) {
    faltando.push('idadeAnos')
  } else if (!Number.isInteger(caso.idadeAnos)) {
    erros.idadeAnos = 'Informe a idade em anos completos.'
  } else if (caso.idadeAnos < FAIXAS.idadeAnos.min) {
    erros.idadeAnos = 'O planejador atende casos a partir de 1 ano.'
  } else if (caso.idadeAnos > FAIXAS.idadeAnos.max) {
    erros.idadeAnos = `Idade acima de ${FAIXAS.idadeAnos.max} anos não é plausível.`
  }

  if (!Number.isInteger(caso.idadeMesesAdicionais) || caso.idadeMesesAdicionais < 0 || caso.idadeMesesAdicionais > 11) {
    erros.idadeMesesAdicionais = 'Os meses adicionais vão de 0 a 11.'
  }

  if (caso.pesoKg === null) {
    faltando.push('pesoKg')
  } else if (fora(caso.pesoKg, FAIXAS.pesoKg)) {
    erros.pesoKg = `Peso deve estar entre ${FAIXAS.pesoKg.min} e ${FAIXAS.pesoKg.max} kg.`
  }

  if (caso.estaturaCm === null) {
    faltando.push('estaturaCm')
  } else if (fora(caso.estaturaCm, FAIXAS.estaturaCm)) {
    erros.estaturaCm = `Estatura deve estar entre ${FAIXAS.estaturaCm.min} e ${FAIXAS.estaturaCm.max} cm.`
  }

  if (caso.circunferenciaCinturaCm !== null && fora(caso.circunferenciaCinturaCm, FAIXAS.circunferenciaCinturaCm)) {
    erros.circunferenciaCinturaCm = `Circunferência da cintura deve estar entre ${FAIXAS.circunferenciaCinturaCm.min} e ${FAIXAS.circunferenciaCinturaCm.max} cm.`
  }
  if (caso.circunferenciaPanturrilhaCm !== null && fora(caso.circunferenciaPanturrilhaCm, FAIXAS.circunferenciaPanturrilhaCm)) {
    erros.circunferenciaPanturrilhaCm = `Circunferência da panturrilha deve estar entre ${FAIXAS.circunferenciaPanturrilhaCm.min} e ${FAIXAS.circunferenciaPanturrilhaCm.max} cm.`
  }

  const { condicao } = caso
  if (condicao.tipo !== 'nenhuma') {
    const nomeCondicao = condicao.tipo === 'gestante' ? 'Gestação' : 'Lactação'
    const faixa = FAIXAS.idadeGestacaoLactacao
    if (caso.sexo === 'M') {
      erros.condicao = `${nomeCondicao} só pode ser marcada para o sexo feminino.`
    } else if (caso.idadeAnos !== null && fora(caso.idadeAnos, faixa)) {
      erros.condicao = `As referências de ${nomeCondicao.toLowerCase()} cobrem ${faixa.min} a ${faixa.max} anos.`
    } else if (condicao.tipo === 'gestante') {
      if (condicao.semanasGestacao === null) {
        avisos.push('Informe a idade gestacional para calcular o adicional de energia e o ganho de peso.')
      } else if (!Number.isInteger(condicao.semanasGestacao) || fora(condicao.semanasGestacao, FAIXAS.semanasGestacao)) {
        erros.condicao = `A idade gestacional vai de ${FAIXAS.semanasGestacao.min} a ${FAIXAS.semanasGestacao.max} semanas.`
      }
      if (condicao.pesoPreGestacionalKg === null) {
        avisos.push('Informe o peso pré-gestacional para classificar o IMC pré-gestacional.')
      } else if (fora(condicao.pesoPreGestacionalKg, FAIXAS.pesoKg)) {
        erros.condicao = `Peso pré-gestacional deve estar entre ${FAIXAS.pesoKg.min} e ${FAIXAS.pesoKg.max} kg.`
      }
    } else if (condicao.mesesPosParto === null) {
      avisos.push('Informe o tempo pós-parto para calcular o adicional de energia da lactação.')
    } else if (!Number.isInteger(condicao.mesesPosParto) || fora(condicao.mesesPosParto, FAIXAS.mesesPosParto)) {
      erros.condicao = `O tempo pós-parto vai de ${FAIXAS.mesesPosParto.min} a ${FAIXAS.mesesPosParto.max} meses.`
    }
  }

  return {
    erros,
    faltando,
    avisos,
    podeCalcular: faltando.length === 0 && Object.keys(erros).length === 0,
  }
}
