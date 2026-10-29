import { cn } from '@ds/lib/cn.ts'

/*
 * D-802 e M-018 (spec ajustes-mobile): nos campos, a densidade de computador (`sm:h-10`, `sm:text-sm`) é para o mouse.
 * No toque (`pointer-coarse`, o tablet), a partir de 640 px, o campo volta aos 44 px e à letra de 16 px (abaixo de 16 px
 * o iPad aproxima a tela ao tocar). A volta entra só onde a classe de computador ficou depois do `cn`: quem troca a
 * altura ou a letra no `sm:` (D-312), como o campo do código (CA-978), manda também no toque. Uma classe fixa não
 * serviria: o CSS de `sm:pointer-coarse:` vem depois do `sm:` de quem usa o componente e passaria por cima.
 */
const DE_VOLTA_NO_TOQUE: Readonly<Record<string, string>> = {
  'sm:h-10': 'sm:pointer-coarse:h-11',
  'sm:text-sm': 'sm:pointer-coarse:text-base',
}

/** As classes já juntadas pelo `cn`, mais a volta ao tamanho do toque de cada classe de computador que sobrou. */
export function comToque(classes: string): string {
  const noToque = classes.split(' ').flatMap((c) => DE_VOLTA_NO_TOQUE[c] ?? [])
  return noToque.length > 0 ? cn(classes, noToque) : classes
}
