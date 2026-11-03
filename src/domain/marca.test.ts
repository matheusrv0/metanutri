// Spec marca-no-link: a marca publicada (D-952) — o que o link lê e o que "Salvar" grava.
import { FALHA_DE_REDE } from '@/ui/estado/mensagemDoBanco.ts'
import { LOGO_MAX_BYTES } from './logoDaMarca.ts'
import { lerMarcaDoLink, marcaDoPerfil, SEM_MARCA, temMarca } from './marca.ts'
import { publicarMarca, type ClienteDaMarca } from './marcaNaNuvem.ts'
import { PERFIL_VAZIO } from './perfil.ts'

/** Um PNG em data URI com `bytes` bytes (múltiplo de 3). */
const png = (bytes: number) => `data:image/png;base64,iVBORw0KGgo${'A'.repeat((bytes / 3) * 4 - 11)}`
const LOGO = png(3000)

describe('a marca que o link lê (CA-1973, DP-ML-13)', () => {
  it('CA-1974: a linha da função traz a logo e a cor da marca publicada', () => {
    expect(lerMarcaDoLink({ id: 'a1', marca_logo: LOGO, marca_cor: '#3f5f2a' })).toEqual({ logo: LOGO, cor: '#3f5f2a' })
  })

  it('CA-1968: a função de antes (sem as colunas) e a conta sem marca dão "sem marca"', () => {
    expect(lerMarcaDoLink({ id: 'a1' })).toEqual(SEM_MARCA)
    expect(lerMarcaDoLink({ id: 'a1', marca_logo: null, marca_cor: null })).toEqual(SEM_MARCA)
    expect(lerMarcaDoLink(null)).toEqual(SEM_MARCA)
    expect(temMarca(SEM_MARCA)).toBe(false)
  })

  it('CA-1969: só a cor também vale', () => {
    const marca = lerMarcaDoLink({ marca_logo: null, marca_cor: '#1f4e8c' })
    expect(marca).toEqual({ logo: null, cor: '#1f4e8c' })
    expect(temMarca(marca)).toBe(true)
  })

  it('CA-1973: imagem estragada, de outro tipo ou grande demais vira "sem logo", e a cor continua', () => {
    for (const logo of ['data:image/png;base64,lixo', 'data:image/svg+xml;base64,PHN2Zy8+', 'https://exemplo.com/a.png', png(LOGO_MAX_BYTES + 3), 42]) {
      expect(lerMarcaDoLink({ marca_logo: logo, marca_cor: '#1f4e8c' }), String(logo).slice(0, 30)).toEqual({ logo: null, cor: '#1f4e8c' })
    }
  })

  it('CA-1973 e DP-ML-33: a logo publicada maior que a cópia do app (24.000 × 24.000 em poucos bytes) vira "sem logo"', () => {
    // A assinatura do PNG e o IHDR de 24.000 × 24.000 (0x5DC0): passa na trava do banco, mas o app nunca faz isto.
    const ihdr = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52, 0, 0, 0x5d, 0xc0, 0, 0, 0x5d, 0xc0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
    const gigante = `data:image/png;base64,${btoa(String.fromCharCode(...ihdr))}`
    expect(lerMarcaDoLink({ marca_logo: gigante, marca_cor: '#1f4e8c' })).toEqual({ logo: null, cor: '#1f4e8c' })
  })

  it('DP-ML-13: cor fora do formato, recusada pelo contraste ou a padrão vira "sem cor"', () => {
    for (const cor of ['azul', '#8cc63f', '#0e3b43', 'red;x:y', '#1F4E8C ', null, 3]) {
      expect(lerMarcaDoLink({ marca_logo: null, marca_cor: cor }).cor, String(cor)).toBeNull()
    }
  })
})

describe('a marca do perfil (D-952)', () => {
  it('a prévia e o plano impresso usam a logo e a cor do perfil', () => {
    expect(marcaDoPerfil({ ...PERFIL_VAZIO, logo: LOGO, cor: '#7a2944' })).toEqual({ logo: LOGO, cor: '#7a2944' })
    expect(marcaDoPerfil(PERFIL_VAZIO)).toEqual(SEM_MARCA)
  })
})

