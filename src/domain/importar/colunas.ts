// As colunas da planilha (spec importar-pacientes, D-904 e D-905): qual linha é o cabeçalho, para onde vai cada
// coluna e quantas linhas de paciente a aba tem. O reconhecimento resolve o caso comum sem clique; a nutricionista
// confere e muda o resto no passo Colunas.
import { registroComTexto, type Registro } from './lerTexto.ts'

/** D-901: até 2.000 linhas de paciente por arquivo. O teto segue o da nuvem (D-910). */
export const LIMITE_DE_LINHAS = 2000

/** D-919: só as 200 primeiras colunas entram; nenhuma ficha precisa de mais. */
export const LIMITE_DE_COLUNAS = 200

/** Quantas linhas do topo podem ser o cabeçalho (D-904). */
const LINHAS_DO_CABECALHO = 10

export type Destino = 'nome' | 'sobrenome' | 'sexo' | 'nascimento' | 'telefone' | 'email' | 'objetivo' | 'observacoes' | 'nao'

/** Os destinos na ordem da lista "Vai para", com o rótulo de cada um. */
export const DESTINOS: readonly { readonly valor: Destino; readonly rotulo: string }[] = [
  { valor: 'nome', rotulo: 'Nome' },
  { valor: 'sobrenome', rotulo: 'Sobrenome (junta ao nome)' },
  { valor: 'sexo', rotulo: 'Sexo' },
  { valor: 'nascimento', rotulo: 'Data de nascimento' },
  { valor: 'telefone', rotulo: 'Telefone' },
  { valor: 'email', rotulo: 'E-mail' },
  { valor: 'objetivo', rotulo: 'Objetivo' },
  { valor: 'observacoes', rotulo: 'Observações' },
  { valor: 'nao', rotulo: 'Não importar' },
]

/** Sem acento, sem caixa e só letra e número: "Dt. nasc." é "dtnasc" (DP-IP-8). */
export function normalizarCabecalho(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
}

/** Os nomes do D-904, mais alguns sinônimos óbvios das mesmas exportações. Igualdade, não "contém". */
const RECONHECIDOS: Readonly<Record<Exclude<Destino, 'nao'>, readonly string[]>> = {
  nome: ['nome', 'nome completo', 'paciente', 'nome do paciente', 'cliente', 'name', 'nombre', 'nome do cliente', 'full name', 'first name', 'primeiro nome'],
  sobrenome: ['sobrenome', 'último nome', 'last name', 'surname'],
  sexo: ['sexo', 'gênero', 'sex', 'gender'],
  nascimento: ['data de nascimento', 'nascimento', 'data nasc.', 'dt. nasc.', 'dn', 'aniversário', 'birth date', 'date of birth', 'data nascimento', 'dt nascimento', 'birthday'],
  telefone: ['telefone', 'celular', 'whatsapp', 'fone', 'tel.', 'phone', 'mobile', 'cel', 'telefone celular', 'phone number'],
  email: ['e-mail', 'email', 'correio eletrônico', 'e-mail address', 'email address'],
  objetivo: ['objetivo', 'motivo da consulta', 'meta', 'goal', 'objetivos'],
  observacoes: ['observações', 'obs.', 'notas', 'anotações', 'notes', 'observação', 'nota', 'anotação'],
}

const POR_NOME: ReadonlyMap<string, Destino> = new Map(
  Object.entries(RECONHECIDOS).flatMap(([destino, nomes]) => nomes.map((nome) => [normalizarCabecalho(nome), destino as Destino] as const)),
)

export function destinoDoCabecalho(texto: string): Destino {
  return POR_NOME.get(normalizarCabecalho(texto)) ?? 'nao'
}

/** "A", "B"… "Z", "AA": a letra da coluna, como o Excel mostra. */
export function letraDaColuna(indice: number): string {
  let n = indice + 1
  let letras = ''
  while (n > 0) {
    const resto = (n - 1) % 26
    letras = String.fromCharCode(65 + resto) + letras
    n = Math.floor((n - 1) / 26)
  }
  return letras
}

export interface Coluna {
  readonly indice: number
  /** O texto do cabeçalho; sem cabeçalho (ou com a célula vazia), "Coluna B". */
  readonly nome: string
  /** O valor da primeira linha de paciente, sem os espaços das pontas (DP-IP-9). */
  readonly exemplo: string
}

