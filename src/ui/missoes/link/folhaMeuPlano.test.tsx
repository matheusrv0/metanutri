// A folha "Meu plano" (spec lado-do-paciente, D-1212, CA-2219 e CA-2228).
import { screen, within } from '@testing-library/react'
import { lerMeusPlanos, lembrarPlano } from '@/domain/meusPlanos.ts'
import { abrirComFolhas } from './folhasDoLink.test-utils.tsx'
import { DADOS } from './linkDeTeste.test-utils.tsx'

beforeEach(() => localStorage.clear())

describe('CA-2219: a folha "Meu plano"', () => {
  it('CA-2219: o botão Mais abre a folha com o paciente e a nutricionista, e os itens na ordem, "Esquecer" por último', async () => {
    await abrirComFolhas()
    const folha = screen.getByRole('dialog', { name: 'Meu plano' })
    expect(folha).toHaveTextContent('Juliana · com Ana Lima')
    expect(within(folha).getAllByRole('button').filter((b) => b.textContent !== 'Fechar').map((b) => b.textContent)).toEqual([
      'Receber meu link por e-mail',
      'Avisos por e-mail2 ligados',
      'Esquecer neste aparelho',
    ])
  })

  it('CA-2219: "Avisos por e-mail" mostra o estado: "Desligados" sem nenhum ligado', async () => {
    await abrirComFolhas({ dados: { ...DADOS, avisos: { plano: 'desligado', semana: 'desligado', lembrete: 'nao-oferecido' } } })
    expect(screen.getByRole('button', { name: /Avisos por e-mail/ })).toHaveTextContent('Desligados')
  })

  it('CA-2242: sem nenhum aviso oferecido pela nutricionista, a folha não oferece avisos', async () => {
    await abrirComFolhas({ dados: { ...DADOS, avisos: { plano: 'nao-oferecido', semana: 'nao-oferecido', lembrete: 'nao-oferecido' } } })
    expect(screen.queryByRole('button', { name: /Avisos por e-mail/ })).not.toBeInTheDocument()
  })

  it('CA-2219: "Instalar na tela inicial" aparece quando dá para instalar (o iPhone, pela folha dos passos)', async () => {
    Object.defineProperty(globalThis.navigator, 'userAgent', { value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)', configurable: true })
    const { usuario } = await abrirComFolhas()
    await usuario.click(screen.getByRole('button', { name: 'Instalar na tela inicial' }))
    expect(screen.getByRole('dialog', { name: 'Instalar o Meu plano' })).toBeInTheDocument()
    Object.defineProperty(globalThis.navigator, 'userAgent', { value: '', configurable: true })
  })
})

describe('CA-2228: esquecer neste aparelho', () => {
  it('CA-2228: confirmar apaga a lembrança daquele link, e o link continua valendo; cancelar não apaga', async () => {
    const aoEsquecido = vi.fn()
    lembrarPlano(localStorage, { token: 'outro0000000', primeiroNome: 'Pedro', nutricionista: 'Ana Lima', ultimoAcesso: '2026-11-01' })
    const { usuario, link } = await abrirComFolhas({ aoEsquecido })
    expect(lerMeusPlanos(localStorage).map((p) => p.token)).toContain(link.token)

    await usuario.click(screen.getByRole('button', { name: 'Esquecer neste aparelho' }))
    await usuario.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(lerMeusPlanos(localStorage).map((p) => p.token)).toContain(link.token)

    await usuario.click(screen.getByRole('button', { name: 'Mais opções' }))
    await usuario.click(screen.getByRole('button', { name: 'Esquecer neste aparelho' }))
    expect(screen.getByRole('dialog', { name: 'Esquecer o plano neste aparelho?' })).toBeInTheDocument()
    await usuario.click(screen.getByRole('button', { name: 'Esquecer' }))
    expect(lerMeusPlanos(localStorage).map((p) => p.token)).toEqual(['outro0000000'])
    expect(aoEsquecido).toHaveBeenCalled()
  })
})
