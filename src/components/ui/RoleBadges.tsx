import { useTranslation } from 'react-i18next'
import type { RoleOption } from '../../types/app'

const roleClass: Record<string, string> = {
  ADMIN: 'bg-teal-50 text-teal-800 ring-teal-100',
  BOARD_ADMIN: 'bg-teal-50 text-teal-800 ring-teal-100',
  EMPLOYEE: 'bg-mint-50 text-mint-800 ring-mint-100',
  PILGRIM: 'bg-teal-50 text-teal-800 ring-teal-100',
  CARAVAN_MANAGER: 'bg-mint-50 text-mint-800 ring-mint-100',
  GROUP_MANAGER: 'bg-mint-50 text-mint-800 ring-mint-100',
  ACCOMMODATION_MANAGER: 'bg-cream-100 text-ink-700 ring-line',
  HEADQUARTERS_REPRESENTATIVE: 'bg-teal-50 text-teal-800 ring-teal-100',
  LICENSE_ISSUER: 'bg-mint-50 text-mint-800 ring-mint-100',
  UNIT_MANAGER: 'bg-cream-100 text-ink-700 ring-line',
  STATION_MANAGER: 'bg-teal-50 text-teal-800 ring-teal-100',
}

const chipClass =
  'inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ring-1'
const fallbackClass = 'bg-cream-100 text-ink-500 ring-line'

export function RoleBadges({
  roles,
}: {
  roles: Pick<RoleOption, 'code' | 'name' | 'nameKey'>[] | undefined
}) {
  const { t } = useTranslation()
  if (!roles?.length) return null

  return (
    <span className="mt-1 flex flex-wrap gap-1">
      {roles.map((role) => (
        <span
          key={role.code}
          className={`${chipClass} ${roleClass[role.code] ?? fallbackClass}`}
        >
          {role.name || (role.nameKey ? t(role.nameKey) : role.code)}
        </span>
      ))}
    </span>
  )
}
