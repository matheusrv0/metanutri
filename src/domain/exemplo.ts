// Plano de exemplo: quem abre pela primeira vez vê o sistema funcionando, não uma tela vazia.
import { buscarAlimentos } from './busca.ts'
import { criarCasoVazio } from './caso.ts'
import { adicionarItem, criarPlanoPadrao, type GerarId } from './plano.ts'
import { ALIMENTOS } from './tabelas.ts'
import type { Caso, OpcaoId, Plano } from './tipos.ts'

export const NOME_DO_EXEMPLO = 'Exemplo — Maria, 28 anos'

interface EntradaExemplo {
  readonly refeicao: string
  readonly opcao: OpcaoId
  /** O mesmo texto que você digitaria no campo de busca. */
  readonly texto: string
}

/** Dia comum, comida do dia a dia brasileiro, com dois substitutos no almoço. */
const ENTRADAS: readonly EntradaExemplo[] = [
  { refeicao: 'Desjejum', opcao: 'principal', texto: '70 pao frances' },
  { refeicao: 'Desjejum', opcao: 'principal', texto: '5 margarina' },
  { refeicao: 'Desjejum', opcao: 'principal', texto: '30 queijo minas frescal' },
  { refeicao: 'Desjejum', opcao: 'principal', texto: '120 mamao formosa' },

  { refeicao: 'Lanche da manhã', opcao: 'principal', texto: '130 banana prata' },
  { refeicao: 'Lanche da manhã', opcao: 'principal', texto: '15 castanha do brasil' },

  { refeicao: 'Almoço', opcao: 'principal', texto: '150 arroz tipo 1 cozido' },
  { refeicao: 'Almoço', opcao: 'principal', texto: '100 feijao carioca cozido' },
  { refeicao: 'Almoço', opcao: 'principal', texto: '100 frango peito sem pele grelhado' },
  { refeicao: 'Almoço', opcao: 'principal', texto: '80 brocolis cozido' },
  { refeicao: 'Almoço', opcao: 'principal', texto: '60 cenoura crua' },
  { refeicao: 'Almoço', opcao: 'substituto1', texto: '90 macarrao trigo cru' },
  { refeicao: 'Almoço', opcao: 'substituto1', texto: '100 carne bovina patinho grelhado' },
  { refeicao: 'Almoço', opcao: 'substituto2', texto: '150 batata inglesa cozida' },
  { refeicao: 'Almoço', opcao: 'substituto2', texto: '100 merluza file assado' },

  { refeicao: 'Lanche da tarde', opcao: 'principal', texto: '150 iogurte natural' },
  { refeicao: 'Lanche da tarde', opcao: 'principal', texto: '30 aveia flocos crua' },

  { refeicao: 'Jantar', opcao: 'principal', texto: '120 arroz integral cozido' },
  { refeicao: 'Jantar', opcao: 'principal', texto: '60 lentilha cozida' },
  { refeicao: 'Jantar', opcao: 'principal', texto: '90 ovo de galinha cozido' },
  { refeicao: 'Jantar', opcao: 'principal', texto: '70 alface crespa crua' },

  { refeicao: 'Ceia', opcao: 'principal', texto: '130 maca fuji com casca crua' },
]

/** Quantas entradas do exemplo a tabela de composição não reconhece; deve ser zero. */
export function entradasSemAlimento(): readonly string[] {
  return ENTRADAS.filter((e) => resolver(e.texto) === null).map((e) => e.texto)
}

function resolver(texto: string): { readonly alimentoId: number; readonly gramas: number } | null {
  const { resultados } = buscarAlimentos(texto, ALIMENTOS)
  const primeiro = resultados[0]
  if (!primeiro || primeiro.gramas === null) return null
  return { alimentoId: primeiro.alimento.id, gramas: primeiro.gramas }
}

/**
 * Caso e plano de demonstração, prontos para abrir. O nome deixa claro que é exemplo,
 * e nada aqui pertence a uma pessoa real.
 */
export function criarExemplo(gerarId: GerarId, hoje: string): { readonly caso: Caso; readonly plano: Plano } {
  const caso: Caso = {
    ...criarCasoVazio(gerarId()),
    nome: NOME_DO_EXEMPLO,
    modo: 'completo',
    sexo: 'F',
    idadeAnos: 28,
    pesoKg: 62,
    estaturaCm: 165,
    circunferenciaCinturaCm: 74,
    objetivo: 'manter',
    ocupacao: 'Professora',
    diagnosticoClinico: 'Eutrofia',
    dataConsulta: hoje,
    observacoes: 'Plano de exemplo, criado pelo próprio MetaNutri. Pode apagar quando quiser.',
    orientacoes: 'Beba água ao longo do dia. Coma devagar e sem tela na frente.',
  }

  let plano = criarPlanoPadrao(gerarId)
  for (const entrada of ENTRADAS) {
    const refeicao = plano.refeicoes.find((r) => r.nome === entrada.refeicao)
    const item = resolver(entrada.texto)
    if (!refeicao || !item) continue
    plano = adicionarItem(plano, refeicao.id, entrada.opcao, item, gerarId)
  }

  return { caso, plano }
}
