// Código malicioso em campo de texto livre (spec seguranca-lote-4, CA-487): as cargas e a conferência do DOM.
// O nome não termina em `.test.ts`, então o Vitest não roda este arquivo como teste.

/** As quatro cargas da spec: script, imagem com onerror, link javascript: e svg com onload. */
export const CARGAS = [
  '<script>alert(1)</script>',
  '"><img src=x onerror=alert(1)>',
  '<a href="javascript:alert(1)">x</a>',
  '<svg onload=alert(1)>',
] as const

/** Um texto livre com as quatro cargas. O rótulo diz de que campo ele é, para achar na tela. */
export function malicioso(rotulo: string): string {
  return `${rotulo} ${CARGAS.join(' ')}`
}

const ATRIBUTOS_DE_ENDERECO = ['href', 'src', 'action', 'formaction', 'xlink:href', 'data', 'srcdoc', 'poster', 'background']

/**
 * Nada nasceu da carga: nenhum `script`, nenhum elemento com atributo `on*` (o React nunca põe um; só
 * HTML injetado põe), nenhum endereço `javascript:`, nenhuma `img` com `src="x"` e nenhuma moldura,
 * `object` ou `embed`. Confere o documento inteiro, porque janela e menu vão para o fim do `body`.
 */
export function conferirSemInjecao(raiz: ParentNode = document): void {
  expect(raiz.querySelectorAll('script')).toHaveLength(0)
  const todos = [...raiz.querySelectorAll('*')]
  const comEvento = todos.filter((el) => [...el.attributes].some((a) => a.name.toLowerCase().startsWith('on'))).map((el) => el.outerHTML.slice(0, 160))
  expect(comEvento).toEqual([])
  const comJavascript = todos.flatMap((el) => ATRIBUTOS_DE_ENDERECO.map((nome) => el.getAttribute(nome) ?? '')).filter((valor) => /^\s*javascript:/i.test(valor))
  expect(comJavascript).toEqual([])
  expect(raiz.querySelectorAll('img[src="x"], iframe, object, embed, frame')).toHaveLength(0)
}

/** Todo o texto que a pessoa vê, mais o que está escrito nos campos. */
export function textoVisivel(raiz: ParentNode = document.body): string {
  const campos = [...raiz.querySelectorAll('input, textarea')].map((el) => (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement ? el.value : ''))
  return `${raiz.textContent ?? ''}\n${campos.join('\n')}`
}

/** A carga aparece como texto, inteira: as quatro cargas literais, junto do rótulo do campo. */
export function cargaComoTexto(rotulo: string, raiz: ParentNode = document.body): void {
  expect(textoVisivel(raiz)).toContain(malicioso(rotulo))
}
