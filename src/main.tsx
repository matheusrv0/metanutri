import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/archivo/wdth.css'
import '@fontsource-variable/figtree'
import './ui/tema/globals.css'
import { criarRepositorioProdutos, produtoComoAlimento } from './domain/produtos.ts'
import { registrarProdutos } from './domain/tabelas.ts'
import { App } from './App.tsx'
import { ProvedorTema } from './ui/tema/ProvedorTema.tsx'

// Produtos cadastrados pelo rótulo entram na busca desde a primeira tela.
try {
  registrarProdutos(criarRepositorioProdutos(globalThis.localStorage ?? null).listar().map(produtoComoAlimento))
} catch {
  // navegador sem armazenamento: o app segue só com a tabela
}

const raiz = document.getElementById('root')
if (!raiz) throw new Error('Elemento #root não encontrado em index.html')

createRoot(raiz).render(
  <StrictMode>
    <ProvedorTema>
      <App />
    </ProvedorTema>
  </StrictMode>,
)
