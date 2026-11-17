// A lembrança da aba (spec assistente-ia, D-1366 e D-1367): o que a tela do plano precisa reencontrar quando a
// nutricionista sai dele e volta, guardado pelo caso e pelo paciente. Fica só na memória da página: nunca vai ao
// navegador (localStorage) nem à nuvem, e recarregar a página ou sair da conta (que recarrega, D-131) a apaga.

/** Uma lembrança por dono (o caso e o paciente do plano). */
export interface MemoriaDaAba<T> {
  ler(dono: string): T | undefined
  /** `undefined` esquece. */
  gravar(dono: string, valor: T | undefined): void
}

const esquecedores = new Set<() => void>()

/** Registra o que esquecer junto com as lembranças (o estado da espera da IA, por exemplo). */
export function aoEsquecerTudo(esquecer: () => void): void {
  esquecedores.add(esquecer)
}

export function criarMemoriaDaAba<T>(): MemoriaDaAba<T> {
  const guardadas = new Map<string, T>()
  aoEsquecerTudo(() => guardadas.clear())
  return {
    ler: (dono) => guardadas.get(dono),
    gravar: (dono, valor) => {
      if (valor === undefined) guardadas.delete(dono)
      else guardadas.set(dono, valor)
    },
  }
}

/** Apaga todas as lembranças da aba. Os testes chamam entre um caso e outro (vitest.setup.ts). */
export function esquecerTudoDaAba(): void {
  for (const esquecer of esquecedores) esquecer()
}
