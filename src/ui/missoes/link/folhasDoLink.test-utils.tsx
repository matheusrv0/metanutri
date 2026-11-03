// A tela do link aberta com as folhas (spec lado-do-paciente): um cliente de mentira para as funções do servidor.
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { DadosDoLink } from '@/domain/dadosDoLink.ts'
import type { ClienteDosEmails } from '@/domain/emailsDoLink.ts'
import type { AcompanhamentoDoLink, FonteAcompanhamentos } from '@/domain/repositorioAcompanhamentos.ts'
import { TelaMissoesPaciente } from '../TelaMissoesPaciente.tsx'
import { DADOS, linkDeTeste } from './linkDeTeste.test-utils.tsx'

export interface Chamada {
  readonly tipo: 'rpc' | 'funcao'
  readonly nome: string
  readonly corpo: Record<string, unknown>
}

/** A resposta de uma função: 2xx com o corpo, ou o erro como o supabase-js o devolve (a `Response` em `context`). */
export type RespostaFalsa = { readonly status: number; readonly corpo: Record<string, unknown> } | 'sem-resposta'

export function clienteDasFolhas(respostaDaFuncao: (corpo: Record<string, unknown>) => RespostaFalsa = () => ({ status: 200, corpo: {} })) {
  const chamadas: Chamada[] = []
  const cliente = {
    rpc: (nome: string, parametros: Record<string, unknown> = {}) => {
      chamadas.push({ tipo: 'rpc', nome, corpo: parametros })
      return Promise.resolve({ data: null, error: null })
    },
    from: () => {
      throw new Error('não usado')
    },
    functions: {
      invoke: (nome: string, { body }: { readonly body: Record<string, unknown> }) => {
        chamadas.push({ tipo: 'funcao', nome, corpo: body })
        const r = respostaDaFuncao(body)
        if (r === 'sem-resposta') return Promise.reject(new Error('Failed to fetch'))
        if (r.status < 300) return Promise.resolve({ data: r.corpo, error: null })
        return Promise.resolve({ data: null, error: { name: 'FunctionsHttpError', context: new Response(JSON.stringify(r.corpo), { status: r.status }) } })
      },
    },
  } as unknown as ClienteDosEmails
  return { cliente, chamadas }
}

export async function abrirComFolhas(opcoes: { readonly dados?: DadosDoLink; readonly cliente?: ClienteDosEmails | null; readonly aoEsquecido?: () => void } = {}) {
  const link: AcompanhamentoDoLink = { ...linkDeTeste(), doLink: opcoes.dados ?? DADOS }
  const fonte: FonteAcompanhamentos = { naNuvem: true, porToken: () => Promise.resolve(link), salvar: (a) => Promise.resolve(a) }
  const tela = render(<TelaMissoesPaciente token={link.token} fonte={fonte} hoje="2026-11-03" cliente={opcoes.cliente ?? null} aoEsquecido={opcoes.aoEsquecido ?? (() => undefined)} />)
  await screen.findByRole('heading', { level: 1 })
  const usuario = userEvent.setup()
  await usuario.click(screen.getByRole('button', { name: 'Mais opções' }))
  return { ...tela, usuario, link }
}
