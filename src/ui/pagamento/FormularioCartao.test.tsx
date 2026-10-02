import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useRef, useState } from 'react'
import { FormularioCartao } from './FormularioCartao.tsx'
import { ErroDoCartao, type ControleDoCartao } from './processadorCartao.ts'
import { CARTAO_APROVADO, processadorFalso, type ProcessadorFalso } from './processadorFalso.test-utils.ts'

/** Uma tela mínima que usa o formulário como o checkout usa: conferir, gerar e limpar pelo ref. */
function Bancada({ falso, travado }: { readonly falso: ProcessadorFalso; readonly travado: boolean }) {
  const controle = useRef<ControleDoCartao>(null)
  const [pronto, setPronto] = useState(false)
  const [resultado, setResultado] = useState('')
  const enviar = async () => {
    const atual = controle.current
    if (!atual || !atual.conferir()) return
    const gerado = await atual.gerar()
    setResultado(gerado.ok ? gerado.dados.token : gerado.erro)
  }
  return (
    <>
      <FormularioCartao ref={controle} criarProcessador={falso.criar} travado={travado} aoMudarPronto={setPronto} />
      <p>{pronto ? 'pode enviar' : 'parado'}</p>
      <button type="button" onClick={() => void enviar()}>
        Enviar
      </button>
      <button type="button" onClick={() => controle.current?.limparCodigo()}>
        Limpar código
      </button>
      <output>{resultado}</output>
    </>
  )
}

async function montar(falso: ProcessadorFalso = processadorFalso(), travado = false) {
  const tela = render(<Bancada falso={falso} travado={travado} />)
  // A montagem dos campos seguros termina numa promessa: espera ela antes de olhar.
  await act(async () => {})
  return { ...tela, falso, usuario: userEvent.setup() }
}

const nome = () => screen.getByRole('textbox', { name: 'Nome impresso no cartão' })
const cpf = () => screen.getByRole('textbox', { name: 'CPF do titular' })

