// Fotos e anexos da avaliação (spec antropometria-telas, D-1450 a D-1459 e D-1503 a D-1513). A regra mora aqui: o tipo
// pelo conteúdo, os lados pelo cabeçalho, os limites, os caminhos, o envio com a frase de cada recusa e "Comparar fotos".
// Quem guarda (o Supabase) e quem desenha (o <canvas>) chegam de fora, pelas interfaces `ArmazenamentoDeFotos` e
// `DesenhistaDeFoto` (src/ui/antropometria/armazenamentoDeFotos.ts e reduzirFoto.ts); os testes passam falsos.
//
// CFN 599/2018, art. 58: as fotos ficam só no prontuário. Nada daqui leva foto ao documento, ao link ou ao site.
import { dataCompleta } from './formatarData.ts'
import { comparacaoEntre, formatarNumero, type AvaliacaoDoHistorico } from './historicoAntropometrico.ts'
import { ladosPeloCabecalho, tipoPeloConteudo } from './logoDaMarca.ts'
import type { AnguloDaFoto, ArquivoDaAvaliacao, DadosDaAvaliacao, Sexo } from './tipos.ts'

/** D-1506: 1 MB = 1024 × 1024 bytes, no app e no balde. */
export const MEGA = 1024 * 1024
/** D-1451: até 5 fotos por avaliação. */
export const FOTOS_POR_AVALIACAO = 5
/** D-1457 e D-1511: até 10 anexos por avaliação. */
export const ANEXOS_POR_AVALIACAO = 10
/** D-1451: fotos e anexos somam até 8 MB por avaliação (o balde também recusa arquivo maior que isso). */
export const TETO_DA_AVALIACAO = 8 * MEGA
/** D-1452: a foto escolhida vai até 20 MB e 8000 px de lado, lidos antes de abrir. */
export const FOTO_ENVIO_MAX_BYTES = 20 * MEGA
export const LADO_MAXIMO_DA_FOTO = 8000
/** D-1453: o lado maior da foto guardada e a qualidade do JPEG. */
export const LADO_DA_FOTO = 1600
export const QUALIDADE_DA_FOTO = 0.85
/** D-1457: a URL assinada vale 10 minutos. */
export const VALIDADE_DA_URL_S = 600
/** D-1457: o balde privado. */
export const BALDE_DAS_FOTOS = 'fotos-avaliacao'

/** As frases fixas (D-1452, D-1453, D-1505, D-1507, CA-2485, CB-1413 a CB-1416). */
export const FRASES = {
  formatoFoto: 'Use JPG ou PNG.',
  formatoAnexo: 'Anexo em PDF, JPG ou PNG.',
  grande: 'Use uma foto de até 20 MB e 8000 px.',
  leitura: 'Não foi possível ler esta foto. Use JPG ou PNG.',
  passaFoto: 'Passa de 8 MB somando fotos e anexos. Reduza a foto.',
  passaAnexo: 'Passa de 8 MB somando fotos e anexos.',
  cincoFotos: 'Já há 5 fotos nesta avaliação.',
  dezAnexos: 'Já há 10 anexos nesta avaliação.',
  sessaoFoto: 'Entre de novo para enviar fotos.',
  sessaoAnexo: 'Entre de novo para enviar anexos.',
  redeFoto: 'A foto não subiu. Confira a internet e tente de novo.',
  redeAnexo: 'O anexo não subiu. Confira a internet e tente de novo.',
  excluir: 'Não foi possível excluir. Tente de novo.',
  abrir: 'Não foi possível abrir a foto.',
  abrirAnexo: 'Não foi possível abrir o anexo. Tente de novo.',
  semNuvem: 'Fotos e anexos ficam guardados na conta, na nuvem.',
  semOutra: 'Comparar fotos precisa de outra avaliação com foto.',
  regras: 'Até 5 fotos por avaliação. Fotos e anexos somam até 8 MB. Fotos em JPG ou PNG; anexos em PDF. Imagem anexada entra como foto.',
  dezDeDez: '10 de 10 anexos.',
} as const

