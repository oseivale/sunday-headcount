import type { Role } from './types'

export const canEnterSundays = (r: Role) => r === 'admin' || r === 'pastor' || r === 'usher'
/** E-transfer totals: only the pastor and admins can enter or change them (also enforced in the database). */
export const canEnterEtransfer = (r: Role) => r === 'admin' || r === 'pastor'
export const canReport = (r: Role) => r === 'admin' || r === 'pastor'
export const isAdmin = (r: Role) => r === 'admin'

export const ROLE_LABEL: Record<Role, string> = {
  admin: 'Admin',
  pastor: 'Pastor',
  usher: 'Usher',
  viewer: 'Viewer',
}
