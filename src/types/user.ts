import { UserRole, User, Organization, Department } from "@prisma/client"

export type UserWithDetails = User & {
  organization?: Organization | null
  department?: Department | null
}

export interface UserProfile {
  id: string
  email: string
  name: string | null
  avatar: string | null
  image: string | null
  role: UserRole
  trustScore: number
  isActive: boolean
  organizationId: string | null
  departmentId: string | null
  createdAt: Date
  updatedAt: Date
  organization?: {
    id: string
    name: string
    description: string | null
  } | null
  department?: {
    id: string
    name: string
    description: string | null
  } | null
}

export interface UserProfileUpdate {
  name?: string
  avatar?: string
  departmentId?: string
}

export interface AdminUserUpdate extends UserProfileUpdate {
  role?: UserRole
  isActive?: boolean
  organizationId?: string
}

// Role-based permissions
export const USER_PERMISSIONS = {
  SUPER_ADMIN: [
    'users:read',
    'users:write',
    'users:delete',
    'items:read',
    'items:write', 
    'items:delete',
    'reservations:read',
    'reservations:write',
    'reservations:approve',
    'reservations:delete',
    'organizations:read',
    'organizations:write',
    'organizations:delete',
    'departments:read',
    'departments:write',
    'departments:delete',
    'analytics:read',
    'audit:read',
  ],
  MANAGER: [
    'users:read',
    'users:write',
    'items:read',
    'items:write',
    'items:delete',
    'reservations:read',
    'reservations:write',
    'reservations:approve',
    'departments:read',
    'departments:write',
    'analytics:read',
  ],
  STAFF: [
    'users:read',
    'items:read',
    'items:write',
    'reservations:read',
    'reservations:write',
    'reservations:approve',
  ],
  BORROWER: [
    'items:read',
    'reservations:read',
    'reservations:write',
  ],
} as const

export type Permission = 
  | 'users:read' | 'users:write' | 'users:delete'
  | 'items:read' | 'items:write' | 'items:delete'
  | 'reservations:read' | 'reservations:write' | 'reservations:approve' | 'reservations:delete'
  | 'organizations:read' | 'organizations:write' | 'organizations:delete'
  | 'departments:read' | 'departments:write' | 'departments:delete'
  | 'analytics:read' | 'audit:read'

export function hasPermission(userRole: UserRole, permission: Permission): boolean {
  return (USER_PERMISSIONS[userRole] as readonly Permission[]).includes(permission)
}

export function hasAnyPermission(userRole: UserRole, permissions: Permission[]): boolean {
  return permissions.some(permission => hasPermission(userRole, permission))
}

export function hasAllPermissions(userRole: UserRole, permissions: Permission[]): boolean {
  return permissions.every(permission => hasPermission(userRole, permission))
}

// Role hierarchy helpers
export function canManageUser(managerRole: UserRole, targetUserRole: UserRole): boolean {
  const roleHierarchy = {
    SUPER_ADMIN: 4,
    MANAGER: 3,
    STAFF: 2,
    BORROWER: 1,
  }
  
  return roleHierarchy[managerRole] > roleHierarchy[targetUserRole]
}

export function getRoleDisplayName(role: UserRole): string {
  const roleNames = {
    SUPER_ADMIN: 'Super Admin',
    MANAGER: 'Manager',
    STAFF: 'Staff',
    BORROWER: 'Borrower',
  }
  
  return roleNames[role]
}

export function getTrustScoreColor(score: number): string {
  if (score >= 90) return 'text-green-600'
  if (score >= 70) return 'text-yellow-600'
  if (score >= 50) return 'text-orange-600'
  return 'text-red-600'
}

export function getTrustScoreLabel(score: number): string {
  if (score >= 90) return 'Excellent'
  if (score >= 70) return 'Good'
  if (score >= 50) return 'Fair'
  return 'Poor'
}
