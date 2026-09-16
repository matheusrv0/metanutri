// Adequação de micronutrientes às DRI (SPEC CA-25 a CA-33, D-4).
import { DRI } from './tabelas.ts'
import type { EstagioDri } from './tabelas.ts'
import type { Totais } from './totais.ts'
import type { Caso, ChaveNutrienteAlimento } from './tipos.ts'

/** Micronutrientes (e fibra) da TACO avaliados na adequação, na ordem de exibição. */
export const MICRONUTRIENTES_ADEQUACAO: readonly ChaveNutrienteAlimento[] = [
  'calcio_mg',
  'ferro_mg',
  'magnesio_mg',
  'zinco_mg',
  'potassio_mg',
  'fosforo_mg',
  'sodio_mg',
  'cobre_mg',
  'manganes_mg',
  'vitamina_a_rae_mcg',
  'vitamina_c_mg',
  'tiamina_mg',
  'riboflavina_mg',
  'piridoxina_mg',
  'niacina_mg',
  'fibra_g',
]

export type Preset =
  | { readonly tipo: 'individual' }
  | { readonly tipo: 'coletivo' }
  | { readonly tipo: 'personalizado'; readonly referencia: 'rda' | 'ear'; readonly minimoPct: number }

export const PRESETS = {
  individual: { referencia: 'rda', minimoPct: 90 },
  coletivo: { referencia: 'ear', minimoPct: 50 },
} as const

export type EstadoAdequacao = 'abaixo' | 'adequado' | 'acima-limite'

export interface LinhaAdequacao {
  readonly chave: ChaveNutrienteAlimento
  readonly rotulo: string
  readonly unidade: string
  readonly total: number
  readonly semDado: number
  readonly subestimado: boolean
  readonly referencia: { readonly tipo: 'rda' | 'ear' | 'ai'; readonly valor: number }
  readonly usouAi: boolean
  readonly metaPct: number
  readonly adequacaoPct: number
  readonly limite: { readonly tipo: 'ul' | 'cdrr'; readonly valor: number } | null
  /** Explica por que o UL da tabela não é usado como alerta para alimentos. */
  readonly notaLimite: string | null
  readonly estado: EstadoAdequacao
}

export interface ResultadoAdequacao {
  readonly estagio: EstagioDri | null
  readonly motivoSemCalculo: string | null
  readonly linhas: readonly LinhaAdequacao[]
  readonly fonte: string
}

type PerfilCaso = Pick<Caso, 'sexo' | 'idadeAnos' | 'condicao'>

const naFaixa = (idade: number, e: EstagioDri) => idade >= e.idadeMin && (e.idadeMax === null || idade <= e.idadeMax)

export function estagioDeVida(perfil: PerfilCaso): EstagioDri | null {
  const { sexo, idadeAnos, condicao } = perfil
  if (idadeAnos === null || idadeAnos < 1) return null
  if (condicao.tipo !== 'nenhuma') {
    if (sexo !== 'F') return null
    const gestante = condicao.tipo === 'gestante'
    return DRI.estagios.find((e) => (gestante ? e.gestante : e.lactante) && naFaixa(idadeAnos, e)) ?? null
  }
  if (idadeAnos <= 8) {
    return DRI.estagios.find((e) => e.sexo === null && !e.gestante && !e.lactante && naFaixa(idadeAnos, e)) ?? null
  }
  if (sexo === null) return null
  return DRI.estagios.find((e) => e.sexo === sexo && !e.gestante && !e.lactante && naFaixa(idadeAnos, e)) ?? null
}

function limiteSuperior(chave: ChaveNutrienteAlimento, estagio: EstagioDri, ul: number | null) {
  if (chave === 'sodio_mg') {
    const cdrr = DRI.sodioCdrr.find((c) => estagio.idadeMin >= c.idadeMin && (c.idadeMax === null || estagio.idadeMin <= c.idadeMax))
    return { limite: cdrr ? { tipo: 'cdrr' as const, valor: cdrr.valor } : null, nota: null }
  }
  const info = DRI.nutrientes[chave]
  if (ul === null) return { limite: null, nota: null }
  if (info && info.ul.escopo !== 'total') return { limite: null, nota: info.ul.nota }
  return { limite: { tipo: 'ul' as const, valor: ul }, nota: null }
}

export function calcularAdequacao(totais: Totais, perfil: PerfilCaso, preset: Preset): ResultadoAdequacao {
  const fonte = `${DRI.fonte.publicacao} ${DRI.fonte.nome}.`
  if (preset.tipo === 'personalizado' && (!(preset.minimoPct > 0) || preset.minimoPct > 1000)) {
    throw new RangeError(`Porcentagem mínima inválida: ${preset.minimoPct}.`)
  }

  const estagio = estagioDeVida(perfil)
  if (!estagio) {
    return {
      estagio: null,
      motivoSemCalculo: 'Informe sexo e idade válidos (e uma condição compatível) para escolher as referências.',
      linhas: [],
      fonte,
    }
  }

  const config = preset.tipo === 'personalizado' ? preset : PRESETS[preset.tipo]
  const valores = DRI.valores[estagio.id] ?? {}

  const linhas = MICRONUTRIENTES_ADEQUACAO.map((chave): LinhaAdequacao => {
    const dri = valores[chave]
    const info = DRI.nutrientes[chave]
    const principal = dri?.[config.referencia] ?? null
    const valorReferencia = principal ?? dri?.ai ?? null
    if (!dri || !info || valorReferencia === null) {
      throw new Error(`DRI sem referência para ${chave} em ${estagio.id}.`)
    }
    const referencia = { tipo: principal !== null ? config.referencia : ('ai' as const), valor: valorReferencia }
    const { total, semDado } = totais.nutrientes[chave]
    const adequacaoPct = (total / valorReferencia) * 100
    const { limite, nota } = limiteSuperior(chave, estagio, dri.ul)
    const estado: EstadoAdequacao =
      limite !== null && total > limite.valor ? 'acima-limite' : Math.round(adequacaoPct * 1e6) / 1e6 < config.minimoPct ? 'abaixo' : 'adequado'

    return {
      chave,
      rotulo: info.rotulo,
      unidade: info.unidade,
      total,
      semDado,
      subestimado: semDado > 0,
      referencia,
      usouAi: referencia.tipo === 'ai',
      metaPct: config.minimoPct,
      adequacaoPct,
      limite,
      notaLimite: nota,
      estado,
    }
  })

  return { estagio, motivoSemCalculo: null, linhas, fonte }
}
