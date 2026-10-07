// O banco explica os próprios erros em português (`raise exception`, com estes
// códigos). Qualquer outra coisa é rede, servidor fora ou erro que a pessoa não
// tem como resolver: vira a mensagem de falha de rede.
export const FALHA_DE_REDE = 'Não deu para falar com o servidor. Confira a internet e tente de novo.'

const EXPLICADOS: readonly string[] = ['P0001', '22023', '42501']

/**
 * As frases do MetaNutri terminam em ponto; as do próprio Postgres, não (é a regra de estilo
 * dele). É o que separa "Entre na sua conta." da recusa do RLS, que chega com o mesmo 42501.
 */
const ehFraseDoMetaNutri = (texto: string): boolean => texto.trim().endsWith('.')

export function mensagemDoBanco(erro: { readonly message?: string; readonly code?: string } | null): string | null {
  if (!erro) return null
  if (erro.code && EXPLICADOS.includes(erro.code) && erro.message && ehFraseDoMetaNutri(erro.message)) return erro.message
  return FALHA_DE_REDE
}
