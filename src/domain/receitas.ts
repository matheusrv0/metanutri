// As receitas da conta (spec receitas-com-calculo, D-271 a D-274).
//
// A biblioteca fica na chave `metanutri:receitas`, uma lista com id, como os modelos de suplemento: vai para a nuvem
// item por item, com lápide (D-272). O plano nunca lê daqui depois de pôr a receita: ele guarda uma cópia (D-273).
import { interpretarEntrada, normalizar } from './busca.ts'
import { nomeDaCopia } from './duplicar.ts'
import type { Armazenamento } from './persistencia.ts'
import { ID_DE_RECEITA, NOMES_DA_PORCAO, pesoDaPorcao } from './receitaNoPlano.ts'
import { totaisDeItens, type Totais } from './totais.ts'
import type { Alimento, BuscarAlimento, IngredienteReceita, ReceitaDoPlano } from './tipos.ts'

export const CHAVE_RECEITAS = 'metanutri:receitas'

/**
 * D-274a (publicação em duas vezes): pôr receita na refeição fica desligado na publicação 1, para nenhum plano ganhar
 * receita antes de todo aparelho ter a versão que sabe ler (R-270). A biblioteca, a linha do plano, a folha, o link e o
 * Word já leem receita. Na publicação 2, o coordenador troca para `true`.
 */
export const RECEITAS_NA_REFEICAO: boolean = false

export interface Receita {
  readonly id: string
  readonly nome: string
  readonly ingredientes: readonly IngredienteReceita[]
  readonly porcoes: number
  readonly nomeDaPorcao: string
  /** `null` = a soma dos ingredientes (D-271). */
  readonly pesoProntoG: number | null
  readonly preparo: string
  readonly criadoEm: string
  /** A hora da última mudança: decide a junção entre aparelhos (CB-275). */
  readonly atualizadoEm: string
}

export type DadosReceita = Pick<Receita, 'nome' | 'ingredientes' | 'porcoes' | 'nomeDaPorcao' | 'pesoProntoG' | 'preparo'>

/** O que o editor tem enquanto a pessoa escreve: o rendimento pode estar vazio. */
export type RascunhoReceita = Omit<DadosReceita, 'porcoes'> & { readonly porcoes: number | null }

export interface ProblemaReceita {
  readonly campo: 'nome' | 'ingredientes' | 'porcoes' | 'pesoProntoG'
  readonly mensagem: string
}

/** CB-270: o que impede salvar, campo a campo. */
export function validarReceita(r: RascunhoReceita): readonly ProblemaReceita[] {
  const problemas: ProblemaReceita[] = []
  if (r.nome.trim() === '') problemas.push({ campo: 'nome', mensagem: 'A receita precisa de um nome.' })
  if (!r.ingredientes.some((i) => i.gramas > 0)) problemas.push({ campo: 'ingredientes', mensagem: 'Adicione pelo menos um ingrediente.' })
  if (r.porcoes === null || !Number.isFinite(r.porcoes) || r.porcoes <= 0) problemas.push({ campo: 'porcoes', mensagem: 'Diga quantas porções a receita rende.' })
  if (r.pesoProntoG !== null && !(r.pesoProntoG > 0)) problemas.push({ campo: 'pesoProntoG', mensagem: 'O peso pronto precisa ser maior que zero.' })
  return problemas
}

/** D-273: a cópia que vai para o item do plano. */
export function copiaParaOPlano(r: Receita): ReceitaDoPlano {
  return {
    origemId: r.id,
    nome: r.nome,
    ingredientes: r.ingredientes.map((i) => ({ alimentoId: i.alimentoId, gramas: i.gramas })),
    porcoes: r.porcoes,
    nomeDaPorcao: r.nomeDaPorcao,
    pesoProntoG: r.pesoProntoG,
    preparo: r.preparo,
  }
}

/** CA-862: o valor de uma porção, com a contagem de quem não tem dado (D-275). */
export function totaisDaPorcao(r: ReceitaDoPlano, buscar: BuscarAlimento): Totais {
  return totaisDeItens([{ id: 'porcao', alimentoId: ID_DE_RECEITA, gramas: pesoDaPorcao(r), receita: r }], buscar)
}

/** CA-866: as receitas cujo nome tem todas as palavras digitadas, sem acento e sem maiúscula. */
export function filtrarReceitas<T extends Pick<Receita, 'nome'>>(lista: readonly T[], termo: string): readonly T[] {
  const palavras = normalizar(termo).split(/\s+/).filter(Boolean)
  if (palavras.length === 0) return lista
  return lista.filter((r) => {
    const nome = normalizar(r.nome)
    return palavras.every((p) => nome.includes(p))
  })
}

