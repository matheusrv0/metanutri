import { MAXIMO_DE_OPCOES_DO_ITEM, type VagaParaOpcao } from '@/domain/opcoesDoItem.ts'

/** O texto do botão de opção (spec busca-substitutos, D-1114): o que ele faz, ou por que está desligado. */
export function rotuloDaOpcao(vaga: VagaParaOpcao): string {
  switch (vaga) {
    case 'livre':
      return 'Adicionar como opção'
    case 'ja-e-opcao':
      return 'Já é opção'
    case 'cheia':
      return `Já tem ${MAXIMO_DE_OPCOES_DO_ITEM} opções`
    case 'e-o-item':
      return 'É o mesmo alimento'
  }
}
