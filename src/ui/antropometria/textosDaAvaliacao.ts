// Os textos da vista Avaliação (spec antropometria-telas, D-1407 a D-1421): o que a tela escreve a partir do motor.
// Nenhum número é calculado aqui; só formatado nas casas que o motor manda.
import { comSinalDeMenos } from '@/domain/antropometria.ts'
import type { ErroDaEstimativa, LadoUsado } from '@/domain/estimativas.ts'
import type { Fonte } from '@/domain/fontesAntropometria.ts'
import type { OpcoesDaGordura } from '@/domain/indicadoresDeGordura.ts'
import { medidaValida, type CampoQueFalta, type Detalhe, type IdDaLinha, type LinhaDoResultado, type NivelDaSituacao } from '@/domain/linhaDoResultado.ts'
import type { PesoIdeal } from '@/domain/pesoDeReferencia.ts'
import { conversaoDoProtocolo, protocoloPorId, type DobraCutanea, type Dobras, type IdProtocolo, type Protocolo, type VarianteDoProtocolo } from '@/domain/protocolosDeDobras.ts'
import type { Caso, OrigemDasMedidas, PontoDaCintura, Sexo } from '@/domain/tipos.ts'
import { formatarNumero } from '@/export/copiar-tabela.ts'

export const TRAVESSAO = '—'

/** As entradas do protocolo que a avaliação guarda: a maturação e o grupo do Slaughter (D-1012 e D-1414). */
export const opcoesDaGorduraDoCaso = (caso: Caso): OpcoesDaGordura => ({ maturacao: caso.avaliacao.maturacao, grupo: caso.avaliacao.grupoDoEstudo })

/** O número com as casas do motor e a unidade: "26,58 kg/m²", "29,5%", "10,6", "escore-z +1,23". Sem valor, "—" (nunca 0). */
export function comUnidade(valor: number | null, casas: number, unidade: string): string {
  if (valor === null) return TRAVESSAO
  const numero = formatarNumero(valor, casas)
  if (unidade === 'escore-z') return `escore-z ${valor > 0 ? '+' : ''}${comSinalDeMenos(numero)}`
  if (unidade === '') return numero
  return unidade === '%' ? `${numero}%` : `${numero} ${unidade}`
}

const ehDobra = (f: CampoQueFalta) => f.campo.startsWith('composicao.dobras.')

/** "o peso", "o peso e a estatura", "o sexo, a idade e o peso". */
export function emFrase(nomes: readonly string[]): string {
  if (nomes.length <= 1) return nomes.join('')
  return `${nomes.slice(0, -1).join(', ')} e ${nomes[nomes.length - 1] ?? ''}`
}

/** "Falta a cintura", "Faltam o peso e a estatura", "Faltam 3 dobras" (só dobras, 3 ou mais). */
export function textoDaFalta(falta: readonly CampoQueFalta[]): string {
  if (falta.length === 0) return ''
  if (falta.length >= 3 && falta.every(ehDobra)) return `Faltam ${falta.length} dobras`
  return `${falta.length === 1 ? 'Falta' : 'Faltam'} ${emFrase(falta.map((f) => f.nome))}`
}

/** D-1407: a origem do peso e da estatura, com o sexo da ficha; sem sexo, "pela pessoa". */
export function opcoesDaOrigem(sexo: Sexo | null): { readonly valor: OrigemDasMedidas; readonly rotulo: string }[] {
  const quem = sexo === 'F' ? 'pela paciente' : sexo === 'M' ? 'pelo paciente' : 'pela pessoa'
  return [
    { valor: 'aferidas', rotulo: 'Aferidos na consulta' },
    { valor: 'informadas', rotulo: `Informados ${quem}` },
    { valor: 'estimadas', rotulo: 'Estimados' },
  ]
}

/** O erro de uma estimativa como a tela escreve: "± 6 cm", "erro médio de 6%"; sem erro publicado, `null`. */
export function textoDoErro(erro: ErroDaEstimativa | null): string | null {
  if (erro === null) return null
  return erro.unidade === 'cm' ? `± ${formatarNumero(erro.valor, 0)} cm` : `erro médio de ${formatarNumero(erro.valor, erro.valor % 1 === 0 ? 0 : 1)}%`
}

