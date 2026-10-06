import type { ResumoDoNegocio } from '@/domain/negocio.ts'
import { diferencaEm30Dias, inteiro, parteQuePaga, reais } from '@/domain/negocioTextos.ts'
import { CartaoNumero } from '@ds/componentes/display/CartaoNumero.tsx'

/**
 * CA-345 a CA-348: os três cartões do topo. A receita é o destaque da tela e, na grade de
 * duas colunas, ocupa a linha inteira para não sobrar buraco.
 */
export function NumerosDoNegocio({ resumo }: { readonly resumo: ResumoDoNegocio }) {
  return (
    <section aria-label="Resumo do negócio" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      <CartaoNumero
        tom="teal"
        valor={reais(resumo.receitaCentavos)}
        rotulo="Receita por mês"
        apoio={diferencaEm30Dias(resumo.diferenca30DiasCentavos)}
        className="sm:col-span-2 xl:col-span-1"
      />
      <CartaoNumero valor={inteiro(resumo.assinaturasAtivas)} rotulo="Assinaturas ativas" apoio={parteQuePaga(resumo.parteQuePaga)} />
      <CartaoNumero valor={inteiro(resumo.contas)} rotulo="Contas" apoio={`+${inteiro(resumo.contasNovas30Dias)} em 30 dias`} />
    </section>
  )
}
