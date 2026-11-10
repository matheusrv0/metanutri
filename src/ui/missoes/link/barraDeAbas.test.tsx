// A barra de baixo do link (spec lado-do-paciente, D-1202, CA-2200, CA-2217, CA-2218, CB-1208 e CB-1219).
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BarraDeAbas } from './BarraDeAbas.tsx'
import { abrirLink, linkDeTeste } from './linkDeTeste.test-utils.tsx'

describe('a barra de baixo', () => {
  it('CA-2200: com a dieta, Hoje, Plano e Semana; abre em Hoje, com a cor da marca e aria-current', () => {
    abrirLink()
    const barra = screen.getByRole('navigation', { name: 'Partes do plano' })
    const links = within(barra).getAllByRole('link')
    expect(links.map((l) => l.textContent)).toEqual(['Hoje', 'Plano', 'Semana'])
    expect(links[0]).toHaveAttribute('aria-current', 'page')
    expect(links[0]?.className).toContain('text-linkacao')
    expect(links.slice(1).every((l) => !l.hasAttribute('aria-current'))).toBe(true)
  })

  it('CB-1208: plano novo sem a dieta no link: só Hoje e Semana', () => {
    abrirLink(linkDeTeste({ dieta: null }))
    expect(within(screen.getByRole('navigation', { name: 'Partes do plano' })).getAllByRole('link').map((l) => l.textContent)).toEqual(['Hoje', 'Semana'])
  })

  it('CA-2217: cada parte é um link para o próprio plano; tocar troca a parte sem sair da página', async () => {
    abrirLink()
    const semana = screen.getByRole('link', { name: 'Semana' })
    expect(semana).toHaveAttribute('href', `/p/${linkDeTeste().token}`)
    await userEvent.setup().click(semana)
    expect(semana).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: 'Hoje' })).not.toHaveAttribute('aria-current')
  })

  it('CA-2218: cada parte tem 56 px de altura no celular (alvo de toque acima de 44 px) e a barra respeita a área segura', () => {
    abrirLink()
    const barra = screen.getByRole('navigation', { name: 'Partes do plano' })
    expect(barra.className).toContain('pb-[env(safe-area-inset-bottom,0px)]')
    for (const link of within(barra).getAllByRole('link')) expect(link.className).toContain('min-h-14')
  })

  it('CA-2218: a barra de baixo não cobre a última missão (o conteúdo tem espaço embaixo dela)', () => {
    const { container } = abrirLink()
    expect(container.querySelector('.pb-24')).toContainElement(screen.getByRole('list', { name: 'Missões de hoje' }))
  })

  it('CB-1219: acima de 640 px, a barra vira um trilho no topo, antes do conteúdo', () => {
    abrirLink()
    const barra = screen.getByRole('navigation', { name: 'Partes do plano' })
    expect(barra.className).toContain('fixed')
    expect(barra.className).toContain('sm:static')
    expect(barra.compareDocumentPosition(screen.getByRole('heading', { level: 1 })) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('na prévia de "Sua marca", a barra fica no fim do celular, nunca presa à tela', () => {
    render(<BarraDeAbas partes={['hoje', 'semana']} atual="hoje" aoIr={() => undefined} endereco="/p/x" previa="claro" />)
    const barra = screen.getByRole('navigation', { name: 'Partes do plano' })
    expect(barra.className).not.toContain('fixed')
    expect(barra.className).not.toContain('sm:')
  })
})
