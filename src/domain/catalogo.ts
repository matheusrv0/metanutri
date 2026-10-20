// Navegar a tabela de composição inteira: filtrar, ordenar e ler um alimento por completo.
import { CHAVES_USDA } from './complementoUsda.ts'
import { completudeDe, NUTRIENTES_CONFERIDOS, nomeDoNutriente, type NivelCompletude } from './completude.ts'
import { normalizar } from './busca.ts'
import { ALIMENTOS } from './tabelas.ts'
import type { Alimento, ChaveNutrienteAlimento } from './tipos.ts'

export type OrdemCatalogo = 'nome' | 'energia' | 'completude'

export interface FiltroCatalogo {
  readonly termo?: string
  readonly categoria?: string | null
  readonly nivel?: NivelCompletude | null
  readonly ordem?: OrdemCatalogo
}

/** Categorias da TACO, em ordem alfabética, com quantos alimentos cada uma tem. */
export function categoriasDoCatalogo(): readonly { readonly nome: string; readonly quantos: number }[] {
  const contagem = new Map<string, number>()
  for (const a of ALIMENTOS) contagem.set(a.categoria, (contagem.get(a.categoria) ?? 0) + 1)
  return [...contagem.entries()]
    .map(([nome, quantos]) => ({ nome, quantos }))
    .sort((x, y) => x.nome.localeCompare(y.nome, 'pt-BR'))
}

const ORDENA: Readonly<Record<OrdemCatalogo, (a: Alimento, b: Alimento) => number>> = {
  nome: (a, b) => a.descricao.localeCompare(b.descricao, 'pt-BR'),
  // Sem energia vai para o fim: não dá para ordenar pelo que não existe.
  energia: (a, b) => (b.nutrientes.energia_kcal ?? -1) - (a.nutrientes.energia_kcal ?? -1),
  completude: (a, b) => completudeDe(b).preenchidos - completudeDe(a).preenchidos || a.descricao.localeCompare(b.descricao, 'pt-BR'),
}

export function filtrarCatalogo(filtro: FiltroCatalogo = {}): readonly Alimento[] {
  const termo = normalizar((filtro.termo ?? '').trim())
  const palavras = termo.split(/\s+/).filter(Boolean)

  return ALIMENTOS.filter((a) => {
    if (filtro.categoria && a.categoria !== filtro.categoria) return false
    if (filtro.nivel && completudeDe(a).nivel !== filtro.nivel) return false
    if (palavras.length === 0) return true
    const alvo = normalizar(a.descricao)
    return palavras.every((p) => alvo.includes(p))
  }).sort(ORDENA[filtro.ordem ?? 'nome'])
}

export interface LinhaDeComposicao {
  readonly chave: ChaveNutrienteAlimento
  readonly nome: string
  readonly unidade: string
  /** `null` = não analisado. `0` com `traco` = medido e desprezível. */
  readonly valor: number | null
  readonly traco: boolean
  /** Linha do complemento do USDA: o valor é de um alimento equivalente americano (spec vitaminas-usda, D-308). */
  readonly usda: boolean
}

const UNIDADE: Readonly<Partial<Record<ChaveNutrienteAlimento, string>>> = {
  energia_kcal: 'kcal',
  proteina_g: 'g', lipideos_g: 'g', carboidrato_g: 'g', fibra_g: 'g',
  calcio_mg: 'mg', magnesio_mg: 'mg', manganes_mg: 'mg', fosforo_mg: 'mg', ferro_mg: 'mg',
  sodio_mg: 'mg', potassio_mg: 'mg', cobre_mg: 'mg', zinco_mg: 'mg',
  vitamina_a_rae_mcg: 'µg', tiamina_mg: 'mg', riboflavina_mg: 'mg',
  piridoxina_mg: 'mg', niacina_mg: 'mg', vitamina_c_mg: 'mg',
  vitamina_d_mcg: 'µg', vitamina_e_mg: 'mg', folato_dfe_mcg: 'µg', vitamina_b12_mcg: 'µg', selenio_mcg: 'µg',
  gordura_trans_g: 'g',
}

/**
 * A composição do alimento por 100 g, na ordem em que a TACO publica. Com equivalente no USDA, as seis do
 * complemento vêm depois, marcadas; sem equivalente, elas não entram (a ficha diz isso numa linha só, D-308).
 */
export function composicaoDe(alimento: Alimento): readonly LinhaDeComposicao[] {
  const linha = (chave: ChaveNutrienteAlimento, usda: boolean): LinhaDeComposicao => ({
    chave,
    nome: nomeDoNutriente(chave),
    unidade: UNIDADE[chave] ?? '',
    valor: alimento.nutrientes[chave] ?? null,
    traco: alimento.tracos.includes(chave),
    usda,
  })
  const taco = NUTRIENTES_CONFERIDOS.map((chave) => linha(chave, false))
  return alimento.usda ? [...taco, ...CHAVES_USDA.map((chave) => linha(chave, true))] : taco
}

export interface ResumoDoCatalogo {
  readonly total: number
  readonly completos: number
  readonly semEnergia: number
}

export function resumoDoCatalogo(): ResumoDoCatalogo {
  let completos = 0
  let semEnergia = 0
  for (const a of ALIMENTOS) {
    const c = completudeDe(a)
    if (c.nivel === 'completo') completos += 1
    if (c.semEnergia) semEnergia += 1
  }
  return { total: ALIMENTOS.length, completos, semEnergia }
}
