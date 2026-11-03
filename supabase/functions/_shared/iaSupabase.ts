// O banco de verdade da função sugerir-plano (spec assistente-ia, D-1316): o supabase-js com a chave de serviço, que passa
// por cima do RLS. É o único arquivo da IA que importa o supabase-js, e o Vitest não o executa: aqui só se traduz cada
// consulta para as funções do 016, e src/data/servidorIaLigacao.test.ts confere o texto. A versão é a das outras funções.
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2.117.2'
import type { BancoDaIa } from './iaPortas.ts'
import type { Registro } from './portas.ts'

const mensagemDe = (erro: unknown): string => (erro instanceof Error ? erro.message : String(erro))

/** O número que o banco devolve (o bigint pode vir como texto); sem número, rejeita. */
function numero(valor: unknown, oQue: string): number {
  const n = typeof valor === 'string' ? Number(valor) : valor
  if (typeof n !== 'number' || !Number.isFinite(n)) throw new Error(`${oQue} veio sem número.`)
  return n
}

/** `log` é o registro da função: só a conclusão, que não rejeita, escreve nele. */
export function criarBancoDaIa(cliente: SupabaseClient, log: Registro): BancoDaIa {
  return {
    // D-1305: o perfil, o pedido de estudante aprovado e a assinatura, lidos juntos. Falha de qualquer um rejeita.
    async lerConta(conta) {
      const [perfil, pedido, assinatura] = await Promise.all([
        cliente.from('perfis').select('situacao, crn_status').eq('id', conta).maybeSingle(),
        cliente.from('pedidos_estudante').select('id').eq('usuario', conta).eq('status', 'aprovado').limit(1),
        cliente.from('assinaturas').select('plano, status, expira_em').eq('nutricionista_id', conta).maybeSingle(),
      ])
      for (const r of [perfil, pedido, assinatura]) if (r.error) throw new Error(r.error.message || 'A leitura da conta falhou.')
      const p = perfil.data as { readonly situacao?: unknown; readonly crn_status?: unknown } | null
      const a = assinatura.data as { readonly plano?: unknown; readonly status?: unknown; readonly expira_em?: unknown } | null
      return {
        perfil: p && typeof p.situacao === 'string' ? { situacao: p.situacao, crnStatus: typeof p.crn_status === 'string' ? p.crn_status : null } : null,
        pedidoAprovado: (pedido.data ?? []).length > 0,
        assinatura:
          a && typeof a.plano === 'string' && typeof a.status === 'string'
            ? { plano: a.plano, status: a.status, expiraEm: typeof a.expira_em === 'string' ? a.expira_em : null }
            : null,
      }
    },
    // CA-2323: contar e anotar são um passo só, na função do banco, com a conta travada.
    async reservar(conta, modo, limiteMes, inicioDoMes, limiteHora) {
      const { data, error } = await cliente.rpc('reservar_uso_da_ia', {
        p_conta: conta,
        p_modo: modo,
        p_consentimento: true,
        p_limite_mes: limiteMes,
        p_inicio_mes: inicioDoMes.toISOString(),
        p_limite_hora: limiteHora,
      })
      if (error) throw new Error(error.message || 'A reserva do uso falhou.')
      const [linha] = (Array.isArray(data) ? data : []) as readonly { readonly reserva?: unknown; readonly motivo?: unknown }[]
      if (linha?.motivo === 'limite-mes' || linha?.motivo === 'limite-hora') return { motivo: linha.motivo }
      return { reserva: numero(linha?.reserva, 'A reserva') }
    },
    async concluir(reserva, c) {
      try {
        const { error } = await cliente.rpc('concluir_uso_da_ia', {
          p_reserva: reserva,
          p_status: c.status,
          p_modelo: c.modelo,
          p_entrada: c.entrada,
          p_cache_gravados: c.cacheGravados,
          p_cache_lidos: c.cacheLidos,
          p_saida: c.saida,
          p_custo: c.custoMicrodolares,
          p_duracao: c.duracaoMs,
          p_custo_estimado: c.custoEstimado,
        })
        if (error) log('IA: não consegui concluir o uso:', error.message)
      } catch (erro) {
        log('IA: não consegui concluir o uso:', mensagemDe(erro))
      }
    },
    async usosNoMes(conta, inicioDoMes) {
      const { data, error } = await cliente.rpc('uso_da_ia_no_mes', { p_conta: conta, p_inicio_mes: inicioDoMes.toISOString() })
      if (error) throw new Error(error.message || 'A contagem do mês falhou.')
      return numero(data, 'A contagem do mês')
    },
    async custoDesde(desde) {
      const { data, error } = await cliente.rpc('custo_da_ia_desde', { p_desde: desde.toISOString() })
      if (error) throw new Error(error.message || 'A soma do gasto falhou.')
      return numero(data, 'A soma do gasto')
    },
  }
}
