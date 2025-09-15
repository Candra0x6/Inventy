import { DefaultSession, DefaultUser } from "next-auth"
import { JWT } from "next-auth/jwt"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      role: "SUPER_ADMIN" | "MANAGER" | "STAFF" | "BORROWER"
      organizationId?: string
      departmentId?: string
    } & DefaultSession["user"]
  }

  interface User extends DefaultUser {
    role: "SUPER_ADMIN" | "MANAGER" | "STAFF" | "BORROWER"
    organizationId?: string
    departmentId?: string
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role: "SUPER_ADMIN" | "MANAGER" | "STAFF" | "BORROWER"
    organizationId?: string
    departmentId?: string
  }
}
