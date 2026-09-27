import { useTranslation } from 'react-i18next'
import { CheckboxField } from '../../components/ui/CheckboxField'
import { APP_NAV } from '../../lib/nav'
import type { NavModule } from '../../types/app'

function isSelected(code: string, selected: Set<string>, parentCode?: string) {
  return selected.has(code) || Boolean(parentCode && selected.has(parentCode))
}

export function compactPermissionCodes(selected: Iterable<string>, nav: NavModule[] = APP_NAV) {
  const set = new Set(selected)
  const result: string[] = []
  for (const mod of nav) {
    const childCodes = mod.menus.map((menu) => menu.code)
    const allChildren =
      childCodes.length > 0 &&
      childCodes.every((code) => set.has(code) || set.has(mod.code))
    if (set.has(mod.code) || allChildren) {
      result.push(mod.code)
    } else {
      for (const code of childCodes) {
        if (set.has(code)) result.push(code)
      }
    }
  }
  return result
}

export function PermissionTree({
  selected,
  onChange,
  disabled,
}: {
  selected: string[]
  onChange: (codes: string[]) => void
  disabled?: boolean
}) {
  const { t } = useTranslation()
  const selectedSet = new Set(selected)

  function commit(next: Set<string>) {
    onChange(compactPermissionCodes(next))
  }

  function toggleModule(mod: NavModule, checked: boolean) {
    const next = new Set(selectedSet)
    if (checked) {
      next.add(mod.code)
      for (const menu of mod.menus) next.add(menu.code)
    } else {
      next.delete(mod.code)
      for (const menu of mod.menus) next.delete(menu.code)
    }
    commit(next)
  }

  function toggleMenu(mod: NavModule, menuCode: string, checked: boolean) {
    const next = new Set(selectedSet)
    if (checked) {
      next.add(menuCode)
      const allChildren = mod.menus.every(
        (menu) => menu.code === menuCode || next.has(menu.code) || next.has(mod.code),
      )
      if (allChildren) next.add(mod.code)
    } else {
      next.delete(menuCode)
      next.delete(mod.code)
    }
    commit(next)
  }

  return (
    <div className="space-y-3">
      {APP_NAV.map((mod) => {
        const childCodes = mod.menus.map((menu) => menu.code)
        const selectedChildren = childCodes.filter((code) => isSelected(code, selectedSet, mod.code))
        const parentChecked = isSelected(mod.code, selectedSet) ||
          (childCodes.length > 0 && selectedChildren.length === childCodes.length)
        const parentIndeterminate = !parentChecked && selectedChildren.length > 0

        return (
          <div key={mod.code} className="rounded-2xl border border-line bg-cream-50/70 p-3">
            <CheckboxField
              id={`perm-${mod.code}`}
              checked={parentChecked}
              indeterminate={parentIndeterminate}
              disabled={disabled}
              label={t(mod.nameKey)}
              onChange={(checked) => toggleModule(mod, checked)}
            />
            <div className="ms-6 mt-2 grid gap-2">
              {mod.menus.map((menu) => (
                <CheckboxField
                  key={menu.code}
                  id={`perm-${menu.code}`}
                  checked={isSelected(menu.code, selectedSet, mod.code)}
                  disabled={disabled}
                  label={t(menu.nameKey)}
                  onChange={(checked) => toggleMenu(mod, menu.code, checked)}
                />
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
