import { ScanSearch } from 'lucide-react'
import { CheckboxField } from '../../components/ui/CheckboxField'
import { FormField } from '../../components/ui/Form'
import { FormEmptyHint, FormFactTile } from '../../components/ui/FormLayout'

export type InquiryCenterOption = {
  id: string
  name: string
}

export function InquiryCenterPicker({
  centers,
  selectedIds,
  onChange,
  label,
  empty,
}: {
  centers: InquiryCenterOption[]
  selectedIds: string[]
  onChange: (ids: string[]) => void
  label: string
  empty: string
}) {
  if (centers.length === 0) {
    return <FormEmptyHint>{empty}</FormEmptyHint>
  }

  return (
    <FormField icon={ScanSearch} label={label} htmlFor="inquiryCenterIds">
      <div id="inquiryCenterIds" className="grid gap-2">
        {centers.map((center) => (
          <CheckboxField
            key={center.id}
            id={`job-center-${center.id}`}
            checked={selectedIds.includes(center.id)}
            label={center.name}
            onChange={(checked) => {
              onChange(
                checked
                  ? [...selectedIds, center.id]
                  : selectedIds.filter((item) => item !== center.id),
              )
            }}
          />
        ))}
      </div>
    </FormField>
  )
}

export function InquiryCenterList({
  centers,
  label,
  empty,
}: {
  centers: InquiryCenterOption[]
  label: string
  empty: string
}) {
  if (centers.length === 0) {
    return <FormEmptyHint>{empty}</FormEmptyHint>
  }

  return (
    <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
      {centers.map((center, index) => (
        <FormFactTile
          key={center.id}
          icon={ScanSearch}
          label={label}
          value={center.name}
          tone={index % 2 === 0 ? 'teal' : 'mint'}
        />
      ))}
    </div>
  )
}
