import { UserRole } from '@prisma/client'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { hasPermission, Permission, canManageUser } from '@/types/user'
import { redirect } from "next/navigation"

/**
 * Server-side authentication and authorization helpers
 */

// Get current user session on server
export async function getCurrentUser() {
  const session = await getServerSession(authOptions)
  return session?.user || null
}

// Check if user is authenticated
export async function requireAuth() {
  const user = await getCurrentUser()
  if (!user) {
    redirect("/auth/login")
  }
  return user
}

// Check if user has specific role
export async function requireRole(requiredRole: UserRole) {
  const user = await requireAuth()
  if (user.role !== requiredRole) {
    redirect("/unauthorized")
  }
  return user
}

// Check if user has any of the specified roles
export async function requireAnyRole(requiredRoles: UserRole[]) {
  const user = await requireAuth()
  if (!requiredRoles.includes(user.role)) {
    redirect("/unauthorized")
  }
  return user
}

// Check if user has specific permission
export async function requirePermission(permission: Permission) {
  const user = await requireAuth()
  if (!hasPermission(user.role, permission)) {
    redirect("/unauthorized")
  }
  return user
}

// Check if user can manage another user (role hierarchy)
export async function requireUserManagement(targetUserId: string) {
  const currentUser = await requireAuth()
  
  const targetUser = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: { role: true },
  })
  
  if (!targetUser) {
    throw new Error('Target user not found')
  }
  
  if (!canManageUser(currentUser.role, targetUser.role)) {
    redirect("/unauthorized")
  }
  
  return { currentUser, targetUser }
}

// Check if user belongs to the same organization (simplified for single-tenant)
export async function requireSameOrganization(targetUserId: string) {
  const currentUser = await requireAuth()
  
  const targetUser = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: { id: true },
  })
  
  if (!targetUser) {
    throw new Error('Target user not found')
  }
  
  // In single-tenant mode, all users belong to the same organization
  return { currentUser, targetUser }
}

// Validate organization access (simplified for single-tenant)
export async function requireOrganizationAccess(organizationId: string) {
  const user = await requireAuth()
  
  // In single-tenant mode, all users have access
  return user
}

// Client-side role checking hooks (for React components)
export function useRoleCheck() {
  return {
    hasRole: (userRole: UserRole, requiredRole: UserRole) => userRole === requiredRole,
    hasAnyRole: (userRole: UserRole, requiredRoles: UserRole[]) => requiredRoles.includes(userRole),
    hasPermission: (userRole: UserRole, permission: Permission) => hasPermission(userRole, permission),
    canManageUser: (managerRole: UserRole, targetRole: UserRole) => canManageUser(managerRole, targetRole),
  }
}

// Common role-based UI helper
export function withRoleAccess<T>(
  userRole: UserRole,
  requiredRoles: UserRole[],
  component: T,
  fallback: T | null = null
): T | null {
  return requiredRoles.includes(userRole) ? component : fallback
}

// Navigation helper for role-based menu items
export function getNavigationItems(userRole: UserRole) {
  const baseItems = [
    { label: 'Dashboard', href: '/dashboard', roles: ['SUPER_ADMIN', 'MANAGER', 'STAFF', 'BORROWER'] },
    { label: 'Items', href: '/items', roles: ['SUPER_ADMIN', 'MANAGER', 'STAFF', 'BORROWER'] },
    { label: 'My Reservations', href: '/reservations', roles: ['SUPER_ADMIN', 'MANAGER', 'STAFF', 'BORROWER'] },
    { label: 'Profile', href: '/profile', roles: ['SUPER_ADMIN', 'MANAGER', 'STAFF', 'BORROWER'] },
  ]

  const adminItems = [
    { label: 'User Management', href: '/users', roles: ['SUPER_ADMIN', 'MANAGER'] },
    { label: 'Analytics', href: '/analytics', roles: ['SUPER_ADMIN', 'MANAGER'] },
    { label: 'Departments', href: '/departments', roles: ['SUPER_ADMIN', 'MANAGER'] },
  ]

  const superAdminItems = [
    { label: 'Organizations', href: '/organizations', roles: ['SUPER_ADMIN'] },
    { label: 'Audit Logs', href: '/audit', roles: ['SUPER_ADMIN'] },
  ]

  const allItems = [...baseItems, ...adminItems, ...superAdminItems]
  
  return allItems.filter(item => (item.roles as UserRole[]).includes(userRole))
}

// Legacy helpers for backward compatibility
export function hasRolePermission(userRole: string, requiredRoles: string[]) {
  return requiredRoles.includes(userRole)
}

export function isAdmin(userRole: string) {
  return ["SUPER_ADMIN", "MANAGER"].includes(userRole)
}

export function canManageItems(userRole: string) {
  return ["SUPER_ADMIN", "MANAGER", "STAFF"].includes(userRole)
}
