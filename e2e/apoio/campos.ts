// Medida dos campos de texto no navegador (spec integracao-rodada-1910, D-311, CA-979).
import { expect, type Locator, type Page } from '@playwright/test'

export interface Medida {
  readonly nome: string
  readonly letra: number
  readonly altura: number
  readonly caixaDeTexto: boolean
}

/** Cada campo de texto à vista na tela: o nome, a letra e a altura. Caixa de marcar, de opção e de arquivo não contam. */
export async function medirCampos(pagina: Page): Promise<readonly Medida[]> {
  return pagina.evaluate(() =>
    [...document.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>('input, select, textarea')]
      .filter((el) => {
        const tipo = el.getAttribute('type') ?? ''
        const r = el.getBoundingClientRect()
        return !['checkbox', 'radio', 'file', 'hidden'].includes(tipo) && r.width > 2 && r.height > 2 && getComputedStyle(el).visibility !== 'hidden'
      })
      .map((el) => ({
        nome: el.getAttribute('aria-label') ?? (el.labels?.[0]?.textContent?.trim() || el.id || el.tagName),
        letra: parseFloat(getComputedStyle(el).fontSize),
        altura: el.getBoundingClientRect().height,
        caixaDeTexto: el.tagName === 'TEXTAREA',
      })),
  )
}

/** CA-979: no celular, nenhuma rolagem para o lado e todo campo com letra de 16 px e, fora a caixa de texto, 44 px. */
export async function conferirCamposNoCelular(pagina: Page, onde: string): Promise<void> {
  const larguras = await pagina.evaluate(() => ({ documento: document.documentElement.scrollWidth, janela: window.innerWidth }))
  expect(larguras.documento, `${onde}: rola para o lado`).toBeLessThanOrEqual(larguras.janela)
  const campos = await medirCampos(pagina)
  expect(campos.length, `${onde}: nenhum campo à vista`).toBeGreaterThan(0)
  const fora = campos.filter((c) => c.letra < 16 || (!c.caixaDeTexto && c.altura < 43.5)).map((c) => `${c.nome}: ${c.letra}px, ${Math.round(c.altura)}px`)
  expect(fora, onde).toEqual([])
}

/** A letra e a altura de um campo só (CA-976 e CA-978). */
export async function medidaDe(campo: Locator): Promise<{ readonly letra: number; readonly altura: number }> {
  return campo.evaluate((el) => ({ letra: parseFloat(getComputedStyle(el).fontSize), altura: el.getBoundingClientRect().height }))
}
