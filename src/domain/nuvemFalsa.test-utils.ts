// A tabela `copias` de mentira, para os testes do domínio e das telas (spec dados-na-nuvem).
// O nome não termina em `.test.ts`, então o Vitest não roda este arquivo como teste.
//
// Imita o que importa do Supabase: o RLS (cada sessão só vê a própria linha), a chave primária
// (23505 no insert repetido), a trava de tamanho (23514, copias_dados_tamanho), a falha de rede
// (status 0) e o `update … eq … select`, que devolve só as linhas que casaram com os filtros.

interface Erro {
  readonly message: string
  readonly code?: string
}

interface Resposta {
  readonly data: unknown
  readonly error: Erro | null
  readonly status?: number
}

export interface LinhaCopia {
  readonly nutricionista_id: string
  readonly dados: unknown
  readonly aparelho: string
  readonly atualizado_em: string
}

type Operacao = 'select' | 'insert' | 'update' | 'upsert' | 'delete'

export interface NuvemFalsa {
  readonly linhas: Map<string, LinhaCopia>
  /** De quem é a sessão; `null` sem sessão. */
  usuario: string | null
  /** Enquanto verdadeiro, todo pedido falha como sem internet. */
  semInternet: boolean
  /** Recusa a cópia com JSON maior que isto, como a trava de 5 MB. */
  limite: number | null
  /** Responde 413 (o servidor recusou antes de chegar ao banco). */
  recusar413: boolean
  /** Enquanto verdadeiro, as respostas esperam `soltar()`. */
  segurar: boolean
  /** Enquanto verdadeiro, o pedido chega ao banco, mas a resposta se perde no caminho (nunca volta). */
  perderResposta: boolean
  /** Os sinais de desistir que vieram com os pedidos. */
  readonly sinais: AbortSignal[]
  soltar(): void
  /** Os pedidos feitos à tabela `copias`, na ordem: "select", "insert", "update". */
  readonly pedidos: Operacao[]
  /** Grava a linha direto, como outro aparelho faria. */
  guardar(usuario: string, dados: unknown, atualizadoEm: string): void
  readonly cliente: ClienteFalso
}

/** O Postgres devolve o `timestamptz` com `+00:00`; o aparelho manda com `Z`. Os dois são o mesmo instante. */
const comoBanco = (iso: string): string => iso.replace(/Z$/, '+00:00')
const mesmoInstante = (a: unknown, b: unknown): boolean => typeof a === 'string' && typeof b === 'string' && Date.parse(a) === Date.parse(b)

class Consulta implements PromiseLike<Resposta> {
  private operacao: Operacao | null = null
  private corpo: Record<string, unknown> = {}
  private readonly filtros: [string, string][] = []
  private unico = false

  constructor(
    private readonly tabela: string,
    private readonly nuvem: NuvemFalsa,
    private readonly esperar: () => Promise<void>,
  ) {}

  select(): this {
    if (this.operacao === null) this.operacao = 'select'
    return this
  }
  insert(linha: Record<string, unknown>): this {
    this.operacao = 'insert'
    this.corpo = linha
    return this
  }
  upsert(linha: Record<string, unknown>): this {
    this.operacao = 'upsert'
    this.corpo = linha
    return this
  }
  update(campos: Record<string, unknown>): this {
    this.operacao = 'update'
    this.corpo = campos
    return this
  }
  delete(): this {
    this.operacao = 'delete'
    return this
  }
  eq(coluna: string, valor: string): this {
    this.filtros.push([coluna, valor])
    return this
  }
  in(): this {
    return this
  }
  order(): this {
    return this
  }
  maybeSingle(): this {
    this.unico = true
    return this
  }
  abortSignal(sinal: AbortSignal): this {
    this.nuvem.sinais.push(sinal)
    return this
  }

  then<A = Resposta, B = never>(aoCumprir?: ((v: Resposta) => A | PromiseLike<A>) | null, aoFalhar?: ((e: unknown) => B | PromiseLike<B>) | null): PromiseLike<A | B> {
    if (this.nuvem.perderResposta) {
      this.executar()
      return new Promise<Resposta>(() => undefined).then(aoCumprir, aoFalhar)
    }
    return this.esperar()
      .then(() => this.executar())
      .then(aoCumprir, aoFalhar)
  }

  private casa(linha: LinhaCopia): boolean {
    return this.filtros.every(([coluna, valor]) => {
      const atual = (linha as unknown as Record<string, unknown>)[coluna]
      return coluna === 'atualizado_em' ? mesmoInstante(atual, valor) : atual === valor
    })
  }

