/** O endereço que o paciente recebe. Funciona com o app em subpasta (GitHub Pages). */
export function enderecoDoPaciente(token: string): string {
  const { origin, pathname } = globalThis.location
  return `${origin}${pathname}#/missoes/${token}`
}
