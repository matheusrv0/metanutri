// Produtos industrializados cadastrados pelo rótulo (revisão de produto, B-25).
// Ficam no mesmo armazenamento dos casos e entram nos cálculos como qualquer alimento.
import type { Armazenamento } from './persistencia.ts'
import type { Alimento, ChaveNutrienteAlimento } from './tipos.ts'

const CHAVE = 'metanutri:produtos'

/** Ids de produto começam acima da TACO, para nunca colidir com a tabela. */
export const PRIMEIRO_ID_PRODUTO = 900_000

/** Campos que a rotulagem brasileira obriga (RDC 429/2020 e IN 75/2020). */
export const CAMPOS_ROTULO: readonly { readonly chave: ChaveNutrienteAlimento; readonly rotulo: string; readonly unidade: string }[] = [
  { chave: 'energia_kcal', rotulo: 'Valor energético', unidade: 'kcal' },
  { chave: 'carboidrato_g', rotulo: 'Carboidratos', unidade: 'g' },
  { chave: 'acucares_g', rotulo: 'Açúcares totais', unidade: 'g' },
  { chave: 'proteina_g', rotulo: 'Proteínas', unidade: 'g' },
  { chave: 'lipideos_g', rotulo: 'Gorduras totais', unidade: 'g' },
  { chave: 'gordura_saturada_g', rotulo: 'Gorduras saturadas', unidade: 'g' },
  { chave: 'fibra_g', rotulo: 'Fibra alimentar', unidade: 'g' },
  { chave: 'sodio_mg', rotulo: 'Sódio', unidade: 'mg' },
]

/** Micronutrientes que o rótulo pode trazer, mas não é obrigado. */
export const CAMPOS_OPCIONAIS: readonly { readonly chave: ChaveNutrienteAlimento; readonly rotulo: string; readonly unidade: string }[] = [
  { chave: 'calcio_mg', rotulo: 'Cálcio', unidade: 'mg' },
  { chave: 'ferro_mg', rotulo: 'Ferro', unidade: 'mg' },
  { chave: 'zinco_mg', rotulo: 'Zinco', unidade: 'mg' },
  { chave: 'potassio_mg', rotulo: 'Potássio', unidade: 'mg' },
  { chave: 'magnesio_mg', rotulo: 'Magnésio', unidade: 'mg' },
  { chave: 'vitamina_c_mg', rotulo: 'Vitamina C', unidade: 'mg' },
]

export interface Produto {
  readonly id: number
  readonly nome: string
  readonly marca: string
  /** Porção declarada no rótulo, em gramas ou mililitros. */
  readonly porcaoG: number
  /** Como essa porção é servida: "1 pote", "2 fatias". Vazio quando o rótulo não diz. */
  readonly medidaCaseira: string
  /** Valores do rótulo, na porção declarada. `null` = não informado no rótulo. */
  readonly porPorcao: Readonly<Partial<Record<ChaveNutrienteAlimento, number | null>>>
  readonly criadoEm: string
}

export interface ProblemaProduto {
  readonly campo: string
  readonly mensagem: string
}

/** Converte o valor por porção para 100 g ou 100 ml, que é como o resto do sistema trabalha. */
export function porCem(valorNaPorcao: number, porcaoG: number): number {
  return Math.round(((valorNaPorcao * 100) / porcaoG) * 100) / 100
}

