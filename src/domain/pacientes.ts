// Paciente: a pessoa atendida. Um paciente tem vários planos ao longo do tempo.
// Fica no mesmo armazenamento local dos planos; nada sai deste aparelho.
import { normalizarRespostas, type RespostaAnamnese } from './anamnese.ts'
import { CONSUMO_VAZIO, lerConsumo, type ConsumoMensal } from './consumoDaCasa.ts'
import { normalizarPedido, PEDIDO_VAZIO, type PedidoExames } from './exames.ts'
import { lerDia, lerMomento, type MomentoDeVida } from './momentoDeVida.ts'
import type { Armazenamento } from './persistencia.ts'
import { lerConsulta } from './retorno.ts'
import { normalizarSuplementos, type Suplemento } from './suplementos.ts'
import type { Sexo } from './tipos.ts'

const CHAVE = 'metanutri:pacientes'

export interface Paciente {
  readonly id: string
  readonly nome: string
  readonly sexo: Sexo | null
  /** Data de nascimento em ISO (AAAA-MM-DD); a idade é calculada a partir dela. */
  readonly nascimento: string | null
  readonly telefone: string
  readonly email: string
  /** "Objetivo do paciente", nas palavras dele, no bloco Motivo da consulta (spec ficha-unica, D-346). */
  readonly objetivo: string
  /** "Outros alimentos que não come", um por linha: o que as escolhas de restrição não cobrem (D-351). */
  readonly restricoes: string
  /** "Outros diagnósticos": o texto livre ao lado das escolhas de doença (D-360). */
  readonly condicoesClinicas: string
  /** "Medicamentos em uso", no bloco Saúde (D-349). */
  readonly medicamentos: string
  /** O texto livre da anamnese, de antes do roteiro. Aparece no bloco "Observações" (spec anamnese-e-prescricoes, D-162). */
  readonly anamnese: string
  readonly observacoes: string
  /**
   * A próxima consulta, na hora de Brasília: `AAAA-MM-DD` ou `AAAA-MM-DDTHH:MM`; nulo quando não há
   * (spec whatsapp-e-retorno, D-143). Leia sempre por `lerConsulta`.
   */
  readonly proximaConsulta: string | null
  /** As respostas do roteiro de anamnese (D-163). */
  readonly respostasAnamnese: readonly RespostaAnamnese[]
  /** Suplementos escritos pelo nutricionista (D-165). */
  readonly suplementos: readonly Suplemento[]
  /** O pedido de exames atual (D-169). */
  readonly pedidoExames: PedidoExames
  readonly criadoEm: string
  readonly atualizadoEm: string
  // ---- Ficha única (spec ficha-unica, D-359 a D-362) ----
  /** Ocupação (18 anos ou mais) ou escola e ano (abaixo de 18). */
  readonly ocupacao: string
  readonly pessoasNaCasa: number | null
  /** Quem responde pela criança ou pelo adolescente. */
  readonly responsavel: string
  /** Gestação ou lactação (D-342); `null` quando não foi informado. */
  readonly momentoDeVida: MomentoDeVida | null
  /** Ids de `RESTRICOES` marcados; id desconhecido fica guardado e não conta (D-365). */
  readonly restricoesMarcadas: readonly string[]
  /** Ids de `DOENCAS` marcados; id desconhecido fica guardado e não aparece. */
  readonly doencas: readonly string[]
  readonly consumoMensal: ConsumoMensal
  readonly examesRecentes: readonly ExameRecente[]
}

/** Um resultado de exame registrado na anamnese (D-362). */
export interface ExameRecente {
  readonly id: string
  /** AAAA-MM-DD, ou vazio. */
  readonly data: string
  readonly exame: string
  readonly valor: string
}

export interface ResumoPaciente extends Paciente {
  /** Quantos planos existem para este paciente. */
  readonly planos: number
  readonly ultimoPlanoEm: string | null
}

export function criarPacienteVazio(id: string, agora: string): Paciente {
  return {
    id,
    nome: '',
    sexo: null,
    nascimento: null,
    telefone: '',
    email: '',
    objetivo: '',
    restricoes: '',
    condicoesClinicas: '',
    medicamentos: '',
    anamnese: '',
    observacoes: '',
    criadoEm: agora,
    atualizadoEm: agora,
    // Os campos das novidades vêm depois das datas: a versão de antes lê `{ ...fichaVaziaDela, ...ficha }`, e o texto
    // só sai igual com esta ordem; senão, uma aba antiga que salva uma ficha remarca todas (spec dados-na-nuvem, DP-34).
    proximaConsulta: null,
    respostasAnamnese: [],
    suplementos: [],
    pedidoExames: PEDIDO_VAZIO,
    // Os da ficha única vêm depois, pelo mesmo motivo (spec ficha-unica, D-365).
    ocupacao: '',
    pessoasNaCasa: null,
    responsavel: '',
    momentoDeVida: null,
    restricoesMarcadas: [],
    doencas: [],
    consumoMensal: CONSUMO_VAZIO,
    examesRecentes: [],
  }
}

/** Idade em anos completos e os meses que sobram, como as curvas da OMS pedem. */
export function idadeDe(nascimento: string | null, hoje: Date = new Date()): { readonly anos: number; readonly meses: number } | null {
  if (!nascimento) return null
  const m = nascimento.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!m) return null
  const [ano, mes, dia] = [Number(m[1]), Number(m[2]), Number(m[3])]
  const nasc = new Date(ano, mes - 1, dia)
  if (Number.isNaN(nasc.getTime()) || nasc > hoje) return null
  let anos = hoje.getFullYear() - ano
  let meses = hoje.getMonth() - (mes - 1)
  if (hoje.getDate() < dia) meses -= 1
  if (meses < 0) {
    anos -= 1
    meses += 12
  }
  return { anos, meses }
}

