import type { NavModule } from '../types/app'

export const MANAGEMENT_MODULE_CODE = 'management'

/** ماژول مدیریت کاربران همیشه آخرین کارت منوی اصلی می‌ماند. */
export function withManagementLast(nav: NavModule[]): NavModule[] {
  const rest: NavModule[] = []
  const management: NavModule[] = []
  for (const mod of nav) {
    if (mod.code === MANAGEMENT_MODULE_CODE) management.push(mod)
    else rest.push(mod)
  }
  return [...rest, ...management]
}

export const APP_NAV: NavModule[] = withManagementLast([
  {
    code: 'dashboard',
    nameKey: 'modules.dashboard',
    icon: 'layout-dashboard',
    sortOrder: 1,
    menus: [
      {
        code: 'dashboard.home',
        nameKey: 'menus.overview',
        path: '/dashboard',
        icon: 'layout-dashboard',
        sortOrder: 1,
      },
    ],
  },
  {
    code: 'base-info',
    nameKey: 'modules.baseInfo',
    icon: 'globe',
    sortOrder: 2,
    menus: [
      {
        code: 'base-info.job-types',
        nameKey: 'menus.jobTypes',
        path: '/base-info/job-types',
        icon: 'briefcase',
        sortOrder: 1,
      },
      {
        code: 'base-info.job-groups',
        nameKey: 'menus.jobGroups',
        path: '/base-info/job-groups',
        icon: 'folder-kanban',
        sortOrder: 2,
      },
      {
        code: 'base-info.jobs',
        nameKey: 'menus.jobs',
        path: '/base-info/jobs',
        icon: 'hard-hat',
        sortOrder: 3,
      },
      {
        code: 'base-info.registration-places',
        nameKey: 'menus.registrationPlaces',
        path: '/base-info/registration-places',
        icon: 'map-pinned',
        sortOrder: 4,
      },
      {
        code: 'base-info.countries',
        nameKey: 'menus.countries',
        path: '/base-info/countries',
        icon: 'globe',
        sortOrder: 5,
      },
      {
        code: 'base-info.provinces',
        nameKey: 'menus.provinces',
        path: '/base-info/provinces',
        icon: 'map',
        sortOrder: 6,
      },
      {
        code: 'base-info.cities',
        nameKey: 'menus.cities',
        path: '/base-info/cities',
        icon: 'map-pin',
        sortOrder: 7,
      },
      {
        code: 'base-info.commercial-complexes',
        nameKey: 'menus.commercialComplexes',
        path: '/base-info/commercial-complexes',
        icon: 'building-2',
        sortOrder: 8,
      },
      {
        code: 'base-info.inquiry-centers',
        nameKey: 'menus.inquiryCenters',
        path: '/base-info/inquiry-centers',
        icon: 'scan-search',
        sortOrder: 9,
      },
      {
        code: 'base-info.documents',
        nameKey: 'menus.documents',
        path: '/base-info/documents',
        icon: 'file-check',
        sortOrder: 10,
      },
      {
        code: 'base-info.work-units',
        nameKey: 'menus.workUnits',
        path: '/base-info/work-units',
        icon: 'network',
        sortOrder: 11,
      },
      {
        code: 'base-info.staff-posts',
        nameKey: 'menus.staffPosts',
        path: '/base-info/staff-posts',
        icon: 'user-round-cog',
        sortOrder: 12,
      },
    ],
  },
  {
    code: 'finance',
    nameKey: 'modules.finance',
    icon: 'wallet',
    sortOrder: 3,
    menus: [
      {
        code: 'finance.bank-accounts',
        nameKey: 'menus.bankAccounts',
        path: '/base-info/bank-accounts',
        icon: 'landmark',
        sortOrder: 1,
      },
      {
        code: 'finance.municipal-fees',
        nameKey: 'menus.municipalFees',
        path: '/base-info/municipal-fees',
        icon: 'hand-coins',
        sortOrder: 2,
      },
      {
        code: 'finance.discounts',
        nameKey: 'menus.discounts',
        path: '/base-info/discounts',
        icon: 'percent',
        sortOrder: 3,
      },
    ],
  },
  {
    code: 'inspection',
    nameKey: 'modules.inspectionComplaints',
    icon: 'scale',
    sortOrder: 4,
    menus: [
      {
        code: 'inspection.violation-types',
        nameKey: 'menus.violationTypes',
        path: '/inspection/violation-types',
        icon: 'shield-alert',
        sortOrder: 1,
      },
    ],
  },
  {
    code: 'management',
    nameKey: 'modules.management',
    icon: 'user-cog',
    sortOrder: 5,
    menus: [
      {
        code: 'management.users',
        nameKey: 'menus.users',
        path: '/users',
        icon: 'users',
        sortOrder: 1,
      },
      {
        code: 'management.roles',
        nameKey: 'menus.roles',
        path: '/base-info/roles',
        icon: 'shield',
        sortOrder: 2,
      },
    ],
  },
])
