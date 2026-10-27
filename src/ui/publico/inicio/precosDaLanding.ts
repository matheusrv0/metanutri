// "Planos e preços" da landing (spec landing-v3, D-666 a D-671): os cartões Free, Solo e Pro, o Estudante e a Clínica,
// e o plano indicado pela régua de pacientes ativos, tudo de `PLANOS` (src/domain/conta.ts). Nenhum preço nem limite
// escrito aqui (D-327).
import { mensalizadoDoAnual, PLANOS, type Ciclo, type IdPlano, type PlanoAssinatura } from '@/domain/conta.ts'

export type IdDoCartao = Extract<IdPlano, 'free' | 'solo' | 'pro'>

/** O preço de um ciclo, como o cartão mostra (D-668). */
export interface PrecoNoCiclo {
  /** O número grande, sem o "R$": "34,90". */
  readonly valor: string
  /** O que o leitor de tela lê no lugar do número grande: "R$ 34,90". */
  readonly falado: string
  /** "por mês", "por ano" ou, no Free, "Sem cartão de crédito". */
  readonly periodo: string
  /** A linha de baixo: o outro ciclo ou a economia; nula no Free. */
  readonly detalhe: string | null
}

export interface CartaoDePlanoDaLanding {
  readonly id: IdDoCartao
  readonly nome: string
  readonly descricao: string
  /** Quantos pacientes ativos cabem; nulo é ilimitado. */
  readonly limite: number | null
  readonly mensal: PrecoNoCiclo
  /** O anual; nulo quando o plano não tem preço (o Free é o mesmo nos dois ciclos e não troca). */
  readonly anual: PrecoNoCiclo | null
  readonly itens: readonly string[]
  /** O texto do botão de PLANOS ("Começar grátis", "Assinar"). */
  readonly acao: string
}

/** A régua de pacientes ativos (D-666): de 1 a 60; o 60 vale "60 ou mais". Ao abrir, 12 (o Solo indicado). */
export const REGUA_DE_PACIENTES = { minimo: 1, maximo: 60, aoAbrir: 12 } as const

const IDS: readonly IdDoCartao[] = ['free', 'solo', 'pro']

const reais = (valor: number) => {
  const centavos = Math.round(valor * 100) / 100
  return centavos.toLocaleString('pt-BR', { minimumFractionDigits: Number.isInteger(centavos) ? 0 : 2, maximumFractionDigits: 2 })
}

function planoDe(planos: readonly PlanoAssinatura[], id: IdPlano): PlanoAssinatura {
  const achado = planos.find((p) => p.id === id)
  if (!achado) throw new Error(`Plano sem cadastro: ${id}`)
  return achado
}

function precoMensal(plano: PlanoAssinatura): PrecoNoCiclo {
  if (plano.mensal === 0) return { valor: '0', falado: 'R$ 0', periodo: 'Sem cartão de crédito', detalhe: null }
  return {
    valor: reais(plano.mensal),
    falado: `R$ ${reais(plano.mensal)}`,
    periodo: 'por mês',
    detalhe: plano.anual > 0 ? `ou R$ ${reais(plano.anual)} por ano` : null,
  }
}

function precoAnual(plano: PlanoAssinatura): PrecoNoCiclo | null {
  if (plano.anual <= 0) return null
  const economia = plano.mensal * 12 - plano.anual
  return {
    valor: reais(plano.anual),
    falado: `R$ ${reais(plano.anual)}`,
    periodo: 'por ano',
    detalhe: `R$ ${reais(mensalizadoDoAnual(plano))} por mês${economia > 0 ? ` · economize R$ ${reais(economia)}` : ''}`,
  }
}

/** CA-1677: os cartões Free, Solo e Pro, com os limites de `PLANOS` e "Todas as funções" no fim da lista. */
export function cartoesDosPlanos(planos: readonly PlanoAssinatura[] = PLANOS): readonly CartaoDePlanoDaLanding[] {
  return IDS.map((id) => {
    const plano = planoDe(planos, id)
    return {
      id,
      nome: plano.nome,
      descricao: plano.resumo,
      limite: plano.limitePacientesAtivos,
      mensal: precoMensal(plano),
      anual: precoAnual(plano),
      itens: [...plano.recursos, 'Todas as funções'],
      acao: plano.acaoTexto,
    }
  })
}

/** CA-1678: "Começar grátis" no Free; nos pagos, "Assinar o Solo", com "anual" no ciclo anual. */
export function textoDaAcao(cartao: CartaoDePlanoDaLanding, ciclo: Ciclo): string {
  if (cartao.anual === null) return cartao.acao
  return `Assinar o ${cartao.nome}${ciclo === 'anual' ? ' anual' : ''}`
}

/** CA-1679: o primeiro de Free, Solo e Pro cujo limite de pacientes ativos cabe o número da régua. */
export function planoIndicado(pacientes: number, planos: readonly PlanoAssinatura[] = PLANOS): IdDoCartao {
  return IDS.find((id) => {
    const limite = planoDe(planos, id).limitePacientesAtivos
    return limite === null || pacientes <= limite
  }) ?? 'pro'
}

/** Quantos pacientes a régua diz, por extenso: "1 paciente ativo", "12 pacientes ativos", "60 ou mais pacientes ativos". */
export function pacientesNaRegua(pacientes: number): string {
  if (pacientes >= REGUA_DE_PACIENTES.maximo) return `${REGUA_DE_PACIENTES.maximo} ou mais pacientes ativos`
  return pacientes === 1 ? '1 paciente ativo' : `${pacientes} pacientes ativos`
}

/** CA-1676: "Para 12 pacientes ativos, o plano indicado é o Solo." */
export function veredito(pacientes: number, planos: readonly PlanoAssinatura[] = PLANOS): string {
  return `Para ${pacientesNaRegua(pacientes)}, o plano indicado é o ${planoDe(planos, planoIndicado(pacientes, planos)).nome}.`
}

/** CA-1681: os cartões de baixo, Estudante (com o comprovante, D-671) e Clínica. */
export function extrasDosPlanos(planos: readonly PlanoAssinatura[] = PLANOS) {
  const estudante = planoDe(planos, 'estudante')
  const clinica = planoDe(planos, 'clinica')
  return {
    estudante: {
      nome: estudante.nome,
      texto:
        'Grátis por 12 meses ou até a formatura, o que vier antes, com o e-mail da faculdade e o comprovante de matrícula. Na formatura, os pacientes continuam na conta.',
      acao: estudante.acaoTexto,
    },
    clinica: { nome: clinica.nome, texto: clinica.resumo, acao: clinica.acaoTexto },
  } as const
}
