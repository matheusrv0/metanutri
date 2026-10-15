// Paciente: a pessoa atendida. Um paciente tem vários planos ao longo do tempo.
// Fica no mesmo armazenamento local dos planos; nada sai deste aparelho.
import { normalizarRespostas, type RespostaAnamnese } from './anamnese.ts'
import { normalizarPedido, PEDIDO_VAZIO, type PedidoExames } from './exames.ts'
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
  readonly objetivo: string
  /** O que a pessoa não come: alergia, intolerância, escolha. Uma por linha. */
  readonly restricoes: string
  readonly condicoesClinicas: string
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
    proximaConsulta: null,
    respostasAnamnese: [],
    suplementos: [],
    pedidoExames: PEDIDO_VAZIO,
    criadoEm: agora,
    atualizadoEm: agora,
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
