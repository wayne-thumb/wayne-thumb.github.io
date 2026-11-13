// The anniversary as a calendar entry, in the two forms a phone can take without saving a file first:
// a Google Calendar link with the event filled in, and an .ics file to be opened as a link
// (the build writes it to assets/anniversary.ics; Safari on an iPhone shows "add to calendar" for it).
// No DOM here, so the build script can use it too.
const compact = (date) => date.replace(/-/g, '');
const dayAfter = (date) => {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day + 1)).toISOString().slice(0, 10);
};
const title = (data) => `${data.groom.name} · ${data.bride.name} 결혼기념일`;
const note = '두 사람이 부부가 되는 날입니다. 별도의 결혼식은 진행하지 않습니다.';

// An all-day event runs from the date up to, but not including, the next day.
export function googleCalendarUrl(data) {
  const query = new URLSearchParams({
    action: 'TEMPLATE',
    text: title(data),
    dates: `${compact(data.date)}/${compact(dayAfter(data.date))}`,
    details: note
  });
  return `https://calendar.google.com/calendar/render?${query}`;
}

// RFC 5545: all-day event, exclusive end date, UTF-8 lines folded at 75 octets.
const escape = (value) => value.replace(/\\/g, '\\\\').replace(/\r?\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
function fold(line) {
  let folded = '', bytes = 0;
  for (const character of line) {
    const size = new TextEncoder().encode(character).length;
    if (bytes + size > 75) { folded += '\r\n '; bytes = 1; }
    folded += character;
    bytes += size;
  }
  return folded;
}
export function icsText(data) {
  const lines = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Wedding Announcement//KO',
    'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', 'BEGIN:VEVENT',
    // The same id every time, so adding it twice updates the entry instead of doubling it.
    `UID:${data.date}-${encodeURIComponent(`${data.groom.name} · ${data.bride.name}`)}@wedding-announcement`,
    // Fixed rather than "now", so the published file only changes when the event does.
    `DTSTAMP:${compact(data.date)}T000000Z`,
    `DTSTART;VALUE=DATE:${compact(data.date)}`,
    `DTEND;VALUE=DATE:${compact(dayAfter(data.date))}`,
    `SUMMARY:${escape(title(data))}`,
    `DESCRIPTION:${escape(note)}`,
    'TRANSP:TRANSPARENT', 'END:VEVENT', 'END:VCALENDAR'
  ];
  return `${lines.map(fold).join('\r\n')}\r\n`;
}
