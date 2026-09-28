import { useQuery } from '@tanstack/react-query'
import { calendarService } from '@/services/calendar.service'
import { qk } from './queryKeys'

export function useCalendar<T = unknown>() {
  return useQuery({ queryKey: qk.calendar, queryFn: () => calendarService.get<T>() })
}
