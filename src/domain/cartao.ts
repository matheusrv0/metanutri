// O formulário do cartão (spec checkout-proprio): o que é nosso de conferir (nome e CPF),
// as mensagens de cada campo e o que dizer quando o banco recusa. O número, a validade e
// o código são conferidos pelos campos seguros da operadora; aqui só chegam as respostas
// ("vazio", "válido", "inválido") e os códigos de erro.

/** O que a operadora devolve no lugar do cartão (D-66), mais o que a tela mostra (D-70). */
export interface DadosDoCartao {
  /** O código de uso único: vale para um envio só (CB-90). */
  readonly token: string
  readonly bandeira: string
  /** Os 4 últimos números. */
  readonly final: string
}

export type CampoSeguro = 'numero' | 'validade' | 'codigo'
export type CampoDoCartao = CampoSeguro | 'nome' | 'cpf'
export type EstadoDoCampo = 'vazio' | 'valido' | 'invalido'

/** A ordem da tela: o foco vai para o primeiro com erro (CA-370). */
export const ORDEM_DOS_CAMPOS: readonly CampoDoCartao[] = ['numero', 'validade', 'codigo', 'nome', 'cpf']

export const soDigitos = (texto: string): string => texto.replace(/\D/g, '')

/** "12345678909" → "123.456.789-09", enquanto digita. Para em 11 números. */
export function mascararCpf(texto: string): string {
  return soDigitos(texto)
    .slice(0, 11)
    .replace(/^(\d{3})(\d)/, '$1.$2')
    .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1-$2')
}

/** Os dois dígitos verificadores do CPF. Onze números iguais não valem. */
export function cpfValido(texto: string): boolean {
  const d = soDigitos(texto)
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false
  const digito = (quantos: number): number => {
    let soma = 0
    for (let i = 0; i < quantos; i += 1) soma += Number(d[i]) * (quantos + 1 - i)
    const resto = (soma * 10) % 11
    return resto === 10 ? 0 : resto
  }
  return digito(9) === Number(d[9]) && digito(10) === Number(d[10])
}

