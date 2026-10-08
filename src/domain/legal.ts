// Quem responde pelo MetaNutri e a versão dos termos (spec conta-e-verificacao, D-46).
// RESPONSAVEL e CONTATO_EMAIL ficam nulos até o dono do projeto mandar os dois. Nulos,
// os Termos e a Política mostram "em preparação" e a publicação é barrada
// (scripts/conferir-publicacao.mjs, Tarefa 13). Ninguém inventa esses valores.

/** Pessoa física responsável pelo MetaNutri e encarregada dos dados pessoais. */
export const RESPONSAVEL: string | null = 'Matheus Rondon'

/** Canal de contato do MetaNutri: titular de dados, plano Clínica, faculdade que falta e suporte. */
export const CONTATO_EMAIL: string | null = 'metanutricontato@gmail.com'

/** Muda quando o texto dos termos ou da política mudar. Vai gravada no cadastro (CA-223). */
export const VERSAO_TERMOS = '2026-10-07'
export const DATA_TERMOS = '7 de outubro de 2026'

/** Em quantos dias os dados somem depois do pedido de exclusão. */
export const PRAZO_EXCLUSAO_DIAS = 90

/** Em quantas horas o MetaNutri avisa o nutricionista de um incidente de segurança. */
export const PRAZO_INCIDENTE_HORAS = 72

export const termosProntos = (): boolean => RESPONSAVEL !== null && CONTATO_EMAIL !== null