/** O lado do braço e da panturrilha que a estimativa usou: "lado esquerdo" ou "braço direito, panturrilha esquerda". */
export function textoDosLados(lados: readonly LadoUsado[]): string | null {
  if (lados.length === 0) return null
  const [primeiro] = lados
  if (primeiro && lados.every((l) => l.lado === primeiro.lado)) return `lado ${primeiro.lado}`
  return lados.map((l) => (l.medida === 'braço' ? `braço ${l.lado}` : `panturrilha ${l.lado === 'direito' ? 'direita' : 'esquerda'}`)).join(', ')
}

const NOME_DA_COMPLEICAO = { pequena: 'pequena', media: 'média', grande: 'grande' } as const

/** D-1409 e D-1463: de onde vem o IMC-alvo do peso ideal. */
export function fraseDoImcAlvo(origem: PesoIdeal['origemDoImcAlvo'], compleicao: keyof typeof NOME_DA_COMPLEICAO | null): string {
  if (origem === 'digitado') return 'Definido por você.'
  if (origem === 'padrao-do-idoso') return 'Padrão do idoso. Edite se quiser.'
  return `Padrão da compleição ${NOME_DA_COMPLEICAO[compleicao ?? 'media']}. Edite se quiser.`
}

/** "53,5 a 72,2 kg". */
export const faixaEmKg = (min: number, max: number): string => `${formatarNumero(min, 1)} a ${formatarNumero(max, 1)} kg`

// --- Dobras (D-1412, D-1413 e D-1466) -----------------------------------------------------------------------------

/** "mulheres dos EUA (Jackson, Pollock e Ward, 1980)" sem a fonte entre parênteses, mais a faixa de idade da amostra. */
function populacao(v: VarianteDoProtocolo): string {
  const semFonte = v.populacao.replace(/\s*\([^)]*\)\s*$/, '')
  return v.idade ? `${semFonte}, de ${v.idade.min} a ${v.idade.max} anos` : semFonte
}

/** A conversão que o motor vai usar para a idade (D-1009 e D-1466). */
function textoDaConversao(protocolo: Protocolo, v: VarianteDoProtocolo, idadeAnos: number | null): string {
  if (v.saida === 'gordura') return 'dá a gordura direto'
  const conversao = conversaoDoProtocolo(protocolo, {})
  if (conversao === 'siri') return 'conversão de Siri'
  if (conversao === 'brozek') return 'conversão de Brozek'
  if (idadeAnos === null) return 'conversão de Lohman até 19 anos e de Siri depois'
  if (idadeAnos >= 20) return 'conversão de Siri'
  return idadeAnos >= 7 ? 'conversão de Lohman' : 'conversão de Lohman, que começa aos 7 anos'
}

export interface SobreOProtocolo {
  /** "Jackson, Pollock e Ward, 1980 · mulheres dos EUA, de 18 a 55 anos · conversão de Siri". */
  readonly linha: string
  /** O aviso fixo do protocolo e as notas da equação; vazio = sem nota. */
  readonly nota: string
  /** "Fora da população de origem: homens dos EUA, de 18 a 61 anos."; dentro dela (ou sem idade), `null`. */
  readonly fora: string | null
}

/** O quadro do protocolo escolhido (D-1412 e D-1466); sem sexo ou com um id desconhecido, `null`. */
export function sobreOProtocolo(id: IdProtocolo, sexo: Sexo | null, idadeAnos: number | null): SobreOProtocolo | null {
  const protocolo = protocoloPorId(id)
  if (!protocolo || sexo === null) return null
  const v = protocolo.porSexo[sexo]
  const notas = [
    protocolo.aviso,
    v.entradas.includes('peso') && v.entradas.includes('estatura') ? 'Usa também o peso e a estatura.' : null,
    (id === 'jackson-pollock-3' || id === 'jackson-pollock-7') && sexo === 'F' && idadeAnos !== null && idadeAnos > 40 ? 'Os autores pedem cautela acima de 40 anos.' : null,
  ].filter((n) => n !== null)
  const fora = v.idade !== null && idadeAnos !== null && (idadeAnos < v.idade.min || idadeAnos > v.idade.max) ? `Fora da população de origem: ${populacao(v)}.` : null
  return { linha: `${v.fonte.curta} · ${populacao(v)} · ${textoDaConversao(protocolo, v, idadeAnos)}`, nota: notas.join(' '), fora }
}

