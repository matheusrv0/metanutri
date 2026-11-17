// O relógio do Docker nos testes de ataque (spec seguranca-lote-4, D-136; rodada de melhorias de 16/11).
//
// O Supabase local roda numa máquina virtual do Docker, e o relógio dela às vezes salta para trás (depois de o
// computador dormir, por exemplo). Um token assinado antes do salto passa a parecer "emitido no futuro", e a API de
// tabelas recusa o pedido com PGRST303 ("JWT issued at future") antes de olhar a regra do banco. Recusado assim, o
// ataque não provou nada. Este fetch repete o pedido: primeiro com um token novo, que o login assina na hora do
// relógio de agora; sem sessão para renovar (ou se o novo também vier do futuro), espera e tenta de novo, até 40
// vezes. Qualquer outra resposta volta como veio. Testado em src/seguranca/relogio.test.ts.

const ATE = 40
const PAUSA_MS = 250

const esperarDeVerdade = (ms: number): Promise<void> => new Promise((resolver) => setTimeout(resolver, ms))

async function veioDoFuturo(resposta: Response): Promise<boolean> {
  if (resposta.ok) return false
  return /PGRST303|issued at future/i.test(await resposta.clone().text())
}

/** As mesmas opções, com o token novo no lugar do velho; o pedido sem login continua sem. */
function comToken(opcoes: RequestInit | undefined, token: string): RequestInit | undefined {
  const cabecalhos = new Headers(opcoes?.headers)
  if (!cabecalhos.has('Authorization')) return opcoes
  cabecalhos.set('Authorization', `Bearer ${token}`)
  return { ...opcoes, headers: cabecalhos }
}

/**
 * @param base o fetch de verdade
 * @param renovar renova a sessão do cliente e devolve o token novo, ou null se não houver sessão
 * @param esperar a pausa entre as tentativas (no teste, sem pausa)
 */
export function fetchQueAcertaORelogio(
  base: typeof fetch,
  renovar: () => Promise<string | null>,
  esperar: (ms: number) => Promise<void> = esperarDeVerdade,
): typeof fetch {
  return async (entrada, opcoes) => {
    let atuais = opcoes
    let renovou = false
    for (let tentativa = 1; ; tentativa++) {
      const resposta = await base(entrada, atuais)
      if (tentativa >= ATE || !(await veioDoFuturo(resposta))) return resposta
      if (!renovou) {
        renovou = true
        const token = await renovar()
        if (token) {
          atuais = comToken(atuais, token)
          continue
        }
      }
      await esperar(PAUSA_MS)
    }
  }
}
