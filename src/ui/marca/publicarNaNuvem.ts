// O "Salvar" de "Sua marca" na nuvem (spec marca-no-link, D-952 e DP-ML-11): sem servidor, nulo, e a tela grava só o
// perfil.
import type { MarcaDoLink } from '@/domain/marca.ts'
import { publicarMarca, type ClienteDaMarca } from '@/domain/marcaNaNuvem.ts'
import { obterSupabase } from '../estado/supabase.ts'

export function publicadorDaMarca(usuarioId: string | null): ((marca: MarcaDoLink) => Promise<string | null>) | null {
  const cliente = obterSupabase()
  if (!cliente) return null
  // O cliente do supabase-js tem mais do que este pedaço; o tipo do domínio só diz o que é usado.
  const daMarca = cliente as unknown as ClienteDaMarca
  return (marca) => publicarMarca(daMarca, marca, usuarioId)
}
