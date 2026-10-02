export type UserRole = 'ADMIN' | 'BONDE'
export type UserStatus = 'pending' | 'approved'

export interface AppUser {
  displayName?: string
  photoURL?: string
  lastLogin: number
  roles: UserRole[]
  status: UserStatus
}

export interface AppUserMedId extends AppUser {
  id: string
}
