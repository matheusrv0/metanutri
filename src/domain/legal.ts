// Quem responde pelo MetaNutri e a versão dos termos (spec conta-e-verificacao, D-46).
// RESPONSAVEL e CONTATO_EMAIL ficam nulos até o dono do projeto mandar os dois. Nulos,
// os Termos e a Política mostram "em preparação" e a publicação é barrada
// (scripts/conferir-publicacao.mjs, Tarefa 13). Ninguém inventa esses valores.

/** Pessoa física responsável pelo MetaNutri e encarregada dos dados pessoais. */
export const RESPONSAVEL: string | null = 'Matheus Rondon'

/** Canal de contato do MetaNutri: titular de dados, plano Clínica, faculdade que falta e suporte. */
export const CONTATO_EMAIL: string | null = 'metanutricontato@gmail.com'

/**
 * Muda quando o texto dos termos ou da política mudar. Vai gravada no cadastro (CA-223). Mudou duas vezes
 * no mesmo dia: a segunda leva `.2` (spec dados-na-nuvem, DP-26); a data mostrada continua a do dia.
 * 15/10/2026: a Política passou a falar da dieta no link do paciente (spec dieta-no-link, D-157) e da anamnese, dos
 * suplementos e dos pedidos de exame da ficha (spec anamnese-e-prescricoes, CA-597).
 * 19/10/2026: a Política e os Termos passaram a dizer como excluir a conta pelo site e o que fica guardado (spec
 * exclusao-de-conta, D-257).
 * 20/10/2026: uma versão só para a integração da rodada (spec integracao-rodada-1910, D-314). Quem publica em outro dia
 * troca as duas constantes e o teste delas para o dia em que o site vai ao ar.
 * 21/10/2026: os Termos deixaram de dizer que os cálculos não foram conferidos por nutricionista (spec
 * site-publico-profissional, D-323).
 */
export const VERSAO_TERMOS = '2026-10-21'
export const DATA_TERMOS = '21 de outubro de 2026'

/** Em quantos dias as cópias de segurança do banco somem depois da exclusão (a exclusão em si é na hora). */
export const PRAZO_EXCLUSAO_DIAS = 90

/** Em quantas horas o MetaNutri avisa o nutricionista de um incidente de segurança. */
export const PRAZO_INCIDENTE_HORAS = 72

export const termosProntos = (): boolean => RESPONSAVEL !== null && CONTATO_EMAIL !== null
