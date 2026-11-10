// O que a tela do link faz ao abrir (spec lado-do-paciente): registra o acesso (D-1223, CA-2239, CB-1205), lembra o link
// no aparelho (D-1218), põe o "Meu plano" na página (CA-2221) e troca o endereço de um link antigo pelo do fixo (D-1217).
import { act, render, screen, waitFor } from '@testing-library/react'
import { criarAcompanhamento, type Acompanhamento } from '@/domain/acompanhamento.ts'
import type { ClienteDosEmails } from '@/domain/emailsDoLink.ts'
import { lerMeusPlanos } from '@/domain/meusPlanos.ts'
import type { AcompanhamentoDoLink, FonteAcompanhamentos } from '@/domain/repositorioAcompanhamentos.ts'
import { TelaMissoesPaciente } from './TelaMissoesPaciente.tsx'

const HOJE = '2026-11-03'

function link(parcial: Partial<Acompanhamento> = {}): AcompanhamentoDoLink {
  return {
    ...criarAcompanhamento(
      { casoId: 'c', pacienteId: 'p', nome: 'Juliana Martins', missoes: [{ id: 'agua', texto: 'Beber água', origem: 'Hábito' }] },
      { agora: () => '2026-10-01T10:00:00.000Z', gerarId: () => 'ac-1', aleatorio: (n) => new Uint8Array(n).fill(9) },
    ),
    ...parcial,
    doLink: { nutricionista: 'Ana Lima', emailMascarado: 'j•••a@gmail.com', avisos: { plano: 'ligado', semana: 'desligado', lembrete: 'nao-oferecido' } },
  }
}

const fonte = (achado: AcompanhamentoDoLink | null, naNuvem = true): FonteAcompanhamentos => ({ naNuvem, porToken: () => Promise.resolve(achado), salvar: (a) => Promise.resolve(a) })

function clienteFalso(respostas: readonly ({ error: { message: string } | null })[] = [{ error: null }]) {
  const chamadas: { nome: string; parametros: Record<string, unknown> }[] = []
  let i = 0
  const cliente = {
    rpc: (nome: string, parametros: Record<string, unknown> = {}) => {
      chamadas.push({ nome, parametros })
      const resposta = respostas[Math.min(i++, respostas.length - 1)] ?? { error: null }
      return Promise.resolve({ data: null, ...resposta })
    },
    from: () => {
      throw new Error('não usado')
    },
    functions: { invoke: () => Promise.resolve({ data: null, error: null }) },
  } as unknown as ClienteDosEmails
  return { cliente, chamadas }
}

beforeEach(() => {
  localStorage.clear()
  document.head.innerHTML = ''
})

describe('CA-2239: o último acesso', () => {
  it('CA-2239: abrir o link registra o acesso na nuvem, pelo token, uma vez', async () => {
    const { cliente, chamadas } = clienteFalso()
    const aberto = link()
    render(<TelaMissoesPaciente token={aberto.token} fonte={fonte(aberto)} hoje={HOJE} cliente={cliente} />)
    await screen.findByRole('heading', { level: 1 })
    await waitFor(() => expect(chamadas).toEqual([{ nome: 'registrar_acesso', parametros: { p_token: aberto.token } }]))
  })

  it('CB-1205: sem internet, o registro do acesso fica para quando a internet voltar', async () => {
    const { cliente, chamadas } = clienteFalso([{ error: { message: 'Failed to fetch' } }, { error: null }])
    const aberto = link()
    render(<TelaMissoesPaciente token={aberto.token} fonte={fonte(aberto)} hoje={HOJE} cliente={cliente} />)
    await waitFor(() => expect(chamadas).toHaveLength(1))
    await act(async () => {
      globalThis.dispatchEvent(new Event('online'))
      await Promise.resolve()
    })
    expect(chamadas).toHaveLength(2)
  })

  it('sem servidor (o modo local), nada é registrado', async () => {
    const aberto = link()
    render(<TelaMissoesPaciente token={aberto.token} fonte={fonte(aberto, false)} hoje={HOJE} cliente={null} />)
    expect(await screen.findByRole('heading', { level: 1 })).toBeInTheDocument()
  })
})

describe('CA-2298: a nutricionista que abre o link (D-1253)', () => {
  it('CA-2298: fora do papel de paciente, a tela não lembra o plano e não registra o acesso', async () => {
    const { cliente, chamadas } = clienteFalso()
    const aberto = link()
    render(<TelaMissoesPaciente token={aberto.token} fonte={fonte(aberto)} hoje={HOJE} cliente={cliente} comoPaciente={false} />)
    expect(await screen.findByRole('heading', { level: 1 })).toBeInTheDocument()
    await act(async () => {
      await new Promise((pronto) => setTimeout(pronto, 20))
    })
    expect(lerMeusPlanos(localStorage)).toEqual([])
    expect(chamadas.filter((c) => c.nome === 'registrar_acesso')).toEqual([])
  })
})

describe('D-1218 e CA-2221: o aparelho e a página', () => {
  it('CA-2227: o link aberto fica lembrado com "Juliana" e "Ana Lima"', async () => {
    const aberto = link()
    render(<TelaMissoesPaciente token={aberto.token} fonte={fonte(aberto)} hoje={HOJE} cliente={null} />)
    await screen.findByRole('heading', { level: 1 })
    await waitFor(() => expect(lerMeusPlanos(localStorage)).toEqual([{ token: aberto.token, primeiroNome: 'Juliana', nutricionista: 'Ana Lima', ultimoAcesso: HOJE }]))
  })

  it('CA-2221: com o link aberto, a página aponta para o manifesto "Meu plano" dele', async () => {
    document.head.innerHTML = '<link rel="manifest" href="/manifest.webmanifest">'
    const aberto = link()
    const { unmount } = render(<TelaMissoesPaciente token={aberto.token} fonte={fonte(aberto)} hoje={HOJE} cliente={null} />)
    await screen.findByRole('heading', { level: 1 })
    const href = document.head.querySelector('link[rel="manifest"]')?.getAttribute('href') ?? ''
    expect(decodeURIComponent(href)).toContain(`"start_url":"${location.origin}/p/${aberto.token}"`)
    expect(document.title).toBe('Meu plano')
    unmount()
    expect(document.head.querySelector('link[rel="manifest"]')?.getAttribute('href')).toBe('/manifest.webmanifest')
  })

  it('D-1217: o endereço de um link antigo abre o link fixo, e o endereço da página passa a ser o dele, sem recarregar', async () => {
    const fixo = link({ token: 'fixo00000000' })
    const trocar = vi.spyOn(history, 'replaceState')
    render(<TelaMissoesPaciente token="antigo000000" fonte={fonte(fixo)} hoje={HOJE} cliente={null} />)
    await screen.findByRole('heading', { level: 1 })
    await waitFor(() => expect(trocar).toHaveBeenCalledWith(null, '', '/p/fixo00000000'))
    expect(lerMeusPlanos(localStorage).map((p) => p.token)).toEqual(['fixo00000000'])
    trocar.mockRestore()
  })
})
