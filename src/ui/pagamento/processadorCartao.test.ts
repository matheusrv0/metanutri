import { ErroDoCartao, estiloDosCampos, FONTE_DOS_CAMPOS } from './processadorCartao.ts'

const CLARO: Readonly<Record<string, string>> = { '--text-strong': '#1c222a', '--text-subtle': '#a3a5ab', '--fonte-md': '14px' }
const ESCURO: Readonly<Record<string, string>> = { '--text-strong': '#f6f2ea', '--text-subtle': '#6f858a', '--fonte-md': '14px' }

describe('o estilo dos campos seguros (CA-368)', () => {
  it('a cor do texto, a do placeholder e o tamanho vêm dos tokens do tema claro', () => {
    expect(estiloDosCampos((token) => CLARO[token] ?? '')).toEqual({
      color: '#1c222a',
      placeholderColor: '#a3a5ab',
      fontSize: '14px',
      fontFamily: FONTE_DOS_CAMPOS,
      height: '100%',
      padding: '0',
    })
  })

  it('e do escuro', () => {
    expect(estiloDosCampos((token) => ESCURO[token] ?? '')).toMatchObject({ color: '#f6f2ea', placeholderColor: '#6f858a' })
  })

  it('token que não resolveu fica de fora, em vez de ir vazio para o iframe', () => {
    expect(estiloDosCampos(() => '')).toEqual({ fontFamily: FONTE_DOS_CAMPOS, height: '100%', padding: '0' })
  })
})

describe('ErroDoCartao', () => {
  it('é um erro e guarda os códigos da operadora', () => {
    const erro = new ErroDoCartao(['205', 'E301'])
    expect(erro).toBeInstanceOf(Error)
    expect(erro.codigos).toEqual(['205', 'E301'])
  })
})

describe('CA-404: Manrope primeiro e a fonte do sistema como reserva, nunca a serifada do navegador', () => {
  it('CA-404: Manrope primeiro e a fonte do sistema como reserva, nunca a serifada do navegador', () => {
    expect(FONTE_DOS_CAMPOS.split(',')[0]).toBe('Manrope')
    expect(FONTE_DOS_CAMPOS).toContain('system-ui')
    expect(FONTE_DOS_CAMPOS.trim().endsWith('sans-serif')).toBe(true)
  })

  it('CB-313: a letra é de 16 px abaixo de 640 px, para o iPhone não aproximar a tela, e a do tema a partir de 640 px', () => {
    const ler = (token: string) => CLARO[token] ?? ''
    expect(estiloDosCampos(ler, 390).fontSize).toBe('16px')
    expect(estiloDosCampos(ler, 639).fontSize).toBe('16px')
    expect(estiloDosCampos(ler, 640).fontSize).toBe('14px')
    expect(estiloDosCampos(ler, 1280).fontSize).toBe('14px')
  })
})
