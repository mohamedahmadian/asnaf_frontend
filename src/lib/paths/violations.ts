export function violationsPath() {
  return '/inspection/violations'
}

export function violationCreatePath() {
  return '/inspection/violations/new'
}

export function violationPath(id: string) {
  return `/inspection/violations/${id}`
}

export function violationEditPath(id: string) {
  return `/inspection/violations/${id}/edit`
}

export function violationProceedingsPath(violationId: string) {
  return `/inspection/violations/${violationId}/proceedings`
}

export function violationProceedingCreatePath(violationId: string) {
  return `/inspection/violations/${violationId}/proceedings/new`
}

export function violationProceedingPath(violationId: string, id: string) {
  return `/inspection/violations/${violationId}/proceedings/${id}`
}

export function violationProceedingEditPath(violationId: string, id: string) {
  return `/inspection/violations/${violationId}/proceedings/${id}/edit`
}

export function violationReportsPath() {
  return '/inspection/violations/reports'
}