const NOME = /^\p{L}[\p{L} .'-]*$/u

/** Como está impresso: só letras, espaço, ponto, apóstrofo e hífen. "APRO" (do cartão de teste) serve. */
export const nomeValido = (texto: string): boolean => {
  const limpo = texto.trim()
  return limpo.length >= 2 && NOME.test(limpo)
}

export const MENSAGEM_DO_CAMPO: Readonly<Record<CampoDoCartao, { readonly vazio: string; readonly invalido: string }>> = {
  numero: { vazio: 'Digite o número do cartão.', invalido: 'Confira o número do cartão.' },
  validade: { vazio: 'Digite a validade, como 11/30.', invalido: 'Confira a validade do cartão.' },
  codigo: { vazio: 'Digite o código de segurança.', invalido: 'Confira o código de segurança.' },
  nome: { vazio: 'Digite o nome como está impresso no cartão.', invalido: 'Use só letras no nome.' },
  cpf: { vazio: 'Digite o CPF do titular do cartão.', invalido: 'Confira o CPF: os dígitos não batem.' },
}

/** CA-370: o erro de cada campo, na ordem da tela; só os que têm erro. */
export function errosDoCartao(entrada: {
  readonly seguros: Readonly<Record<CampoSeguro, EstadoDoCampo>>
  readonly nome: string
  readonly cpf: string
}): Partial<Record<CampoDoCartao, string>> {
  const erros: Partial<Record<CampoDoCartao, string>> = {}
  for (const campo of ['numero', 'validade', 'codigo'] as const) {
    const estado = entrada.seguros[campo]
    if (estado !== 'valido') erros[campo] = MENSAGEM_DO_CAMPO[campo][estado]
  }
  if (!entrada.nome.trim()) erros.nome = MENSAGEM_DO_CAMPO.nome.vazio
  else if (!nomeValido(entrada.nome)) erros.nome = MENSAGEM_DO_CAMPO.nome.invalido
  if (!soDigitos(entrada.cpf)) erros.cpf = MENSAGEM_DO_CAMPO.cpf.vazio
  else if (!cpfValido(entrada.cpf)) erros.cpf = MENSAGEM_DO_CAMPO.cpf.invalido
  return erros
}

/** CA-369 e D-67: débito, pré-pago ou outro tipo trava o envio. Sem tipo conhecido, deixa seguir: o banco confere. */
export const ehCredito = (tipo: string | null): boolean => tipo === null || tipo === 'credit_card'

export const USE_CREDITO = 'Use um cartão de crédito.'
/** CB-88. */
export const CAMPOS_NAO_CARREGARAM = 'Não consegui abrir o formulário do cartão. Recarregue a página ou desative o bloqueador de anúncios para este site.'
/** CB-89. */
export const PAGAMENTO_INDISPONIVEL = 'O pagamento não está disponível agora.'
/** CA-374. */
export const SERVIDOR_FORA = 'Não consegui falar com o servidor de cobrança. Nada foi cobrado. Tente de novo em alguns minutos.'
/** CA-373. */
/** Só depois de uma recusa do banco ao cartão novo: sem resposta ou erro de servidor, o cartão novo pode ter sido aceito. */
export const CARTAO_ANTIGO = 'O cartão antigo continua valendo.'

export const RECUSA_PADRAO = 'O banco recusou este cartão. Confira os dados ou use outro cartão. Nada foi cobrado.'
/** CB-90 e erro do gerador do código do cartão. */
export const CONFIRA_O_CARTAO = 'Confira os dados do cartão e tente de novo. Nada foi cobrado.'
/** Erro que não é do cartão (configuração, conta de teste): não culpa o banco. */
export const FALHA_DESCONHECIDA = 'Não consegui concluir a assinatura agora. Nada foi cobrado. Tente de novo em alguns minutos.'
/** CA-373: depois da recusa, o código de segurança é apagado. */
export const DIGITE_O_CODIGO_DE_NOVO = 'Digite o código de novo.'
/** CA-370. */
export const ACEITE_FALTANDO = 'Marque a autorização da cobrança para assinar.'

const RECUSAS: Readonly<Record<string, string>> = {
  cc_rejected_bad_filled_card_number: 'O banco não reconheceu o número do cartão. Confira e tente de novo. Nada foi cobrado.',
  cc_rejected_bad_filled_date: 'O banco não aceitou a validade. Confira e tente de novo. Nada foi cobrado.',
  cc_rejected_bad_filled_security_code: 'O banco não aceitou o código de segurança. Confira e tente de novo. Nada foi cobrado.',
  cc_rejected_bad_filled_other: CONFIRA_O_CARTAO,
  cc_rejected_insufficient_amount: 'O cartão não tem limite para esta cobrança. Use outro cartão. Nada foi cobrado.',
  cc_rejected_call_for_authorize: 'O banco pediu para você autorizar esta cobrança. Ligue para o banco do cartão e tente de novo. Nada foi cobrado.',
  cc_rejected_card_disabled: 'Este cartão está bloqueado. Ligue para o banco ou use outro cartão. Nada foi cobrado.',
  cc_rejected_duplicated_payment: 'Já existe uma cobrança igual de poucos minutos atrás. Confira em Conta e plano antes de tentar de novo.',
  cc_rejected_high_risk: 'O pagamento foi recusado por segurança. Use outro cartão. Nada foi cobrado.',
  cc_rejected_blacklist: 'O pagamento foi recusado por segurança. Use outro cartão. Nada foi cobrado.',
  cc_rejected_max_attempts: 'Muitas tentativas com este cartão. Use outro cartão ou tente amanhã. Nada foi cobrado.',
  cc_rejected_other_reason: RECUSA_PADRAO,
  'token-invalido': CONFIRA_O_CARTAO,
  recusado: RECUSA_PADRAO,
  falha: FALHA_DESCONHECIDA,
}

/** CA-373 e CB-90: o motivo em português, pelo código que a função devolveu. Código desconhecido vira a recusa padrão. */
export function mensagemDaRecusa(codigo: string | null | undefined): string {
  return (codigo ? RECUSAS[codigo] : undefined) ?? RECUSA_PADRAO
}

/**
 * Os códigos de erro do gerador do código do cartão → o campo com problema. São os da
 * documentação de tokenização da operadora; a pesquisa de 02/10/2026 não confirmou se o
 * SDK v2 devolve os mesmos. Código que não está aqui vira erro geral (foco 3).
 */
const CAMPO_DO_CODIGO: Readonly<Record<string, CampoDoCartao>> = {
  '205': 'numero',
  E301: 'numero',
  '208': 'validade',
  '209': 'validade',
  '325': 'validade',
  '326': 'validade',
  '224': 'codigo',
  E302: 'codigo',
  E203: 'codigo',
  '221': 'nome',
  '316': 'nome',
  '212': 'cpf',
  '213': 'cpf',
  '214': 'cpf',
  '322': 'cpf',
  '323': 'cpf',
  '324': 'cpf',
}

/** O primeiro campo, na ordem da tela, que algum dos códigos aponta. */
export function campoDoErroDoToken(codigos: readonly string[]): CampoDoCartao | null {
  const campos = new Set(codigos.map((codigo) => CAMPO_DO_CODIGO[codigo]).filter((campo): campo is CampoDoCartao => campo !== undefined))
  return ORDEM_DOS_CAMPOS.find((campo) => campos.has(campo)) ?? null
}
