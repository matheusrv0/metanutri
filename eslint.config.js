import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'

/*
 * Aderência ao design system.
 *
 * Vinha do export como `_adherence.oxlintrc.json`, escrito para o oxlint. O projeto
 * usa ESLint, e as duas regras que carregam a intenção (`no-restricted-syntax` e
 * `no-restricted-imports`) existem nos dois. Foi isso que entrou aqui.
 *
 * Três coisas do arquivo original NÃO entraram, de propósito:
 *  - `react/forbid-elements`: a lista de elementos proibidos vinha vazia (não fazia
 *    nada) e a regra exigiria `eslint-plugin-react`, uma dependência nova.
 *  - As ~50 travas de prop e de variante por componente (`<Alert> variant must be…`):
 *    o TypeScript já faz isso, em tempo de edição, com erro melhor — e as listas do
 *    export não batem com a API dos componentes portados, que tem mais variantes.
 *  - A lista de fontes `Urbanist | Plus Jakarta Sans`: o app embute outras fontes
 *    (ver DESIGN.md > Tipografia). A regra ficou, com as fontes de verdade.
 */
const SEM_VALOR_SOLTO = [
  {
    selector: 'Literal[value=/#[0-9a-fA-F]{3,8}\\b/]',
    message: 'Cor em hexadecimal no código. Use um token do design system via var() ou um utilitário do tema.',
  },
  {
    selector: 'Literal[value=/font-family/]',
    message: 'font-family no código. As fontes do sistema são --font-corpo, --font-display e --font-data (design-system/tokens/tokens.css).',
  },
]

const SEM_PX_SOLTO = [
  {
    selector: 'Literal[value=/\\b\\d+px\\b/]',
    message: 'Medida em px no código. Use a escala do tema (p-5, gap-4, rounded-lg, text-2xs) ou um token --space-*/--radius-*/--fonte-*.',
  },
]

export default tseslint.config(
  { ignores: ['dist', 'coverage', 'node_modules', 'dados-brutos', 'design-system/referencia'] },
  {
    files: ['**/*.{ts,tsx}'],
    extends: [js.configs.recommended, ...tseslint.configs.strict],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      '@typescript-eslint/no-explicit-any': 'error',
      // Cor e fonte soltas em qualquer lugar do app: nunca.
      'no-restricted-syntax': ['error', ...SEM_VALOR_SOLTO],
    },
  },
  {
    // Dentro da biblioteca a régua é mais curta: nem px solto passa.
    // `overlay/` fica fora porque a gaveta precisa de limite de viewport
    // (max-w-[300px], env(safe-area-inset-bottom)), e `efeitos/` porque são
    // componentes de animação de terceiros (21st.dev), não do sistema.
    files: ['design-system/componentes/{forms,display,navigation,nutricao}/**/*.tsx', 'design-system/vitrine/**/*.tsx'],
    rules: {
      'no-restricted-syntax': ['error', ...SEM_VALOR_SOLTO, ...SEM_PX_SOLTO],
    },
  },
  {
    // A fronteira da biblioteca. Quem está fora entra pelo alias, não por caminho
    // relativo: assim o import diz, na própria linha, que aquilo é do design system.
    files: ['src/**/*.{ts,tsx}', 'e2e/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/design-system/**', '../../design-system/*', '../design-system/*'],
              message: "Importe a biblioteca pelo alias: '@ds/...' (ou '@ds' para o barril em design-system/index.ts).",
            },
          ],
        },
      ],
    },
  },
  {
    // componentes shadcn exportam variantes junto com o componente (padrão da biblioteca)
    files: ['design-system/componentes/**/*.tsx'],
    rules: { 'react-refresh/only-export-components': 'off' },
  },
  {
    files: ['**/*.test.{ts,tsx}'],
    rules: { 'no-restricted-syntax': 'off' },
  },
  {
    // Config de build roda em Node e não alcança o CSS: o manifest do PWA precisa
    // do hexadecimal escrito. As duas constantes de cor lá dizem qual token espelham.
    files: ['vite.config.ts', 'playwright.config.ts', 'vitest.setup.ts'],
    rules: { 'no-restricted-syntax': 'off' },
  },
  {
    files: ['scripts/**/*.mjs', 'eslint.config.js'],
    extends: [js.configs.recommended],
    languageOptions: { ecmaVersion: 2022, globals: globals.node },
    rules: { 'no-restricted-syntax': 'off' },
  },
)
