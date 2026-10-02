import { render, screen } from '@testing-library/react'
import userEvent, { type UserEvent } from '@testing-library/user-event'
import type { ValorConta } from '../../estado/usarConta.ts'
import { contaFalsa } from './contaFalsa.test-utils.ts'
import { TelaCriarConta } from './TelaCriarConta.tsx'

function montar(sobre: { conta?: ValorConta; plano?: 'solo' | 'estudante' | null; contato?: string | null } = {}) {
  const conta = sobre.conta ?? contaFalsa()
  const props = {
    conta,
    plano: sobre.plano ?? null,
    ciclo: 'mensal' as const,
    contato: sobre.contato ?? null,
    aoCriada: vi.fn(),
    aoEntrar: vi.fn(),
    aoTrocarPlano: vi.fn(),
    aoIrParaInicio: vi.fn(),
    aoAbrirSistema: vi.fn(),
  }
  render(<TelaCriarConta {...props} />)
  return { ...props, usuario: userEvent.setup() }
}

async function preencherBase(usuario: UserEvent, email = 'ana@gmail.com') {
  await usuario.type(screen.getByLabelText('Nome completo'), 'Ana Souza')
  await usuario.type(screen.getByLabelText(/e-mail/i), email)
  await usuario.type(screen.getByLabelText('Senha'), 'senhaforte1')
  await usuario.click(screen.getByRole('checkbox', { name: /Li e aceito/ }))
}

async function comoNutricionista(usuario: UserEvent) {
  await usuario.click(screen.getByRole('radio', { name: /Nutricionista/ }))
  await usuario.selectOptions(screen.getByRole('combobox', { name: 'Região do CRN' }), 'CRN-6')
  await usuario.type(screen.getByRole('textbox', { name: 'Número do CRN' }), '12345')
  await usuario.click(screen.getByRole('checkbox', { name: 'Declaro que este CRN é meu e está ativo.' }))
}

const botaoCriar = () => screen.getByRole('button', { name: /^Criar conta/ })