/** Idade em anos e meses num dia do calendário (AAAA-MM-DD): a da data da consulta (spec ficha-unica, D-341). */
export function idadeNaData(nascimento: string | null, dia: string): { readonly anos: number; readonly meses: number } | null {
  const data = lerDia(dia)
  if (!data) return null
  return idadeDe(nascimento, new Date(data.getUTCFullYear(), data.getUTCMonth(), data.getUTCDate()))
}

const texto = (v: unknown): string => (typeof v === 'string' ? v : '')
const listaDeTextos = (v: unknown): readonly string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [])
const pessoas = (v: unknown): number | null => (typeof v === 'number' && Number.isInteger(v) && v >= 1 && v <= 50 ? v : null)

/** D-365: exame estragado sai; campo a mais fica (como o CA-589). */
export function normalizarExamesRecentes(valor: unknown): ExameRecente[] {
  if (!Array.isArray(valor)) return []
  return valor.flatMap((item: unknown) => {
    if (typeof item !== 'object' || item === null) return []
    const o = item as Record<string, unknown>
    if (typeof o['id'] !== 'string' || o['id'] === '') return []
    return [{ ...o, id: o['id'], data: texto(o['data']), exame: texto(o['exame']), valor: texto(o['valor']) }]
  })
}

/** Uma restrição por linha; linhas vazias são ignoradas. */
export function listaDeRestricoes(texto: string): readonly string[] {
  return texto
    .split(/\r?\n|,/)
    .map((l) => l.trim())
    .filter((l) => l !== '')
}

export interface RepositorioPacientes {
  listar(): readonly Paciente[]
  obter(id: string): Paciente | null
  criar(nome: string): Paciente
  salvar(paciente: Paciente): Paciente
  excluir(id: string): void
  readonly persistente: boolean
}

/** A ficha como está guardada: uma versão mais velha (ou mais nova) pode ter deixado de fora algum campo. */
type PacienteGuardado = Pick<Paciente, 'id' | 'nome'> & Partial<Paciente>

function ehPaciente(v: unknown): v is PacienteGuardado {
  if (typeof v !== 'object' || v === null) return false
  const o = v as Record<string, unknown>
  return typeof o['id'] === 'string' && typeof o['nome'] === 'string'
}

export interface OpcoesPacientes {
  readonly agora?: () => string
  readonly gerarId?: () => string
}

export function criarRepositorioPacientes(armazenamento: Armazenamento | null, opcoes: OpcoesPacientes = {}): RepositorioPacientes {
  const agora = opcoes.agora ?? (() => new Date().toISOString())
  const gerarId = opcoes.gerarId ?? (() => globalThis.crypto.randomUUID())
  const memoria = new Map<string, Paciente>()
  let persistente = armazenamento !== null

  // Completa campos que versões antigas não tinham. A consulta estragada vira "sem consulta" (CA-526);
  // campo novo da anamnese e das prescrições estragado vira vazio (CA-588).
  const completar = (p: PacienteGuardado): Paciente => {
    const completo = { ...criarPacienteVazio(p.id, p.criadoEm ?? agora()), ...p }
    return {
      ...completo,
      proximaConsulta: lerConsulta(completo.proximaConsulta) ? completo.proximaConsulta : null,
      respostasAnamnese: normalizarRespostas(completo.respostasAnamnese),
      suplementos: normalizarSuplementos(completo.suplementos),
      pedidoExames: normalizarPedido(completo.pedidoExames),
      ocupacao: texto(completo.ocupacao),
      pessoasNaCasa: pessoas(completo.pessoasNaCasa),
      responsavel: texto(completo.responsavel),
      momentoDeVida: lerMomento(completo.momentoDeVida),
      restricoesMarcadas: listaDeTextos(completo.restricoesMarcadas),
      doencas: listaDeTextos(completo.doencas),
      consumoMensal: lerConsumo(completo.consumoMensal),
      examesRecentes: normalizarExamesRecentes(completo.examesRecentes),
    }
  }

  /**
   * As fichas como estão guardadas, sem completar nada. Quem grava troca só a ficha mexida e devolve as outras
   * exatamente assim: completar todas mudaria o texto delas, e cada uma contaria como mudada agora na nuvem
   * (spec dados-na-nuvem, D-171).
   */
  const lerGuardados = (): PacienteGuardado[] => {
    if (!persistente || !armazenamento) return [...memoria.values()]
    try {
      const bruto: unknown = JSON.parse(armazenamento.getItem(CHAVE) ?? '[]')
      return Array.isArray(bruto) ? bruto.filter(ehPaciente) : []
    } catch {
      return [...memoria.values()]
    }
  }

  const ler = (): Paciente[] => lerGuardados().map(completar)

  const gravar = (lista: readonly PacienteGuardado[]) => {
    memoria.clear()
    for (const p of lista) memoria.set(p.id, completar(p))
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
      return ler().sort((a, b) => b.atualizadoEm.localeCompare(a.atualizadoEm))
    },

    obter(id) {
      return ler().find((p) => p.id === id) ?? null
    },

    criar(nome) {
      const paciente = { ...criarPacienteVazio(gerarId(), agora()), nome }
      gravar([...lerGuardados(), paciente])
      return paciente
    },

    salvar(paciente) {
      const atualizado = { ...paciente, atualizadoEm: agora() }
      gravar([...lerGuardados().filter((p) => p.id !== paciente.id), atualizado])
      return atualizado
    },

    excluir(id) {
      gravar(lerGuardados().filter((p) => p.id !== id))
    },
  }
}
