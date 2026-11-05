// A prévia da importação (spec importar-pacientes, D-905 a D-909): cada linha de paciente lida pelo mapeamento, com as
// correções e as marcas da nutricionista, os problemas e quem fica de fora. Refeita do zero a cada mudança: o estado
// guardado é só o mapeamento, as correções e as marcas, pelo número da linha (CA-1932).
import type { Paciente } from '../pacientes.ts'
import type { Sexo } from '../tipos.ts'
import type { Coluna, Destino } from './colunas.ts'
import type { Registro } from './lerTexto.ts'
import { arrumarNome, lerData, lerSexo, lerTelefone, ordemDasDatas, type LeituraDaData, type LeituraDoSexo } from './valores.ts'

/** CA-1931: acima disto, as que começaram com problema vêm primeiro e a lista aparece em páginas (DP-IP-13). */
export const LINHAS_POR_PAGINA = 50

/** O que a nutricionista corrigiu na linha: a data digitada (DD/MM/AAAA) e o sexo escolhido ("" é "—"). */
export interface Correcao {
  readonly data?: string
  readonly sexo?: Sexo | ''
}

export type Problema = 'data' | 'sexo-vazio' | 'sexo-nao-reconhecido'

/** D-908: de fora, sem opção de marcar. */
export type Fora = { readonly tipo: 'igual'; readonly linha: number } | { readonly tipo: 'na-conta' }

export interface LinhaDaPrevia {
  readonly numero: number
  readonly nome: string
  readonly sexo: Sexo | null
  /** O texto da data (o da planilha ou o digitado), para o campo da correção. */
  readonly dataTexto: string
  /** A data lida (AAAA-MM-DD); nula sem data ou com a data inválida. */
  readonly nascimento: string | null
  readonly telefone: string
  readonly email: string
  readonly objetivo: string
  readonly observacoes: string
  readonly problemas: readonly Problema[]
  readonly fora: Fora | null
  readonly marcada: boolean
  readonly podeMarcar: boolean
  /** O que a coluna Situação diz: "Pronto", "Desmarcada", "Data inválida · Sexo vazio", "Entra sem a data"… */
  readonly motivo: string
  /** A linha mostra o campo da data (teve data inválida ou já tem correção). */
  readonly corrigeData: boolean
  readonly corrigeSexo: boolean
  /** Começou com problema, sem as correções: a ordem da lista (DP-IP-13). */
  readonly comecouComProblema: boolean
}

export interface Previa {
  /** Na ordem de mostrar (DP-IP-13). */
  readonly linhas: readonly LinhaDaPrevia[]
  readonly marcadas: readonly LinhaDaPrevia[]
  /** DP-IP-12: as marcadas, o mesmo N do botão. */
  readonly prontos: number
  /** DP-IP-12: as não marcadas com problema ou de fora. */
  readonly comProblema: number
  /** Os números das linhas sem nome, que ficam de fora e são contadas à parte (CA-1926). */
  readonly semNome: readonly number[]
  /** A coluna de nascimento foi lida como mês/dia (CA-1920). */
  readonly mesDia: boolean
  /** CB-901: toda linha está de fora e alguma já está na conta: nada para importar. */
  readonly todasNaConta: boolean
}

export interface EntradaDaPrevia {
  readonly linhas: readonly Registro[]
  readonly colunas: readonly Coluna[]
  readonly destinos: readonly Destino[]
  readonly correcoes: Readonly<Record<number, Correcao>>
  /** As escolhas da nutricionista; sem escolha, a pronta começa marcada e a com problema, não (D-909). */
  readonly marcas: Readonly<Record<number, boolean>>
  /** Os pacientes da conta, para "Já está na conta". */
  readonly pacientes: readonly Pick<Paciente, 'nome' | 'nascimento'>[]
  /** O dia de hoje (AAAA-MM-DD): data futura é inválida. */
  readonly hoje: string
}

/** Os campos do paciente que a linha leva (D-906). */
export interface DadosDoPaciente {
  readonly nome: string
  readonly sexo: Sexo | null
  readonly nascimento: string | null
  readonly telefone: string
  readonly email: string
  readonly objetivo: string
  readonly observacoes: string
}

