// A mesma interface `FonteAcompanhamentos`, agora contra o Supabase. É o que faz o
// link do paciente abrir no aparelho dele. Nenhuma tela muda por causa deste arquivo.
//
// Duas pessoas diferentes chegam aqui:
//   - o paciente, sem conta, que só pode ler e marcar pelo token (funções RPC);
//   - o nutricionista, logado, que grava a linha inteira (tabela com RLS).
// Ver `supabase/001-acompanhamentos.sql`.
import type { Acompanhamento, MarcacaoDia } from './acompanhamento.ts'
import type { Missao } from './missoes.ts'
import type { FonteAcompanhamentos } from './repositorioAcompanhamentos.ts'

interface Resposta<T> {
  readonly data: T | null
  readonly error: { readonly message: string } | null
}

/** O pedaço do cliente Supabase que este arquivo usa — o resto não interessa aqui. */
export interface ClienteMissoes {
  rpc(nome: string, parametros: Record<string, unknown>): PromiseLike<Resposta<unknown>>
  from(tabela: string): {
    upsert(linha: Record<string, unknown>, opcoes?: { onConflict?: string }): PromiseLike<Resposta<unknown>>
    delete(): { eq(coluna: string, valor: string): PromiseLike<Resposta<unknown>> }
  }
  auth: {
    getSession(): PromiseLike<{ data: { session: { user: { id: string } } | null } }>
  }
}

const TABELA = 'acompanhamentos'

function ehListaDeMissoes(v: unknown): v is readonly Missao[] {
  return Array.isArray(v) && v.every((m) => typeof m === 'object' && m !== null && typeof (m as Missao).id === 'string')
}

function ehListaDeMarcacoes(v: unknown): v is readonly MarcacaoDia[] {
  return Array.isArray(v) && v.every((m) => typeof m === 'object' && m !== null && typeof (m as MarcacaoDia).dia === 'string' && Array.isArray((m as MarcacaoDia).feitas))
}

/** Linha do banco → acompanhamento. Devolve nulo se vier coisa que não dá para usar. */
export function daLinha(linha: unknown): Acompanhamento | null {
  if (typeof linha !== 'object' || linha === null) return null
  const o = linha as Record<string, unknown>
  if (typeof o['id'] !== 'string' || typeof o['token'] !== 'string' || typeof o['caso_id'] !== 'string') return null

  return {
    id: o['id'],
    token: o['token'],
    casoId: o['caso_id'],
    pacienteId: typeof o['paciente_id'] === 'string' ? o['paciente_id'] : null,
    nome: typeof o['nome'] === 'string' ? o['nome'] : '',
    criadoEm: typeof o['criado_em'] === 'string' ? o['criado_em'] : new Date().toISOString(),
    missoes: ehListaDeMissoes(o['missoes']) ? o['missoes'] : [],
    marcacoes: ehListaDeMarcacoes(o['marcacoes']) ? o['marcacoes'] : [],
    // Na dúvida, avisa. Linha antiga sem a coluna vira link de estudante e mostra o
    // aviso — errar para o lado de avisar demais é o lado certo aqui.
    usoNaoComercial: o['uso_nao_comercial'] !== false,
  }
}

function paraLinha(a: Acompanhamento, nutricionistaId: string): Record<string, unknown> {
  return {
    id: a.id,
    nutricionista_id: nutricionistaId,
    token: a.token,
    caso_id: a.casoId,
    paciente_id: a.pacienteId,
    nome: a.nome,
    criado_em: a.criadoEm,
    missoes: a.missoes,
    marcacoes: a.marcacoes,
    uso_nao_comercial: a.usoNaoComercial,
  }
}

export interface OpcoesFonteSupabase {
  /** Chamado quando a rede falha, para a tela poder avisar em vez de fingir que salvou. */
  readonly aoFalhar?: (mensagem: string) => void
}

export function fonteSupabase(cliente: ClienteMissoes, opcoes: OpcoesFonteSupabase = {}): FonteAcompanhamentos {
  const avisar = opcoes.aoFalhar ?? (() => undefined)

  return {
    naNuvem: true,

    async porToken(token) {
      if (!token) return null
      const { data, error } = await cliente.rpc('missoes_por_token', { p_token: token })
      if (error) {
        avisar(error.message)
        return null
      }
      // A função devolve uma tabela: vem lista, mesmo com uma linha só.
      const linha = Array.isArray(data) ? data[0] : data
      return daLinha(linha)
    },

    async salvar(acompanhamento) {
      const { data } = await cliente.auth.getSession()
      const usuario = data.session?.user.id ?? null

      // Sem sessão é o paciente marcando: só as marcações, só na linha do token dele.
      if (usuario === null) {
        const { error } = await cliente.rpc('marcar_missoes', { p_token: acompanhamento.token, p_marcacoes: acompanhamento.marcacoes })
        if (error) avisar(error.message)
        return acompanhamento
      }

      const { error } = await cliente.from(TABELA).upsert(paraLinha(acompanhamento, usuario), { onConflict: 'id' })
      if (error) avisar(error.message)
      return acompanhamento
    },
  }
}

/**
 * Apaga da nuvem tudo que é deste nutricionista. É o que a LGPD chama de direito à
 * eliminação, e o que a tela de Configurações precisa para não prometer o que não faz.
 * Devolve a mensagem de erro, ou nulo quando deu certo.
 */
export async function apagarAcompanhamentosDaNuvem(cliente: ClienteMissoes): Promise<string | null> {
  const { data } = await cliente.auth.getSession()
  const usuario = data.session?.user.id ?? null
  if (usuario === null) return null

  const { error } = await cliente.from(TABELA).delete().eq('nutricionista_id', usuario)
  return error ? error.message : null
}
