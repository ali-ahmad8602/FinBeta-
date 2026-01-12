import NextAuth, { DefaultSession } from "next-auth"

declare module "next-auth" {
    /**
     * Returned by `useSession`, `getSession` and received as a prop on the `SessionProvider` React Context
     */
    interface Session {
        user: {
            /** The user's role. */
            role: 'fund_manager' | 'cro';
            status: 'pending' | 'active' | 'rejected';
            id: string;
        } & DefaultSession["user"]
    }

    interface User {
        role: 'fund_manager' | 'cro';
        status: 'pending' | 'active' | 'rejected';
    }
}

declare module "next-auth/jwt" {
    interface JWT {
        role: 'fund_manager' | 'cro';
        status: 'pending' | 'active' | 'rejected';
        id: string;
    }
}