// ---------- Na busca da refeição (D-274) ----------

/** No máximo 2 receitas acima dos alimentos (R-274). */
export const RECEITAS_NA_BUSCA = 2

export interface ResultadoReceita {
  readonly receita: Receita
  /** Gramas a pôr no plano; `null` quando a medida digitada não é a da porção (CA-872). */
  readonly gramas: number | null
  readonly porcoes: number | null
  readonly aviso: string | null
  /** O nome começa pelo que foi digitado e nenhum alimento achado começa igual: vem acima dos alimentos (D-274). */
  readonly antesDosAlimentos: boolean
}

/** Nomes de porção de uma palavra que a tabela de medidas não tem sozinhos ("copo", "xícara"), com o plural. */
const PORCOES_DE_UMA_PALAVRA = new Map<string, string>(
  NOMES_DA_PORCAO.filter((n) => !n.includes(' ')).flatMap((n) => {
    const base = normalizar(n)
    const plural = base.endsWith('ao') ? `${base.slice(0, -2)}oes` : `${base}s`
    return [
      [base, n],
      [plural, n],
    ]
  }),
)

const quantidadeEmTexto = (q: number): string => String(q).replace('.', ',')

/**
 * CA-871 e CA-872: as receitas que casam com o que foi digitado, com a quantidade a pôr. `alimentosAchados` são os
 * alimentos que a busca da refeição achou: se um deles começa pelo mesmo termo, a receita vem depois deles (D-274), e o
 * Enter de "75 banana" continua pondo banana mesmo com "Banana amassada com aveia" na biblioteca.
 */
export function buscarReceitas(texto: string, receitas: readonly Receita[], alimentosAchados: readonly Pick<Alimento, 'descricao'>[] = []): readonly ResultadoReceita[] {
  // CA-872: sem número no começo, o texto todo é o nome ("copo da felicidade", "fatia húngara"); a medida só vale depois
  // de um número ("2 unidade panqueca").
  const comNumero = /^\d/.test(normalizar(texto).trim())
  const lida = comNumero ? interpretarEntrada(texto) : { quantidade: null, medida: null, termos: normalizar(texto).trim().split(/\s+/).filter((t) => t !== '' && t !== 'de') }
  let { medida, termos } = lida
  const { quantidade } = lida
  if (comNumero && medida === null && termos.length > 1) {
    const daPorcao = PORCOES_DE_UMA_PALAVRA.get(termos[0] ?? '')
    if (daPorcao !== undefined) {
      medida = daPorcao
      termos = termos.slice(1)
    }
  }
  if (termos.length === 0) return []
  const primeiro = termos[0] ?? ''
  const alimentoComOMesmoComeco = alimentosAchados.some((a) => normalizar(a.descricao).startsWith(primeiro))

  return receitas
    .map((receita) => ({ receita, nome: normalizar(receita.nome) }))
    .filter(({ nome }) => termos.every((t) => nome.includes(t)))
    .sort((a, b) => Number(b.nome.startsWith(primeiro)) - Number(a.nome.startsWith(primeiro)) || a.receita.nome.localeCompare(b.receita.nome, 'pt-BR'))
    .slice(0, RECEITAS_NA_BUSCA)
    .map(({ receita, nome }): ResultadoReceita => {
      const antesDosAlimentos = nome.startsWith(primeiro) && !alimentoComOMesmoComeco
      const porcao = pesoDaPorcao(receita)
      if (medida === null) {
        if (quantidade === null) return { receita, gramas: porcao, porcoes: 1, aviso: null, antesDosAlimentos }
        return { receita, gramas: quantidade, porcoes: quantidade / porcao, aviso: null, antesDosAlimentos }
      }
      const nomeDaPorcao = receita.nomeDaPorcao.trim() || 'porção'
      const q = quantidade ?? 1
      if (medida === 'porção' || normalizar(medida) === normalizar(nomeDaPorcao)) return { receita, gramas: q * porcao, porcoes: q, aviso: null, antesDosAlimentos }
      return {
        receita,
        gramas: null,
        porcoes: null,
        aviso: `Esta receita é medida em ${nomeDaPorcao}. Use "${quantidadeEmTexto(q)} ${nomeDaPorcao}" ou as gramas.`,
        antesDosAlimentos,
      }
    })
}

// ---------- O repositório ----------