export type TipoDoArquivo = ArquivoDaAvaliacao['tipo']
export type ConferenciaDaFoto = { readonly tipo: 'ok'; readonly mime: 'image/jpeg' | 'image/png' } | { readonly tipo: 'erro'; readonly mensagem: string }

/** Os ângulos na ordem da escolha (D-1454) e o nome de cada um. */
export const ANGULOS: readonly AnguloDaFoto[] = ['frente', 'lado', 'costas', 'outra']
export const NOME_DO_ANGULO: Readonly<Record<AnguloDaFoto, string>> = { frente: 'Frente', lado: 'Lado', costas: 'Costas', outra: 'Outra' }
/** "frente", "lado", "costas", "outra": o ângulo no meio da frase (a foto sem ângulo conta como Outra). */
export const anguloNaFrase = (angulo: AnguloDaFoto | undefined): string => NOME_DO_ANGULO[angulo ?? 'outra'].toLocaleLowerCase('pt-BR')
/** Os que "Comparar fotos" oferece (D-1455). */
export const ANGULOS_DA_COMPARACAO: readonly AnguloDaFoto[] = ['frente', 'lado', 'costas']

/**
 * D-1452 e D-1507: a foto pelo conteúdo, antes de abrir. JPEG ou PNG pela assinatura; até 20 MB; os lados lidos no
 * cabeçalho (o mesmo leitor da logo, DP-ML-32), até 8000 px. Sem os lados no cabeçalho, a foto não é lida.
 */
export function conferirFoto(bytes: Uint8Array): ConferenciaDaFoto {
  if (bytes.length > FOTO_ENVIO_MAX_BYTES) return { tipo: 'erro', mensagem: FRASES.grande }
  const mime = tipoPeloConteudo(bytes)
  if (mime !== 'image/jpeg' && mime !== 'image/png') return { tipo: 'erro', mensagem: FRASES.formatoFoto }
  const lados = ladosPeloCabecalho(bytes, mime)
  if (lados === null || !(lados.largura > 0) || !(lados.altura > 0)) return { tipo: 'erro', mensagem: FRASES.leitura }
  if (Math.max(lados.largura, lados.altura) > LADO_MAXIMO_DA_FOTO) return { tipo: 'erro', mensagem: FRASES.grande }
  return { tipo: 'ok', mime }
}

const ASSINATURA_PDF = [0x25, 0x50, 0x44, 0x46, 0x2d] // "%PDF-"

/** D-1452: o anexo é PDF (`%PDF-`), JPEG ou PNG pelo conteúdo; o resto, nulo. */
export function tipoDoAnexo(bytes: Uint8Array): TipoDoArquivo | null {
  if (ASSINATURA_PDF.every((b, i) => bytes[i] === b)) return 'application/pdf'
  const mime = tipoPeloConteudo(bytes)
  return mime === 'image/jpeg' || mime === 'image/png' ? mime : null
}

/** D-1453: o lado maior em até 1600 px, sem aumentar a foto pequena. */
export function ladosDaCopia(largura: number, altura: number): { readonly largura: number; readonly altura: number } {
  const escala = Math.min(1, LADO_DA_FOTO / Math.max(largura, altura))
  return { largura: Math.max(1, Math.round(largura * escala)), altura: Math.max(1, Math.round(altura * escala)) }
}

/** D-1451: o que a avaliação já usa, fotos e anexos somados. */
export function bytesUsados(avaliacao: DadosDaAvaliacao): number {
  return [...(avaliacao.fotos ?? []), ...(avaliacao.anexos ?? [])].reduce((soma, a) => soma + (Number.isFinite(a.bytes) && a.bytes > 0 ? a.bytes : 0), 0)
}

/** D-1451: o arquivo novo passa do teto de 8 MB da avaliação. */
export const tetoPassa = (usados: number, novo: number): boolean => usados + novo > TETO_DA_AVALIACAO

const EXTENSAO: Readonly<Record<TipoDoArquivo, string>> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'application/pdf': 'pdf' }

