import '@testing-library/jest-dom/vitest'
import { prepararBaseAmpliadaParaTeste } from './src/ui/estado/baseAmpliada.ts'
import { prepararCatalogoParaTeste } from './src/ui/estado/catalogoOff.ts'
import { esquecerTudoDaAba } from './src/ui/estado/memoriaDaAba.ts'

// Spec base-ampliada: nos testes, a base ampliada não é pedida sozinha; o teste que precisa dela a registra.
prepararBaseAmpliadaParaTeste({ automatico: false })
// Spec base-ampliada, fase 2: o catálogo de rótulos também não é pedido nos testes de tela; quem precisa o prepara.
prepararCatalogoParaTeste({ automatico: false })
// Spec assistente-ia, D-1366: a lembrança da aba (a espera da IA, a gaveta e o "Desfazer") não passa de um teste a outro.
afterEach(() => esquecerTudoDaAba())
