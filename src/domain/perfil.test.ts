import { lerPerfil, PERFIL_VAZIO } from './perfil.ts'
import type { Armazenamento } from './persistencia.ts'

const guardando = (texto: string): Armazenamento => ({ getItem: () => texto, setItem: () => undefined, removeItem: () => undefined })

describe('lerPerfil', () => {
  it('item 7: campo com tipo errado cai no vazio, campo a campo', () => {
    const perfil = lerPerfil(guardando('{"nome":null,"tipo":"profissional","crn":7}'))
    expect(perfil.nome).toBe('')
    expect(perfil.tipo).toBe('profissional')
    expect(perfil.crn).toBe('')
  })

  it('aproveita os campos de tipo certo e ignora tipo desconhecido', () => {
    const perfil = lerPerfil(guardando('{"nome":"Ana","tipo":"outro","logo":3,"responsavel":"Dra. Bia"}'))
    expect(perfil).toEqual({ ...PERFIL_VAZIO, nome: 'Ana', responsavel: 'Dra. Bia' })
  })

  it('CA-487: a logo só vale como imagem embutida, como a tela de Configurações grava', () => {
    const logo = (valor: string) => lerPerfil(guardando(JSON.stringify({ nome: 'Ana', logo: valor }))).logo
    expect(logo('data:image/png;base64,iVBORw0KGgo=')).toBe('data:image/png;base64,iVBORw0KGgo=')
    expect(logo('data:image/svg+xml;base64,PHN2Zy8+')).toBe('data:image/svg+xml;base64,PHN2Zy8+')
    expect(logo('javascript:alert(1)')).toBeNull()
    expect(logo(' JavaScript:alert(1)')).toBeNull()
    expect(logo('https://exemplo.com/logo.png')).toBeNull()
    expect(logo('data:text/html;base64,PHNjcmlwdD4=')).toBeNull()
  })
})

describe('lerPerfil: a marca (spec marca-no-link, D-952)', () => {
  const ler = (o: Record<string, unknown>) => lerPerfil(guardando(JSON.stringify({ nome: 'Ana', ...o })))

  it('perfil antigo, sem cor e sem marca publicada: sem cor, e a marca ainda não foi publicada (D-961)', () => {
    expect(ler({ logo: 'data:image/png;base64,iVBORw0KGgo=' })).toMatchObject({ cor: null, marcaPublicada: false })
    expect(PERFIL_VAZIO).toMatchObject({ cor: null, marcaPublicada: false })
  })

  it('a cor vale só no formato #rrggbb, e volta em minúscula', () => {
    expect(ler({ cor: '#1F4E8C' }).cor).toBe('#1f4e8c')
    expect(ler({ cor: 'azul' }).cor).toBeNull()
    expect(ler({ cor: 'red;background:url(x)' }).cor).toBeNull()
    expect(ler({ cor: 7 }).cor).toBeNull()
  })

  it('CB-960: a cor padrão guardada vale como sem cor', () => {
    expect(ler({ cor: '#0e3b43' }).cor).toBeNull()
  })

  it('marca publicada só com verdadeiro', () => {
    expect(ler({ marcaPublicada: true }).marcaPublicada).toBe(true)
    expect(ler({ marcaPublicada: 'sim' }).marcaPublicada).toBe(false)
  })
})
