const DAY_MS = 24 * 60 * 60 * 1000;

// Dates are shown in the library's time zone, whatever the zone of the server or the browser.
const day = new Intl.DateTimeFormat("es-PE", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "America/Lima",
});

export const formatDay = (date: Date) => day.format(date);

/** Whole days past the due date, or null while the loan is not overdue. */
export function daysOverdue(dueDate: Date | null, now: Date) {
  if (dueDate === null || dueDate.getTime() >= now.getTime()) return null;
  return Math.floor((now.getTime() - dueDate.getTime()) / DAY_MS);
}

export const overdueCountLabel = (count: number) =>
  count === 1 ? "1 vencido" : `${count} vencidos`;

export function overdueLabel(days: number) {
  if (days === 0) return "Vencido hoy";
  return days === 1 ? "Vencido hace 1 día" : `Vencido hace ${days} días`;
}

/** Adds the due date while the loan is current. It adds the overdue label after the due date. */
export function dueSuffix(dueDate: Date, now: Date) {
  const late = daysOverdue(dueDate, now);
  return late === null
    ? ` hasta el ${formatDay(dueDate)}`
    : `, ${overdueLabel(late).toLowerCase()}`;
}