/** DP-AT-20: a pasta do plano, `<conta>/<plano>`. */
export const pastaDoPlano = (conta: string, plano: string): string => `${conta}/${plano}`
/** DP-AT-20: `<conta>/<plano>/fotos/<id>.jpg` (a foto guardada é sempre JPEG, D-1453). */
export const caminhoDaFoto = (conta: string, plano: string, id: string): string => `${pastaDoPlano(conta, plano)}/fotos/${id}.jpg`
/** DP-AT-20: `<conta>/<plano>/anexos/<id>.<pdf|jpg|png>`, pela extensão do conteúdo; o nome original nunca entra. */
export const caminhoDoAnexo = (conta: string, plano: string, id: string, tipo: TipoDoArquivo): string => `${pastaDoPlano(conta, plano)}/anexos/${id}.${EXTENSAO[tipo]}`

/** D-1509: o primeiro de Frente, Lado e Costas que a avaliação ainda não tem; com os três, Outra. */
export function anguloSugerido(fotos: readonly ArquivoDaAvaliacao[]): AnguloDaFoto {
  return ANGULOS_DA_COMPARACAO.find((a) => !fotos.some((f) => f.angulo === a)) ?? 'outra'
}

/** D-1506: "412 KB" abaixo de 1 MB (nunca "0 KB"); "1,1 MB" de 1 MB em diante. */
export function textoDoTamanho(bytes: number): string {
  if (bytes < MEGA) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  return `${formatarNumero(bytes / MEGA, 1)} MB`
}

/** D-1451: "3,7 de 8 MB usados". */
export const textoDoUso = (bytes: number): string => `${formatarNumero(bytes / MEGA, 1)} de 8 MB usados`

/** D-1508: as frases que falam da pessoa, pelo sexo da ficha; sem sexo, "a pessoa". */
export function textosPeloSexo(sexo: Sexo | null): { readonly autorizou: string; readonly marque: string; readonly lembrete: string } {
  const [artigo, da] = sexo === 'F' ? ['A paciente', 'da paciente'] : sexo === 'M' ? ['O paciente', 'do paciente'] : ['A pessoa', 'da pessoa']
  return {
    autorizou: `${artigo} autorizou fotos para o prontuário`,
    marque: `Marque a autorização ${da} para adicionar fotos.`,
    lembrete: `As fotos ficam só no prontuário. Não podem ir para divulgação, nem com autorização ${da} (CFN 599/2018, art. 58).`,
  }
}

// --- O envio (D-1453, D-1505) ------------------------------------------------------------------------------------------

/** `recusado`: o servidor respondeu e não aceitou; `sem-rede`: não respondeu. */
export type ResultadoDoEnvio = 'ok' | 'recusado' | 'sem-rede'

/** Quem guarda os arquivos: o armazenamento do Supabase na interface; um falso nos testes. */
export interface ArmazenamentoDeFotos {
  /** O id da conta que está dentro (a primeira pasta do caminho); nulo sem sessão. */
  conta(): Promise<string | null>
  /** Envia sem sobrescrever (o balde não tem alteração, D-1504). */
  enviar(caminho: string, arquivo: Blob, tipo: TipoDoArquivo): Promise<ResultadoDoEnvio>
  /** Quantos arquivos a pasta tem; nulo quando não deu para saber. */
  contar(pasta: string): Promise<number | null>
  /** A URL assinada de 10 minutos; nula quando não deu. */
  assinar(caminho: string): Promise<string | null>
  /** Verdadeiro quando os arquivos não estão mais lá (o que já não existia conta como apagado). */
  apagar(caminhos: readonly string[]): Promise<boolean>
  /** Apaga tudo dentro da pasta (`<conta>/<plano>`), em todas as subpastas. */
  apagarPasta(pasta: string): Promise<boolean>
}

/** A foto aberta pelo navegador, já girada pela orientação da câmera. */
export interface FotoAberta {
  readonly largura: number
  readonly altura: number
  /** O JPEG neste tamanho, sem os metadados da câmera. Pode lançar. */
  desenharJpeg(largura: number, altura: number, qualidade: number): Promise<Blob>
}

/** Quem abre e redesenha a foto: o <canvas> na interface; um falso nos testes. */
export interface DesenhistaDeFoto {
  /** Rejeita quando a foto não abre. */
  abrir(arquivo: Blob): Promise<FotoAberta>
}

