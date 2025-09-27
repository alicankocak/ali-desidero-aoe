import type { NextAuthOptions } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcrypt";
import { prisma } from "@/lib/prisma";

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "E-posta", type: "text" },
        password: { label: "Şifre", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
          include: { roles: { include: { role: true } } },
        });
        if (!user || !user.passwordHash) return null;

        const ok = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!ok) return null;

        return {
          id: user.id,
          name: user.name ?? user.email,
          email: user.email,
          image: user.avatarUrl ?? undefined,
        } as any;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user?.id) {
        token.userId = (user as any).id;
        const roles = await prisma.userRole.findMany({
          where: { userId: token.userId as string },
          include: { role: true },
        });
        token.roles = roles.map((r) => r.role.name);
      }
      return token;
    },
    async session({ session, token }) {
      (session.user as any) = {
        ...(session.user || {}),
        id: token.userId as string,
        roles: (token.roles as string[]) ?? [],
      };
      return session;
    },
  },
  pages: { signIn: "/login" },
};
