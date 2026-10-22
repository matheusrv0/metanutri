// As páginas que os buscadores indexam (spec site-publico-profissional, D-329 e D-331). Cada uma vira um arquivo no
// build: a inicial é o index.html; as outras, `<caminho>index.html`. Título e descrição saem do domínio (D-327).
import { MICRONUTRIENTES_ADEQUACAO } from '@/domain/adequacao.ts'
import { planoPorId, PLANOS } from '@/domain/conta.ts'

/** O endereço público do site, com a barra do fim. */
export const ENDERECO_DO_SITE = 'https://metanutri.com.br/'

export type RotaIndexavel = 'inicio' | 'precos' | 'termos' | 'privacidade' | 'fontes'

export interface PaginaIndexavel {
  readonly rota: RotaIndexavel
  /** Caminho a partir da raiz do site: vazio na inicial, "precos/" em Preços. */
  readonly caminho: string
  /** Até 60 letras. */
  readonly titulo: string
  /** Até 155 letras. */
  readonly descricao: string
}

const reais = (valor: number) => valor.toLocaleString('pt-BR', { minimumFractionDigits: Number.isInteger(valor) ? 0 : 2, maximumFractionDigits: 2 })

const VITAMINAS_E_MINERAIS = MICRONUTRIENTES_ADEQUACAO.filter((chave) => chave !== 'fibra_g').length

/** "Solo por R$ 34,90 ao mês ou R$ 299 ao ano": os planos pagos com preço público, na ordem de `PLANOS` (D-406). */
function frasesDosPagos(): string[] {
  return PLANOS.filter((p) => p.mensal > 0 && !p.porContato).map((p) => `${p.nome} por R$ ${reais(p.mensal)} ao mês${p.anual > 0 ? ` ou R$ ${reais(p.anual)} ao ano` : ''}`)
}

function descricaoDosPrecos(): string {
  const gratis = PLANOS.filter((p) => p.mensal === 0).map((p) => p.nome)
  const pagos = frasesDosPagos()
  const ultimo = pagos.pop() ?? ''
  return `${gratis.join(' e ')} por R$ 0, ${pagos.join(', ')} e ${ultimo}.`
}

export const PAGINAS: readonly PaginaIndexavel[] = [
  {
    rota: 'inicio',
    caminho: '',
    // Spec textos-e-promessas, D-415: para quem é e o diferencial, no mesmo vocabulário da landing.
    titulo: 'MetaNutri: software para nutricionistas que diz o que comer',
    descricao: `Monte o plano alimentar, veja o que ficou abaixo da meta em ${VITAMINAS_E_MINERAIS} vitaminas e minerais e receba o alimento e a porção em medida caseira. Comece grátis.`,
  },
  {
    rota: 'precos',
    caminho: 'precos/',
    titulo: `Preços do MetaNutri: Free, Solo a R$ ${reais(planoPorId('solo')?.mensal ?? 0)} e Pro a R$ ${reais(planoPorId('pro')?.mensal ?? 0)}`,
    descricao: `${descricaoDosPrecos()} Todos os planos têm as mesmas funções.`,
  },
  {
    rota: 'termos',
    caminho: 'termos/',
    titulo: 'Termos de uso do MetaNutri',
    descricao:
      'Regras de uso do MetaNutri: conta, assinaturas e pagamento, plano Estudante, CRN do nutricionista, dados dos pacientes e encerramento da conta.',
  },
  {
    rota: 'privacidade',
    caminho: 'privacidade/',
    titulo: 'Política de privacidade do MetaNutri',
    descricao:
      'Como o MetaNutri trata os dados da conta e dos pacientes: o que guarda, onde, com quem compartilha, por quanto tempo e como pedir a exclusão.',
  },
  {
    rota: 'fontes',
    caminho: 'fontes/',
    titulo: 'Fontes da Base MetaNutri',
    descricao:
      'A Base MetaNutri reúne a TACO, as medidas caseiras do IBGE, vitaminas do USDA e rótulos da Open Food Facts, com a citação de cada fonte.',
  },
]

export const enderecoDaPagina = (pagina: PaginaIndexavel): string => `${ENDERECO_DO_SITE}${pagina.caminho}`

export function paginaDaRota(rota: RotaIndexavel): PaginaIndexavel {
  const pagina = PAGINAS.find((p) => p.rota === rota)
  if (!pagina) throw new Error(`Página indexável sem cadastro: ${rota}`)
  return pagina
}
