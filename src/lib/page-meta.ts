function commercialComplexesPageMeta(pathname: string): {
  titleKey: string
  subtitleKey?: string
} | null {
  if (!pathname.startsWith('/base-info/commercial-complexes')) {
    return null
  }
  if (pathname.includes('/units')) {
    if (pathname.endsWith('/new')) {
      return { titleKey: 'commercialUnits.create', subtitleKey: 'commercialUnits.createSubtitle' }
    }
    if (pathname.endsWith('/edit')) {
      return { titleKey: 'commercialUnits.edit', subtitleKey: 'commercialUnits.editSubtitle' }
    }
    if (/\/units\/[^/]+/.test(pathname)) {
      return { titleKey: 'commercialUnits.details', subtitleKey: 'commercialUnits.detailsSubtitle' }
    }
    return { titleKey: 'commercialUnits.title', subtitleKey: 'commercialUnits.subtitle' }
  }
  if (pathname.includes('/lanes')) {
    if (pathname.endsWith('/new')) {
      return { titleKey: 'commercialLanes.create', subtitleKey: 'commercialLanes.createSubtitle' }
    }
    if (pathname.endsWith('/edit')) {
      return { titleKey: 'commercialLanes.edit', subtitleKey: 'commercialLanes.editSubtitle' }
    }
    if (/\/lanes\/[^/]+/.test(pathname)) {
      return { titleKey: 'commercialLanes.details', subtitleKey: 'commercialLanes.detailsSubtitle' }
    }
    return { titleKey: 'commercialLanes.title', subtitleKey: 'commercialLanes.subtitle' }
  }
  if (pathname.includes('/floors')) {
    if (pathname.endsWith('/new')) {
      return { titleKey: 'commercialFloors.create', subtitleKey: 'commercialFloors.createSubtitle' }
    }
    if (pathname.endsWith('/edit')) {
      return { titleKey: 'commercialFloors.edit', subtitleKey: 'commercialFloors.editSubtitle' }
    }
    if (/\/floors\/[^/]+/.test(pathname)) {
      return { titleKey: 'commercialFloors.details', subtitleKey: 'commercialFloors.detailsSubtitle' }
    }
    return { titleKey: 'commercialFloors.title', subtitleKey: 'commercialFloors.subtitle' }
  }
  if (pathname === '/base-info/commercial-complexes/new') {
    return { titleKey: 'commercialComplexes.create', subtitleKey: 'commercialComplexes.createSubtitle' }
  }
  if (pathname.endsWith('/edit')) {
    return { titleKey: 'commercialComplexes.edit', subtitleKey: 'commercialComplexes.editSubtitle' }
  }
  if (pathname.startsWith('/base-info/commercial-complexes/')) {
    return { titleKey: 'commercialComplexes.details', subtitleKey: 'commercialComplexes.detailsSubtitle' }
  }
  return { titleKey: 'menus.commercialComplexes', subtitleKey: 'commercialComplexes.subtitle' }
}

function jobGroupsPageMeta(pathname: string): {
  titleKey: string
  subtitleKey?: string
} | null {
  if (!pathname.startsWith('/base-info/job-groups')) {
    return null
  }
  if (pathname.includes('/jobs')) {
    if (pathname.endsWith('/new')) {
      return { titleKey: 'jobs.create', subtitleKey: 'jobs.createSubtitle' }
    }
    if (pathname.endsWith('/edit')) {
      return { titleKey: 'jobs.edit', subtitleKey: 'jobs.editSubtitle' }
    }
    if (/\/jobs\/[^/]+/.test(pathname)) {
      return { titleKey: 'jobs.details', subtitleKey: 'jobs.detailsSubtitle' }
    }
    return { titleKey: 'jobs.title', subtitleKey: 'jobs.subtitle' }
  }
  if (pathname === '/base-info/job-groups/new') {
    return { titleKey: 'jobGroups.create', subtitleKey: 'jobGroups.createSubtitle' }
  }
  if (pathname.endsWith('/edit')) {
    return { titleKey: 'jobGroups.edit', subtitleKey: 'jobGroups.editSubtitle' }
  }
  if (pathname.startsWith('/base-info/job-groups/')) {
    return { titleKey: 'jobGroups.details', subtitleKey: 'jobGroups.detailsSubtitle' }
  }
  return { titleKey: 'menus.jobGroups', subtitleKey: 'jobGroups.subtitle' }
}

