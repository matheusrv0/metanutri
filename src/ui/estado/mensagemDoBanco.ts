// O banco explica os próprios erros em português (`raise exception`, com estes
// códigos). Qualquer outra coisa é rede, servidor fora ou erro que a pessoa não
// tem como resolver: vira a mensagem de falha de rede. A exceção são as travas de
// tamanho (D-107): o banco recusa pelo nome da trava, e a tela diz o motivo.
export const FALHA_DE_REDE = 'Não deu para falar com o servidor. Confira a internet e tente de novo.'

/** D-107 (CA-445): a cópia completa passou do tamanho que a nuvem guarda. Texto da spec dados-na-nuvem (CB-123). */
export const COPIA_GRANDE_DEMAIS = 'A cópia passou de 5 MB, o máximo da nuvem. Apague o que não precisa para voltar a salvar.'
/** D-107 (CA-446): o link passou de um dos tamanhos que a nuvem guarda. */
export const LINK_GRANDE_DEMAIS = 'Este link ficou grande demais. Tire algumas missões e tente de novo.'

/** D-107: as travas de tamanho do banco (supabase/011-seguranca-lote-2.sql), pelo nome, com a frase de cada uma. */
export const TRAVAS_DE_TAMANHO: Readonly<Record<string, string>> = {
  copias_dados_tamanho: COPIA_GRANDE_DEMAIS,
  acompanhamentos_missoes_tamanho: LINK_GRANDE_DEMAIS,
  acompanhamentos_marcacoes_tamanho: LINK_GRANDE_DEMAIS,
  acompanhamentos_nome_tamanho: LINK_GRANDE_DEMAIS,
  acompanhamentos_caso_id_tamanho: LINK_GRANDE_DEMAIS,
  acompanhamentos_paciente_id_tamanho: LINK_GRANDE_DEMAIS,
}

/** O código do Postgres para a trava (check) que recusou a linha. */
const TRAVA_RECUSOU = '23514'

const EXPLICADOS: readonly string[] = ['P0001', '22023', '42501']

/**
 * As frases do MetaNutri terminam em ponto; as do próprio Postgres, não (é a regra de estilo
 * dele). É o que separa "Entre na sua conta." da recusa do RLS, que chega com o mesmo 42501.
 */
const ehFraseDoMetaNutri = (texto: string): boolean => texto.trim().endsWith('.')

/** A frase da trava de tamanho citada na mensagem. O nome vem entre aspas, em qualquer idioma do banco. */
function fraseDaTrava(mensagem: string): string | null {
  for (const [nome, frase] of Object.entries(TRAVAS_DE_TAMANHO)) if (mensagem.includes(`"${nome}"`)) return frase
  return null
}

export function mensagemDoBanco(erro: { readonly message?: string; readonly code?: string } | null): string | null {
  if (!erro) return null
  if (erro.code === TRAVA_RECUSOU && erro.message) {
    const frase = fraseDaTrava(erro.message)
    if (frase) return frase
  }
  if (erro.code && EXPLICADOS.includes(erro.code) && erro.message && ehFraseDoMetaNutri(erro.message)) return erro.message
  return FALHA_DE_REDE
}
