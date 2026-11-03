// O endereço do link do paciente (spec lado-do-paciente, D-1213, DP-LP-1 e DP-LP-3).
import { enderecoOficial } from './enderecos.ts'
import { enderecoDoPaciente } from './missoes/endereco.ts'
import { caminhoNovoDoLink, ehRotaLivre, escreverRota, lerRota, lerRotaDoEndereco, rotaDoEndereco } from './navegacao.ts'

const TOKEN = 'k7q2mx9pla3r'
const CHAVE = 'Ab3dEf6hIj9kLm2nOp5qRs8tUv1wXy4z'

describe('D-1213: o link do paciente em /p/<token>', () => {
  it('D-1213: o endereço que a nutricionista copia é <app>/p/<token>', () => {
    expect(enderecoDoPaciente(TOKEN)).toBe(`${globalThis.location.origin}/p/${TOKEN}`)
  })

  it('D-1213: o caminho /p/<token> é o link do paciente, com qualquer #', () => {
    expect(lerRotaDoEndereco(`/p/${TOKEN}`, '')).toEqual({ tela: 'missoes', token: TOKEN })
    expect(lerRotaDoEndereco(`/p/${TOKEN}`, '#/painel')).toEqual({ tela: 'missoes', token: TOKEN })
    expect(rotaDoEndereco(`/p/${TOKEN}#/qualquer`)).toEqual({ tela: 'missoes', token: TOKEN })
  })

  it('DP-LP-1: fora de /p/ e de /avisos/, vale o # de sempre', () => {
    expect(lerRotaDoEndereco('/', '#/pacientes')).toEqual({ tela: 'pacientes' })
    expect(rotaDoEndereco('/#/adesao')).toEqual({ tela: 'adesao' })
    expect(rotaDoEndereco('/')).toEqual(lerRota(''))
  })

  it('DP-LP-1: caminho estranho debaixo de /p/ não vira link (token fora do formato, partes a mais)', () => {
    for (const caminho of ['/p/', '/p/CURTO', '/p/k7Q2mX9pLa3R', `/p/${TOKEN}/extra`, '/p/<script>', `/x/${TOKEN}`]) {
      expect(lerRotaDoEndereco(caminho, '#/casos')).toEqual({ tela: 'casos' })
    }
  })

  it('DP-LP-20: /avisos/<chave> é a página do aceite ou do descadastro, sem conta', () => {
    expect(lerRotaDoEndereco(`/avisos/${CHAVE}`, '')).toEqual({ tela: 'avisos', chave: CHAVE })
    expect(lerRotaDoEndereco('/avisos/curta', '')).toEqual(lerRota(''))
    expect(ehRotaLivre({ tela: 'avisos', chave: CHAVE })).toBe(true)
  })

  it('D-1220: "Recuperar meu link" tem endereço próprio e abre sem conta', () => {
    expect(lerRota('#/recuperar-link')).toEqual({ tela: 'recuperar-link' })
    expect(escreverRota({ tela: 'recuperar-link' })).toBe('#/recuperar-link')
    expect(ehRotaLivre({ tela: 'recuperar-link' })).toBe(true)
  })

  it('CA-2261: a ficha aberta no campo E-mail tem endereço próprio', () => {
    const rota = { tela: 'paciente', pacienteId: 'p1', campo: 'email' } as const
    expect(escreverRota(rota)).toBe('#/paciente/p1/email')
    expect(lerRota(escreverRota(rota))).toEqual(rota)
  })
})

describe('CA-2220: o endereço antigo vira o novo', () => {
  it('CA-2220: #/missoes/<token> vira /p/<token>', () => {
    expect(caminhoNovoDoLink(`#/missoes/${TOKEN}`)).toBe(`/p/${TOKEN}`)
  })

  it('CA-2220: qualquer outro endereço fica como está', () => {
    expect(caminhoNovoDoLink('#/painel')).toBeNull()
    expect(caminhoNovoDoLink('')).toBeNull()
    expect(caminhoNovoDoLink('#/missoes/curto')).toBeNull()
  })

  it('CA-2220: aberto pelo endereço da Cloudflare, o link vai ao oficial com o caminho', () => {
    expect(enderecoOficial({ hostname: 'metanutri.pages.dev', pathname: `/p/${TOKEN}`, search: '', hash: '' })).toBe(`https://app.metanutri.com.br/p/${TOKEN}`)
    expect(enderecoOficial({ hostname: 'metanutri.pages.dev', pathname: `/avisos/${CHAVE}`, search: '', hash: '' })).toBe(`https://app.metanutri.com.br/avisos/${CHAVE}`)
    expect(enderecoOficial({ hostname: 'metanutri.pages.dev', pathname: '/qualquer/coisa', search: '', hash: '#/painel' })).toBe('https://app.metanutri.com.br/#/painel')
  })
})
