import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

export const {
  handlers,
  signIn,
  signOut,
  auth,
} = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: {},
        password: {},
      },

      async authorize(credentials) {
        if (
          !credentials?.email ||
          !credentials?.password
        ) {
          return null;
        }

        const response = await fetch(
          "http://localhost:4000/api/auth/login",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              email: credentials.email,
              password: credentials.password,
            }),
          }
        );

        if (!response.ok) {
          return null;
        }

        const result = await response.json();

        if (!result.success || !result.data) {
          return null;
        }

        const role = result.data.role;

        if (
          role !== "admin" &&
          role !== "staff" &&
          role !== "viewer"
        ) {
          return null;
        }

        return {
          id: String(result.data.id),
          name: result.data.name ?? null,
          email: result.data.email ?? null,
          role,
          accessToken: result.data.token,
        };
      },
    }),
  ],

  pages: {
    signIn: "/login",
  },

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.accessToken = user.accessToken;
      }

      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id = String(
          token.sub ?? ""
        );

        session.user.role =
          token.role ?? "viewer";

        session.user.accessToken =
          token.accessToken ?? "";
      }

      return session;
    },
  },

  secret: process.env.AUTH_SECRET,
});