// Um cliente de mentira para os e-mails do link (spec lado-do-paciente): responde às funções do banco e às funções do
// servidor com o que o teste disser, e guarda o que foi pedido. Nada sai da máquina.
import type { ClienteDosEmails } from './emailsDoLink.ts'

export interface ChamadaDosEmails {
  readonly tipo: 'rpc' | 'funcao' | 'select' | 'upsert'
  readonly nome: string
  readonly corpo: Record<string, unknown>
}

export interface OpcoesDosEmailsFalsos {
  /** O que cada função do banco devolve, pelo nome (`emails_do_link`, `painel_emails`…). */
  readonly rpc?: Readonly<Record<string, unknown>>
  /** Funções do banco que falham (o banco sem o 017, por exemplo). */
  readonly rpcComErro?: readonly string[]
  /** A resposta de cada Edge Function, pelo nome; status 2xx é sucesso. */
  readonly funcao?: Readonly<Record<string, { readonly status: number; readonly corpo: unknown }>>
  /** A linha de `config_de_emails`. */
  readonly config?: unknown
}

export function emailsFalsos(opcoes: OpcoesDosEmailsFalsos = {}) {
  const chamadas: ChamadaDosEmails[] = []
  const cliente: ClienteDosEmails = {
    rpc: (nome, parametros = {}) => {
      chamadas.push({ tipo: 'rpc', nome, corpo: parametros })
      if (opcoes.rpcComErro?.includes(nome)) return Promise.resolve({ data: null, error: { message: `Could not find the function public.${nome}` } })
      return Promise.resolve({ data: opcoes.rpc?.[nome] ?? null, error: null })
    },
    from: (tabela) => ({
      select: () => ({
        eq: (coluna, valor) => ({
          maybeSingle: () => {
            chamadas.push({ tipo: 'select', nome: tabela, corpo: { [coluna]: valor } })
            return Promise.resolve({ data: opcoes.config ?? null, error: null })
          },
        }),
      }),
      upsert: (linha) => {
        chamadas.push({ tipo: 'upsert', nome: tabela, corpo: linha })
        return Promise.resolve({ error: null })
      },
    }),
    functions: {
      invoke: (nome, { body }) => {
        chamadas.push({ tipo: 'funcao', nome, corpo: body })
        const resposta = opcoes.funcao?.[nome] ?? { status: 200, corpo: {} }
        if (resposta.status < 300) return Promise.resolve({ data: resposta.corpo, error: null })
        return Promise.resolve({ data: null, error: { name: 'FunctionsHttpError', context: new Response(JSON.stringify(resposta.corpo), { status: resposta.status }) } })
      },
    },
  }
  return { cliente, chamadas }
}

/** Um `emails_do_link` com e-mail da ficha, os três avisos oferecidos e, se pedido, aceitos. */
export function linhaDeEmails(dados: Readonly<Record<string, unknown>> = {}): Record<string, unknown> {
  return {
    email: 'juliana.martins@gmail.com',
    origem: 'ficha',
    confirmado_em: null,
    ofertas: { plano: true, semana: true, lembrete: true },
    aceites: [],
    pendentes: [],
    supressao: null,
    parou_tudo_em: null,
    convite_em: null,
    a1_para: null,
    envios: [],
    ...dados,
  }
}