export interface DobraNaTela {
  readonly chave: DobraCutanea
  readonly nome: string
  /** Exigida pelo protocolo: o ponto e "(usada no protocolo)"; as outras ficam apagadas (D-1412). */
  readonly marcada: boolean
}

/** As 10 dobras do protótipo, na ordem dele; a supraespinal e a suprailíaca de antes só com valor (D-1412). */
const ORDEM_DAS_DOBRAS: readonly { readonly chave: DobraCutanea; readonly nome: string; readonly soComValor?: true }[] = [
  { chave: 'tricipital', nome: 'Tríceps' },
  { chave: 'bicipital', nome: 'Bíceps' },
  { chave: 'subescapular', nome: 'Subescapular' },
  { chave: 'peitoral', nome: 'Peitoral' },
  { chave: 'axilarMedia', nome: 'Axilar média' },
  { chave: 'suprailiacaAnt', nome: 'Suprailíaca · axilar anterior' },
  { chave: 'suprailiacaMed', nome: 'Suprailíaca · axilar média' },
  { chave: 'suprailiaca', nome: 'Suprailíaca · linha não informada', soComValor: true },
  { chave: 'abdominal', nome: 'Abdominal' },
  { chave: 'coxa', nome: 'Coxa' },
  { chave: 'panturrilhaMedial', nome: 'Panturrilha medial' },
  { chave: 'supraespinal', nome: 'Supraespinal', soComValor: true },
]

/**
 * As dobras da tela e as marcadas (D-1412 e D-1413). A suprailíaca marcada é a da linha do protocolo; nos que não
 * registram a linha (Guedes, Faulkner), a de linha não informada quando ela tem valor, senão a da axilar média.
 * `mostrar` diz se a dobra que só aparece com valor continua à vista (a que a pessoa apagou nesta sessão).
 */
export function dobrasNaTela(id: IdProtocolo, sexo: Sexo | null, dobras: Dobras, mostrar: (chave: DobraCutanea) => boolean = () => false): DobraNaTela[] {
  const protocolo = protocoloPorId(id)
  const exigidas = protocolo && sexo !== null ? protocolo.porSexo[sexo].dobras : []
  const marcadas = new Set<DobraCutanea>(exigidas.map((d) => (d === 'suprailiaca' && medidaValida(dobras.suprailiaca) === null ? 'suprailiacaMed' : d)))
  return ORDEM_DAS_DOBRAS.filter((d) => !d.soComValor || medidaValida(dobras[d.chave]) !== null || mostrar(d.chave)).map((d) => ({ chave: d.chave, nome: d.nome, marcada: marcadas.has(d.chave) }))
}

/** "As 7 dobras marcadas entram no protocolo. As outras ficam guardadas." ou "Faltam 2 das 7 dobras marcadas ..." (D-1412). */
export function fraseDasDobras(exigidas: number, faltam: number): string {
  if (faltam === 0) return `As ${exigidas} dobras marcadas entram no protocolo. As outras ficam guardadas.`
  return `${faltam === 1 ? 'Falta 1' : `Faltam ${faltam}`} das ${exigidas} dobras marcadas para calcular a gordura.`
}

// --- Resultado (D-1416, D-1417 e DP-AT-8) --------------------------------------------------------------------------

/** O tom do selo, pelos tokens de estado: ok (verde), baixo (âmbar), alto (vermelho) e neutro (D-1417, DP-AT-17). */
export type TomDoSelo = 'ok' | 'baixo' | 'alto' | 'neutro'

