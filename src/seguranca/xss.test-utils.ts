// Código malicioso em campo de texto livre (spec seguranca-lote-4, CA-487): as cargas e a conferência do DOM.
// O nome não termina em `.test.ts`, então o Vitest não roda este arquivo como teste.

/** As quatro cargas da spec: script, imagem com onerror, link javascript: e svg com onload. */
export const CARGAS = [
  '<script>alert(1)</script>',
  '"><img src=x onerror=alert(1)>',
  '<a href="javascript:alert(1)">x</a>',
  '<svg onload=alert(1)>',
] as const

/** O endereço `javascript:` puro, sem HTML: o que um campo de e-mail, telefone ou nome de link receberia. */
export const JAVASCRIPT_PURO = 'javascript:alert(1)'

/** Um texto livre com as quatro cargas. O rótulo diz de que campo ele é, para achar na tela. */
export function malicioso(rotulo: string): string {
  return `${rotulo} ${CARGAS.join(' ')}`
}

const ATRIBUTOS_DE_ENDERECO = ['href', 'src', 'action', 'formaction', 'xlink:href', 'data', 'srcdoc', 'poster', 'background']

const ENTIDADES_NOMEADAS: Readonly<Record<string, string>> = { colon: ':', tab: '\t', newline: '\n', lpar: '(', rpar: ')' }

/** Entidades que o navegador lê dentro de um endereço (`&#x09;`, `&#58;`, `&colon;`, `&Tab;`...), já traduzidas. */
function semEntidades(valor: string): string {
  const caractere = (inteira: string, codigo: number) => (codigo <= 0x10ffff ? String.fromCodePoint(codigo) : inteira)
  return valor
    .replace(/&#x([0-9a-f]+);?/gi, (inteira: string, hex: string) => caractere(inteira, Number.parseInt(hex, 16)))
    .replace(/&#([0-9]+);?/g, (inteira: string, dec: string) => caractere(inteira, Number.parseInt(dec, 10)))
    .replace(/&([a-z]+);/gi, (inteira: string, nome: string) => ENTIDADES_NOMEADAS[nome.toLowerCase()] ?? inteira)
}

/** Tira espaço, tabulação, quebra de linha e os outros caracteres de controle, que o navegador ignora num endereço. */
function semInvisiveis(valor: string): string {
  return [...valor]
    .filter((c) => {
      const codigo = c.codePointAt(0) ?? 0
      return codigo > 0x20 && (codigo < 0x7f || codigo > 0xa0)
    })
    .join('')
}

/**
 * Endereço perigoso: tem `javascript:` em qualquer ponto (maiúscula ou minúscula, com espaço, tabulação,
 * quebra de linha ou entidade no meio, como `java\tscript:`) ou tem o `alert(1)` das cargas.
 */
export function enderecoPerigoso(valor: string): boolean {
  const limpo = semInvisiveis(semEntidades(valor)).toLowerCase()
  return limpo.includes('javascript:') || limpo.includes('alert(1)')
}

/**
 * Nada nasceu da carga: nenhum `script`, nenhum elemento com atributo `on*` (o React nunca põe um; só HTML
 * injetado põe), nenhum endereço perigoso (`enderecoPerigoso`), nenhuma `img` com `src="x"` e nenhuma moldura,
 * `object` ou `embed`. Confere o documento inteiro, porque janela e menu vão para o fim do `body`.
 */
export function conferirSemInjecao(raiz: ParentNode = document): void {
  expect(raiz.querySelectorAll('script')).toHaveLength(0)
  const todos = [...raiz.querySelectorAll('*')]
  const comEvento = todos.filter((el) => [...el.attributes].some((a) => a.name.toLowerCase().startsWith('on'))).map((el) => el.outerHTML.slice(0, 160))
  expect(comEvento).toEqual([])
  const perigosos = todos.flatMap((el) => ATRIBUTOS_DE_ENDERECO.map((nome) => el.getAttribute(nome) ?? '')).filter(enderecoPerigoso)
  expect(perigosos).toEqual([])
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

/** Um texto exato (como o `javascript:` puro) aparece como texto na tela ou num campo. */
export function textoLiteral(texto: string, raiz: ParentNode = document.body): void {
  expect(textoVisivel(raiz)).toContain(texto)
}
