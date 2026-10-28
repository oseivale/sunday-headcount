import type { Role } from './types'

export const canEnterSundays = (r: Role) => r === 'admin' || r === 'pastor' || r === 'usher'
export const canReport = (r: Role) => r === 'admin' || r === 'pastor'
export const isAdmin = (r: Role) => r === 'admin'

export const ROLE_LABEL: Record<Role, string> = {
  admin: 'Admin',
  pastor: 'Pastor',
  usher: 'Usher',
  viewer: 'Viewer',
}
