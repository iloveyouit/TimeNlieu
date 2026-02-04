import { DrizzleAdapter } from '@auth/drizzle-adapter';
import { db } from '@/db';
import Credentials from 'next-auth/providers/credentials';
import type { NextAuthOptions } from 'next-auth';

export const authOptions: NextAuthOptions = {
  adapter: DrizzleAdapter(db),
  providers: [
    Credentials({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials) return null;
        if (credentials.email === "test@example.com" && credentials.password === "password") {
          return {
            id: "1",
            name: "Test User",
            email: "test@example.com",
            image: "https://github.com/shadcn.png",
          };
        }
        return null;
      },
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: 'jwt',
  },
  pages: {
    signIn: '/',
  },
};
