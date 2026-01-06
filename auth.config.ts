import type { NextAuthConfig } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { getUserByEmail, verifyPassword } from './lib/models/User';

export const authConfig: NextAuthConfig = {
    pages: {
        signIn: '/login',
    },
    callbacks: {
        authorized({ auth, request: { nextUrl } }) {
            const isLoggedIn = !!auth?.user;
            const isOnDashboard = nextUrl.pathname.startsWith('/') && nextUrl.pathname !== '/login' && nextUrl.pathname !== '/signup';

            if (isOnDashboard) {
                if (isLoggedIn) return true;
                return false; // Redirect unauthenticated users to login page
            } else if (isLoggedIn) {
                return Response.redirect(new URL('/', nextUrl));
            }
            return true;
        },
        async jwt({ token, user }) {
            if (user) {
                token.id = user.id;
                token.role = user.role;
                token.status = user.status;
            }
            return token;
        },
        async session({ session, token }) {
            if (token && session.user) {
                session.user.id = token.id as string;
                session.user.role = token.role as 'fund_manager' | 'cfo';
                session.user.status = token.status as 'pending' | 'active' | 'rejected';
            }
            return session;
        },
    },
    providers: [
        Credentials({
            async authorize(credentials) {
                const { email, password } = credentials as { email: string; password: string };

                if (!email || !password) {
                    return null;
                }

                const user = await getUserByEmail(email);
                if (!user) {
                    return null;
                }

                const isValid = await verifyPassword(password, user.password);
                if (!isValid) {
                    return null;
                }

                return {
                    id: user._id!.toString(),
                    email: user.email,
                    name: user.name,
                    role: user.role,
                    status: user.status || 'pending',
                };
            },
        }),
    ],
};