export interface RepositorioReceitas {
  listar(): readonly Receita[]
  obter(id: string): Receita | null
  /** Sem `id`, receita nova; com `id`, troca aquela e guarda a criação. */
  salvar(dados: DadosReceita & { readonly id?: string }): Receita
  /** CA-864: "Nome (cópia)"; `null` quando a receita não existe mais. */
  duplicar(id: string): Receita | null
  excluir(id: string): void
  readonly persistente: boolean
}

const ehNumero = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)

function ehReceita(v: unknown): v is Receita {
  if (typeof v !== 'object' || v === null) return false
  const o = v as Record<string, unknown>
  return (
    typeof o['id'] === 'string' &&
    typeof o['nome'] === 'string' &&
    Array.isArray(o['ingredientes']) &&
    (o['ingredientes'] as unknown[]).every((i) => typeof i === 'object' && i !== null && ehNumero((i as Record<string, unknown>)['alimentoId']) && ehNumero((i as Record<string, unknown>)['gramas'])) &&
    // CB-273: sem ingrediente com gramas, a receita não tem o que somar (dado mexido à mão).
    (o['ingredientes'] as { gramas: number }[]).some((i) => i.gramas > 0) &&
    ehNumero(o['porcoes']) &&
    o['porcoes'] > 0 &&
    typeof o['nomeDaPorcao'] === 'string' &&
    (o['pesoProntoG'] === null || (ehNumero(o['pesoProntoG']) && o['pesoProntoG'] > 0)) &&
    typeof o['preparo'] === 'string' &&
    typeof o['criadoEm'] === 'string' &&
    typeof o['atualizadoEm'] === 'string'
  )
}

export interface OpcoesReceitas {
  readonly agora?: () => string
  readonly gerarId?: () => string
}

export function criarRepositorioReceitas(armazenamento: Armazenamento | null, opcoes: OpcoesReceitas = {}): RepositorioReceitas {
  const agora = opcoes.agora ?? (() => new Date().toISOString())
  const gerarId = opcoes.gerarId ?? (() => globalThis.crypto.randomUUID())
  // A lista como está guardada: salvar uma receita não reescreve as outras, nem o que uma versão mais nova guardou a mais.
  let memoria: unknown[] = []
  let persistente = armazenamento !== null

  const lerBruto = (): unknown[] => {
    if (!persistente || !armazenamento) return memoria
    try {
      const bruto: unknown = JSON.parse(armazenamento.getItem(CHAVE_RECEITAS) ?? '[]')
      return Array.isArray(bruto) ? bruto : []
    } catch {
      return []
    }
  }

  const gravar = (lista: unknown[]) => {
    memoria = lista
    if (!persistente || !armazenamento) return
    try {
      armazenamento.setItem(CHAVE_RECEITAS, JSON.stringify(lista))
    } catch {
      persistente = false
    }
  }

  const ler = (): Receita[] => lerBruto().filter(ehReceita)
  const idDe = (v: unknown): unknown => (typeof v === 'object' && v !== null ? (v as Record<string, unknown>)['id'] : undefined)

  const salvar = (dados: DadosReceita & { readonly id?: string }): Receita => {
    const bruto = lerBruto()
    const anterior = dados.id === undefined ? undefined : ler().find((r) => r.id === dados.id)
    const quando = agora()
    const receita: Receita = {
      id: dados.id ?? gerarId(),
      nome: dados.nome.trim(),
      ingredientes: dados.ingredientes.map((i) => ({ alimentoId: i.alimentoId, gramas: i.gramas })),
      porcoes: dados.porcoes,
      nomeDaPorcao: dados.nomeDaPorcao,
      pesoProntoG: dados.pesoProntoG,
      preparo: dados.preparo,
      criadoEm: anterior?.criadoEm ?? quando,
      atualizadoEm: quando,
    }
    const posicao = bruto.findIndex((v) => idDe(v) === receita.id)
    gravar(posicao === -1 ? [...bruto, receita] : bruto.map((v, i) => (i === posicao ? receita : v)))
    return receita
  }

  return {
    get persistente() {
      return persistente
    },

    listar() {
      return ler().sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
    },

    obter(id) {
      return ler().find((r) => r.id === id) ?? null
    },

    salvar,

    duplicar(id) {
      const original = ler().find((r) => r.id === id)
      if (!original) return null
      const { nome, ingredientes, porcoes, nomeDaPorcao, pesoProntoG, preparo } = original
      return salvar({ nome: nomeDaCopia(nome), ingredientes, porcoes, nomeDaPorcao, pesoProntoG, preparo })
    },

    excluir(id) {
      gravar(lerBruto().filter((v) => idDe(v) !== id))
    },
  }
}
