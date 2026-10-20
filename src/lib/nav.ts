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
    code: 'cases',
    nameKey: 'modules.cases',
    icon: 'folder-open',
    sortOrder: 2,
    menus: [
      {
        code: 'cases.formation',
        nameKey: 'menus.caseFormation',
        path: '/cases/formation',
        icon: 'file-plus',
        sortOrder: 1,
      },
      {
        code: 'cases.management',
        nameKey: 'menus.caseManagement',
        path: '/cases',
        icon: 'files',
        sortOrder: 2,
      },
      {
        code: 'cases.inquiries',
        nameKey: 'menus.caseInquiries',
        path: '/cases/inquiries',
        icon: 'scan-search',
        sortOrder: 3,
      },
      {
        code: 'cases.places',
        nameKey: 'menus.casePlaces',
        path: '/cases/places',
        icon: 'landmark',
        sortOrder: 4,
      },
      {
        code: 'cases.management-reviews',
        nameKey: 'menus.caseManagementReviews',
        path: '/cases/management-reviews',
        icon: 'shield',
        sortOrder: 5,
      },
      {
        code: 'cases.issuance',
        nameKey: 'menus.caseIssuance',
        path: '/cases/issuance',
        icon: 'file-check',
        sortOrder: 6,
      },
      {
        code: 'cases.settings',
        nameKey: 'menus.caseSettings',
        path: '/cases/settings',
        icon: 'settings',
        sortOrder: 7,
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
      {
        code: 'finance.settings',
        nameKey: 'menus.financialSettings',
        path: '/finance/settings',
        icon: 'settings',
        sortOrder: 4,
      },
      {
        code: 'finance.payments',
        nameKey: 'menus.payments',
        path: '/finance/payments',
        icon: 'banknote',
        sortOrder: 5,
      },
      {
        code: 'finance.payment-history',
        nameKey: 'menus.paymentHistory',
        path: '/finance/payment-history',
        icon: 'history',
        sortOrder: 6,
      },
    ],
  },
  {
    code: 'reports',
    nameKey: 'modules.reports',
    icon: 'chart-column',
    sortOrder: 4,
    menus: [
      {
        code: 'reports.expiring-cases',
        nameKey: 'menus.expiringCases',
        path: '/reports/expiring-cases',
        icon: 'calendar-clock',
        sortOrder: 1,
      },
      {
        code: 'reports.inquiry-centers',
        nameKey: 'menus.caseInquiriesReports',
        path: '/cases/inquiries/reports',
        icon: 'chart-column',
        sortOrder: 2,
      },
      {
        code: 'reports.places-cases',
        nameKey: 'menus.casePlacesReports',
        path: '/cases/places/reports',
        icon: 'chart-column',
        sortOrder: 3,
      },
      {
        code: 'reports.referred-cases',
        nameKey: 'menus.caseManagementReviewsReports',
        path: '/cases/management-reviews/reports',
        icon: 'chart-column',
        sortOrder: 4,
      },
      {
        code: 'reports.case-files',
        nameKey: 'menus.caseReports',
        path: '/cases/reports',
        icon: 'chart-column',
        sortOrder: 5,
      },
    ],
  },
  {
    code: 'inspection',
    nameKey: 'modules.inspectionComplaints',
    icon: 'scale',
    sortOrder: 5,
    menus: [
      {
        code: 'inspection.violations.register',
        nameKey: 'menus.violationRegister',
        path: '/inspection/violations/new',
        icon: 'file-plus',
        sortOrder: 1,
      },
      {
        code: 'inspection.violations',
        nameKey: 'menus.violations',
        path: '/inspection/violations',
        icon: 'gavel',
        sortOrder: 2,
      },
      {
        code: 'inspection.violations.reports',
        nameKey: 'menus.violationReports',
        path: '/inspection/violations/reports',
        icon: 'chart-column',
        sortOrder: 3,
      },
      {
        code: 'inspection.violation-types',
        nameKey: 'menus.violationTypes',
        path: '/inspection/violation-types',
        icon: 'shield-alert',
        sortOrder: 4,
      },
    ],
  },
  {
    code: 'base-info',
    nameKey: 'modules.baseInfo',
    icon: 'globe',
    sortOrder: 6,
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
        code: 'base-info.letter-settings',
        nameKey: 'menus.letterInquirySettings',
        path: '/cases/settings?tab=letterhead',
        icon: 'file-signature',
        sortOrder: 10,
      },
      {
        code: 'base-info.documents',
        nameKey: 'menus.documents',
        path: '/base-info/documents',
        icon: 'file-check',
        sortOrder: 11,
      },
      {
        code: 'base-info.work-units',
        nameKey: 'menus.workUnits',
        path: '/base-info/work-units',
        icon: 'network',
        sortOrder: 12,
      },
      {
        code: 'base-info.staff-posts',
        nameKey: 'menus.staffPosts',
        path: '/base-info/staff-posts',
        icon: 'user-round-cog',
        sortOrder: 13,
      },
    ],
  },
  {
    code: 'sms',
    nameKey: 'modules.sms',
    icon: 'message-square',
    sortOrder: 7,
    menus: [
      {
        code: 'sms.settings',
        nameKey: 'menus.smsSettings',
        path: '/sms/settings',
        icon: 'settings',
        sortOrder: 1,
      },
      {
        code: 'sms.send',
        nameKey: 'menus.smsSend',
        path: '/sms/send',
        icon: 'send',
        sortOrder: 2,
      },
      {
        code: 'sms.history',
        nameKey: 'menus.smsHistory',
        path: '/sms/history',
        icon: 'history',
        sortOrder: 3,
      },
    ],
  },
  {
    code: 'management',
    nameKey: 'modules.management',
    icon: 'user-cog',
    sortOrder: 8,
    menus: [
      {
        code: 'management.userRegister',
        nameKey: 'menus.userRegister',
        path: '/users/register',
        icon: 'user-plus',
        sortOrder: 1,
      },
      {
        code: 'management.users',
        nameKey: 'menus.users',
        path: '/users',
        icon: 'users',
        sortOrder: 2,
      },
      {
        code: 'management.roles',
        nameKey: 'menus.roles',
        path: '/base-info/roles',
        icon: 'shield',
        sortOrder: 3,
      },
      {
        code: 'management.case-expiry',
        nameKey: 'menus.caseExpiry',
        path: '/management/case-expiry',
        icon: 'calendar-cog',
        sortOrder: 4,
      },
      {
        code: 'management.schedules',
        nameKey: 'menus.schedules',
        path: '/management/schedules',
        icon: 'calendar-clock',
        sortOrder: 5,
      },
    ],
  },
])
