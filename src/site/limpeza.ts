// O que o site faz com o navegador em toda visita, antes de desenhar (spec separacao-site-app, D-510, D-511 e D-527).
// Puro, sem React: o main.tsx do site chama, e os testes conferem cada regra.
import { contaEmDia, contasComEspaco } from '@/domain/contaEmDia.ts'
import { apagarDadosDaConta, chavesSemConta } from '@/domain/donoDosDados.ts'
import type { ArmazenamentoListavel } from '@/domain/persistencia.ts'
import { TELAS_DO_SITE } from '@/ui/navegacao.ts'
import { telaNoApp } from '@/ui/enderecos.ts'

/** A sessão do Supabase e as chaves que andam com ela (`sb-<ref>-auth-token`, `-code-verifier`, `-user`). */
const CHAVE_DE_SESSAO = /^sb-.+-auth-token(?:-code-verifier|-user)?$/

/** D-524 e DP-SA-37: a marca, na consulta, do ícone instalado do endereço antigo. */
export const MARCA_DO_ICONE = 'icone-antigo'

/**
 * D-511: (a) toda sessão guardada sai: o site não usa nenhuma, e ela não pode ficar onde roda só código de vitrine; (b) o
 * espaço de cada conta em dia sai, porque a nuvem tem tudo (com valor retido conta: pode ser a única cópia). Devolve se
 * sobrou dado que só existe aqui (DP-SA-54): um espaço de conta ou dado de antes das contas. Sem conseguir mexer no
 * navegador, não lê nem apaga nada e diz que não sobrou (CB-500): os repasses seguem, e "Continuar" não aparece.
 */
export function limparEnderecoAntigo(base: ArmazenamentoListavel | null): boolean {
  if (base === null) return false
  try {
    const sessoes: string[] = []
    for (let i = 0; i < base.length; i += 1) {
      const chave = base.key(i)
      if (chave !== null && CHAVE_DE_SESSAO.test(chave)) sessoes.push(chave)
    }
    for (const chave of sessoes) base.removeItem(chave)
    for (const conta of contasComEspaco(base)) {
      if (contaEmDia(base, conta, { contarRetidos: true })) apagarDadosDaConta(base, conta)
    }
    return contasComEspaco(base).length > 0 || chavesSemConta(base).length > 0
  } catch {
    return false
  }
}

/**
 * D-510, CA-1423 e CB-512: o link do paciente vai direto ao app, sempre e para sempre, mesmo com dado só aqui (que fica
 * para a próxima ida pelo site). O script do <head> já faz isso; esta é a reserva do pacote.
 */
export const ehLinkDoPaciente = (hash: string): boolean => /^#\/missoes\/[^/]+/.test(hash)

/** A consulta com a marca do ícone antigo no fim. */
const comMarca = (busca: string): string => (busca === '' || busca === '?' ? `?${MARCA_DO_ICONE}` : `${busca}&${MARCA_DO_ICONE}`)

/**
 * O endereço do app para onde o site leva (D-510 e D-527), ou nulo quando o endereço é de página do site. Tela do app
 * (`#/painel`…) vai com o mesmo `#` (CA-1424); a volta do e-mail ou do pagamento (`?volta=…`), com a mesma consulta e o
 * mesmo `#` (CA-1425); o ícone instalado leva a marca do D-524 (CA-1426).
 */
export function enderecoNoApp(local: { readonly hash: string; readonly search: string }, instalado: boolean): string | null {
  const rota = local.hash.startsWith('#/') ? (local.hash.slice(2).split('/')[0] ?? '') : ''
  const paginaDoSite = (TELAS_DO_SITE as readonly string[]).includes(rota)
  const telaDoApp = rota !== '' && !paginaDoSite
  const volta = /[?&]volta=/.test(local.search)
  if (!telaDoApp && !volta && !instalado) return null
  const hash = paginaDoSite ? '' : local.hash
  return telaNoApp(hash, instalado ? comMarca(local.search) : local.search)
}
