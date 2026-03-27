import { Rol } from '@prisma/client'
import NextAuth, { DefaultSession } from 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      rol: Rol
      planillaId: string | null
      sectorId: string | null
    } & DefaultSession['user']
  }
}
