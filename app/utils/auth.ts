import { PrismaAdapter } from '@auth/prisma-adapter';
import NextAuth from 'next-auth';
import GithubProvider from 'next-auth/providers/github';
import GoogleProvider from 'next-auth/providers/google';
import prisma from './db';

interface CustomSendVerificationRequestParams {
  identifier: string;
  url: string;
  token: string;
}

export const {
  handlers: { GET, POST },
  auth,
} = NextAuth({
  adapter: PrismaAdapter(prisma) as any,
  providers: [
    GithubProvider({
      clientId: process.env.AUTH_GITHUB_ID,
      clientSecret: process.env.AUTH_GITHUB_SECRET,
    }) as any,
    GoogleProvider({
      clientId: process.env.AUTH_GOOGLE_CLIENT_ID,
      clientSecret: process.env.AUTH_GOOGLE_CLIENT_SECRET,
      allowDangerousEmailAccountLinking: true,
    }) as any,
    {
      id: 'resend',
      type: 'email',
      async sendVerificationRequest({
        identifier: email,
        url,
        token, // eslint-disable-line
      }: CustomSendVerificationRequestParams) {
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${process.env.AUTH_EMAIL_SERVER_PASSWORD}`,
          },
          body: JSON.stringify({
            from: process.env.AUTH_EMAIL_FROM,
            to: [email],
            subject: 'Biblioteca 216 - Iniciar sesión ✨',
            html: `<p>Por favor, utilice el siguiente enlace para iniciar sesión:</p><p><a href="${url}">Iniciar sesión</a></p>`,
          }),
        });

        if (!response.ok) {
          const error = await response.text();
          throw new Error(error);
        }
      },
    },
  ],
});
