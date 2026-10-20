// O lado de verdade da excluir-conta (spec exclusao-de-conta): o supabase-js com a chave de serviço, que passa por cima
// do RLS. Aqui só se traduz cada passo; a decisão e a ordem moram em excluirConta.ts. O texto é conferido em
// src/data/servidorExcluirLigacao.test.ts, e o comportamento, contra o Supabase local, em testes/seguranca/exclusao.test.ts.
//
// Importa só o tipo, pelo npm: (o mesmo caminho para onde as outras funções estão indo), na versão das outras.
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2.117.2'
import { horaDaSenha, type PortaDaExclusao, type QuemPedeAExclusao } from './excluirConta.ts'

const BALDE = 'comprovantes'
const PAGINA = 100

const mensagemDe = (erro: unknown): string => (erro instanceof Error ? erro.message : String(erro))

/** O balde dos comprovantes, só com o que a exclusão usa. */
type Balde = ReturnType<SupabaseClient['storage']['from']>

/**
 * CB-259: todos os arquivos de uma pasta, em páginas de 100, entrando nas subpastas (o envio aceita qualquer caminho
 * dentro da pasta da conta). A lista é lida inteira antes de apagar: assim as páginas não andam no meio. Na lista do
 * armazenamento, a subpasta é o item sem id.
 */
async function listarArquivos(balde: Balde, pasta: string, achados: string[]): Promise<string | null> {
  for (let desde = 0; ; desde += PAGINA) {
    const { data, error } = await balde.list(pasta, { limit: PAGINA, offset: desde })
    if (error) return error.message
    const itens = data ?? []
    for (const item of itens) {
      const caminho = `${pasta}/${item.name}`
      if (item.id) achados.push(caminho)
      else {
        const falha = await listarArquivos(balde, caminho, achados)
        if (falha) return falha
      }
    }
    if (itens.length < PAGINA) return null
  }
}

export function criarPortaDaExclusao(cliente: SupabaseClient): PortaDaExclusao {
  return {
    // CB-253 (L4 da revisão): a mesma trava do 008 que o pagamento e a troca de cartão usam; sem cartão, que aqui não há.
    async reservar(conta, antesDe) {
      try {
        const vencida = await cliente.from('assinando_agora').delete().eq('nutricionista_id', conta).lt('desde', antesDe)
        if (vencida.error) return { tipo: 'falhou', mensagem: vencida.error.message }
        const { error } = await cliente.from('assinando_agora').insert({ nutricionista_id: conta })
        if (!error) return { tipo: 'reservada' }
        return error.code === '23505' ? { tipo: 'ocupada' } : { tipo: 'falhou', mensagem: error.message || 'A reserva falhou.' }
      } catch (erro) {
        return { tipo: 'falhou', mensagem: mensagemDe(erro) }
      }
    },
    async soltarReserva(conta) {
      try {
        const { error } = await cliente.from('assinando_agora').delete().eq('nutricionista_id', conta)
        return error ? error.message || 'A reserva não saiu.' : null
      } catch (erro) {
        return mensagemDe(erro)
      }
    },
    async ehAdmin(conta) {
      const { data, error } = await cliente.from('administradores').select('usuario').eq('usuario', conta).maybeSingle()
      if (error) throw new Error(error.message || 'A leitura dos administradores falhou.')
      return data !== null
    },
    async apagarArquivos(conta) {
      try {
        const balde = cliente.storage.from(BALDE)
        const arquivos: string[] = []
        const naoListou = await listarArquivos(balde, conta, arquivos)
        if (naoListou) return naoListou
        for (let i = 0; i < arquivos.length; i += PAGINA) {
          const { error } = await balde.remove(arquivos.slice(i, i + PAGINA))
          if (error) return error.message
        }
        return null
      } catch (erro) {
        return mensagemDe(erro)
      }
    },
    async apagarLogin(conta) {
      try {
        const { error } = await cliente.auth.admin.deleteUser(conta)
        // CB-252: outro pedido (ou o dono, no painel) já apagou: está feito.
        if (!error || error.code === 'user_not_found') return null
        return error.message || 'O servidor de login não apagou a conta.'
      } catch (erro) {
        return mensagemDe(erro)
      }
    },
  }
}

/**
 * Quem está pedindo: o token da sessão vem no cabeçalho Authorization, já conferido pela porta da função (verify_jwt).
 * O servidor de login confere de novo e diz de quem é. Token que vale de uma conta que não existe mais é a conta já
 * excluída (CA-821): a resposta do pedido anterior se perdeu.
 */
export async function quemPedeAExclusao(cliente: SupabaseClient, autorizacao: string | null): Promise<QuemPedeAExclusao> {
  const jwt = (autorizacao ?? '').replace(/^Bearer\s+/i, '').trim()
  // Sem token, o getUser leria a sessão do próprio cliente (que não tem): melhor nem perguntar.
  if (!jwt) return { tipo: 'ninguem' }
  const { data, error } = await cliente.auth.getUser(jwt)
  if (error?.code === 'user_not_found') return { tipo: 'apagada' }
  if (error || !data.user) return { tipo: 'ninguem' }
  return { tipo: 'conta', conta: { id: data.user.id, email: data.user.email ?? null }, senhaEm: horaDaSenha(jwt) }
}