export type EnvioDoArquivo = { readonly tipo: 'ok'; readonly arquivo: ArquivoDaAvaliacao } | { readonly tipo: 'erro'; readonly mensagem: string }

interface EntradaComum {
  readonly plano: string
  /** Os bytes do arquivo escolhido (para conferir o tipo e os lados antes de abrir). */
  readonly bytes: Uint8Array
  readonly arquivo: Blob
  /** A avaliação como está agora (para o teto e as contagens). */
  readonly avaliacao: DadosDaAvaliacao
  readonly agora: Date
  readonly gerarId: () => string
}

export interface EntradaDaFoto extends EntradaComum {
  readonly angulo: AnguloDaFoto
}

export interface EntradaDoAnexo extends EntradaComum {
  /** O nome do arquivo escolhido: só para a tela (DP-AT-20). */
  readonly nome: string
  /** O sexo da ficha, para a frase da autorização quando a imagem anexada vira foto (D-1508 e D-1530). */
  readonly sexo: Sexo | null
}

const erro = (mensagem: string): { readonly tipo: 'erro'; readonly mensagem: string } => ({ tipo: 'erro', mensagem })

/** D-1505: depois do envio, a frase de cada resposta do servidor (a recusa é lida pela pasta). */
async function subir(
  porta: ArmazenamentoDeFotos,
  caminho: (conta: string) => string,
  pasta: (conta: string) => string,
  blob: Blob,
  tipo: TipoDoArquivo,
  frases: { readonly sessao: string; readonly rede: string; readonly cheio: string; readonly limite: number },
): Promise<{ readonly tipo: 'ok'; readonly caminho: string } | { readonly tipo: 'erro'; readonly mensagem: string }> {
  const conta = await porta.conta()
  if (conta === null) return { tipo: 'erro', mensagem: frases.sessao }
  const destino = caminho(conta)
  const envio = await porta.enviar(destino, blob, tipo)
  if (envio === 'ok') return { tipo: 'ok', caminho: destino }
  if (envio === 'sem-rede') return { tipo: 'erro', mensagem: frases.rede }
  const contagem = await porta.contar(pasta(conta)).catch(() => null)
  return { tipo: 'erro', mensagem: contagem !== null && contagem >= frases.limite ? frases.cheio : frases.sessao }
}

/**
 * D-1452, D-1453 e D-1505: confere a foto pelos bytes, abre e redesenha em JPEG (lado maior até 1600 px, qualidade 0,85,
 * sem os metadados da câmera), confere o teto de 8 MB com a foto já reduzida e envia. Nada sobe pela metade: só o envio
 * aceito volta como item da lista.
 */
export async function enviarFoto(entrada: EntradaDaFoto, porta: ArmazenamentoDeFotos, desenhista: DesenhistaDeFoto): Promise<EnvioDoArquivo> {
  if ((entrada.avaliacao.fotos ?? []).length >= FOTOS_POR_AVALIACAO) return erro(FRASES.cincoFotos)
  const conferida = conferirFoto(entrada.bytes)
  if (conferida.tipo === 'erro') return conferida
  let blob: Blob
  try {
    const aberta = await desenhista.abrir(entrada.arquivo)
    if (!(aberta.largura > 0) || !(aberta.altura > 0)) return erro(FRASES.leitura)
    const lados = ladosDaCopia(aberta.largura, aberta.altura)
    blob = await aberta.desenharJpeg(lados.largura, lados.altura, QUALIDADE_DA_FOTO)
  } catch {
    return erro(FRASES.leitura)
  }
  if (blob.size === 0) return erro(FRASES.leitura)
  if (tetoPassa(bytesUsados(entrada.avaliacao), blob.size)) return erro(FRASES.passaFoto)
  const id = entrada.gerarId()
  const r = await subir(
    porta,
    (conta) => caminhoDaFoto(conta, entrada.plano, id),
    (conta) => `${pastaDoPlano(conta, entrada.plano)}/fotos`,
    blob,
    'image/jpeg',
    { sessao: FRASES.sessaoFoto, rede: FRASES.redeFoto, cheio: FRASES.cincoFotos, limite: FOTOS_POR_AVALIACAO },
  )
  if (r.tipo === 'erro') return r
  return {
    tipo: 'ok',
    arquivo: { id, angulo: entrada.angulo, nome: NOME_DO_ANGULO[entrada.angulo], caminho: r.caminho, bytes: blob.size, tipo: 'image/jpeg', enviadoEm: entrada.agora.toISOString() },
  }
}

