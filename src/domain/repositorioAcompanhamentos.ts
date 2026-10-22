// Onde os acompanhamentos ficam guardados. Hoje: o navegador de quem montou o plano.
// Amanhã: o Supabase, sem reescrever tela nenhuma — é para isso que existe a
// interface `FonteAcompanhamentos` no fim do arquivo.
import type { Acompanhamento } from './acompanhamento.ts'
import { lerDieta } from './dietaDoLink.ts'
import type { Armazenamento } from './persistencia.ts'

const CHAVE = 'metanutri:acompanhamentos'
const FORMATO = 1

interface ArquivoSalvo {
  readonly formato: number
  readonly itens: readonly Acompanhamento[]
  /**
   * Ids dos links que já estiveram na nuvem (spec missoes-na-nuvem, CB-107). O que já esteve
   * e sumiu de lá foi apagado em outro aparelho. Arquivo antigo, sem o campo: nenhum esteve.
   */
  readonly naNuvem?: readonly string[]
  /**
   * Ids dos links com mudança daqui que ainda não chegou à nuvem (CB-108): a leitura não a
   * desfaz e tenta de novo. Arquivo antigo, sem o campo: nada pendente.
   */
  readonly pendentes?: readonly string[]
}

interface Guardado {
  readonly itens: readonly Acompanhamento[]
  readonly naNuvem: ReadonlySet<string>
  readonly pendentes: ReadonlySet<string>
}

const VAZIO: Guardado = { itens: [], naNuvem: new Set(), pendentes: new Set() }

/** As marcas que a cópia do aparelho guarda ao lado de cada link. */
export interface MarcasDoLink {
  /** Está (ou já esteve) na nuvem (CB-107). */
  readonly naNuvem?: boolean
  /** Tem mudança daqui que ainda não chegou à nuvem (CB-108). */
  readonly pendente?: boolean
}

const ids = (v: unknown): string[] => (Array.isArray(v) ? v.filter((id): id is string => typeof id === 'string') : [])

/** Liga ou desliga a marca; `undefined` deixa como estava. */
function comMarca(conjunto: ReadonlySet<string>, id: string, valor: boolean | undefined): Set<string> {
  const novo = new Set(conjunto)
  if (valor === true) novo.add(id)
  if (valor === false) novo.delete(id)
  return novo
}

/**
 * O link como o aparelho guardou. Guardado antes da dieta no link, ele não tem o campo: conta
 * como link sem dieta (CB-150). Dieta estragada também (CB-153).
 */
const comDietaLida = (a: Acompanhamento): Acompanhamento => ({ ...a, dieta: lerDieta((a as { readonly dieta?: unknown }).dieta) })

function ehAcompanhamento(v: unknown): v is Acompanhamento {
  if (typeof v !== 'object' || v === null) return false
  const o = v as Record<string, unknown>
  return (
    typeof o['id'] === 'string' &&
    typeof o['token'] === 'string' &&
    typeof o['casoId'] === 'string' &&
    typeof o['nome'] === 'string' &&
    typeof o['criadoEm'] === 'string' &&
    Array.isArray(o['missoes']) &&
    Array.isArray(o['marcacoes'])
  )
}

