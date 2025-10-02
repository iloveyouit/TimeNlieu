import NextAuth from 'next-auth';
import { DrizzleAdapter } from '@auth/drizzle-adapter';
import { db } from '@/db';
import Credentials from 'next-auth/providers/credentials';

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db),
  providers: [
    Credentials({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials.email || !credentials.password) {
          return null;
        }

        // Add your own logic here to find the user from the database
        // and verify the password.
        //
        // const user = await db.query.users.findFirst({
        //   where: (users, { eq }) => eq(users.email, credentials.email as string),
        // });
        //
        // if (!user) {
        //   return null;
        // }
        //
        // const isValid = await new Argon2().verify(user.password, credentials.password as string);
        // if (!isValid) {
        //   return null;
        // }
        //
        // return user;

        return null;
      },
    }),
  ],
});