const TOM: Readonly<Record<NivelDaSituacao, TomDoSelo>> = { adequado: 'ok', atencao: 'baixo', alterado: 'alto', grave: 'alto', informativo: 'neutro' }

export const tomDoNivel = (nivel: NivelDaSituacao): TomDoSelo => TOM[nivel]

/** DP-AT-8: os nomes curtos do protótipo na tela; as linhas que ele não tem (e o IMC da criança e da gestante) usam o do motor. */
const NOME_NA_TELA: Readonly<Partial<Record<IdDaLinha, string>>> = {
  gordura: 'Gordura corporal',
  'massa-gorda': 'Massa gorda',
  'massa-magra': 'Massa magra',
  'soma-de-dobras': 'Soma de dobras',
  cintura: 'Cintura',
  rcq: 'Cintura/quadril',
  rce: 'Cintura/estatura',
  pescoco: 'Pescoço',
  cb: 'Braço (CB)',
  dct: 'Dobra tricipital',
  cmb: 'Músculo (CMB)',
  agb: 'Área de gordura (AGB)',
  'adequacao-cb': 'Adequação da CB',
  'adequacao-dct': 'Adequação da DCT',
  'adequacao-cmb': 'Adequação da CMB',
  panturrilha: 'Panturrilha',
  compleicao: 'Compleição',
}

const nomeNaTela = (linha: LinhaDoResultado): string => {
  if (linha.id === 'amb') return linha.nome.includes('corrigida') ? 'Área muscular (AMBc)' : 'Área muscular (AMB)'
  return NOME_NA_TELA[linha.id] ?? linha.nome
}

export const ROTULO_DO_PONTO: Readonly<Record<PontoDaCintura, string>> = {
  'ponto-medio': 'Ponto médio (OMS)',
  'crista-iliaca': 'Crista ilíaca (NIH)',
  'menor-perimetro': 'Menor perímetro',
}

/** O que a tela sabe além da linha: o método da gordura e o ponto da cintura (D-1417). */
export interface ContextoDaLinha {
  /** "Jackson & Pollock, 7 dobras · Siri" ou "Bioimpedância (InBody)". */
  readonly metodoDaGordura?: string | null
  readonly pontoDaCintura?: PontoDaCintura | null
}

const texto = (detalhes: readonly Detalhe[], rotulo: string): string | null => {
  const d = detalhes.find((x) => x.rotulo === rotulo)
  return d?.tipo === 'texto' ? d.texto : null
}

/** O detalhe curto embaixo do nome: o método, o percentil, o lado, o ponto (D-1417). */
function subtitulo(linha: LinhaDoResultado, contexto: ContextoDaLinha): string | null {
  const lado = texto(linha.detalhes, 'Lado')
  const doLado = lado ? `lado ${lado}` : null
  switch (linha.id) {
    case 'imc': {
      // A criança: o IMC embaixo do escore-z (CA-2435).
      const imc = linha.unidade === 'escore-z' ? linha.detalhes.find((d) => d.tipo === 'numero' && d.rotulo === 'IMC') : undefined
      return imc?.tipo === 'numero' ? `IMC ${comUnidade(imc.valor, imc.casas, imc.unidade)}` : null
    }
    case 'gordura':
    case 'massa-gorda':
    case 'massa-magra':
      return linha.valor === null ? null : (contexto.metodoDaGordura ?? null)
    case 'soma-de-dobras':
      return texto(linha.detalhes, 'Protocolo')
    case 'cintura':
      return contexto.pontoDaCintura ? ROTULO_DO_PONTO[contexto.pontoDaCintura] : 'Ponto não registrado'
    case 'cb':
    case 'dct':
    case 'cmb':
    case 'amb':
    case 'agb':
      return [texto(linha.detalhes, 'Percentil'), doLado].filter((t) => t !== null && t !== '').join(' · ') || null
    case 'compleicao':
      return 'Estatura ÷ punho'
    default:
      return doLado
  }
}

