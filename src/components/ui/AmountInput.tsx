import { useTranslation } from 'react-i18next'
import { integerToPersianWords } from '../../lib/amount-words'
import { groupAmountInput, parseGroupedAmount } from '../../lib/datetime'
import { fieldClassName } from './Form'

export function AmountInput({
  id,
  value,
  onChange,
  required,
}: {
  id?: string
  value: string
  onChange: (value: string) => void
  required?: boolean
}) {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.split('-')[0] ?? 'fa'
  const display = groupAmountInput(value, locale)
  const amount = parseGroupedAmount(display)
  const words = amount == null ? '' : integerToPersianWords(amount)

  return (
    <>
      <input
        id={id}
        inputMode="numeric"
        autoComplete="off"
        className={`${fieldClassName} digit-field`}
        value={display}
        onChange={(event) => onChange(groupAmountInput(event.target.value, locale))}
        onFocus={(event) => event.currentTarget.select()}
        required={required}
      />
      {words ? <p className="text-xs text-ink-500">{t('common.amountEquivalent', { value: words })}</p> : null}
    </>
  )
}
