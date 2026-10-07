// O banco de verdade das três funções: o supabase-js com a chave de serviço, que passa por cima do RLS
// (spec cobranca-em-producao, D-88). É o único arquivo de _shared que importa do esm.sh, e o Vitest não o
// executa: aqui só se traduz cada consulta, com o mesmo sentido do banco de mentira
// (src/data/servidorFalsos.test-utils.ts), e src/data/servidorLigacao.test.ts confere o texto.
//
// O supabase-js devolve o erro do banco (e o da rede) no resultado, sem lançar: é o que a porta pede.
import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { UM_DIA_MS } from './cobranca.ts'
import type { BancoDaCobranca, ContaQuePede, FalhaDoBanco, LinhaDaAssinatura, Registro } from './portas.ts'

const COLUNAS = 'nutricionista_id, plano, status, ciclo, preapproval_id, cartao_final, proxima_cobranca, expira_em, ultima_cobranca_paga, encerrada_por, encerrada_em'
const UMA_HORA_MS = 60 * 60 * 1000

const falhaDe = (erro: { readonly message: string; readonly code?: string } | null): FalhaDoBanco | null =>
  erro ? { mensagem: erro.message, codigo: erro.code ?? null } : null

const mensagemDe = (erro: unknown): string => (erro instanceof Error ? erro.message : String(erro))

/** O número da contagem; sem ele (erro do banco ou da rede), rejeita: o portão responde 502 e não deixa passar (R5). */
function numeroDa(contagem: { readonly count: number | null; readonly error: { readonly message: string } | null }): number {
  if (contagem.error) throw new Error(contagem.error.message)
  if (typeof contagem.count !== 'number') throw new Error('A contagem das tentativas veio sem número.')
  return contagem.count
}

/** `log` é o registro da função: só as tentativas, que não podem rejeitar, escrevem nele. */
export function criarBanco(cliente: SupabaseClient, log: Registro): BancoDaCobranca {
  return {
    async lerDaConta(conta) {
      const { data, error } = await cliente.from('assinaturas').select(COLUNAS).eq('nutricionista_id', conta).maybeSingle()
      return { linha: (data as LinhaDaAssinatura | null) ?? null, falha: falhaDe(error) }
    },
    async lerDaOperadora(preapprovalId) {
      const { data, error } = await cliente.from('assinaturas').select(COLUNAS).eq('preapproval_id', preapprovalId).maybeSingle()
      return { linha: (data as LinhaDaAssinatura | null) ?? null, falha: falhaDe(error) }
    },
    async gravar(nova) {
      const { error } = await cliente.from('assinaturas').upsert(nova, { onConflict: 'nutricionista_id' })
      return falhaDe(error)
    },
    async mudar(conta, preapprovalId, mudanca) {
      const { data, error } = await cliente.from('assinaturas').update(mudanca).eq('nutricionista_id', conta).eq('preapproval_id', preapprovalId).select('nutricionista_id')
      return { linhas: error ? 0 : (data?.length ?? 0), falha: falhaDe(error) }
    },
    async soltarReservaVencida(conta, antesDe) {
      const { error } = await cliente.from('assinando_agora').delete().eq('nutricionista_id', conta).lt('desde', antesDe)
      return falhaDe(error)
    },
    async reservar(conta, cartao) {
      const { error } = await cliente.from('assinando_agora').insert({ nutricionista_id: conta, cartao_bandeira: cartao.bandeira, cartao_final: cartao.final })
      return falhaDe(error)
    },
    async lerReserva(conta) {
      const { data, error } = await cliente.from('assinando_agora').select('cartao_bandeira, cartao_final').eq('nutricionista_id', conta).maybeSingle()
      if (error || !data) return null
      const reserva = data as { readonly cartao_bandeira: string | null; readonly cartao_final: string | null }
      return { cartao_bandeira: reserva.cartao_bandeira ?? null, cartao_final: reserva.cartao_final ?? null }
    },
    async soltarReserva(conta) {
      const { error } = await cliente.from('assinando_agora').delete().eq('nutricionista_id', conta)
      return falhaDe(error)
    },
    async anotarAviso(aviso) {
      const { error } = await cliente.from('avisos_da_operadora').insert(aviso)
      return falhaDe(error)
    },
    async apagarAvisosAntesDe(data) {
      const { error } = await cliente.from('avisos_da_operadora').delete().lt('recebido_em', data)
      return falhaDe(error)
    },
    // As janelas são estritas (quando > agora − 24 h; quando > agora − 1 h), como no banco de mentira.
    // As seguidas comparam no próprio banco com a hora do último sucesso como ela veio, sem perder os
    // microssegundos que o Date do JavaScript corta.
    async contarRecusas(conta, agora) {
      const desde24h = new Date(agora.getTime() - UM_DIA_MS).toISOString()
      const desde1h = new Date(agora.getTime() - UMA_HORA_MS).toISOString()
      const recusas = () => cliente.from('tentativas_de_cartao').select('id', { count: 'exact', head: true }).eq('recusada', true)
      const daConta24h = () => recusas().eq('nutricionista_id', conta).gt('quando', desde24h)
      const [contaEm24h, siteEm1h, sucesso] = await Promise.all([
        daConta24h(),
        recusas().gt('quando', desde1h),
        cliente.from('tentativas_de_cartao').select('quando').eq('nutricionista_id', conta).eq('recusada', false).order('quando', { ascending: false }).limit(1).maybeSingle(),
      ])
      const daConta = numeroDa(contaEm24h)
      const doSite = numeroDa(siteEm1h)
      if (sucesso.error) throw new Error(sucesso.error.message)
      const quando: unknown = (sucesso.data as { readonly quando?: unknown } | null)?.quando
      const ultimoSucesso = typeof quando === 'string' ? quando : null
      const seguidas = await (ultimoSucesso ? daConta24h().gt('quando', ultimoSucesso) : daConta24h())
      return { daConta24h: daConta, seguidasDaConta: numeroDa(seguidas), doSite1h: doSite }
    },
    async anotarTentativa(conta, recusada) {
      // A hora é a do banco (default now()); a do relógio da função difere dela em milissegundos.
      try {
        const { error } = await cliente.from('tentativas_de_cartao').insert({ nutricionista_id: conta, recusada })
        if (error) log('Não consegui anotar a tentativa de cartão:', error.message)
      } catch (erro) {
        log('Não consegui anotar a tentativa de cartão:', mensagemDe(erro))
      }
    },
    async apagarTentativasAntesDe(data) {
      try {
        const { error } = await cliente.from('tentativas_de_cartao').delete().lt('quando', data.toISOString())
        if (error) log('Não consegui apagar as tentativas de cartão antigas:', error.message)
      } catch (erro) {
        log('Não consegui apagar as tentativas de cartão antigas:', mensagemDe(erro))
      }
    },
  }
}

/** Quem está pedindo: o token da sessão vem no cabeçalho Authorization. Sem ele, ninguém. */
export async function quemPede(cliente: SupabaseClient, autorizacao: string | null): Promise<ContaQuePede | null> {
  const jwt = (autorizacao ?? '').replace(/^Bearer\s+/i, '').trim()
  // Sem token, o getUser leria a sessão do próprio cliente (que não tem): melhor nem perguntar.
  if (!jwt) return null
  const { data, error } = await cliente.auth.getUser(jwt)
  if (error || !data.user) return null
  return { id: data.user.id, email: data.user.email ?? null }
}
