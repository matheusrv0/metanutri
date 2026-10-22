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
  // D-415: a busca e os robôs com o mesmo glossário da landing.
  ['"folha do paciente"', /folha do paciente/i],
  ['comentário antigo do index.html', /impeccable:direction|OWN-WORLD/],
  // CA-1184: Termos, Privacidade e Fontes no glossário (dado "é apagado", não "some"; "renovam automaticamente").
  ['"renovam sozinhas"', /renovam sozinhas/i],
  ['"somem sozinhas" e "some em"', /somem sozinhas|\bsome (em|quando)\b/i],
  ['"não alcança os dados"', /alcança os dados/i],
  ['"organiza e confere"', /organiza e confere/i],
  // D-408 e CA-1185 a CA-1187: "assinatura" é a cobrança; menu, conta e checkout no glossário.
  ['"Conta e plano"', /Conta e plano/],
  ['"Meus produtos"', /Meus produtos/],
  ['"Mudar de plano"', /Mudar de plano/],
  ['"Me formei" sem o "Já"', /(^|[^\p{L}])Me formei/u],
  ['"Estudante de Nutrição" no meio da frase', /Estudante de Nutrição/],
  ['"não vale mais"', /não vale mais/i],
  ['"Olhe (também) o spam"', /Olhe (também )?(a caixa de )?spam/i],
  ['"libera sozinho"', /libera sozinho/i],
  ['"Lembrei, quero entrar"', /Lembrei, quero entrar/i],
  ['"Criar grátis"', /Criar grátis/i],
  ['"Dados e medidas" como etapa', /Dados e medidas/],
  // CA-1189: Painel, lista de planos e primeiro acesso.
  ['"mexidos"', /\bmexid[oa]s?\b/i],
  ['"trabalhados em"', /trabalhad[oa]s? em/i],
  ['"Os casos ficam"', /Os casos ficam/i],
  ['exemplo de nome com idade e condição', /28 anos, gestante/],
  // CA-1190 a CA-1192: link do paciente, Adesão e missões.
  ['"Ver planos"', /Ver planos/],
  ['"Mostrar a dieta no link"', /Mostrar a dieta no link/i],
  ['"Sumindo" como rótulo e "sumindo antes de sumir"', /Sumindo|sumir de vez/],
  ['"Acompanhando"', /Acompanhando|paciente acompanhando/],
  ['"missões saem"', /miss(ão|ões) sa(i|em)\b/i],
  ['"Dia fechado"', /Dia fechado/i],
  ['"me conta"', /\bme conta\b/i],
  ['"Comer os vegetais do almoço e do jantar"', /vegetais do almoço/i],
  ['"Seu plano não tem limite" e "Acima do seu plano"', /Seu plano não tem limite|Acima do seu plano/],
  ['"Atualizada em" para o plano', /Atualizada em/],
  // CA-1193 e CA-1194: documentos impressos e em Word.
  ['código do estágio de vida', /Estágio de vida das referências/i],
  ['"Caso:" no memorial', /^Caso: /],
  ['"Mesmo tipo de alimento"', /Mesmo tipo de alimento/i],
  ['"1 ou mais alimentos"', /\b1 ou mais alimentos/i],
  ['maiúscula no meio do rótulo', /Data da Consulta|Circunferência da (Cintura|Panturrilha)/],
  ['"ou · Opção"', /ou · Opção/],
  // CA-1195 a CA-1197: Configurações, Ajuda, mensagens do sistema e administração.
  ['"presos à conta"', /presos? à/i],
  ['"folha da dieta"', /folha da dieta/i],
  ['"Dieta para imprimir"', /Dieta para imprimir/i],
  ['"Responsável técnico" (é Preceptor(a))', /respons[áa]vel técnico/i],
  ['"Cinco minutos"', /Cinco minutos/i],
  ['"Nada aqui é opinião"', /Nada aqui é opinião/i],
  ['"Último login"', /último login/i],
  ['"Reduzir os dados"', /Reduzir os dados/i],
  ['servidor ausente em várias vozes', /conta na nuvem (ainda )?não (está|foi) (ligada|configurada)|não foi ligada/i],
  ['"os casos não serão salvos"', /os casos não serão salvos/i],
  ['"não sobrevivem ao fechar"', /não sobrevivem/i],
  ['"Se for recusar, o motivo"', /Se for recusar/i],
  ['"logo" no lugar de "logotipo"', /\b(a|uma|Sua|Remover) logo\b/],
  // Aspas curvas no texto de tela (glossário): "assim" vira “assim”. O HTML do cabeçalho de busca usa aspas de atributo.
  ['aspas retas em volta de palavras', /(^|\s)"[\p{L}\d][^"<>=]*"(\s|[.,:;)]|$)/u],
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

