import { Trash2 } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Button } from '../../components/ui/Form'
import { useConfirmDelete } from '../../hooks/useConfirmDelete'
import { api, getApiErrorMessage } from '../../lib/api'
import { CaseDeleteDependentsDialog } from './CaseDeleteDependentsDialog'
import type { StewardRow } from './CaseStewardsSection'

export function caseIsIssued(item: {
  licenseNumber?: string | null
  licenseIssuedAt?: string | null
  cardNumber?: string | null
}) {
  return Boolean(item.licenseNumber || item.licenseIssuedAt || item.cardNumber)
}

export function DeleteCaseButton({ onClick, disabled }: { onClick: () => void; disabled?: boolean }) {
  const { t } = useTranslation()
  return (
    <Button type="button" variant="danger" disabled={disabled} onClick={onClick}>
      <Trash2 className="size-4" aria-hidden />
      {t('cases.deleteCase')}
    </Button>
  )
}

export function useCaseDelete(caseId: string | null | undefined) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { confirmDelete } = useConfirmDelete()
  const [checking, setChecking] = useState(false)
  const [dependents, setDependents] = useState<StewardRow[] | null>(null)
  const [removing, setRemoving] = useState(false)

  function goToList() {
    void queryClient.invalidateQueries({ queryKey: ['cases', 'list'] })
    navigate('/cases')
  }

  function confirmCaseDelete() {
    if (!caseId) return
    confirmDelete({
      message: t('cases.confirmDelete'),
      successMessage: t('cases.deleted'),
      path: `/cases/${caseId}`,
      queryKey: ['cases', 'list'],
      onDeleted: () => navigate('/cases'),
    })
  }

  async function askDelete() {
    if (!caseId || checking || dependents) return
    setChecking(true)
    try {
      const { data } = await api.get<StewardRow[]>(`/cases/${caseId}/stewards`)
      if (data.length) {
        setDependents(data)
        return
      }
      confirmCaseDelete()
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('common.error')))
    } finally {
      setChecking(false)
    }
  }

  async function confirmDependentsDelete() {
    if (!caseId || !dependents || removing) return
    setRemoving(true)
    try {
      await api.delete(`/cases/${caseId}`)
      toast.success(t('cases.deleted'))
      setDependents(null)
      goToList()
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('common.error')))
    } finally {
      setRemoving(false)
    }
  }

  const dialog = dependents ? (
    <CaseDeleteDependentsDialog
      rows={dependents}
      pending={removing}
      onClose={() => {
        if (!removing) setDependents(null)
      }}
      onConfirm={() => void confirmDependentsDelete()}
    />
  ) : null

  return { askDelete, checking, dialog }
}