export function criarRepositorioAcompanhamentos(armazenamento: Armazenamento | null) {
  // Espelho em memória: é a única fonte quando o navegador bloqueia o armazenamento.
  let memoria: Guardado = VAZIO
  let persistente = false
  let aviso: string | null = null

  if (armazenamento === null) {
    aviso = 'Este navegador não permite guardar dados: os links de missões não sobrevivem ao fechar.'
  } else {
    try {
      armazenamento.setItem(`${CHAVE}:teste`, '1')
      armazenamento.removeItem(`${CHAVE}:teste`)
      persistente = true
    } catch {
      aviso = 'O navegador bloqueou o armazenamento: os links de missões não sobrevivem ao fechar.'
    }
  }

  /**
   * Os links como estão guardados, sem ler a dieta de cada um. Quem grava troca só o link mexido e devolve os
   * outros exatamente assim: o link de antes da dieta, regravado com `dieta: null`, contaria como mudado agora
   * na nuvem (spec dados-na-nuvem, D-171).
   */
  const lerGuardado = (): Guardado => {
    if (!persistente || !armazenamento) return memoria
    try {
      const bruto = armazenamento.getItem(CHAVE)
      if (bruto === null) return VAZIO
      const v: unknown = JSON.parse(bruto)
      if (typeof v !== 'object' || v === null) return VAZIO
      const arquivo = v as Partial<ArquivoSalvo>
      if (arquivo.formato !== FORMATO || !Array.isArray(arquivo.itens)) return VAZIO
      return { itens: arquivo.itens.filter(ehAcompanhamento), naNuvem: new Set(ids(arquivo.naNuvem)), pendentes: new Set(ids(arquivo.pendentes)) }
    } catch {
      return memoria
    }
  }

  const lerTudo = (): Guardado => {
    const guardado = lerGuardado()
    return { ...guardado, itens: guardado.itens.map(comDietaLida) }
  }

  const ler = (): readonly Acompanhamento[] => lerTudo().itens

  const gravar = ({ itens, naNuvem, pendentes }: Guardado) => {
    // As marcas só vivem enquanto o link existe: remover leva as marcas junto.
    const existe = (id: string) => itens.some((a) => a.id === id)
    const marcadosNaNuvem = [...naNuvem].filter(existe)
    const marcadosPendentes = [...pendentes].filter(existe)
    memoria = { itens: itens.map(comDietaLida), naNuvem: new Set(marcadosNaNuvem), pendentes: new Set(marcadosPendentes) }
    if (!persistente || !armazenamento) return
    try {
      armazenamento.setItem(
        CHAVE,
        JSON.stringify({ formato: FORMATO, itens, naNuvem: marcadosNaNuvem, pendentes: marcadosPendentes } satisfies ArquivoSalvo),
      )
    } catch {
      persistente = false
      aviso = 'O armazenamento do navegador está cheio: as marcações a partir de agora não serão salvas.'
    }
  }

  return {
    get aviso(): string | null {
      return aviso
    },

    listar(): readonly Acompanhamento[] {
      return [...ler()].sort((a, b) => b.criadoEm.localeCompare(a.criadoEm))
    },

    porId(id: string): Acompanhamento | null {
      return ler().find((a) => a.id === id) ?? null
    },

    /** O que o link do paciente usa. Token vazio nunca casa com nada. */
    porToken(token: string): Acompanhamento | null {
      if (!token) return null
      return ler().find((a) => a.token === token) ?? null
    },

    /** O acompanhamento vigente de um plano, se houver. */
    porCaso(casoId: string): Acompanhamento | null {
      return ler().find((a) => a.casoId === casoId) ?? null
    },

    /**
     * Grava a cópia do aparelho. As marcas só mudam quando ditas: sem elas, ficam como
     * estavam (gerar de novo sem internet não tira a marca de que o link está na nuvem).
     */
    salvar(acompanhamento: Acompanhamento, marcas: MarcasDoLink = {}): Acompanhamento {
      const atual = lerGuardado()
      const i = atual.itens.findIndex((a) => a.id === acompanhamento.id)
      gravar({
        itens: i === -1 ? [...atual.itens, acompanhamento] : atual.itens.map((a) => (a.id === acompanhamento.id ? acompanhamento : a)),
        naNuvem: comMarca(atual.naNuvem, acompanhamento.id, marcas.naNuvem),
        pendentes: comMarca(atual.pendentes, acompanhamento.id, marcas.pendente),
      })
      return acompanhamento
    },

    /**
     * Muda só as marcas de um link que existe, sem regravar o link: o texto dele fica como estava guardado e ele não
     * conta como mudado na nuvem da conta (spec dados-na-nuvem, CA-601). Link que não existe: nada muda.
     */
    marcar(id: string, marcas: MarcasDoLink): void {
      const atual = lerGuardado()
      if (!atual.itens.some((a) => a.id === id)) return
      gravar({ itens: atual.itens, naNuvem: comMarca(atual.naNuvem, id, marcas.naNuvem), pendentes: comMarca(atual.pendentes, id, marcas.pendente) })
    },

    /** Já esteve na nuvem? Se sim e sumiu de lá, foi apagado em outro aparelho (CB-107). */
    estaNaNuvem(id: string): boolean {
      return lerTudo().naNuvem.has(id)
    },

    /** Tem mudança daqui que ainda não chegou à nuvem (CB-108)? */
    estaPendente(id: string): boolean {
      return lerTudo().pendentes.has(id)
    },

    remover(id: string): void {
      const atual = lerGuardado()
      gravar({ ...atual, itens: atual.itens.filter((a) => a.id !== id) })
    },
  }
}