/**
 * CA-1201 (integração das frentes de 21/10/2026): depois da junção, as telas que eram das outras frentes (ficha, etapa 1,
 * refeições, alimentos, Adequação, receitas) também ficam sem as vozes antigas que a revisão de texto apontou. Só os
 * termos que valem para essas telas; os de Preços, landing e documentos continuam na guarda de cima.
 */
const PASTAS_DAS_OUTRAS_FRENTES = [
  'src/ui/pacientes',
  'src/ui/caso',
  'src/ui/plano',
  'src/ui/produtos',
  'src/ui/alimentos',
  'src/ui/adequacao',
  'src/ui/resumo',
  'src/ui/receitas',
]
const SOLTOS_DAS_OUTRAS_FRENTES = ['src/domain/plano.ts', 'src/domain/sugestoes.ts', 'src/domain/receitas.ts', 'src/domain/produtos.ts']
const TEXTOS_DAS_OUTRAS_FRENTES: ReadonlyMap<string, readonly string[]> = new Map(
  [...PASTAS_DAS_OUTRAS_FRENTES.flatMap(arquivosDa), ...SOLTOS_DAS_OUTRAS_FRENTES].map((caminho): [string, readonly string[]] => [
    caminho,
    textosDoCodigo(caminho, readFileSync(join(RAIZ, caminho), 'utf8')),
  ]),
)
const PROIBIDOS_NAS_OUTRAS_FRENTES: readonly (readonly [string, RegExp])[] = [
  ['"Não consegui"', /\bNão consegui\b/i],
  ['"Não deu para"', /\bNão deu para\b/i],
  ['"Não dá para desfazer"', /não dá para desfazer/i],
  ['"Conta e plano"', /Conta e plano/],
  ['"Meus produtos"', /Meus produtos/],
  ['"presos à conta"', /presos? à/i],
  // Linha 118 de textos.md: plano novo começa com "Café da manhã" (o "Desjejum" guardado continua, CA-1200).
  ['"Desjejum"', /Desjejum|o desjejum/],
]

describe('CA-1201: termos antigos nas telas das outras frentes, depois da junção', () => {
  it('a varredura lê a ficha, a etapa 1, as refeições, os alimentos e a Adequação', () => {
    const lidos = [...TEXTOS_DAS_OUTRAS_FRENTES.keys()]
    for (const esperado of ['src/ui/caso/CartaoDocumento.tsx', 'src/ui/plano/DialogoSugestoes.tsx', 'src/ui/produtos/LeitorCodigo.tsx', 'src/domain/plano.ts']) {
      expect(lidos).toContain(esperado)
    }
    expect(lidos.some((c) => c.includes('.test.'))).toBe(false)
  })

  it.each(PROIBIDOS_NAS_OUTRAS_FRENTES)('nenhum texto tem %s', (_nome, padrao) => {
    const achou = [...TEXTOS_DAS_OUTRAS_FRENTES].flatMap(([caminho, textos]) => textos.filter((t) => padrao.test(t)).map((t) => `${caminho}: ${t}`))
    expect(achou).toEqual([])
  })
})
