// Os arquivos de busca na raiz do site e o cabeçalho escrito no index.html (spec site-publico-profissional).
// São texto parado; estes testes garantem que não se descolam do domínio (D-327, CB-327).
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { DIAS_PACIENTE_ATIVO, PLANOS } from '@/domain/conta.ts'
import { CONTATO_EMAIL } from '@/domain/legal.ts'
import { cabecalhoDaPagina, MARCA_FIM, MARCA_INICIO } from './cabecalho.ts'
import { enderecoDaPagina, PAGINAS, paginaDaRota } from './paginas.ts'

const ler = (...partes: string[]) => readFileSync(join(process.cwd(), ...partes), 'utf8')
const reais = (valor: number) => valor.toLocaleString('pt-BR', { minimumFractionDigits: Number.isInteger(valor) ? 0 : 2, maximumFractionDigits: 2 })

describe('arquivos de busca e o index.html', () => {
  it('CA-1009 e D-327: o cabeçalho escrito no index.html é o mesmo que o build escreve, montado do domínio', () => {
    const html = ler('index.html')
    const inicio = html.indexOf(MARCA_INICIO)
    const fim = html.indexOf(MARCA_FIM)
    expect(inicio).toBeGreaterThan(0)
    expect(fim).toBeGreaterThan(inicio)
    const bloco = html.slice(inicio + MARCA_INICIO.length, fim).trim()
    expect(bloco.replace(/\s*\n\s*/g, '\n')).toBe(cabecalhoDaPagina(paginaDaRota('inicio')).replace(/\s*\n\s*/g, '\n'))
    expect(html).toMatch(/<html lang="pt-BR">/)
    expect(html).toContain('<meta name="theme-color"')
    expect(html).toContain('<link rel="apple-touch-icon" href="apple-touch-icon.png" />')
    // CA-1183 (spec textos-e-promessas, D-415): o comentário antigo, em inglês e com fontes que o site não usa, saiu.
    expect(html).not.toMatch(/impeccable:direction|OWN-WORLD|Archivo|Figtree/)
  })

  it('CA-1018: o robots.txt libera todos os robôs e aponta o sitemap', () => {
    const robots = ler('public', 'robots.txt')
    expect(robots).toMatch(/^User-agent: \*\nAllow: \/$/m)
    expect(robots).not.toMatch(/^Disallow: \/\s*$/m)
    expect(robots).toContain('Sitemap: https://metanutri.com.br/sitemap.xml')
  })

  it('CA-1018: o sitemap lista exatamente as páginas indexáveis', () => {
    const sitemap = ler('public', 'sitemap.xml')
    expect(sitemap.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true)
    const enderecos = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1])
    expect(enderecos).toEqual(PAGINAS.map(enderecoDaPagina))
  })

  it('CA-1019: o llms.txt traz os planos com os preços de PLANOS, o contato e as páginas', () => {
    const llms = ler('public', 'llms.txt')
    expect(llms.startsWith('# MetaNutri\n')).toBe(true)
    // D-406 (spec textos-e-promessas): a Clínica é por contato, sem preço.
    expect(llms).toContain('- Clínica com mais de um nutricionista: condições combinadas pelo e-mail de contato.')
    for (const plano of PLANOS.filter((p) => !p.porContato)) {
      const linha = llms.split('\n').find((l) => l.startsWith(`- ${plano.nome}: R$ ${reais(plano.mensal)}`))
      expect(linha, plano.nome).toBeDefined()
      if (plano.anual > 0) expect(linha).toContain(`R$ ${reais(plano.anual)} por ano`)
      if (plano.limitePacientesAtivos !== null) expect(linha).toContain(`${plano.limitePacientesAtivos} pacientes ativos`)
    }
    expect(llms).toContain(`nos últimos ${DIAS_PACIENTE_ATIVO} dias`)
    expect(llms).toContain(`E-mail: ${CONTATO_EMAIL ?? ''}`)
    for (const pagina of PAGINAS) expect(llms).toContain(enderecoDaPagina(pagina))
  })

  it('CA-1408 (spec separacao-site-app): o llms.txt aponta "Entrar" para o app, junto das páginas', () => {
    const paginas = ler('public', 'llms.txt').split('## Páginas')[1] ?? ''
    expect(paginas).toContain('\n- Entrar: https://app.metanutri.com.br/\n')
  })

  it('CA-1183 (spec textos-e-promessas): o llms.txt diz o mesmo que a landing, com o glossário', () => {
    const llms = ler('public', 'llms.txt')
    expect(llms).toContain(
      '> Software para nutricionistas, no navegador. Monta o plano alimentar e mostra a adequação de 20 vitaminas e minerais e da fibra. Em cada nutriente abaixo da meta, o botão Cobrir propõe o alimento e a porção que fecham a diferença, em gramas e, quando a base tem, em medida caseira, respeitando as restrições do paciente. O plano vira missões diárias que o paciente marca pelo celular.',
    )
    expect(llms).toContain('Todas as assinaturas têm as mesmas funções.')
    expect(llms).not.toMatch(/presos|Folha do paciente|até 4 nutricionistas|R\$ 149/i)
  })

  it('CA-1010: a imagem de compartilhar é um PNG de 1200 × 630 com menos de 300 KB', () => {
    const png = readFileSync(join(process.cwd(), 'public', 'imagem-compartilhar.png'))
    expect(png.subarray(1, 4).toString('ascii')).toBe('PNG')
    expect(png.readUInt32BE(16)).toBe(1200)
    expect(png.readUInt32BE(20)).toBe(630)
    expect(png.length).toBeLessThan(300 * 1024)
  })
})
