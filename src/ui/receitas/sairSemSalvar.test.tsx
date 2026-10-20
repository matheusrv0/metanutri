// Spec receitas-com-calculo, CA-863a: sair do editor com mudança não salva pergunta antes.
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useRota } from '../usarRota.ts'
import { TelaReceitas } from './TelaReceitas.tsx'

/** O pedaço do app que importa aqui: a rota, um item de menu e a tela Receitas. */
function Anfitriao() {
  const [rota, navegar] = useRota()
  return (
    <>
      <button type="button" onClick={() => navegar({ tela: 'painel' })}>
        Ir ao painel
      </button>
      {rota.tela === 'receitas' ? <TelaReceitas /> : <p>Tela do painel</p>}
    </>
  )
}

beforeEach(() => {
  localStorage.clear()
  globalThis.location.hash = '#/receitas'
})

async function abrirEditor() {
  render(<Anfitriao />)
  const usuario = userEvent.setup()
  await usuario.click(screen.getByRole('button', { name: 'Nova receita' }))
  return usuario
}

describe('sair do editor sem salvar (CA-863a)', () => {
  it('sem mudança, o menu sai direto', async () => {
    const usuario = await abrirEditor()
    await usuario.click(screen.getByRole('button', { name: 'Ir ao painel' }))
    expect(screen.getByText('Tela do painel')).toBeInTheDocument()
    expect(globalThis.location.hash).toBe('#/painel')
  })

  it('com mudança, o menu pergunta; "Continuar editando" fica; "Sair sem salvar" sai', async () => {
    const usuario = await abrirEditor()
    await usuario.type(screen.getByLabelText('Nome'), 'Bolo')
    await usuario.click(screen.getByRole('button', { name: 'Ir ao painel' }))
    const pergunta = screen.getByRole('alertdialog', { name: 'Sair sem salvar a receita?' })
    expect(pergunta).toHaveTextContent('O que você mudou nesta receita vai se perder.')
    expect(globalThis.location.hash).toBe('#/receitas')

    await usuario.click(screen.getByRole('button', { name: 'Continuar editando' }))
    expect(screen.getByLabelText('Nome')).toHaveValue('Bolo')

    await usuario.click(screen.getByRole('button', { name: 'Ir ao painel' }))
    await usuario.click(screen.getByRole('button', { name: 'Sair sem salvar' }))
    expect(screen.getByText('Tela do painel')).toBeInTheDocument()
    expect(globalThis.location.hash).toBe('#/painel')
  })

  it('com mudança, o voltar do navegador também pergunta, e o endereço fica no editor', async () => {
    const usuario = await abrirEditor()
    await usuario.type(screen.getByLabelText('Nome'), 'Bolo')
    globalThis.location.hash = '#/painel'
    expect(await screen.findByRole('alertdialog', { name: 'Sair sem salvar a receita?' })).toBeInTheDocument()
    await waitFor(() => expect(globalThis.location.hash).toBe('#/receitas'))
    expect(screen.getByLabelText('Nome')).toHaveValue('Bolo')
    await usuario.click(screen.getByRole('button', { name: 'Sair sem salvar' }))
    expect(await screen.findByText('Tela do painel')).toBeInTheDocument()
  })

  it('com mudança, fechar a aba pede confirmação ao navegador; sem mudança, não', async () => {
    const usuario = await abrirEditor()
    const semMudanca = new Event('beforeunload', { cancelable: true })
    globalThis.dispatchEvent(semMudanca)
    expect(semMudanca.defaultPrevented).toBe(false)
    await usuario.type(screen.getByLabelText('Nome'), 'Bolo')
    const comMudanca = new Event('beforeunload', { cancelable: true })
    globalThis.dispatchEvent(comMudanca)
    expect(comMudanca.defaultPrevented).toBe(true)
  })
})
