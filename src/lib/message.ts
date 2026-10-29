import { longDate, shortDate } from './dates'
import { cad, offTot, offTotUsd, receivedTot, receivedTotUsd, tot, usd } from './stats'
import type { Service } from './types'

/** "CAD $30", or "CAD $30 + USD $10" when some of it came in US dollars. */
const both = (c: number, u: number) => (u > 0 ? `${cad(c)} + ${usd(u)}` : cad(c))

/** The Sunday summary, in the same format the ushers already send. USD, new members, special offering, tithe and pledge appear only when not zero. */
export function sundayMessage(s: Service) {
  const lines = [
    longDate(s.service_date),
    '',
    'Attendance',
    `Men: ${s.men}`,
    `Women: ${s.women}`,
    `Children: ${s.children}`,
    '',
    `Total Attendance: ${tot(s)}`,
  ]
  if (s.new_members > 0) lines.push(`New Members: ${s.new_members}`)
  const hasSpecial = s.offering_special > 0 || s.offering_special_usd > 0
  const hasTithe = s.tithe > 0 || s.tithe_usd > 0
  const hasPledge = s.pledge > 0 || s.pledge_usd > 0
  lines.push(
    '',
    'Offerings',
    `1st Offering: ${both(s.offering_1, s.offering_1_usd)}`,
    `2nd Offering (Project): ${both(s.offering_2, s.offering_2_usd)}`,
  )
  if (hasSpecial) lines.push(`Special Offering${s.offering_special_note ? ` (${s.offering_special_note})` : ''}: ${both(s.offering_special, s.offering_special_usd)}`)
  lines.push('', `Total Offering: ${both(offTot(s), offTotUsd(s))}`)
  if (hasTithe || hasPledge) {
    lines.push('')
    if (hasTithe) lines.push(`Tithe: ${both(s.tithe, s.tithe_usd)}`)
    if (hasPledge) lines.push(`Pledge: ${both(s.pledge, s.pledge_usd)}`)
    lines.push('', `Grand Total: ${both(receivedTot(s), receivedTotUsd(s))}`)
  }
  return lines.join('\n')
}

export function sundaySubject(s: Service, updated: boolean) {
  return `${updated ? '[Updated] ' : ''}Sunday Headcount: Rehoboth Temple Sunday Attendance, ${shortDate(s.service_date)}, ${s.service_date.slice(0, 4)}: ${tot(s)} people, ${both(receivedTot(s), receivedTotUsd(s))}`
}
