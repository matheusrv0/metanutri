// CA-1170 (spec textos-e-promessas, D-416): a guarda dos termos que a revisão de texto tirou.
// Lê o texto que a pessoa vê (literais, template strings e texto de JSX, pelo compilador do TypeScript), não os
// comentários nem os nomes do código: "aoVerPlanos" e um comentário que cita "Conta e plano" não são texto de tela.
// Só os arquivos desta frente entram (D-417): a ficha, as refeições, os alimentos e o Cobrir são de outras frentes.
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import ts from 'typescript'

const RAIZ = process.cwd()

function arquivosDa(pasta: string): string[] {
  return readdirSync(join(RAIZ, pasta)).flatMap((nome) => {
    const caminho = `${pasta}/${nome}`
    if (statSync(join(RAIZ, caminho)).isDirectory()) return arquivosDa(caminho)
    return /\.(ts|tsx)$/.test(nome) && !/\.test\.|\.test-utils\./.test(nome) ? [caminho] : []
  })
}

/** As pastas inteiras desta frente. */
const PASTAS = [
  'src/ui/publico',
  'src/ui/conta',
  'src/ui/painel',
  'src/ui/casos',
  'src/ui/missoes',
  'src/ui/exportar',
  'src/ui/config',
  'src/ui/ajuda',
  'src/ui/negocio',
  'src/ui/aprovacoes',
  'src/ui/aplicativo',
  'src/ui/nuvem',
  'src/ui/pagamento',
  'src/ui/segundoFator',
  'src/ui/whatsapp',
  'src/ui/layout',
  'src/ui/estado',
  'src/export',
  'src/seo',
]

/** Os arquivos soltos desta frente. */
const SOLTOS = [
  'src/App.tsx',
  'src/ui/AreaDeTrabalho.tsx',
  'src/ui/AvisoMoldura.tsx',
  'src/ui/navegacao.ts',
  'src/domain/acompanhamento.ts',
  'src/domain/assinatura.ts',
  'src/domain/assinaturaTextos.ts',
  'src/domain/baseMetanutri.ts',
  'src/domain/cartao.ts',
  'src/domain/conta.ts',
  'src/domain/copiaNaNuvem.ts',
  'src/domain/documentoDoPaciente.ts',
  'src/domain/exemplo.ts',
  'src/domain/folhaDieta.ts',
  'src/domain/fonteSupabase.ts',
  'src/domain/legal.ts',
  'src/domain/missoes.ts',
  'src/domain/negocio.ts',
  'src/domain/negocioTextos.ts',
  'src/domain/pedidoEstudante.ts',
  'src/domain/perfil.ts',
  'src/domain/persistencia.ts',
  'src/domain/repositorioAcompanhamentos.ts',
  'src/domain/whatsapp.ts',
  // As funções do servidor cuja mensagem a tela mostra (assinar, gerenciar a assinatura e excluir a conta).
  'supabase/functions/_shared/assinar.ts',
  'supabase/functions/_shared/cobranca.ts',
  'supabase/functions/_shared/excluirConta.ts',
  'supabase/functions/_shared/gerenciarAssinatura.ts',
  'supabase/functions/_shared/portas.ts',
]

/** Textos que não são código: lidos inteiros. */
const TEXTOS = [
  'index.html',
  'public/llms.txt',
  'supabase/emails/confirmar-acao.html',
  'supabase/emails/confirmar-conta.html',
  'supabase/emails/trocar-email.html',
  'supabase/emails/trocar-senha.html',
]

const CODIGO = [...PASTAS.flatMap(arquivosDa), ...SOLTOS]

/** Registro para quem mantém o código (console, log do servidor, erro de programação): não é texto de tela. */
const CHAMADAS_DE_REGISTRO = new Set(['log', 'error', 'warn', 'info', 'debug', 'Error', 'RangeError', 'TypeError'])

const nomeDaChamada = (expressao: ts.Expression): string =>
  ts.isIdentifier(expressao) ? expressao.text : ts.isPropertyAccessExpression(expressao) ? expressao.name.text : ''

function ehRegistro(no: ts.Node): boolean {
  for (let pai = no.parent; pai !== undefined; pai = pai.parent) {
    if ((ts.isCallExpression(pai) || ts.isNewExpression(pai)) && CHAMADAS_DE_REGISTRO.has(nomeDaChamada(pai.expression))) return true
    if (ts.isBlock(pai) || ts.isSourceFile(pai)) return false
  }
  return false
}

/** Os textos de um arquivo de código: literais, template strings (com `${…}` no lugar da expressão) e texto de JSX. */
function textosDoCodigo(caminho: string, codigo: string): string[] {
  const fonte = ts.createSourceFile(caminho, codigo, ts.ScriptTarget.Latest, true, caminho.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS)
  const textos: string[] = []
  const visitar = (no: ts.Node): void => {
    if (ts.isJsxText(no)) textos.push(no.text)
    else if ((ts.isStringLiteral(no) || ts.isNoSubstitutionTemplateLiteral(no)) && !ehRegistro(no)) textos.push(no.text)
    else if (ts.isTemplateExpression(no) && !ehRegistro(no)) textos.push([no.head.text, ...no.templateSpans.map((s) => s.literal.text)].join('${…}'))
    ts.forEachChild(no, visitar)
  }
  visitar(fonte)
  return textos.map((t) => t.replace(/\s+/g, ' ').trim()).filter(Boolean)
}

