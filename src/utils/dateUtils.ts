export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString()
}