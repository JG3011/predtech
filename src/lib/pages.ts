// Screen (aba) paths and their display labels, shared by the sidebar and
// the Histórico de Entradas table.

export const PAGE_LABELS: Record<string, string> = {
  '/': 'Dashboard',
  '/falhas': 'Histórico de Falhas',
  '/leituras': 'Histórico de Leituras',
  '/manutencao': 'Previsão de Manutenção',
  '/manutencoes': 'Histórico de Manutenções',
  '/range': 'Range',
  '/acessos': 'Histórico de Entradas',
}

export function pageLabel(path: string | null | undefined) {
  if (!path) return '—'
  return PAGE_LABELS[path] ?? path
}
