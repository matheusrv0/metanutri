// CA-1900 no app inteiro (spec importar-pacientes, D-900): Pacientes leva a #/pacientes/importar, que abre no passo
// Arquivo, num pedaço separado do JavaScript (DP-IP-1), com Pacientes marcado no menu.
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { App } from '@/App.tsx'
import { CHAVE_AVISO_VISTO } from '../../casos/AvisoPrimeiroAcesso.tsx'
import { ProvedorTema } from '../../tema/ProvedorTema.tsx'

beforeEach(() => {
  localStorage.clear()
  localStorage.setItem(CHAVE_AVISO_VISTO, '1')
  window.location.hash = '#/pacientes'
})

it('CA-1900: "Importar planilha" em Pacientes abre #/pacientes/importar no passo Arquivo', async () => {
  render(
    <ProvedorTema>
      <App />
    </ProvedorTema>,
  )
  // Na lista vazia, o botão aparece no topo e no convite a cadastrar (CA-1901); o do topo basta.
  await userEvent.click(screen.getAllByRole('button', { name: 'Importar planilha' })[0] as HTMLElement)
  expect(window.location.hash).toBe('#/pacientes/importar')
  expect(await screen.findByRole('heading', { level: 2, name: 'Solte a planilha aqui' })).toBeInTheDocument()
  expect(screen.getByRole('heading', { level: 1, name: 'Importar planilha' })).toBeInTheDocument()
  expect(document.title).toBe('Importar planilha · MetaNutri')
  const menu = screen.getAllByRole('navigation', { name: 'Menu principal' })[0]
  if (!menu) throw new Error('sem o menu')
  expect(within(menu).getByRole('button', { name: 'Pacientes' })).toHaveAttribute('aria-current', 'page')
  // A trilha volta a Pacientes.
  await userEvent.click(screen.getAllByRole('button', { name: 'Pacientes' }).find((b) => b.closest('header') !== null) as HTMLElement)
  expect(window.location.hash).toBe('#/pacientes')
})