const TEXTOS_POR_ARQUIVO: ReadonlyMap<string, readonly string[]> = new Map<string, readonly string[]>([
  ...CODIGO.map((caminho): [string, readonly string[]] => [caminho, textosDoCodigo(caminho, readFileSync(join(RAIZ, caminho), 'utf8'))]),
  ...TEXTOS.map((caminho): [string, readonly string[]] => [caminho, [readFileSync(join(RAIZ, caminho), 'utf8')]]),
])

/**
 * Os termos tirados, com o motivo. Cada tarefa da spec põe aqui os dela (PLAN, T1 a T12).
 */
const PROIBIDOS: readonly (readonly [string, RegExp])[] = [
  // D-401: uma voz para erro, "Não foi possível …" e o que fazer.
  ['"Não consegui"', /\bNão consegui\b/i],
  ['"Não conseguimos"', /\bNão conseguimos\b/i],
  ['"Não deu para"', /\bNão deu para\b/i],
  ['"O MetaNutri não conseguiu"', /MetaNutri não conseguiu/i],
  ['"Não dá para desfazer"', /não dá para desfazer/i],
  // D-401: erro de pedido em linguagem de programador.
  ['"Corpo da requisição"', /Corpo da requisição/i],
  ['"Ação desconhecida"', /(^|[^\p{L}])Ação desconhecida/iu],
  ['"Só dá para"', /\bSó dá para\b/i],
  // D-405 a D-407: Preços sem tagline e sem prometer o que não existe.
  ['"Grátis na faculdade"', /Grátis na faculdade/i],
  ['recurso de clínica que não existe', /Painel do gestor|Até 4 nutricionistas|Pacientes compartilhados|Preceptor revisa|nutricionista extra/i],
  ['recurso do Pro que não existe', /Painel de micros|Relatório de adesão|Modelos próprios de documento/i],
  ['"Tudo do Grátis"', /Tudo do Grátis/i],
  ['"montando a clientela"', /clientela/i],
  // D-402 a D-404: a landing sem repetição e com o glossário.
  ['"feche o que falta"', /feche o que falta/i],
  ['"Comece pelo Free"', /Comece pelo Free/i],
  ['"Comparar os planos"', /Comparar os planos/i],
]

const achados = (padrao: RegExp) =>
  [...TEXTOS_POR_ARQUIVO].flatMap(([caminho, textos]) => textos.filter((t) => padrao.test(t)).map((t) => `${caminho}: ${t}`))

describe('CA-1170: termos antigos nos textos desta frente', () => {
  it('a varredura lê as telas desta frente, sem teste e sem os arquivos das outras frentes', () => {
    const lidos = [...TEXTOS_POR_ARQUIVO.keys()].map((c) => relative(RAIZ, join(RAIZ, c)).replaceAll('\\', '/'))
    for (const esperado of [
      'src/ui/publico/TelaInicio.tsx',
      'src/ui/publico/SecaoPrecos.tsx',
      'src/ui/conta/TelaConta.tsx',
      'src/ui/layout/MenuLateral.tsx',
      'src/ui/painel/TelaPainel.tsx',
      'src/ui/casos/TelaCasos.tsx',
      'src/ui/missoes/TelaAdesao.tsx',
      'src/ui/exportar/FolhaDieta.tsx',
      'src/ui/config/TelaConfiguracoes.tsx',
      'src/ui/ajuda/TelaAjuda.tsx',
      'src/ui/negocio/ListaDeContas.tsx',
      'src/domain/conta.ts',
      'index.html',
      'supabase/emails/trocar-email.html',
    ]) {
      expect(lidos).toContain(esperado)
    }
    expect(lidos.some((c) => c.includes('.test.'))).toBe(false)
    expect(lidos.some((c) => /^src\/ui\/(pacientes|caso|plano|produtos|alimentos|adequacao|resumo|receitas)\//.test(c))).toBe(false)
  })

  it('lê o texto e deixa de fora comentário, nome de código e registro para quem mantém', () => {
    const textos = textosDoCodigo(
      'x.tsx',
      [
        '// Conta e plano, num comentário',
        'const aoVerPlanos = () => null',
        "console.error('Não consegui ler')",
        "const a = 'Texto da tela'",
        'const b = `Olá, ${nome}.`',
        'const c = <p>Texto do JSX</p>',
      ].join('\n'),
    )
    expect(textos).toEqual(['Texto da tela', 'Olá, ${…}.', 'Texto do JSX'])
  })

  it.each(PROIBIDOS)('nenhum texto tem %s', (_nome, padrao) => {
    expect(achados(padrao)).toEqual([])
  })
})
