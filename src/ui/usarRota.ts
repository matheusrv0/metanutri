import { useCallback, useEffect, useRef, useState } from 'react'
import { escreverRota, lerRota, type Rota } from './navegacao.ts'

/**
 * Uma tela com mudança não salva pode segurar a saída (spec receitas-com-calculo, CA-863a). A guarda recebe como seguir
 * para onde a pessoa ia: devolve `true` para deixar sair agora, ou `false` e chama `seguir` depois (se a pessoa
 * confirmar). Uma de cada vez: a do editor de receita.
 */
export type GuardaDeSaida = (seguir: () => void) => boolean

let guarda: GuardaDeSaida | null = null

/** Liga a guarda enquanto `ativa` (a tela tem mudança não salva). */
export function useGuardaDeSaida(ativa: boolean, guardar: GuardaDeSaida): void {
  useEffect(() => {
    if (!ativa) return
    guarda = guardar
    return () => {
      if (guarda === guardar) guarda = null
    }
  }, [ativa, guardar])
}

/** Rota atual lida do endereço, atualizada quando o usuário navega (inclusive voltar do navegador). */
export function useRota(): readonly [Rota, (rota: Rota) => void] {
  const [rota, setRota] = useState<Rota>(() => lerRota(globalThis.location?.hash ?? ''))
  // O endereço da tela de agora, para voltar a ele quando a guarda segura o voltar do navegador.
  const enderecoAtual = useRef(escreverRota(rota))

  const aplicar = useCallback((nova: Rota) => {
    const hash = escreverRota(nova)
    enderecoAtual.current = hash
    if (globalThis.location.hash !== hash) globalThis.location.hash = hash
    setRota(nova)
  }, [])

  useEffect(() => {
    const aoMudar = () => {
      const nova = lerRota(globalThis.location.hash)
      const segurar = guarda
      // CA-863a: o voltar do navegador já trocou o endereço; segurado, ele volta para a tela de agora.
      if (segurar && escreverRota(nova) !== enderecoAtual.current) {
        const seguir = () => {
          guarda = null
          aplicar(nova)
        }
        if (!segurar(seguir)) {
          globalThis.history.pushState(null, '', enderecoAtual.current)
          return
        }
      }
      enderecoAtual.current = escreverRota(nova)
      setRota(nova)
    }
    globalThis.addEventListener('hashchange', aoMudar)
    return () => globalThis.removeEventListener('hashchange', aoMudar)
  }, [aplicar])

  const navegar = useCallback(
    (nova: Rota) => {
      const segurar = guarda
      if (segurar) {
        const seguir = () => {
          guarda = null
          aplicar(nova)
        }
        if (!segurar(seguir)) return
      }
      aplicar(nova)
    },
    [aplicar],
  )

  return [rota, navegar] as const
}