export type RepositorioAcompanhamentos = ReturnType<typeof criarRepositorioAcompanhamentos>

/** O valor em texto com as chaves de cada objeto em ordem: a ordem que o banco devolve não conta. */
function canonico(valor: unknown): string {
  if (Array.isArray(valor)) return `[${valor.map(canonico).join(',')}]`
  if (typeof valor !== 'object' || valor === null) return JSON.stringify(valor) ?? 'null'
  const campos = Object.entries(valor).sort(([a], [b]) => a.localeCompare(b))
  return `{${campos.map(([nome, v]) => `${JSON.stringify(nome)}:${canonico(v)}`).join(',')}}`
}

/** O que importa num link, para comparar o daqui com o da nuvem (a dieta já lida dos dois lados). */
const essencia = (a: Acompanhamento): string =>
  canonico([a.id, a.token, a.casoId, a.pacienteId, a.nome, a.criadoEm, a.missoes, a.marcacoes, a.usoNaoComercial, lerDieta(a.dieta)])

/**
 * O mesmo link nos dois lados (spec dados-na-nuvem, CA-601, DP-37): então a leitura da nuvem não o regrava. A ordem
 * dos campos e a dieta ausente (link de antes da dieta, banco sem o 012) não contam.
 */
export const mesmoLink = (a: Acompanhamento, b: Acompanhamento): boolean => essencia(a) === essencia(b)

/** A chave onde a cópia do aparelho fica (o backup leva e traz esta chave). */
export const CHAVE_ACOMPANHAMENTOS = CHAVE

/**
 * CB-108: o que vem de um backup (arquivo ou "Trazer da nuvem") chega sem mudança pendente.
 * A mudança guardada no backup é velha: depois de restaurar, vale a nuvem. Texto que não dá
 * para ler volta como veio; o repositório já ignora o que não entende.
 */
export function semMudancasPendentes(guardado: string): string {
  try {
    const v: unknown = JSON.parse(guardado)
    if (typeof v !== 'object' || v === null || !('pendentes' in v)) return guardado
    return JSON.stringify(Object.fromEntries(Object.entries(v).filter(([campo]) => campo !== 'pendentes')))
  } catch {
    return guardado
  }
}

/**
 * A costura com o servidor. O link do paciente abre no aparelho **dele**, onde não
 * existe nada guardado — então essa busca é a única parte que precisa de rede de
 * verdade. Hoje a implementação local responde o que está neste navegador; quando
 * o Supabase entrar, basta uma segunda implementação desta mesma interface.
 */
export interface FonteAcompanhamentos {
  /** Nulo quando o link não existe. Pode rejeitar com `LinkSemConexao` quando nem a nuvem nem o aparelho responderam. */
  porToken(token: string): Promise<Acompanhamento | null>
  /** Pode rejeitar com `LinkSemConexao` quando a nuvem não gravou: aí nada foi guardado. */
  salvar(acompanhamento: Acompanhamento): Promise<Acompanhamento>
  /** Falso quando os dados só existem neste navegador, para a tela poder avisar. */
  readonly naNuvem: boolean
}

/**
 * A nuvem não respondeu (sem internet, ou o servidor recusou) e não havia como seguir sem ela (spec
 * revisao-geral-publica, D-232). A tela do paciente diz isso, em vez de "o link não existe" ou de fingir que salvou.
 */
export class LinkSemConexao extends Error {
  constructor() {
    super('Não foi possível falar com a nuvem.')
    this.name = 'LinkSemConexao'
  }
}

/**
 * A nuvem respondeu e recusou a marcação por um motivo dela, numa frase para quem lê, como "Este link já guarda
 * marcações demais." (spec revisao-geral-publica, revisão de 20/10/2026, M-3b). Tentar de novo não resolve, então a
 * tela mostra o motivo em vez de mandar conferir a internet.
 */
export class MarcacaoRecusada extends Error {
  constructor(readonly motivo: string) {
    super(motivo)
    this.name = 'MarcacaoRecusada'
  }
}

export function fonteLocal(repositorio: RepositorioAcompanhamentos): FonteAcompanhamentos {
  return {
    naNuvem: false,
    porToken: (token) => Promise.resolve(repositorio.porToken(token)),
    salvar: (acompanhamento) => Promise.resolve(repositorio.salvar(acompanhamento)),
  }
}
