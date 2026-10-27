// O tema da landing (spec landing-v3, D-607 a D-613): escuro por padrão, claro pelo botão da barra. A escolha fica no
// navegador numa chave própria, separada do tema do app; sem armazenamento, vale o escuro e nada quebra.
import type { Armazenamento } from '@/domain/persistencia.ts'

export type TemaDaLanding = 'claro' | 'escuro'

/** A mesma chave que `public/preparar-pagina.js` lê antes do primeiro desenho (o teste dele confere). */
export const CHAVE_TEMA_DA_LANDING = 'metanutri:tema-da-landing'

/** A marca que o claro deixa no `<html>`; o CSS pinta a landing pré-desenhada por ela (D-613). */
const MARCA_NO_HTML = 'data-tema-da-landing'

/** CA-1611 e CB-601: só `claro` vale o claro; nada guardado, outro valor ou armazenamento bloqueado, o escuro. */
export function lerTemaDaLanding(arm: Pick<Armazenamento, 'getItem'> | null): TemaDaLanding {
  try {
    return arm?.getItem(CHAVE_TEMA_DA_LANDING) === 'claro' ? 'claro' : 'escuro'
  } catch {
    return 'escuro'
  }
}

/** CA-1613 e CA-1614: guarda a escolha; sem armazenamento, ela vale enquanto a página estiver aberta. */
export function guardarTemaDaLanding(arm: Pick<Armazenamento, 'setItem'> | null, tema: TemaDaLanding): void {
  try {
    arm?.setItem(CHAVE_TEMA_DA_LANDING, tema)
  } catch {
    // Armazenamento bloqueado: a troca vale até recarregar.
  }
}

/** D-613: a marca do `<html>` acompanha a escolha, para o CSS da página pré-desenhada não contradizer o app. */
export function marcarTemaNoHtml(html: HTMLElement | undefined, tema: TemaDaLanding): void {
  if (!html) return
  if (tema === 'claro') html.setAttribute(MARCA_NO_HTML, 'claro')
  else html.removeAttribute(MARCA_NO_HTML)
}