interface Gravacao {
  readonly tabela: string
  readonly linha: Record<string, unknown>
  readonly opcoes: Record<string, unknown> | undefined
}

function clienteFalso(opcoes: { readonly usuario?: string | null; readonly erro?: { readonly message: string; readonly code: string } | 'rede' } = {}) {
  const gravacoes: Gravacao[] = []
  const usuario = opcoes.usuario === undefined ? 'conta-1' : opcoes.usuario
  const cliente: ClienteDaMarca = {
    from: (tabela) => ({
      upsert: (linha, o) => {
        gravacoes.push({ tabela, linha, opcoes: o })
        if (opcoes.erro === 'rede') return Promise.reject(new Error('rede'))
        return Promise.resolve({ data: null, error: opcoes.erro ?? null })
      },
    }),
    auth: { getSession: () => Promise.resolve({ data: { session: usuario ? { user: { id: usuario } } : null } }) },
  }
  return { cliente, gravacoes }
}

describe('publicar a marca (CA-1963, CB-955)', () => {
  it('CA-1963: grava a logo e a cor na linha da conta da sessão, uma por conta (a mais nova vale, CB-955)', async () => {
    const { cliente, gravacoes } = clienteFalso()
    expect(await publicarMarca(cliente, { logo: LOGO, cor: '#3f5f2a' })).toBeNull()
    expect(gravacoes).toHaveLength(1)
    expect(gravacoes[0]?.tabela).toBe('marcas')
    expect(gravacoes[0]?.opcoes).toEqual({ onConflict: 'nutricionista_id' })
    expect(gravacoes[0]?.linha).toMatchObject({ nutricionista_id: 'conta-1', logo: LOGO, cor: '#3f5f2a' })
    expect(typeof gravacoes[0]?.linha['atualizado_em']).toBe('string')
  })

  it('CA-1956: sem logo e sem cor, a linha fica vazia (o link volta ao MetaNutri)', async () => {
    const { cliente, gravacoes } = clienteFalso()
    expect(await publicarMarca(cliente, SEM_MARCA)).toBeNull()
    expect(gravacoes[0]?.linha).toMatchObject({ logo: null, cor: null })
  })

  it('sem sessão, ou com a sessão de outra conta, nada é pedido e a resposta é a falha de rede', async () => {
    const semSessao = clienteFalso({ usuario: null })
    expect(await publicarMarca(semSessao.cliente, SEM_MARCA)).toBe(FALHA_DE_REDE)
    expect(semSessao.gravacoes).toEqual([])
    const outra = clienteFalso({ usuario: 'conta-2' })
    expect(await publicarMarca(outra.cliente, SEM_MARCA, 'conta-1')).toBe(FALHA_DE_REDE)
    expect(outra.gravacoes).toEqual([])
  })

  it('D-98: o erro do banco chega traduzido; a trava da logo diz o que fazer', async () => {
    const trava = clienteFalso({ erro: { code: '23514', message: 'new row for relation "marcas" violates check constraint "marcas_logo_png"' } })
    expect(await publicarMarca(trava.cliente, { logo: LOGO, cor: null })).toBe('Use uma logo mais simples.')
    const banco = clienteFalso({ erro: { code: 'PGRST205', message: "Could not find the table 'public.marcas'" } })
    expect(await publicarMarca(banco.cliente, SEM_MARCA)).toBe(FALHA_DE_REDE)
    const rede = clienteFalso({ erro: 'rede' })
    expect(await publicarMarca(rede.cliente, SEM_MARCA)).toBe(FALHA_DE_REDE)
  })

  it('logo que não é publicável nem sai do aparelho', async () => {
    const { cliente, gravacoes } = clienteFalso()
    expect(await publicarMarca(cliente, { logo: 'data:image/svg+xml;base64,PHN2Zy8+', cor: null })).toBe('Use uma logo mais simples.')
    expect(gravacoes).toEqual([])
  })
})
