import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { linkDoWhatsApp } from '@/domain/whatsapp.ts'
import { BotaoWhatsApp } from './BotaoWhatsApp.tsx'

const ANA = { id: 'p1', nome: 'Ana Souza', telefone: '(11) 98765-4321' }

function montar(paciente: { readonly id: string; readonly nome: string; readonly telefone: string } | null, extra: { readonly rotuloCompacto?: string } = {}) {
  const aoCadastrarTelefone = vi.fn()
  render(<BotaoWhatsApp paciente={paciente} texto="Oi, Ana! Tudo bem?" aoCadastrarTelefone={aoCadastrarTelefone} {...extra} />)
  return { aoCadastrarTelefone, usuario: userEvent.setup() }
}

async function abrir(usuario: ReturnType<typeof userEvent.setup>, nome: string | RegExp = 'WhatsApp') {
  await usuario.click(screen.getByRole('button', { name: nome }))
  return within(screen.getByRole('dialog', { name: 'Enviar pelo WhatsApp' }))
}

describe('Enviar pelo WhatsApp', () => {
  it('CA-503: com telefone, o diálogo mostra para quem vai, o texto pronto editável e "Abrir no WhatsApp"', async () => {
    const { usuario } = montar(ANA)
    const dialogo = await abrir(usuario)
    expect(dialogo.getByText(/Ana Souza/)).toHaveTextContent('(11) 98765-4321')
    expect(dialogo.getByLabelText('Mensagem')).toHaveValue('Oi, Ana! Tudo bem?')
    expect(dialogo.getByRole('link', { name: 'Abrir no WhatsApp' })).toHaveAttribute('href', linkDoWhatsApp('5511987654321', 'Oi, Ana! Tudo bem?'))
  })

  it('CA-504: o texto editado vai codificado no wa.me, numa aba nova e sem passar o endereço do MetaNutri', async () => {
    const { usuario } = montar(ANA)
    const dialogo = await abrir(usuario)
    const caixa = dialogo.getByLabelText('Mensagem')
    await usuario.clear(caixa)
    await usuario.type(caixa, 'Olá & até já? #1')
    const link = dialogo.getByRole('link', { name: 'Abrir no WhatsApp' })
    expect(link).toHaveAttribute('href', 'https://wa.me/5511987654321?text=Ol%C3%A1%20%26%20at%C3%A9%20j%C3%A1%3F%20%231')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link.getAttribute('rel')?.split(' ').sort()).toEqual(['noopener', 'noreferrer'])
  })

  it('CB-141: sem texto, o link abre a conversa vazia', async () => {
    const { usuario } = montar(ANA)
    const dialogo = await abrir(usuario)
    await usuario.clear(dialogo.getByLabelText('Mensagem'))
    expect(dialogo.getByRole('link', { name: 'Abrir no WhatsApp' })).toHaveAttribute('href', 'https://wa.me/5511987654321')
  })

  it('reabrir começa de novo do texto pronto', async () => {
    const { usuario } = montar(ANA)
    let dialogo = await abrir(usuario)
    await usuario.type(dialogo.getByLabelText('Mensagem'), ' mudei')
    await usuario.click(dialogo.getByRole('button', { name: 'Cancelar' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    dialogo = await abrir(usuario)
    expect(dialogo.getByLabelText('Mensagem')).toHaveValue('Oi, Ana! Tudo bem?')
  })

  it('CA-505: sem telefone, explica e leva à ficha com o cursor no Telefone; não há link', async () => {
    const { usuario, aoCadastrarTelefone } = montar({ ...ANA, telefone: '' })
    const dialogo = await abrir(usuario)
    expect(dialogo.getByText('A ficha de Ana Souza não tem telefone.')).toBeInTheDocument()
    expect(dialogo.queryByRole('link')).not.toBeInTheDocument()
    expect(dialogo.queryByLabelText('Mensagem')).not.toBeInTheDocument()
    await usuario.click(dialogo.getByRole('button', { name: 'Cadastre o telefone na ficha' }))
    expect(aoCadastrarTelefone).toHaveBeenCalledWith('p1')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('CA-505: telefone que não é do Brasil explica o motivo', async () => {
    const { usuario } = montar({ ...ANA, nome: '', telefone: '1234' })
    const dialogo = await abrir(usuario)
    expect(dialogo.getByText('O telefone da ficha deste paciente não é um número do Brasil com DDD.')).toBeInTheDocument()
    expect(dialogo.queryByRole('link')).not.toBeInTheDocument()
    expect(dialogo.getByRole('button', { name: 'Cadastre o telefone na ficha' })).toBeInTheDocument()
  })

  it('CA-506: sem paciente vinculado, explica como vincular; não há link nem ficha para abrir', async () => {
    const { usuario } = montar(null)
    const dialogo = await abrir(usuario)
    expect(dialogo.getByText(/Este plano não tem paciente vinculado\. Vincule um paciente em Dados e medidas/)).toBeInTheDocument()
    expect(dialogo.queryByRole('link')).not.toBeInTheDocument()
    expect(dialogo.queryByRole('button', { name: 'Cadastre o telefone na ficha' })).not.toBeInTheDocument()
    await usuario.click(dialogo.getByRole('button', { name: 'Entendi' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('na linha apertada, só o ícone, com o rótulo para o leitor de tela', async () => {
    const { usuario } = montar(ANA, { rotuloCompacto: 'Lembrar Ana Souza pelo WhatsApp' })
    const dialogo = await abrir(usuario, 'Lembrar Ana Souza pelo WhatsApp')
    expect(dialogo.getByLabelText('Mensagem')).toHaveValue('Oi, Ana! Tudo bem?')
  })
})