/** O resultado do anexo diz em que lista o arquivo entra: a imagem anexada vira foto (D-1530). */
export type EnvioDoAnexo =
  | { readonly tipo: 'ok'; readonly campo: 'fotos' | 'anexos'; readonly arquivo: ArquivoDaAvaliacao }
  | { readonly tipo: 'erro'; readonly mensagem: string }

/**
 * D-1452, D-1505, D-1511 e D-1530: o anexo pelo conteúdo. O PDF sobe como anexo, sem passar do teto. O JPEG e o PNG são
 * imagem como a foto e seguem o caminho dela: pedem a autorização, contam nas 5 fotos e são redesenhados sem os metadados
 * da câmera (o GPS e o aparelho); entram entre as fotos, com o ângulo "Outra".
 */
export async function enviarAnexo(entrada: EntradaDoAnexo, porta: ArmazenamentoDeFotos, desenhista: DesenhistaDeFoto): Promise<EnvioDoAnexo> {
  const tipo = tipoDoAnexo(entrada.bytes)
  if (tipo === null) return erro(FRASES.formatoAnexo)
  if (tipo !== 'application/pdf') {
    if (entrada.avaliacao.fotosAutorizadasEm === null) return erro(textosPeloSexo(entrada.sexo).marque)
    const foto = await enviarFoto({ ...entrada, angulo: 'outra' }, porta, desenhista)
    return foto.tipo === 'ok' ? { tipo: 'ok', campo: 'fotos', arquivo: foto.arquivo } : foto
  }
  if ((entrada.avaliacao.anexos ?? []).length >= ANEXOS_POR_AVALIACAO) return erro(FRASES.dezAnexos)
  if (tetoPassa(bytesUsados(entrada.avaliacao), entrada.bytes.length)) return erro(FRASES.passaAnexo)
  const id = entrada.gerarId()
  // O tipo que vai ao servidor é o do conteúdo, nunca o que o navegador disse pelo nome.
  const blob = entrada.arquivo.slice(0, entrada.arquivo.size, tipo)
  const r = await subir(
    porta,
    (conta) => caminhoDoAnexo(conta, entrada.plano, id, tipo),
    (conta) => `${pastaDoPlano(conta, entrada.plano)}/anexos`,
    blob,
    tipo,
    { sessao: FRASES.sessaoAnexo, rede: FRASES.redeAnexo, cheio: FRASES.dezAnexos, limite: ANEXOS_POR_AVALIACAO },
  )
  if (r.tipo === 'erro') return r
  const nome = entrada.nome.trim() || `Anexo.${EXTENSAO[tipo]}`
  return { tipo: 'ok', campo: 'anexos', arquivo: { id, nome, caminho: r.caminho, bytes: entrada.bytes.length, tipo, enviadoEm: entrada.agora.toISOString() } }
}

// --- Comparar fotos (D-1455, D-1510) -----------------------------------------------------------------------------------

const fotosDe = (a: AvaliacaoDoHistorico): readonly ArquivoDaAvaliacao[] => a.caso.avaliacao.fotos ?? []

/** D-1510: a mais recente anterior à aberta, na ordem do Histórico (da mais velha à mais nova), com pelo menos uma foto. */
export function anteriorComFoto(avaliacoes: readonly AvaliacaoDoHistorico[], casoId: string): AvaliacaoDoHistorico | null {
  const posicao = avaliacoes.findIndex((a) => a.casoId === casoId)
  for (let i = posicao - 1; i >= 0; i--) {
    const a = avaliacoes[i]
    if (a && fotosDe(a).length > 0) return a
  }
  return null
}

