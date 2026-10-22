// Quantas vezes cada alimento aparece nos planos da conta, para a busca pôr primeiro o que a nutricionista usa (spec
// alimentos-e-gramaturas, D-370, item 2). Conta os itens das três opções; o ingrediente de receita não conta (ele não
// foi escolhido na busca da refeição). Plano estragado não quebra a conta.
import { OPCOES, type Plano } from './tipos.ts'

export function contarUso(planos: Iterable<Plano | null | undefined>): Map<number, number> {
  const uso = new Map<number, number>()
  for (const plano of planos) {
    const refeicoes: unknown = plano?.refeicoes
    if (!Array.isArray(refeicoes)) continue
    for (const refeicao of refeicoes as Plano['refeicoes']) {
      for (const opcao of OPCOES) {
        const itens: unknown = refeicao?.opcoes?.[opcao]
        if (!Array.isArray(itens)) continue
        for (const item of itens as Plano['refeicoes'][number]['opcoes'][typeof opcao]) {
          const id = item?.alimentoId
          if (typeof id === 'number' && id > 0) uso.set(id, (uso.get(id) ?? 0) + 1)
        }
      }
    }
  }
  return uso
}