/** D-908: o nome sem acento, sem caixa e sem espaço a mais. */
export const chaveDoNome = (nome: string): string =>
  nome
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()

/** D-908: mesma pessoa é o mesmo nome e a mesma data, ou o mesmo nome quando um dos dois não tem data. */
const mesmaData = (a: string | null, b: string | null): boolean => a === null || b === null || a === b

const TEXTO_DO_PROBLEMA: Readonly<Record<Problema, string>> = { data: 'Data inválida', 'sexo-vazio': 'Sexo vazio', 'sexo-nao-reconhecido': 'Sexo não reconhecido' }

function problemasDe(data: LeituraDaData, sexo: LeituraDoSexo): Problema[] {
  const problemas: Problema[] = []
  if (data.tipo === 'invalida') problemas.push('data')
  if (sexo.tipo === 'vazio') problemas.push('sexo-vazio')
  if (sexo.tipo === 'nao-reconhecido') problemas.push('sexo-nao-reconhecido')
  return problemas
}

function motivoDa(fora: Fora | null, problemas: readonly Problema[], marcada: boolean): string {
  if (fora?.tipo === 'igual') return `Igual à linha ${fora.linha}`
  if (fora?.tipo === 'na-conta') return 'Já está na conta'
  if (problemas.length === 0) return marcada ? 'Pronto' : 'Desmarcada'
  if (!marcada) return problemas.map((p) => TEXTO_DO_PROBLEMA[p]).join(' · ')
  const sem = [problemas.includes('data') ? 'a data' : null, problemas.some((p) => p !== 'data') ? 'o sexo' : null].filter((x): x is string => x !== null)
  return `Entra sem ${sem.join(' e sem ')}`
}

export function montarPrevia({ linhas, colunas, destinos, correcoes, marcas, pacientes, hoje }: EntradaDaPrevia): Previa {
  const indice = (destino: Destino): number => destinos.indexOf(destino)
  const [iNome, iSobrenome, iSexo, iData, iTelefone, iEmail, iObjetivo] = (['nome', 'sobrenome', 'sexo', 'nascimento', 'telefone', 'email', 'objetivo'] as const).map(indice)
  const iObservacoes = destinos.flatMap((destino, i) => (destino === 'observacoes' ? [i] : []))
  const celula = (registro: Registro, i: number | undefined): string => (i === undefined || i < 0 ? '' : (registro.celulas[i] ?? '').trim())

  const ordem = iData !== undefined && iData >= 0 ? ordemDasDatas(linhas.map((r) => celula(r, iData)), hoje) : 'dm'

  const naConta = new Map<string, (string | null)[]>()
  for (const paciente of pacientes) {
    const chave = chaveDoNome(paciente.nome)
    if (chave === '') continue
    naConta.set(chave, [...(naConta.get(chave) ?? []), paciente.nascimento])
  }

  const vistas = new Map<string, { numero: number; data: string | null }[]>()
  const semNome: number[] = []
  const lidas: LinhaDaPrevia[] = []
  for (const registro of linhas) {
    const nome = arrumarNome(`${celula(registro, iNome)} ${celula(registro, iSobrenome)}`)
    if (nome === '') {
      semNome.push(registro.numero)
      continue
    }
    const correcao = correcoes[registro.numero]
    const sexoDaPlanilha = lerSexo(celula(registro, iSexo))
    const dataDaPlanilha = lerData(celula(registro, iData), hoje, ordem)
    const sexo: LeituraDoSexo = correcao?.sexo ? { tipo: 'ok', sexo: correcao.sexo } : sexoDaPlanilha
    const dataTexto = correcao?.data ?? celula(registro, iData)
    // DP-IP-15: a data digitada na linha é sempre dia/mês.
    const data = correcao?.data !== undefined ? lerData(correcao.data, hoje, 'dm') : dataDaPlanilha
    const problemas = problemasDe(data, sexo)
    const nascimento = data.tipo === 'ok' ? data.iso : null

    const chave = chaveDoNome(nome)
    const anterior = (vistas.get(chave) ?? []).find((vista) => mesmaData(vista.data, nascimento))
    const fora: Fora | null = anterior
      ? { tipo: 'igual', linha: anterior.numero }
      : (naConta.get(chave) ?? []).some((dataDaConta) => mesmaData(dataDaConta, nascimento))
        ? { tipo: 'na-conta' }
        : null
    vistas.set(chave, [...(vistas.get(chave) ?? []), { numero: registro.numero, data: nascimento }])

    const escolha = marcas[registro.numero]
    const marcada = fora === null && (escolha ?? problemas.length === 0)
    const comecouComProblema = problemasDe(dataDaPlanilha, sexoDaPlanilha).length > 0
    lidas.push({
      numero: registro.numero,
      nome,
      sexo: sexo.tipo === 'ok' ? sexo.sexo : null,
      dataTexto,
      nascimento,
      telefone: lerTelefone(celula(registro, iTelefone)),
      email: celula(registro, iEmail),
      objetivo: celula(registro, iObjetivo),
      observacoes: iObservacoes
        .flatMap((i) => {
          const valor = celula(registro, i)
          return valor === '' ? [] : [`${colunas[i]?.nome ?? ''}: ${valor}`]
        })
        .join('\n'),
      problemas,
      fora,
      marcada,
      podeMarcar: fora === null,
      motivo: motivoDa(fora, problemas, marcada),
      corrigeData: fora === null && (correcao?.data !== undefined || dataDaPlanilha.tipo === 'invalida'),
      corrigeSexo: fora === null && (correcao?.sexo !== undefined || sexoDaPlanilha.tipo !== 'ok'),
      comecouComProblema: comecouComProblema || fora !== null,
    })
  }

  // DP-IP-13: até 50, a ordem da planilha; acima, as que começaram com problema (ou de fora) antes, sem pular depois.
  const ordenadas = lidas.length > LINHAS_POR_PAGINA ? [...lidas.filter((l) => l.comecouComProblema), ...lidas.filter((l) => !l.comecouComProblema)] : lidas
  const marcadas = lidas.filter((l) => l.marcada)
  return {
    linhas: ordenadas,
    marcadas,
    prontos: marcadas.length,
    comProblema: lidas.filter((l) => !l.marcada && (l.problemas.length > 0 || l.fora !== null)).length,
    semNome,
    mesDia: ordem === 'md',
    todasNaConta: lidas.length > 0 && lidas.every((l) => l.fora !== null) && lidas.some((l) => l.fora?.tipo === 'na-conta'),
  }
}

