// A base ampliada chega sob demanda (spec base-ampliada, D-710 e D-711): o import() vira um pedaço separado do
// JavaScript, pedido depois da primeira tela e guardado pelo service worker com o resto do app. Aqui fica o estado do
// carregamento, que a interface lê pelo gancho `useBaseAmpliada`.
import { decodificarBaseAmpliada, type ArquivoBaseAmpliada } from '@/domain/baseAmpliada.ts'
import { registrarBaseAmpliada } from '@/domain/tabelas.ts'

export type EstadoBaseAmpliada = 'parada' | 'carregando' | 'pronta' | 'erro'

type CarregarArquivo = () => Promise<ArquivoBaseAmpliada>

// O JSON importado é tipado de forma ampla; a forma exata é conferida em src/data/base-ampliada.test.ts.
const doPacote: CarregarArquivo = async () => (await import('@/data/base-ampliada.json')).default as unknown as ArquivoBaseAmpliada

let carregarArquivo: CarregarArquivo = doPacote
const recarregarDeVerdade = (): void => window.location.reload()
let recarregarPagina: () => void = recarregarDeVerdade
let automatico = true
let estado: EstadoBaseAmpliada = 'parada'
let versao = 0
let pendente: Promise<void> | null = null
const ouvintes = new Set<() => void>()

function mudar(novo: EstadoBaseAmpliada): void {
  estado = novo
  versao += 1
  for (const ouvinte of ouvintes) ouvinte()
}

/** Pede a base uma vez; com erro, a próxima chamada tenta de novo (CB-704). */
export function carregarBaseAmpliada(): Promise<void> {
  if (estado === 'pronta') return Promise.resolve()
  if (pendente) return pendente
  mudar('carregando')
  pendente = carregarArquivo().then(
    (arquivo) => {
      registrarBaseAmpliada(decodificarBaseAmpliada(arquivo))
      pendente = null
      mudar('pronta')
    },
    () => {
      pendente = null
      mudar('erro')
    },
  )
  return pendente
}

/**
 * D-716c (spec base-ampliada, achado 2 da revisão): o "Tentar de novo". Depois de um erro, o navegador guarda a falha do
 * import() e não pede o pedaço outra vez na mesma página; só a página recarregada pede. Sem erro, só pede a base.
 */
export function tentarCarregarDeNovo(): void {
  if (estado === 'erro') recarregarPagina()
  else void carregarBaseAmpliada()
}

export const estadoDaBaseAmpliada = (): EstadoBaseAmpliada => estado

/** Muda a cada mudança de estado: o que a interface usa para se redesenhar. */
export const versaoDaBaseAmpliada = (): number => versao

/** O gancho pede a base sozinho; nos testes de tela, desligado (`vitest.setup.ts`), e o teste que precisa a registra. */
export const carregamentoAutomatico = (): boolean => automatico

export function inscreverNaBaseAmpliada(ouvinte: () => void): () => void {
  ouvintes.add(ouvinte)
  return () => {
    ouvintes.delete(ouvinte)
  }
}

/** Só para teste: volta ao começo, com outro arquivo e com o carregamento automático ligado ou não. */
export function prepararBaseAmpliadaParaTeste(opcoes: { readonly carregar?: CarregarArquivo; readonly automatico?: boolean; readonly recarregar?: () => void }): void {
  carregarArquivo = opcoes.carregar ?? doPacote
  recarregarPagina = opcoes.recarregar ?? recarregarDeVerdade
  automatico = opcoes.automatico ?? true
  estado = 'parada'
  pendente = null
  versao += 1
}