describe('TelaCriarConta', () => {
  it('CA-262: pede nome completo, e-mail, senha, "Você é" e o aceite, e mostra o Free', () => {
    montar()
    expect(screen.getByLabelText('Nome completo')).toBeInTheDocument()
    expect(screen.getByLabelText('E-mail')).toBeInTheDocument()
    expect(screen.getByLabelText('Senha')).toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'Você é' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Termos de uso' })).toHaveAttribute('href', '#/termos')
    expect(screen.getByText('No Free você já tem')).toBeInTheDocument()
  })

  it('CA-268: sem escolher "Você é", nada vai ao servidor', async () => {
    const { usuario, conta } = montar()
    await preencherBase(usuario)
    await usuario.click(botaoCriar())
    expect(screen.getByRole('alert')).toHaveTextContent('Escolha se você é nutricionista ou estudante de Nutrição.')
    expect(conta.cadastrar).not.toHaveBeenCalled()
  })

  it('CA-264: CRN com letra no meio não vai ao servidor', async () => {
    const { usuario, conta } = montar()
    await preencherBase(usuario)
    await usuario.click(screen.getByRole('radio', { name: /Nutricionista/ }))
    await usuario.selectOptions(screen.getByRole('combobox', { name: 'Região do CRN' }), 'CRN-6')
    await usuario.type(screen.getByRole('textbox', { name: 'Número do CRN' }), '12a45')
    await usuario.click(screen.getByRole('checkbox', { name: 'Declaro que este CRN é meu e está ativo.' }))
    await usuario.click(botaoCriar())
    expect(screen.getByRole('alert')).toHaveTextContent('O número do CRN tem só algarismos')
    expect(conta.cadastrar).not.toHaveBeenCalled()
  })

  it('CA-269: nutricionista vai com a situação e o CRN normalizado', async () => {
    const { usuario, conta, aoCriada } = montar()
    await preencherBase(usuario, '  ana@gmail.com ')
    await comoNutricionista(usuario)
    await usuario.click(botaoCriar())
    expect(conta.cadastrar).toHaveBeenCalledWith(
      expect.objectContaining({ situacao: 'nutricionista', crn: { regiao: 6, numero: '12345' }, planoDesejado: 'free', versaoTermos: '2026-10-02' }),
    )
    expect(aoCriada).toHaveBeenCalledWith({ email: 'ana@gmail.com', plano: 'free', situacao: 'nutricionista', confirmarEmail: true })
  })

  it('CA-265: estudante troca o rótulo do e-mail e mostra o passo 1 de 2', async () => {
    const { usuario } = montar()
    await usuario.click(screen.getByRole('radio', { name: /Estudante de Nutrição/ }))
    expect(screen.getByLabelText('E-mail da faculdade')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Passo 1 de 2' })).toBeInTheDocument()
  })

  it('CA-266 e CB-60: e-mail que não é de faculdade não vai, e o contato aparece', async () => {
    const { usuario, conta } = montar({ contato: 'contato@metanutri.com' })
    await usuario.click(screen.getByRole('radio', { name: /Estudante de Nutrição/ }))
    await preencherBase(usuario, 'julia@gmail.com')
    await usuario.click(screen.getByRole('checkbox', { name: 'Declaro ter matrícula ativa no curso de Nutrição.' }))
    await usuario.click(botaoCriar())
    expect(screen.getByRole('alert')).toHaveTextContent('Use o e-mail que a sua faculdade forneceu.')
    expect(screen.getByRole('alert')).toHaveTextContent('contato@metanutri.com')
    expect(conta.cadastrar).not.toHaveBeenCalled()
  })

  it('CA-267: pelo botão do Estudante, já vem em Estudante e o Nutricionista fica indisponível', () => {
    montar({ plano: 'estudante' })
    expect(screen.getByRole('radio', { name: /Estudante de Nutrição/ })).toBeChecked()
    expect(screen.getByRole('radio', { name: /Nutricionista/ })).toBeDisabled()
  })

  it('CA-270: estudante criada segue com a situação, para cair no comprovante', async () => {
    const { usuario, aoCriada } = montar({ plano: 'estudante' })
    await preencherBase(usuario, 'julia@ufrn.edu.br')
    await usuario.click(screen.getByRole('checkbox', { name: 'Declaro ter matrícula ativa no curso de Nutrição.' }))
    await usuario.click(botaoCriar())
    expect(aoCriada).toHaveBeenCalledWith({ email: 'julia@ufrn.edu.br', plano: 'estudante', situacao: 'estudante', confirmarEmail: true })
  })

  it('CA-134: clique duplo cria uma conta só', async () => {
    let terminar: (v: { ok: boolean; erro: null }) => void = () => undefined
    const conta = contaFalsa({ cadastrar: vi.fn(() => new Promise<{ ok: boolean; erro: null }>((resolver) => (terminar = resolver))) })
    const { usuario } = montar({ conta })
    await preencherBase(usuario)
    await comoNutricionista(usuario)
    await usuario.dblClick(botaoCriar())
    terminar({ ok: true, erro: null })
    expect(conta.cadastrar).toHaveBeenCalledTimes(1)
  })

  it('CA-130: e-mail com conta mostra o aviso e o atalho para entrar', async () => {
    const conta = contaFalsa({ cadastrar: vi.fn(async () => ({ ok: false, erro: 'email-em-uso' as const })) })
    const { usuario, aoEntrar } = montar({ conta })
    await preencherBase(usuario)
    await comoNutricionista(usuario)
    await usuario.click(botaoCriar())
    expect(screen.getByRole('alert')).toHaveTextContent('Este e-mail já tem conta.')
    await usuario.click(screen.getAllByRole('button', { name: 'Entrar' })[0] as HTMLElement)
    expect(aoEntrar).toHaveBeenCalled()
  })

  it('CA-128: com o Solo, mostra o passo 1 de 3 e o link para trocar de plano', async () => {
    const { usuario, aoTrocarPlano } = montar({ plano: 'solo' })
    expect(screen.getByRole('img', { name: 'Passo 1 de 3' })).toBeInTheDocument()
    await usuario.click(screen.getByRole('button', { name: 'Trocar de plano' }))
    expect(aoTrocarPlano).toHaveBeenCalledOnce()
  })
})
