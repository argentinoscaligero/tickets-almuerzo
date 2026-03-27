import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/db'
import { Rol } from '@prisma/client'

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: 'jwt', maxAge: 8 * 60 * 60 }, // 8 horas
  pages: {
    signIn: '/login',
    error: '/login',
  },
  providers: [
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Contraseña', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        const usuario = await prisma.usuario.findUnique({
          where: { email: credentials.email as string },
          include: {
            sector: true,
            planilla: true,
          },
        })

        if (!usuario || !usuario.activo) return null

        const passwordValido = await bcrypt.compare(
          credentials.password as string,
          usuario.passwordHash
        )
        if (!passwordValido) return null

        // Actualizar último login
        await prisma.usuario.update({
          where: { id: usuario.id },
          data: { ultimoLoginEn: new Date() },
        })

        return {
          id: usuario.id,
          email: usuario.email,
          name: `${usuario.nombre} ${usuario.apellido}`,
          rol: usuario.rol,
          planillaId: usuario.planillaId,
          sectorId: usuario.sectorId,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.rol = (user as any).rol
        token.planillaId = (user as any).planillaId
        token.sectorId = (user as any).sectorId
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string
        session.user.rol = token.rol as Rol
        session.user.planillaId = token.planillaId as string | null
        session.user.sectorId = token.sectorId as string | null
      }
      return session
    },
  },
})