function jobsPageMeta(pathname: string): {
  titleKey: string
  subtitleKey?: string
} | null {
  if (!pathname.startsWith('/base-info/jobs')) {
    return null
  }
  if (pathname === '/base-info/jobs/new') {
    return { titleKey: 'jobCatalog.create', subtitleKey: 'jobCatalog.createSubtitle' }
  }
  if (pathname.endsWith('/edit')) {
    return { titleKey: 'jobCatalog.edit', subtitleKey: 'jobCatalog.editSubtitle' }
  }
  if (pathname.startsWith('/base-info/jobs/')) {
    return { titleKey: 'jobCatalog.details', subtitleKey: 'jobCatalog.detailsSubtitle' }
  }
  return { titleKey: 'menus.jobs', subtitleKey: 'jobCatalog.subtitle' }
}

export function getPageMeta(pathname: string): {
  titleKey: string
  subtitleKey?: string
} {
  if (pathname.startsWith('/settings/password')) {
    return {
      titleKey: 'auth.changePassword',
      subtitleKey: 'auth.changePasswordSubtitle',
    }
  }
  if (pathname.includes('/location/history')) {
    return { titleKey: 'location.history', subtitleKey: 'location.historySubtitle' }
  }
  if (pathname.includes('/location')) {
    return { titleKey: 'location.register', subtitleKey: 'location.registerSubtitle' }
  }
  if (pathname.startsWith('/account')) {
    return { titleKey: 'account.title', subtitleKey: 'account.subtitle' }
  }
  if (pathname.startsWith('/settings')) {
    return { titleKey: 'settings.title', subtitleKey: 'settings.subtitle' }
  }
  if (pathname === '/users/new') {
    return { titleKey: 'users.create', subtitleKey: 'users.createSubtitle' }
  }
  if (pathname.endsWith('/edit') && pathname.startsWith('/users/')) {
    return { titleKey: 'users.edit', subtitleKey: 'users.editSubtitle' }
  }
  if (pathname.startsWith('/users/')) {
    return { titleKey: 'users.details', subtitleKey: 'users.detailsSubtitle' }
  }
  if (pathname.startsWith('/users')) {
    return { titleKey: 'users.title', subtitleKey: 'users.subtitle' }
  }
  if (pathname === '/base-info/countries/new') {
    return { titleKey: 'countries.create', subtitleKey: 'countries.createSubtitle' }
  }
  if (pathname.endsWith('/edit') && pathname.startsWith('/base-info/countries/')) {
    return { titleKey: 'countries.edit', subtitleKey: 'countries.editSubtitle' }
  }
  if (pathname.startsWith('/base-info/countries/')) {
    return { titleKey: 'countries.details', subtitleKey: 'countries.detailsSubtitle' }
  }
  if (pathname.startsWith('/base-info/countries')) {
    return { titleKey: 'menus.countries', subtitleKey: 'countries.subtitle' }
  }
  if (pathname === '/base-info/provinces/new') {
    return { titleKey: 'provinces.create', subtitleKey: 'provinces.createSubtitle' }
  }
  if (pathname.endsWith('/edit') && pathname.startsWith('/base-info/provinces/')) {
    return { titleKey: 'provinces.edit', subtitleKey: 'provinces.editSubtitle' }
  }
  if (pathname.startsWith('/base-info/provinces/')) {
    return { titleKey: 'provinces.details', subtitleKey: 'provinces.detailsSubtitle' }
  }
  if (pathname.startsWith('/base-info/provinces')) {
    return { titleKey: 'menus.provinces', subtitleKey: 'provinces.subtitle' }
  }
  if (pathname === '/base-info/cities/new') {
    return { titleKey: 'cities.create', subtitleKey: 'cities.createSubtitle' }
  }
  if (pathname.endsWith('/edit') && pathname.startsWith('/base-info/cities/')) {
    return { titleKey: 'cities.edit', subtitleKey: 'cities.editSubtitle' }
  }
  if (pathname.startsWith('/base-info/cities/')) {
    return { titleKey: 'cities.details', subtitleKey: 'cities.detailsSubtitle' }
  }
  if (pathname.startsWith('/base-info/cities')) {
    return { titleKey: 'menus.cities', subtitleKey: 'cities.subtitle' }
  }
  const commercialMeta = commercialComplexesPageMeta(pathname)
  if (commercialMeta) {
    return commercialMeta
  }
  if (pathname === '/base-info/bank-accounts/new') {
    return { titleKey: 'bankAccounts.create', subtitleKey: 'bankAccounts.createSubtitle' }
  }
  if (pathname.endsWith('/edit') && pathname.startsWith('/base-info/bank-accounts/')) {
    return { titleKey: 'bankAccounts.edit', subtitleKey: 'bankAccounts.editSubtitle' }
  }
  if (pathname.startsWith('/base-info/bank-accounts/')) {
    return { titleKey: 'bankAccounts.details', subtitleKey: 'bankAccounts.detailsSubtitle' }
  }
  if (pathname.startsWith('/base-info/bank-accounts')) {
    return { titleKey: 'menus.bankAccounts', subtitleKey: 'bankAccounts.subtitle' }
  }
  if (pathname === '/base-info/discounts/new') {
    return { titleKey: 'discounts.create', subtitleKey: 'discounts.createSubtitle' }
  }
  if (pathname.endsWith('/edit') && pathname.startsWith('/base-info/discounts/')) {
    return { titleKey: 'discounts.edit', subtitleKey: 'discounts.editSubtitle' }
  }
  if (pathname.startsWith('/base-info/discounts/')) {
    return { titleKey: 'discounts.details', subtitleKey: 'discounts.detailsSubtitle' }
  }
  if (pathname.startsWith('/base-info/discounts')) {
    return { titleKey: 'menus.discounts', subtitleKey: 'discounts.subtitle' }
  }
  if (pathname === '/base-info/municipal-fees/new') {
    return { titleKey: 'municipalFees.create', subtitleKey: 'municipalFees.createSubtitle' }
  }
  if (pathname.endsWith('/edit') && pathname.startsWith('/base-info/municipal-fees/')) {
    return { titleKey: 'municipalFees.edit', subtitleKey: 'municipalFees.editSubtitle' }
  }
  if (pathname.startsWith('/base-info/municipal-fees/')) {
    return { titleKey: 'municipalFees.details', subtitleKey: 'municipalFees.detailsSubtitle' }
  }
  if (pathname.startsWith('/base-info/municipal-fees')) {
    return { titleKey: 'menus.municipalFees', subtitleKey: 'municipalFees.subtitle' }
  }
  if (pathname === '/base-info/job-types/new') {
    return { titleKey: 'jobTypes.create', subtitleKey: 'jobTypes.createSubtitle' }
  }
  if (pathname.endsWith('/edit') && pathname.startsWith('/base-info/job-types/')) {
    return { titleKey: 'jobTypes.edit', subtitleKey: 'jobTypes.editSubtitle' }
  }
  if (pathname.startsWith('/base-info/job-types/')) {
    return { titleKey: 'jobTypes.details', subtitleKey: 'jobTypes.detailsSubtitle' }
  }
  if (pathname.startsWith('/base-info/job-types')) {
    return { titleKey: 'menus.jobTypes', subtitleKey: 'jobTypes.subtitle' }
  }
  if (pathname === '/base-info/inquiry-centers/new') {
    return { titleKey: 'inquiryCenters.create', subtitleKey: 'inquiryCenters.createSubtitle' }
  }
  if (pathname.endsWith('/edit') && pathname.startsWith('/base-info/inquiry-centers/')) {
    return { titleKey: 'inquiryCenters.edit', subtitleKey: 'inquiryCenters.editSubtitle' }
  }
  if (pathname.startsWith('/base-info/inquiry-centers/')) {
    return { titleKey: 'inquiryCenters.details', subtitleKey: 'inquiryCenters.detailsSubtitle' }
  }
  if (pathname.startsWith('/base-info/inquiry-centers')) {
    return { titleKey: 'menus.inquiryCenters', subtitleKey: 'inquiryCenters.subtitle' }
  }
  const jobsMeta = jobsPageMeta(pathname)
  if (jobsMeta) {
    return jobsMeta
  }
  const jobGroupsMeta = jobGroupsPageMeta(pathname)
  if (jobGroupsMeta) {
    return jobGroupsMeta
  }
  if (pathname === '/base-info/documents/new') {
    return { titleKey: 'documents.create', subtitleKey: 'documents.createSubtitle' }
  }
  if (pathname.endsWith('/edit') && pathname.startsWith('/base-info/documents/')) {
    return { titleKey: 'documents.edit', subtitleKey: 'documents.editSubtitle' }
  }
  if (pathname.startsWith('/base-info/documents/')) {
    return { titleKey: 'documents.details', subtitleKey: 'documents.detailsSubtitle' }
  }
  if (pathname.startsWith('/base-info/documents')) {
    return { titleKey: 'menus.documents', subtitleKey: 'documents.subtitle' }
  }
  if (pathname === '/base-info/work-units/new') {
    return { titleKey: 'workUnits.create', subtitleKey: 'workUnits.createSubtitle' }
  }
  if (pathname.endsWith('/edit') && pathname.startsWith('/base-info/work-units/')) {
    return { titleKey: 'workUnits.edit', subtitleKey: 'workUnits.editSubtitle' }
  }
  if (pathname.startsWith('/base-info/work-units/')) {
    return { titleKey: 'workUnits.details', subtitleKey: 'workUnits.detailsSubtitle' }
  }
  if (pathname.startsWith('/base-info/work-units')) {
    return { titleKey: 'menus.workUnits', subtitleKey: 'workUnits.subtitle' }
  }
  if (pathname === '/base-info/staff-posts/new') {
    return { titleKey: 'staffPosts.create', subtitleKey: 'staffPosts.createSubtitle' }
  }
  if (pathname.endsWith('/edit') && pathname.startsWith('/base-info/staff-posts/')) {
    return { titleKey: 'staffPosts.edit', subtitleKey: 'staffPosts.editSubtitle' }
  }
  if (pathname.startsWith('/base-info/staff-posts/')) {
    return { titleKey: 'staffPosts.details', subtitleKey: 'staffPosts.detailsSubtitle' }
  }
  if (pathname.startsWith('/base-info/staff-posts')) {
    return { titleKey: 'menus.staffPosts', subtitleKey: 'staffPosts.subtitle' }
  }
  if (pathname === '/inspection/violation-types/new') {
    return { titleKey: 'violationTypes.create', subtitleKey: 'violationTypes.createSubtitle' }
  }
  if (pathname.endsWith('/edit') && pathname.startsWith('/inspection/violation-types/')) {
    return { titleKey: 'violationTypes.edit', subtitleKey: 'violationTypes.editSubtitle' }
  }
  if (pathname.startsWith('/inspection/violation-types/')) {
    return { titleKey: 'violationTypes.details', subtitleKey: 'violationTypes.detailsSubtitle' }
  }
  if (pathname.startsWith('/inspection/violation-types')) {
    return { titleKey: 'menus.violationTypes', subtitleKey: 'violationTypes.subtitle' }
  }
  if (pathname === '/base-info/roles/new') {
    return { titleKey: 'accessRoles.create', subtitleKey: 'accessRoles.createSubtitle' }
  }
  if (pathname.endsWith('/edit') && pathname.startsWith('/base-info/roles/')) {
    return { titleKey: 'accessRoles.edit', subtitleKey: 'accessRoles.editSubtitle' }
  }
  if (pathname.startsWith('/base-info/roles/')) {
    return { titleKey: 'accessRoles.details', subtitleKey: 'accessRoles.detailsSubtitle' }
  }
  if (pathname.startsWith('/base-info/roles')) {
    return { titleKey: 'menus.roles', subtitleKey: 'accessRoles.subtitle' }
  }
  if (pathname === '/dashboard') {
    return { titleKey: 'dashboard.title', subtitleKey: 'dashboard.subtitle' }
  }
  return { titleKey: 'menus.overview' }
}
