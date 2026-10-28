import { longDate, shortDate } from './dates'
import { cad, offTot, tot } from './stats'
import type { Service } from './types'

/** The Sunday summary, in the same format the ushers already send on WhatsApp. */
export function sundayMessage(s: Service) {
  return `${longDate(s.service_date)}

Attendance
Men: ${s.men}
Women: ${s.women}
Children: ${s.children}

Total Attendance: ${tot(s)}

Offerings
1st Offering: ${cad(s.offering_1)}
2nd Offering (Project): ${cad(s.offering_2)}

Total Offering: ${cad(offTot(s))}`
}

export function sundaySubject(s: Service, updated: boolean) {
  return `${updated ? 'Updated: ' : ''}Sunday attendance, ${shortDate(s.service_date)}, ${s.service_date.slice(0, 4)}: ${tot(s)} people, ${cad(offTot(s))}`
}