/** D-1510: o primeiro de Frente, Lado e Costas que as duas têm; sem nenhum, Frente. */
export function anguloInicial(anterior: AvaliacaoDoHistorico, atual: AvaliacaoDoHistorico): AnguloDaFoto {
  return ANGULOS_DA_COMPARACAO.find((a) => fotosDe(anterior).some((f) => f.angulo === a) && fotosDe(atual).some((f) => f.angulo === a)) ?? 'frente'
}

export interface QuadroDaComparacao {
  /** "08/09/2026". */
  readonly data: string
  /** "Frente · 72,6 kg"; sem peso, "Frente". */
  readonly detalhe: string
  readonly foto: ArquivoDaAvaliacao | null
  /** "Sem foto de frente em 08/09/2026." quando falta. */
  readonly falta: string | null
}

export interface DiferencaDaComparacao {
  readonly nome: string
  /** "−1,1 kg". */
  readonly valor: string
  /** "72,6 → 71,5 kg · dentro do erro de medida". */
  readonly detalhe: string
}

export interface ComparacaoDeFotos {
  readonly quadros: readonly [QuadroDaComparacao, QuadroDaComparacao]
  readonly diferencas: readonly DiferencaDaComparacao[]
}

function quadro(a: AvaliacaoDoHistorico, angulo: AnguloDaFoto): QuadroDaComparacao {
  const data = dataCompleta(a.data)
  const foto = fotosDe(a).find((f) => f.angulo === angulo) ?? null
  const peso = a.caso.pesoKg
  const detalhe = peso === null ? NOME_DO_ANGULO[angulo] : `${NOME_DO_ANGULO[angulo]} · ${formatarNumero(peso, 1)} kg`
  return { data, detalhe, foto, falta: foto ? null : `Sem foto de ${anguloNaFrase(angulo)} em ${data}.` }
}

/** As linhas do documento (D-1494) que "Comparar fotos" mostra: o peso, a cintura e a soma das dobras. */
const DA_COMPARACAO = /^(Peso|Cintura|Soma das)/

/**
 * CA-2486 e D-1510: a foto do ângulo nas duas avaliações (a de antes primeiro) e as diferenças de peso, cintura e soma
 * das dobras com a leitura da mudança mínima detectável, da comparação do documento.
 */
export function comparacaoDeFotos(anterior: AvaliacaoDoHistorico, atual: AvaliacaoDoHistorico, angulo: AnguloDaFoto): ComparacaoDeFotos {
  const diferencas = comparacaoEntre(anterior, atual).linhas.flatMap((l): DiferencaDaComparacao[] => {
    if (!DA_COMPARACAO.test(l.nome) || l.antes === '—' || l.agora === '—') return []
    const unidade = /\(([^)]+)\)$/.exec(l.nome)?.[1] ?? ''
    const nome = l.nome.replace(/\s*\([^)]+\)$/, '')
    const faixa = `${l.antes} → ${l.agora}${unidade ? ` ${unidade}` : ''}`
    return [{ nome, valor: l.variacao, detalhe: l.leitura ? `${faixa} · ${l.leitura}` : faixa }]
  })
  return { quadros: [quadro(anterior, angulo), quadro(atual, angulo)], diferencas }
}

// --- A exclusão (D-1458, D-1503) ---------------------------------------------------------------------------------------

/** D-1458 e DP-AT-14: apaga a pasta do plano no balde (melhor esforço); sem sessão, não apaga nada. */
export async function apagarArquivosDoPlano(porta: ArmazenamentoDeFotos, plano: string): Promise<boolean> {
  const conta = await porta.conta()
  if (conta === null) return false
  return porta.apagarPasta(pastaDoPlano(conta, plano))
}

/** A avaliação tem foto, anexo ou a autorização marcada. */
export const temArquivos = (avaliacao: DadosDaAvaliacao): boolean =>
  (avaliacao.fotos?.length ?? 0) + (avaliacao.anexos?.length ?? 0) > 0 || avaliacao.fotosAutorizadasEm !== null

/** D-1503: a avaliação do paciente excluído fica sem fotos, sem anexos e sem a data da autorização. */
export const semArquivos = (avaliacao: DadosDaAvaliacao): DadosDaAvaliacao => ({ ...avaliacao, fotosAutorizadasEm: null, fotos: null, anexos: null })
