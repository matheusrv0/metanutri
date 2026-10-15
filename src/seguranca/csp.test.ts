import { diretivasDaPolitica, NONCE_DO_ANTIFRAUDE, origemDoSupabase, textoDaPolitica, type NomeDaDiretiva, type Politica } from './csp.ts'

const SUPABASE = 'https://qmpljfjbdcrdbqutuvmg.supabase.co'
const politica = diretivasDaPolitica({ supabase: SUPABASE })
const valores = (alvo: Politica, nome: NomeDaDiretiva): readonly string[] | undefined => alvo.find(([diretiva]) => diretiva === nome)?.[1]

describe('a regra de conteúdo do site (D-135)', () => {
  it('CA-485: o texto da regra é exatamente este', () => {
    expect(textoDaPolitica(politica)).toBe(
      [
        "default-src 'self'",
        `script-src 'self' 'nonce-${NONCE_DO_ANTIFRAUDE}' https://sdk.mercadopago.com https://challenges.cloudflare.com`,
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: https://www.mercadolibre.com https://www.mercadolivre.com https://www.mercadopago.com.br",
        "font-src 'self'",
        `connect-src 'self' ${SUPABASE} https://api.mercadopago.com https://secure-fields.mercadopago.com https://api-static.mercadopago.com https://www.mercadolibre.com https://www.mercadopago.com.br https://api.mercadolibre.com https://world.openfoodfacts.org`,
        'frame-src https://secure-fields.mercadopago.com https://api-static.mercadopago.com https://challenges.cloudflare.com',
        "child-src 'self' https://secure-fields.mercadopago.com https://api-static.mercadopago.com https://challenges.cloudflare.com",
        "worker-src 'self'",
        "manifest-src 'self'",
        "base-uri 'self'",
        "form-action 'self'",
        "object-src 'none'",
        'upgrade-insecure-requests',
      ].join('; '),
    )
  })

  it('CA-485: script só do próprio site, do Mercado Pago e do Cloudflare; nada escrito na página sem o nonce, nada de eval', () => {
    const scripts = valores(politica, 'script-src') ?? []
    expect(scripts).toEqual(["'self'", `'nonce-${NONCE_DO_ANTIFRAUDE}'`, 'https://sdk.mercadopago.com', 'https://challenges.cloudflare.com'])
    const texto = textoDaPolitica(politica)
    for (const proibido of ["'unsafe-eval'", "'wasm-unsafe-eval'", "'strict-dynamic'", "'unsafe-hashes'", '*', 'http:', 'https:', 'blob:']) {
      expect(texto.split(/[\s;]+/)).not.toContain(proibido)
    }
    // 'unsafe-inline' só no estilo (React, Radix e motion escrevem estilo na página); nunca em script.
    expect(politica.filter(([, fontes]) => fontes.includes("'unsafe-inline'")).map(([nome]) => nome)).toEqual(['style-src'])
    expect(valores(politica, 'object-src')).toEqual(["'none'"])
    expect(valores(politica, 'default-src')).toEqual(["'self'"])
  })

  it('CA-485: só as origens do D-135: Supabase do build, Mercado Pago e o antifraude dele, Cloudflare e Open Food Facts', () => {
    const origens = new Set(
      politica
        .flatMap(([, fontes]) => fontes)
        .filter((fonte) => fonte.startsWith('https://')),
    )
    expect([...origens].sort()).toEqual(
      [
        SUPABASE,
        'https://sdk.mercadopago.com',
        'https://api.mercadopago.com',
        'https://secure-fields.mercadopago.com',
        'https://api-static.mercadopago.com',
        'https://www.mercadolibre.com',
        'https://www.mercadolivre.com',
        'https://www.mercadopago.com.br',
        'https://api.mercadolibre.com',
        'https://challenges.cloudflare.com',
        'https://world.openfoodfacts.org',
      ].sort(),
    )
    expect(valores(politica, 'frame-src')).toEqual(['https://secure-fields.mercadopago.com', 'https://api-static.mercadopago.com', 'https://challenges.cloudflare.com'])
    // Achado da revisão: no domínio de produção (.com.br) o antifraude usa www.mercadopago.com.br, por imagem ou por fetch.
    expect(valores(politica, 'img-src')).toContain('https://www.mercadopago.com.br')
    expect(valores(politica, 'connect-src')).toContain('https://www.mercadopago.com.br')
    // O servidor reserva dos campos do cartão (o sourceUrl do SDK).
    expect(valores(politica, 'connect-src')).toContain('https://api-static.mercadopago.com')
  })

  it('CA-485: sem o Supabase no build, a regra não libera Supabase nenhum', () => {
    const semNuvem = textoDaPolitica(diretivasDaPolitica({ supabase: null }))
    expect(semNuvem).not.toMatch(/supabase/)
    expect(semNuvem).toContain("connect-src 'self' https://api.mercadopago.com")
  })

  it('CB-128: só diretivas que a <meta> aceita, e nada de aspas duplas que quebrariam o atributo', () => {
    const nomes = politica.map(([nome]) => nome)
    for (const ignorada of ['frame-ancestors', 'report-uri', 'report-to', 'sandbox']) expect(nomes).not.toContain(ignorada)
    expect(new Set(nomes).size).toBe(nomes.length)
    expect(textoDaPolitica(politica)).not.toMatch(/["<>]/)
  })

  it('CB-128: navegador que não entende uma diretiva cai na reserva, e a reserva ainda libera o que o site usa', () => {
    // A reserva de cada tipo de pedido (CSP nível 3): a primeira diretiva da lista que existir na regra vale.
    const RESERVAS: Readonly<Record<string, readonly NomeDaDiretiva[]>> = {
      moldura: ['frame-src', 'child-src', 'default-src'],
      trabalhador: ['worker-src', 'child-src', 'script-src', 'default-src'],
      manifest: ['manifest-src', 'default-src'],
      script: ['script-src', 'default-src'],
      estilo: ['style-src', 'default-src'],
      imagem: ['img-src', 'default-src'],
      fonte: ['font-src', 'default-src'],
      conexao: ['connect-src', 'default-src'],
    }
    const efetiva = (tipo: string, ignorada: NomeDaDiretiva | null): readonly string[] => {
      for (const nome of RESERVAS[tipo] ?? []) {
        if (nome === ignorada) continue
        const achado = valores(politica, nome)
        if (achado) return achado
      }
      return []
    }
    const NECESSARIO: Readonly<Record<string, readonly string[]>> = {
      moldura: ['https://secure-fields.mercadopago.com', 'https://api-static.mercadopago.com', 'https://challenges.cloudflare.com'],
      trabalhador: ["'self'"],
      manifest: ["'self'"],
    }
    const ignoraveis: readonly NomeDaDiretiva[] = ['frame-src', 'child-src', 'worker-src', 'manifest-src']
    for (const ignorada of ignoraveis) {
      for (const [tipo, necessario] of Object.entries(NECESSARIO)) {
        const liberado = efetiva(tipo, ignorada)
        for (const fonte of necessario) expect(liberado, `${tipo} sem ${ignorada}`).toContain(fonte)
      }
    }
    // E, com todas entendidas, cada tipo usa a diretiva própria (a reserva não alarga nada no navegador atual).
    for (const tipo of Object.keys(RESERVAS)) expect(efetiva(tipo, null)).toBe(valores(politica, RESERVAS[tipo]?.[0] ?? 'default-src'))
  })
})

describe('a origem do Supabase do build (DP-CSP-1)', () => {
  it('fica só a origem, sem caminho nem barra no fim', () => {
    expect(origemDoSupabase(`${SUPABASE}/`)).toBe(SUPABASE)
    expect(origemDoSupabase(`${SUPABASE}/rest/v1`)).toBe(SUPABASE)
    expect(origemDoSupabase(` ${SUPABASE} `)).toBe(SUPABASE)
  })

  it('sem https, vazia, "desligado" ou de outro tipo, não há origem', () => {
    for (const valor of ['desligado', '', 'http://127.0.0.1:54321', 'javascript:alert(1)', 'https://', undefined, null, 42]) {
      expect(origemDoSupabase(valor)).toBeNull()
    }
  })
})