/**
 * D-909: a correção na linha. Com ela, a linha que fica sem problema é marcada; a data digitada inválida desmarca
 * (DP-IP-15); a linha que ainda tem outro problema fica como estava.
 */
export function corrigir(entrada: EntradaDaPrevia, numero: number, mudanca: Correcao): Pick<EntradaDaPrevia, 'correcoes' | 'marcas'> {
  const correcoes = { ...entrada.correcoes, [numero]: { ...entrada.correcoes[numero], ...mudanca } }
  const linha = montarPrevia({ ...entrada, correcoes, marcas: {} }).linhas.find((l) => l.numero === numero)
  if (linha === undefined || linha.fora !== null) return { correcoes, marcas: entrada.marcas }
  if (linha.problemas.length === 0) return { correcoes, marcas: { ...entrada.marcas, [numero]: true } }
  const corrigiuErrado = (mudanca.data !== undefined && linha.problemas.includes('data')) || mudanca.sexo === ''
  return { correcoes, marcas: corrigiuErrado ? { ...entrada.marcas, [numero]: false } : entrada.marcas }
}

/** DP-IP-14: marca (ou desmarca) todas as linhas que podem ser marcadas. */
export function marcarTodas(previa: Previa, marcas: Readonly<Record<number, boolean>>, valor: boolean): Record<number, boolean> {
  const novas: Record<number, boolean> = { ...marcas }
  for (const linha of previa.linhas) if (linha.podeMarcar) novas[linha.numero] = valor
  return novas
}

/** Os dados de cada linha marcada, na ordem da planilha. A linha com problema marcada entra sem a data ou sem o sexo. */
export function dadosDosPacientes(previa: Previa): DadosDoPaciente[] {
  return previa.marcadas.map(({ nome, sexo, nascimento, telefone, email, objetivo, observacoes }) => ({ nome, sexo, nascimento, telefone, email, objetivo, observacoes }))
}