describe('FormularioCartao (spec checkout-proprio)', () => {
  it('CA-366: os cinco campos do cartão, três seguros e dois nossos', async () => {
    const { falso } = await montar()
    for (const rotulo of ['Número do cartão', 'Validade', 'Código de segurança']) expect(screen.getByRole('group', { name: rotulo })).toBeInTheDocument()
    expect(nome()).toBeInTheDocument()
    expect(cpf()).toBeInTheDocument()
    const alvos = falso.montagem?.alvos
    expect(alvos ? document.getElementById(alvos.numero) : null).not.toBeNull()
    expect(alvos?.numero).toMatch(/^[a-zA-Z0-9-]+$/)
    expect(screen.getByText('Os 3 números do verso')).toBeInTheDocument()
  })

  it('CA-368: os campos seguros recebem a fonte do site e ocupam a caixa, que é a mesma dos campos nossos', async () => {
    const { falso } = await montar()
    expect(falso.montagem?.estilo).toMatchObject({ fontFamily: 'Manrope', height: '100%', padding: '0' })
    const seguro = screen.getByRole('group', { name: 'Número do cartão' })
    for (const classe of ['h-12', 'rounded-md', 'bg-surfacesunken', 'focus-within:ring-primary']) expect(seguro).toHaveClass(classe)
    for (const classe of ['h-12', 'rounded-md', 'bg-surfacesunken', 'focus-visible:ring-primary']) expect(nome()).toHaveClass(classe)
  })

  it('CB-88: campos que não abrem mostram o aviso e o envio fica parado', async () => {
    const falso = processadorFalso()
    falso.falharAoMontar = true
    await montar(falso)
    expect(screen.getByRole('alert')).toHaveTextContent('Não consegui abrir o formulário do cartão. Recarregue a página ou desative o bloqueador de anúncios para este site.')
    expect(screen.getByText('parado')).toBeInTheDocument()
  })

  it('CA-369: a bandeira aparece no número; débito avisa e trava o envio', async () => {
    const { falso } = await montar()
    expect(screen.getByText('pode enviar')).toBeInTheDocument()
    falso.preencher()
    expect(within(screen.getByRole('group', { name: 'Número do cartão' })).getByText('Mastercard')).toBeInTheDocument()
    falso.emitir({ tipo: 'cartao', cartao: { bandeira: 'Elo Débito', tipo: 'debit_card', bin: '50677667' } })
    expect(screen.getByText('Use um cartão de crédito.')).toBeInTheDocument()
    expect(screen.getByText('parado')).toBeInTheDocument()
  })

  it('CA-370: tudo vazio mostra o erro embaixo de cada campo, não gera o código e põe o foco no número', async () => {
    const { falso, usuario } = await montar()
    await usuario.click(screen.getByRole('button', { name: 'Enviar' }))
    for (const frase of [
      'Digite o número do cartão.',
      'Digite a validade, como 11/30.',
      'Digite o código de segurança.',
      'Digite o nome como está impresso no cartão.',
      'Digite o CPF do titular do cartão.',
    ]) {
      expect(screen.getByText(frase)).toBeInTheDocument()
    }
    expect(falso.tokens).toHaveLength(0)
    expect(falso.focos).toEqual(['numero'])
  })

  it('CA-370: com o cartão certo, o foco vai para o nome; o CPF com dígito errado é apontado', async () => {
    const { falso, usuario } = await montar()
    falso.preencher()
    await usuario.type(cpf(), '12345678900')
    await usuario.click(screen.getByRole('button', { name: 'Enviar' }))
    expect(nome()).toHaveFocus()
    expect(screen.getByText('Confira o CPF: os dígitos não batem.')).toBeInTheDocument()
    expect(cpf()).toHaveAttribute('aria-invalid', 'true')
    expect(falso.tokens).toHaveLength(0)
  })

  it('o CPF ganha pontos e traço enquanto digita, e o erro some quando a pessoa corrige', async () => {
    const { usuario } = await montar()
    await usuario.click(screen.getByRole('button', { name: 'Enviar' }))
    await usuario.type(cpf(), '12345678909')
    expect(cpf()).toHaveValue('123.456.789-09')
    expect(screen.queryByText('Digite o CPF do titular do cartão.')).not.toBeInTheDocument()
  })

  it('tudo certo: gera o código com o nome e o CPF só com números', async () => {
    const { falso, usuario } = await montar()
    falso.preencher()
    await usuario.type(nome(), 'APRO')
    await usuario.type(cpf(), '12345678909')
    await usuario.click(screen.getByRole('button', { name: 'Enviar' }))
    expect(await screen.findByText(CARTAO_APROVADO.token)).toBeInTheDocument()
    expect(falso.tokens).toEqual([{ nome: 'APRO', cpf: '12345678909' }])
  })

  it('nome colado com o acento separado ("Jose" + acento) passa e vai para a operadora como "José"', async () => {
    const { falso, usuario } = await montar()
    falso.preencher()
    await usuario.click(nome())
    await usuario.paste('José Lima')
    await usuario.type(cpf(), '12345678909')
    await usuario.click(screen.getByRole('button', { name: 'Enviar' }))
    expect(await screen.findByText(CARTAO_APROVADO.token)).toBeInTheDocument()
    expect(falso.tokens).toEqual([{ nome: 'José Lima', cpf: '12345678909' }])
  })

  it('CA-370: o erro do gerador aponta o campo e põe o foco nele', async () => {
    const { falso, usuario } = await montar()
    falso.respostaDoToken = () => Promise.reject(new ErroDoCartao(['E301']))
    falso.preencher()
    await usuario.type(nome(), 'APRO')
    await usuario.type(cpf(), '12345678909')
    await usuario.click(screen.getByRole('button', { name: 'Enviar' }))
    expect(await screen.findByText('Confira os dados do cartão e tente de novo. Nada foi cobrado.')).toBeInTheDocument()
    expect(screen.getByText('Confira o número do cartão.')).toBeInTheDocument()
    expect(falso.focos.at(-1)).toBe('numero')
  })

  it('CA-368: o campo com erro continua vermelho quando recebe o foco do conferir', async () => {
    const { usuario } = await montar()
    await usuario.click(screen.getByRole('button', { name: 'Enviar' }))
    const seguro = screen.getByRole('group', { name: 'Número do cartão' })
    for (const classe of ['bg-lighterror', 'ring-error', 'focus-within:bg-lighterror', 'focus-within:ring-error']) expect(seguro).toHaveClass(classe)
    for (const classe of ['focus-within:bg-card', 'focus-within:ring-primary']) expect(seguro).not.toHaveClass(classe)
    for (const classe of ['bg-lighterror', 'ring-error', 'focus-visible:bg-lighterror', 'focus-visible:ring-error']) expect(nome()).toHaveClass(classe)
    for (const classe of ['focus-visible:bg-card', 'focus-visible:ring-primary']) expect(nome()).not.toHaveClass(classe)
  })

  it.each([
    ['221', 'nome'],
    ['214', 'cpf'],
  ] as const)('CA-370: erro %s do gerador com o formulário travado devolve o foco ao campo quando destravar', async (codigo, campo) => {
    const falso = processadorFalso()
    const { usuario, rerender } = await montar(falso)
    falso.respostaDoToken = () => Promise.reject(new ErroDoCartao([codigo]))
    falso.preencher()
    await usuario.type(nome(), 'APRO')
    await usuario.type(cpf(), '12345678909')
    rerender(<Bancada falso={falso} travado />)
    await usuario.click(screen.getByRole('button', { name: 'Enviar' }))
    await screen.findByText('Confira os dados do cartão e tente de novo. Nada foi cobrado.')
    rerender(<Bancada falso={falso} travado={false} />)
    expect(campo === 'nome' ? nome() : cpf()).toHaveFocus()
  })

  it('CA-371: travado, os campos nossos não mexem e os seguros não recebem clique', async () => {
    await montar(processadorFalso(), true)
    expect(nome()).toBeDisabled()
    expect(cpf()).toBeDisabled()
    expect(screen.getByRole('group', { name: 'Número do cartão' })).toHaveClass('pointer-events-none')
  })

  it('CA-373: limpar o código recria o campo e pede para digitar de novo', async () => {
    const { falso, usuario } = await montar()
    await usuario.click(screen.getByRole('button', { name: 'Limpar código' }))
    expect(falso.limpezas).toBe(1)
    expect(screen.getByText('Digite o código de novo.')).toBeInTheDocument()
  })

  it('o cartão desenhado mostra a bandeira, os 6 primeiros números e o nome, e esconde a validade', async () => {
    const { falso, usuario } = await montar()
    falso.preencher()
    await usuario.type(nome(), 'Ana Souza')
    const desenho = document.querySelector('[data-cartao-ao-vivo]')
    expect(desenho).toHaveAttribute('aria-hidden', 'true')
    expect(desenho).toHaveTextContent('5031 43•• •••• ••••')
    expect(desenho).toHaveTextContent('ANA SOUZA')
    expect(desenho).toHaveTextContent('••/••')
  })

  it('CA-383: nenhum ícone de biblioteca no formulário', async () => {
    const { container } = await montar()
    expect(container.querySelectorAll('svg:not([data-icone])')).toHaveLength(0)
  })

  it('ao sair, desmonta os campos seguros', async () => {
    const { falso, unmount } = await montar()
    unmount()
    expect(falso.desmontados).toBe(1)
  })
})
