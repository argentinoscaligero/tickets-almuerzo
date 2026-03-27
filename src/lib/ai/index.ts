import { AIProvider, AnalisisConfig, DictamenTicket } from './types'

// Factory: devuelve el proveedor configurado
export async function getAIProvider(): Promise<AIProvider> {
  const proveedor = process.env.AI_PROVIDER?.toLowerCase() || 'claude'

  switch (proveedor) {
    case 'openai': {
      const { OpenAIProvider } = await import('./providers/openai')
      return new OpenAIProvider()
    }
    case 'deepseek': {
      const { DeepSeekProvider } = await import('./providers/deepseek')
      return new DeepSeekProvider()
    }
    case 'gemini': {
      const { GeminiProvider } = await import('./providers/gemini')
      return new GeminiProvider()
    }
    case 'ollama': {
      const { OllamaProvider } = await import('./providers/ollama')
      return new OllamaProvider()
    }
    case 'claude':
    default: {
      const { ClaudeProvider } = await import('./providers/claude')
      return new ClaudeProvider()
    }
  }
}

export async function analizarTicketConIA(
  imagenBase64: string,
  mimeType: string,
  config: AnalisisConfig
): Promise<DictamenTicket> {
  const provider = await getAIProvider()
  return provider.analizarTicket(imagenBase64, mimeType, config)
}

export type { DictamenTicket, AnalisisConfig }