export function validarProduto(p: Produto): readonly ProblemaProduto[] {
  const problemas: ProblemaProduto[] = []
  if (p.nome.trim() === '') problemas.push({ campo: 'nome', mensagem: 'O produto precisa de um nome.' })
  if (!(p.porcaoG > 0)) problemas.push({ campo: 'porcaoG', mensagem: 'A porção precisa ser maior que zero.' })
  if (p.porcaoG > 2000) problemas.push({ campo: 'porcaoG', mensagem: 'A porção não deve passar de 2000 g ou ml.' })

  for (const campo of CAMPOS_ROTULO) {
    const valor = p.porPorcao[campo.chave]
    if (valor === null || valor === undefined) {
      problemas.push({ campo: campo.chave, mensagem: `${campo.rotulo} é obrigatório no rótulo.` })
    } else if (valor < 0) {
      problemas.push({ campo: campo.chave, mensagem: `${campo.rotulo} não pode ser negativo.` })
    }
  }

  const acucares = p.porPorcao.acucares_g
  const carboidrato = p.porPorcao.carboidrato_g
  if (typeof acucares === 'number' && typeof carboidrato === 'number' && acucares > carboidrato) {
    problemas.push({ campo: 'acucares_g', mensagem: 'Açúcares não podem passar dos carboidratos totais. Confira o rótulo.' })
  }

  const saturada = p.porPorcao.gordura_saturada_g
  const lipideos = p.porPorcao.lipideos_g
  if (typeof saturada === 'number' && typeof lipideos === 'number' && saturada > lipideos) {
    problemas.push({ campo: 'gordura_saturada_g', mensagem: 'Gordura saturada não pode passar da gordura total. Confira o rótulo.' })
  }

  return problemas
}

/** O produto entra na busca e nos cálculos como um alimento normal, por 100 g. */
export function produtoComoAlimento(p: Produto): Alimento {
  const nutrientes: Partial<Record<ChaveNutrienteAlimento, number | null>> = {}
  for (const [chave, valor] of Object.entries(p.porPorcao)) {
    nutrientes[chave as ChaveNutrienteAlimento] = typeof valor === 'number' ? porCem(valor, p.porcaoG) : null
  }
  const descricao = p.marca.trim() ? `${p.nome.trim()} (${p.marca.trim()})` : p.nome.trim()
  return {
    id: p.id,
    descricao,
    categoria: 'Meus produtos',
    base: null,
    preparo: null,
    qualificadores: null,
    nutrientes: nutrientes as Alimento['nutrientes'],
    tracos: [],
  }
}

export interface RepositorioProdutos {
  listar(): readonly Produto[]
  salvar(dados: Omit<Produto, 'id' | 'criadoEm'> & { readonly id?: number }): Produto
  excluir(id: number): void
  readonly persistente: boolean
}

function ehProduto(v: unknown): v is Produto {
  if (typeof v !== 'object' || v === null) return false
  const o = v as Record<string, unknown>
  return typeof o['id'] === 'number' && typeof o['nome'] === 'string' && typeof o['porcaoG'] === 'number' && typeof o['porPorcao'] === 'object'
}

export function criarRepositorioProdutos(armazenamento: Armazenamento | null, agora: () => string = () => new Date().toISOString()): RepositorioProdutos {
  const memoria = new Map<number, Produto>()
  let persistente = armazenamento !== null

  const ler = (): Produto[] => {
    if (!persistente || !armazenamento) return [...memoria.values()]
    try {
      const bruto: unknown = JSON.parse(armazenamento.getItem(CHAVE) ?? '[]')
      return Array.isArray(bruto) ? bruto.filter(ehProduto) : []
    } catch {
      return [...memoria.values()]
    }
  }

  const gravar = (lista: readonly Produto[]) => {
    for (const p of lista) memoria.set(p.id, p)
    if (!persistente || !armazenamento) return
    try {
      armazenamento.setItem(CHAVE, JSON.stringify(lista))
    } catch {
      persistente = false
    }
  }

  return {
    get persistente() {
      return persistente
    },

    listar() {
      return ler().sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
    },

    salvar(dados) {
      const lista = ler()
      const id = dados.id ?? Math.max(PRIMEIRO_ID_PRODUTO - 1, ...lista.map((p) => p.id)) + 1
      const anterior = lista.find((p) => p.id === id)
      const produto: Produto = {
        id,
        nome: dados.nome,
        marca: dados.marca,
        porcaoG: dados.porcaoG,
        medidaCaseira: dados.medidaCaseira,
        porPorcao: dados.porPorcao,
        criadoEm: anterior?.criadoEm ?? agora(),
      }
      gravar([...lista.filter((p) => p.id !== id), produto])
      return produto
    },

    excluir(id) {
      memoria.delete(id)
      gravar(ler().filter((p) => p.id !== id))
    },
  }
}
