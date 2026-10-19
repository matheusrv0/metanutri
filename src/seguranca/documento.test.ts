// CA-857 (spec seguranca-lote-5): o SECURITY.md conta, em português simples, o segundo fator do administrador e
// a limpeza automática dos comprovantes.
import seguranca from '../../SECURITY.md?raw'

describe('CA-857: o SECURITY.md', () => {
  it('conta que o administrador entra com a senha e o código de um app autenticador', () => {
    expect(seguranca).toContain('**O administrador entra com dois passos:** a senha e o código de 6 dígitos de um app autenticador no celular.')
  })

  it('conta que os comprovantes são apagados sozinhos, com os prazos', () => {
    expect(seguranca).toContain('**Os comprovantes são apagados sozinhos.** O servidor confere todo dia e apaga o arquivo 30 dias depois da')
    expect(seguranca).toContain('o envio que não virou pedido sai depois de 1 dia.')
  })
})
