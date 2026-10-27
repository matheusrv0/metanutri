// "Quanto custa" da landing (spec landing-escura, D-544): o plano em destaque e uma linha para cada um dos outros, tudo
// de `PLANOS` (src/domain/conta.ts). Nenhum preço nem limite escrito aqui (D-327).
import { PLANOS, type IdPlano, type PlanoAssinatura } from '@/domain/conta.ts'

export interface PrecosDaLanding {
  readonly destaque: {
    readonly id: IdPlano
    readonly nome: string
    /** "34,90", sem o "R$": o número grande. */
    readonly valor: string
    /** O que o leitor de tela lê no lugar do número grande. */
    readonly falado: string
    readonly itens: readonly string[]
  }
  readonly outros: readonly { readonly nome: string; readonly texto: string }[]
}

const reais = (valor: number) => valor.toLocaleString('pt-BR', { minimumFractionDigits: Number.isInteger(valor) ? 0 : 2, maximumFractionDigits: 2 })

const pacientes = (plano: PlanoAssinatura) => (plano.limitePacientesAtivos === null ? 'pacientes ilimitados' : `${plano.limitePacientesAtivos} pacientes ativos`)

const links = (plano: PlanoAssinatura) => (plano.limiteLinksPaciente === null ? 'links do paciente ilimitados' : `${plano.limiteLinksPaciente} links do paciente`)

/** O que vem em todas as assinaturas, resumido numa linha (o detalhe está em Preços). */
const EM_TODAS = 'Adequação com o Cobrir, PDF e documentos em Word'

export function precosDaLanding(planos: readonly PlanoAssinatura[] = PLANOS): PrecosDaLanding {
  const plano = (id: IdPlano): PlanoAssinatura => {
    const achado = planos.find((p) => p.id === id)
    if (!achado) throw new Error(`Plano sem cadastro: ${id}`)
    return achado
  }
  const destaque = planos.find((p) => p.destaque) ?? plano('solo')
  const free = plano('free')
  const pro = plano('pro')
  const estudante = plano('estudante')
  const clinica = plano('clinica')
  const gratisAte = estudante.recursos.find((r) => r.startsWith('Grátis')) ?? 'Grátis'

  return {
    destaque: {
      id: destaque.id,
      nome: destaque.nome,
      valor: reais(destaque.mensal),
      falado: `${destaque.nome}: R$ ${reais(destaque.mensal)} por mês`,
      itens: [
        `${destaque.nome}: ${pacientes(destaque)}`,
        links(destaque),
        EM_TODAS,
        ...(destaque.anual > 0 ? [`Ou R$ ${reais(destaque.anual)} por ano`] : []),
      ],
    },
    outros: [
      { nome: free.nome, texto: `R$ ${reais(free.mensal)} · ${pacientes(free)}, sem cartão` },
      { nome: pro.nome, texto: `R$ ${reais(pro.mensal)} por mês · ${pacientes(pro)}` },
      { nome: estudante.nome, texto: `${gratisAte}${estudante.usoNaoComercial ? ' · uso não comercial' : ''}` },
      { nome: clinica.nome, texto: clinica.resumo.replace(/\.$/, '') },
    ],
  }
}