/** Os valores de apoio (densidade, P50 de referência, IMC da criança), para o painel da fonte. */
const apoio = (detalhes: readonly Detalhe[]): string[] =>
  detalhes.map((d) => (d.tipo === 'numero' ? `${d.rotulo}: ${comUnidade(d.valor, d.casas, d.unidade)}` : `${d.rotulo}: ${d.texto}`))

export interface ApresentacaoDaLinha {
  readonly id: IdDaLinha
  readonly nome: string
  readonly subtitulo: string | null
  readonly real: string
  readonly recomendacao: string
  readonly selo: { readonly rotulo: string; readonly tom: TomDoSelo } | null
  /** No lugar do selo, quando não há situação: o que falta, o motivo da recusa ou "—". */
  readonly nota: string | null
  readonly fonte: Fonte | null
  readonly avisos: readonly string[]
  readonly apoio: readonly string[]
}

/** A linha do motor como a tabela a desenha (D-1417). */
export function apresentarLinha(linha: LinhaDoResultado, contexto: ContextoDaLinha = {}): ApresentacaoDaLinha {
  const selo = linha.situacao ? { rotulo: linha.situacao.rotulo, tom: tomDoNivel(linha.situacao.nivel) } : null
  let nota: string | null = null
  if (!selo) {
    if (linha.falta.length > 0) {
      // CB-1405: sem as dobras completas, a gordura lembra a bioimpedância.
      const ou = linha.valor === null ? linha.avisos.find((a) => a.startsWith('Ou informe')) : undefined
      nota = ou ? `${textoDaFalta(linha.falta)}. ${ou}` : textoDaFalta(linha.falta)
    } else if (linha.valor === null && linha.avisos[0]) nota = linha.avisos[0]
    else nota = TRAVESSAO
  }
  return {
    id: linha.id,
    nome: nomeNaTela(linha),
    subtitulo: subtitulo(linha, contexto),
    real: comUnidade(linha.valor, linha.casas, linha.unidade),
    recomendacao: linha.recomendacao?.texto ?? TRAVESSAO,
    selo,
    nota,
    fonte: linha.fonte,
    avisos: linha.avisos,
    apoio: apoio(linha.detalhes),
  }
}

export type IdDoGrupo = 'peso-e-composicao' | 'gordura-central' | 'braco' | 'outras'

const GRUPO: Readonly<Record<IdDaLinha, IdDoGrupo>> = {
  imc: 'peso-e-composicao',
  gordura: 'peso-e-composicao',
  'massa-gorda': 'peso-e-composicao',
  'massa-magra': 'peso-e-composicao',
  'soma-de-dobras': 'peso-e-composicao',
  cintura: 'gordura-central',
  rcq: 'gordura-central',
  rce: 'gordura-central',
  pescoco: 'gordura-central',
  cb: 'braco',
  dct: 'braco',
  cmb: 'braco',
  amb: 'braco',
  agb: 'braco',
  'adequacao-cb': 'braco',
  'adequacao-dct': 'braco',
  'adequacao-cmb': 'braco',
  panturrilha: 'outras',
  compleicao: 'outras',
}

const NOME_DO_GRUPO: Readonly<Record<IdDoGrupo, string>> = {
  'peso-e-composicao': 'Peso e composição',
  'gordura-central': 'Gordura central',
  braco: 'Braço · Frisancho',
  outras: 'Outras',
}

const ORDEM: readonly IdDoGrupo[] = ['peso-e-composicao', 'gordura-central', 'braco', 'outras']

/** As linhas do motor nos 4 grupos da tela, na ordem do motor; grupo sem linha não vem (D-1416). */
export function gruposDoResultado(linhas: readonly LinhaDoResultado[]): { readonly id: IdDoGrupo; readonly nome: string; readonly linhas: readonly LinhaDoResultado[] }[] {
  return ORDEM.map((id) => ({ id, nome: NOME_DO_GRUPO[id], linhas: linhas.filter((l) => GRUPO[l.id] === id) })).filter((g) => g.linhas.length > 0)
}