  private executar(): Resposta {
    const nuvem = this.nuvem
    if (nuvem.semInternet) return { data: null, error: { message: 'TypeError: Failed to fetch', code: '' }, status: 0 }
    // Só a tabela da cópia existe aqui; as outras respondem como um erro qualquer do servidor.
    if (this.tabela !== 'copias') return { data: null, error: { message: 'relation does not exist', code: '42P01' }, status: 404 }
    if (this.operacao === null) return { data: null, error: { message: 'pedido vazio' }, status: 400 }
    nuvem.pedidos.push(this.operacao)
    const usuario = nuvem.usuario
    // RLS: sem sessão, nada; com sessão, só a própria linha.
    const visiveis = [...nuvem.linhas.values()].filter((l) => l.nutricionista_id === usuario && this.casa(l))

    if (this.operacao === 'select') {
      if (this.unico) return { data: visiveis[0] ?? null, error: null, status: 200 }
      return { data: visiveis, error: null, status: 200 }
    }

    if (nuvem.recusar413) return { data: null, error: { message: 'Payload Too Large' }, status: 413 }
    const dados = this.corpo['dados']
    if (dados !== undefined && nuvem.limite !== null && JSON.stringify(dados).length > nuvem.limite) {
      return { data: null, error: { message: 'new row for relation "copias" violates check constraint "copias_dados_tamanho"', code: '23514' }, status: 400 }
    }

    if (this.operacao === 'insert') {
      const id = this.corpo['nutricionista_id']
      if (id !== usuario || typeof id !== 'string') return { data: null, error: { message: 'new row violates row-level security policy', code: '42501' }, status: 403 }
      if (nuvem.linhas.has(id)) return { data: null, error: { message: 'duplicate key value violates unique constraint "copias_pkey"', code: '23505' }, status: 409 }
      const linha = this.linhaNova(id, undefined)
      nuvem.linhas.set(id, linha)
      return { data: [{ atualizado_em: linha.atualizado_em }], error: null, status: 201 }
    }

    if (this.operacao === 'update') {
      const atualizadas = visiveis.map((antiga) => {
        const linha = this.linhaNova(antiga.nutricionista_id, antiga)
        nuvem.linhas.set(antiga.nutricionista_id, linha)
        return { atualizado_em: linha.atualizado_em }
      })
      return { data: atualizadas, error: null, status: 200 }
    }

    return { data: null, error: { message: `operação ${this.operacao} não imitada` }, status: 400 }
  }

  private linhaNova(id: string, antiga: LinhaCopia | undefined): LinhaCopia {
    const atualizado = this.corpo['atualizado_em']
    const aparelho = this.corpo['aparelho']
    return {
      nutricionista_id: id,
      dados: this.corpo['dados'] ?? antiga?.dados ?? null,
      aparelho: typeof aparelho === 'string' ? aparelho : (antiga?.aparelho ?? ''),
      atualizado_em: comoBanco(typeof atualizado === 'string' ? atualizado : new Date().toISOString()),
    }
  }
}

export interface ClienteFalso {
  from(tabela: string): Consulta
  rpc(): Consulta
  auth: {
    getSession(): Promise<{ data: { session: { user: { id: string } } | null }; error: null }>
  }
}

export function nuvemFalsa(inicio: { readonly usuario?: string | null } = {}): NuvemFalsa {
  let liberar: (() => void) | null = null
  let porta: Promise<void> | null = null

  const nuvem: NuvemFalsa = {
    linhas: new Map(),
    usuario: inicio.usuario === undefined ? 'conta-a' : inicio.usuario,
    semInternet: false,
    limite: null,
    recusar413: false,
    segurar: false,
    perderResposta: false,
    sinais: [],
    soltar() {
      nuvem.segurar = false
      liberar?.()
      liberar = null
      porta = null
    },
    pedidos: [],
    guardar(usuario, dados, atualizadoEm) {
      nuvem.linhas.set(usuario, { nutricionista_id: usuario, dados, aparelho: 'Outro aparelho', atualizado_em: comoBanco(atualizadoEm) })
    },
    cliente: {
      from: (tabela) => new Consulta(tabela, nuvem, esperar),
      rpc: () => new Consulta('rpc', nuvem, esperar),
      auth: {
        getSession: async () => {
          await esperar()
          return { data: { session: nuvem.usuario === null ? null : { user: { id: nuvem.usuario } } }, error: null }
        },
      },
    },
  }

  function esperar(): Promise<void> {
    if (!nuvem.segurar) return Promise.resolve()
    porta ??= new Promise<void>((resolver) => {
      liberar = resolver
    })
    return porta
  }

  return nuvem
}
