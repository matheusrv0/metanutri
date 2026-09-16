import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { criarRepositorio, type Armazenamento } from '@/domain/persistencia.ts'
import { ProvedorCasos } from '../estado/ProvedorCasos.tsx'
import { AvisoPrimeiroAcesso, CHAVE_AVISO_VISTO } from './AvisoPrimeiroAcesso.tsx'
import { TelaCasos } from './TelaCasos.tsx'

class MemoriaFalsa implements Armazenamento {
  readonly dados = new Map<string, string>()
  getItem(k: string) {
    return this.dados.get(k) ?? null
  }
  setItem(k: string, v: string) {
    this.dados.set(k, v)
  }
  removeItem(k: string) {
    this.dados.delete(k)
  }
}

const relogio = () => {
  let ms = Date.UTC(2026, 8, 15, 12, 0, 0)
  return () => new Date((ms += 60_000)).toISOString()
}

const montar = (repositorio = criarRepositorio(new MemoriaFalsa(), { agora: relogio() })) => {
  const aoAbrir = vi.fn()
  const aoNovoCaso = vi.fn()
  render(
    <ProvedorCasos repositorio={repositorio}>
      <TelaCasos aoAbrir={aoAbrir} aoNovoCaso={aoNovoCaso} />
    </ProvedorCasos>,
  )
  return { repositorio, aoAbrir, aoNovoCaso }
}

const cartoes = () => within(screen.getByRole('list', { name: 'Casos salvos' })).getAllByRole('listitem')

const acoesDo = async (usuario: ReturnType<typeof userEvent.setup>, nome: string) => {
  await usuario.click(screen.getByRole('button', { name: `Mais ações para ${nome}` }))
  return within(screen.getByRole('menu'))
}

describe('Tela Meus casos', () => {
  it('lista vazia convida a criar o primeiro caso', async () => {
    const { aoNovoCaso } = montar()
    expect(screen.getByRole('heading', { name: 'Nenhum caso ainda' })).toBeInTheDocument()
    const usuario = userEvent.setup()
    await usuario.click(screen.getByRole('button', { name: 'Criar primeiro caso' }))
    await usuario.click(screen.getByRole('menuitem', { name: /Prescrição rápida/ }))
    expect(aoNovoCaso).toHaveBeenCalledWith('rapido')
  })

  it('CA-50: mostra os casos, do mais recente ao mais antigo, e abre o escolhido', async () => {
    const repositorio = criarRepositorio(new MemoriaFalsa(), { agora: relogio() })
    repositorio.criar('Maria')
    const joao = repositorio.criar('João')
    const { aoAbrir } = montar(repositorio)

    expect(cartoes().map((li) => within(li).getByRole('heading').textContent)).toEqual(['João', 'Maria'])
    await userEvent.setup().click(screen.getByRole('button', { name: 'Abrir João' }))
    expect(aoAbrir).toHaveBeenCalledWith(joao.caso.id)
  })

  it('CA-50: renomeia e a lista reflete o novo nome', async () => {
    const repositorio = criarRepositorio(new MemoriaFalsa(), { agora: relogio() })
    repositorio.criar('Maria')
    montar(repositorio)
    const usuario = userEvent.setup()

    await usuario.click((await acoesDo(usuario, 'Maria')).getByRole('menuitem', { name: 'Renomear' }))
    const campo = within(screen.getByRole('dialog', { name: 'Renomear caso' })).getByLabelText('Nome do caso')
    await usuario.clear(campo)
    await usuario.type(campo, 'Maria, 28 anos{Enter}')

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Maria, 28 anos' })).toBeInTheDocument()
    expect(screen.getByText('Caso renomeado para “Maria, 28 anos”.')).toBeInTheDocument()
  })

  it('CA-50: duplica e a cópia aparece na lista', async () => {
    const repositorio = criarRepositorio(new MemoriaFalsa(), { agora: relogio() })
    repositorio.criar('Maria')
    montar(repositorio)
    const usuario = userEvent.setup()

    await usuario.click((await acoesDo(usuario, 'Maria')).getByRole('menuitem', { name: 'Duplicar' }))
    expect(cartoes()).toHaveLength(2)
    expect(screen.getByRole('heading', { name: 'Maria (cópia)' })).toBeInTheDocument()
  })

  it('CA-50: excluir pede confirmação; cancelar mantém e confirmar remove', async () => {
    const repositorio = criarRepositorio(new MemoriaFalsa(), { agora: relogio() })
    repositorio.criar('Maria')
    repositorio.criar('João')
    montar(repositorio)
    const usuario = userEvent.setup()

    await usuario.click((await acoesDo(usuario, 'Maria')).getByRole('menuitem', { name: 'Excluir' }))
    const confirmacao = screen.getByRole('alertdialog', { name: 'Excluir “Maria”?' })
    await usuario.click(within(confirmacao).getByRole('button', { name: 'Cancelar' }))
    expect(cartoes()).toHaveLength(2)

    await usuario.click((await acoesDo(usuario, 'Maria')).getByRole('menuitem', { name: 'Excluir' }))
    await usuario.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Excluir caso' }))
    expect(cartoes().map((li) => within(li).getByRole('heading').textContent)).toEqual(['João'])
    expect(repositorio.listar()).toHaveLength(1)
  })

  it('CB-09: avisa quando o navegador não guarda os casos', () => {
    montar(criarRepositorio(null))
    expect(screen.getByText(/não serão salvos ao fechar/)).toBeInTheDocument()
  })

  it('CB-08: atualiza a lista e avisa quando outra aba muda os casos', async () => {
    const armazenamento = new MemoriaFalsa()
    const repositorio = criarRepositorio(armazenamento, { agora: relogio() })
    repositorio.criar('Maria')
    montar(repositorio)

    const outraAba = criarRepositorio(armazenamento, { agora: relogio() })
    outraAba.criar('Caso da outra aba')
    act(() => {
      window.dispatchEvent(new StorageEvent('storage', { key: 'metanutri:casos' }))
    })

    expect(cartoes()).toHaveLength(2)
    expect(screen.getByText(/mudanças feitas em outra aba/)).toBeInTheDocument()
    await userEvent.setup().click(screen.getByRole('button', { name: 'Fechar aviso' }))
    expect(screen.queryByText(/mudanças feitas em outra aba/)).not.toBeInTheDocument()
  })
})

describe('Aviso de primeiro acesso', () => {
  beforeEach(() => localStorage.clear())

  it('CA-51: aparece no primeiro acesso com os três pontos e não volta depois de confirmado', async () => {
    const { unmount } = render(<AvisoPrimeiroAcesso />)
    const aviso = screen.getByRole('dialog', { name: 'Boas-vindas ao MetaNutri' })
    expect(within(aviso).getByText(/apoia o estudo e o planejamento/)).toBeInTheDocument()
    expect(within(aviso).getByText(/prescrição é responsabilidade do nutricionista/)).toBeInTheDocument()
    expect(within(aviso).getByText(/só neste aparelho/)).toBeInTheDocument()

    await userEvent.setup().click(within(aviso).getByRole('button', { name: 'Entendi' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(localStorage.getItem(CHAVE_AVISO_VISTO)).toBe('1')

    unmount()
    render(<AvisoPrimeiroAcesso />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
