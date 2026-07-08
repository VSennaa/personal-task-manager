export function formatDeadline(deadline: string | null, now: Date = new Date()): string | null {
  if (!deadline) return null;

  const diffMs = new Date(deadline).getTime() - now.getTime();
  if (diffMs <= 0) return "atrasada";

  const totalHours = Math.floor(diffMs / (1000 * 60 * 60));
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;

  if (totalHours < 1) return "faltam <1h";
  if (days === 0) return `faltam ${hours}h`;
  return `faltam ${days}d ${hours}h`;
}
