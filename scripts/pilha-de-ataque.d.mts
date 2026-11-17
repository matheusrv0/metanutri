// Tipos de pilha-de-ataque.mjs, para o teste de src/seguranca importar o script com tipo.

export interface PilhaDeAtaque {
  /** O project_id do Supabase local; o contêiner do banco é supabase_db_<projeto>. */
  readonly projeto: string
  /** A primeira das três portas: banco de sombra (base), API (base + 1) e banco (base + 2). */
  readonly portaBase: number
  /** true quando veio das variáveis de ambiente: a configuração é uma cópia temporária. */
  readonly propria: boolean
  /** A pasta do --workdir, relativa à raiz, sem espaço. */
  readonly pasta: string
  readonly conteinerDoBanco: string
}

export declare const PILHA_PADRAO: PilhaDeAtaque

export declare function pilhaDoAmbiente(env: Readonly<Record<string, string | undefined>>): PilhaDeAtaque

export declare function configDaPilha(textoOriginal: string, alvo: PilhaDeAtaque): string
