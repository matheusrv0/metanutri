import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { CHAVE_TEMA, ContextoTema, type PreferenciaTema, type ValorTema } from './contextoTema.ts'

function lerPreferencia(): PreferenciaTema {
  try {
    const v = globalThis.localStorage?.getItem(CHAVE_TEMA)
    return v === 'claro' || v === 'escuro' || v === 'sistema' ? v : 'sistema'
  } catch {
    return 'sistema'
  }
}

const sistemaEscuro = () => globalThis.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false

/** Aplica a classe `dark` no <html>, como o template MaterialM, e guarda a escolha no navegador. */
export function ProvedorTema({ children }: { readonly children: ReactNode }) {
  const [preferencia, setPreferencia] = useState<PreferenciaTema>(lerPreferencia)
  const [escuroSistema, setEscuroSistema] = useState(sistemaEscuro)

  useEffect(() => {
    const mq = globalThis.matchMedia?.('(prefers-color-scheme: dark)')
    if (!mq) return
    const aoMudar = (e: MediaQueryListEvent) => setEscuroSistema(e.matches)
    mq.addEventListener('change', aoMudar)
    return () => mq.removeEventListener('change', aoMudar)
  }, [])

  const aplicado = preferencia === 'sistema' ? (escuroSistema ? 'escuro' : 'claro') : preferencia

  useEffect(() => {
    document.documentElement.classList.toggle('dark', aplicado === 'escuro')
    document.documentElement.style.colorScheme = aplicado === 'escuro' ? 'dark' : 'light'

    // A barra do navegador no celular segue o tema escolhido aqui, não só o do sistema:
    // depois de trocar a classe, o token já tem o valor novo.
    const fundo = getComputedStyle(document.documentElement).getPropertyValue('--bg-page').trim()
    if (fundo) {
      for (const meta of document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')) {
        meta.content = fundo
        meta.removeAttribute('media')
      }
    }
  }, [aplicado])

  const definir = useCallback((p: PreferenciaTema) => {
    setPreferencia(p)
    try {
      globalThis.localStorage?.setItem(CHAVE_TEMA, p)
    } catch {
      // armazenamento indisponível: o tema vale só nesta sessão
    }
  }, [])

  const valor = useMemo<ValorTema>(
    () => ({ preferencia, aplicado, definir, alternar: () => definir(aplicado === 'escuro' ? 'claro' : 'escuro') }),
    [preferencia, aplicado, definir],
  )

  return <ContextoTema.Provider value={valor}>{children}</ContextoTema.Provider>
}
