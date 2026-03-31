interface CalendarEventDetails {
  title: string
  description: string
  startTime: Date
  endTime: Date
  location: string
}

const formatDateToICS = (date: Date) => {
  return date.toISOString().replace(/-|:|\.\d{3}/g, '')
}

const encodeCalendarUrlComponent = (text: string) => encodeURIComponent(text)

export function generateGoogleCalendarLink(details: CalendarEventDetails): string {
  const { title, description, startTime, endTime, location } = details

  const formattedStartTimeICS = formatDateToICS(startTime)
  const formattedEndTimeICS = formatDateToICS(endTime)

  const encodedTitle = encodeCalendarUrlComponent(title)
  const encodedDescription = encodeCalendarUrlComponent(description)
  const encodedLocation = encodeCalendarUrlComponent(location)

  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodedTitle}&details=${encodedDescription}&dates=${formattedStartTimeICS}/${formattedEndTimeICS}&location=${encodedLocation}&sf=true&output=xml`
}

export function generateOutlookCalendarLink(details: CalendarEventDetails): string {
  const { title, description, startTime, endTime, location } = details

  const formattedStartTimeOutlook = startTime.toISOString().replace(/\.\d{3}/, '') // Remove milliseconds
  const formattedEndTimeOutlook = endTime.toISOString().replace(/\.\d{3}/, '') // Remove milliseconds

  const encodedTitle = encodeCalendarUrlComponent(title)
  const encodedDescription = encodeCalendarUrlComponent(description)
  const encodedLocation = encodeCalendarUrlComponent(location)

  return `https://outlook.live.com/owa/?path=/calendar/action/compose&rfr=0&rpar=1&startdt=${formattedStartTimeOutlook}&enddt=${formattedEndTimeOutlook}&subject=${encodedTitle}&body=${encodedDescription}&location=${encodedLocation}`
}