export interface AnaliseDaAba {
  /** O número da linha do cabeçalho; `null` quando nenhuma das 10 primeiras tem nome reconhecido (CA-1913). */
  readonly cabecalho: number | null
  readonly colunas: readonly Coluna[]
  /** As linhas de paciente: as com texto depois do cabeçalho (ou todas, sem cabeçalho; DP-IP-7). */
  readonly linhas: readonly Registro[]
  /** O destino de cada coluna, reconhecido pelo cabeçalho. */
  readonly destinos: readonly Destino[]
  /** Quantas colunas vieram com destino. */
  readonly reconhecidas: number
  /** Passou de `LIMITE_DE_LINHAS` linhas de paciente (CA-1910). */
  readonly excede: boolean
  /** Havia mais de `LIMITE_DE_COLUNAS` colunas; as de depois ficaram de fora (D-919). */
  readonly colunasCortadas: boolean
}

/** Um destino por coluna, menos Observações: o repetido volta a "Não importar" (CB-905). */
function semRepetir(destinos: readonly Destino[]): Destino[] {
  const usados = new Set<Destino>()
  return destinos.map((destino) => {
    if (destino === 'nao' || destino === 'observacoes') return destino
    if (usados.has(destino)) return 'nao'
    usados.add(destino)
    return destino
  })
}

/** Lê a aba: cabeçalho, colunas, linhas de paciente e destinos. `cortada`: o leitor parou antes do fim. */
export function analisarAba(registros: readonly Registro[], cortada: boolean, limite = LIMITE_DE_LINHAS): AnaliseDaAba {
  const comTexto = registros.filter((r) => registroComTexto(r.celulas))
  let posicaoDoCabecalho = -1
  let melhor = 0
  comTexto.slice(0, LINHAS_DO_CABECALHO).forEach((registro, posicao) => {
    const reconhecidos = registro.celulas.filter((c) => destinoDoCabecalho(c) !== 'nao').length
    if (reconhecidos > melhor) {
      melhor = reconhecidos
      posicaoDoCabecalho = posicao
    }
  })
  const cabecalho = posicaoDoCabecalho >= 0 ? (comTexto[posicaoDoCabecalho] ?? null) : null
  const linhas = comTexto.slice(posicaoDoCabecalho + 1)

  // As colunas vão até a última que tem nome no cabeçalho ou algum valor: a vazia no fim (separador sobrando) sai.
  let quantas = 0
  for (const registro of [...(cabecalho ? [cabecalho] : []), ...linhas]) {
    for (let i = registro.celulas.length - 1; i >= quantas; i -= 1) {
      if ((registro.celulas[i] ?? '').trim() !== '') {
        quantas = i + 1
        break
      }
    }
  }

  // D-919 e CB-926: além da 200ª coluna, nada entra.
  const colunasCortadas = quantas > LIMITE_DE_COLUNAS
  quantas = Math.min(quantas, LIMITE_DE_COLUNAS)

  const primeira = linhas[0]
  const colunas: Coluna[] = Array.from({ length: quantas }, (_, indice) => {
    const texto = (cabecalho?.celulas[indice] ?? '').trim()
    return { indice, nome: texto === '' ? `Coluna ${letraDaColuna(indice)}` : texto, exemplo: (primeira?.celulas[indice] ?? '').trim() }
  })
  const destinos = semRepetir(colunas.map((coluna) => (cabecalho ? destinoDoCabecalho(cabecalho.celulas[coluna.indice] ?? '') : 'nao')))

  return {
    cabecalho: cabecalho?.numero ?? null,
    colunas,
    linhas,
    destinos,
    reconhecidas: destinos.filter((d) => d !== 'nao').length,
    excede: cortada || linhas.length > limite,
    colunasCortadas,
  }
}

/** D-905: escolher um destino já usado devolve a outra coluna a "Não importar"; Observações aceita várias. */
export function mudarDestino(destinos: readonly Destino[], indice: number, destino: Destino): Destino[] {
  return destinos.map((atual, i) => {
    if (i === indice) return destino
    return destino !== 'nao' && destino !== 'observacoes' && atual === destino ? 'nao' : atual
  })
}

/** CA-1914: sem coluna em Nome, a prévia não abre. */
export const temNome = (destinos: readonly Destino[]): boolean => destinos.includes('nome')
