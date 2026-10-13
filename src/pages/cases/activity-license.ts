import { api } from '../../lib/api'
import { formatGregorianDate, formatJalaliDate, localizeDigits } from '../../lib/datetime'

export type ActivityLicense = {
  licenseNumber: string
  issuedAt: string | null
  expiresAt: string | null
  requestNumber: string | null
  trackingCode: string | null
  firstName: string
  lastName: string
  lastNameEn: string | null
  gender: 'MALE' | 'FEMALE' | null
  birthDate: string | null
  nationalityFa: string | null
  nationalityEn: string | null
  passportNumber: string | null
  phone: string | null
  tradeName: string | null
  activityTitle: string | null
  activityTitleEn: string | null
  photoId: string | null
  address: string | null
  addressEn: string | null
  plaque: string | null
  floor: string | null
  unitNo: string | null
  postalCode: string | null
  cityNameFa: string | null
  cityNameEn: string | null
  complexName: string | null
  complexNameEn: string | null
}

export type LicenseRow = {
  fa: string
  en: string
  faValue: string
  enValue: string
}

export type LicenseView = {
  org: string
  orgEn: string
  title: string
  titleEn: string
  site: string
  rows: LicenseRow[]
  photoUrl: string | null
}

type LicenseCopy = {
  org: string
  orgEn: string
  title: string
  titleEn: string
  site: string
  number: string
  numberEn: string
  issued: string
  issuedEn: string
  expires: string
  expiresEn: string
  name: string
  nameEn: string
  gender: string
  genderEn: string
  male: string
  maleEn: string
  female: string
  femaleEn: string
  birth: string
  birthEn: string
  nationality: string
  nationalityEn: string
  passport: string
  passportEn: string
  address: string
  addressEn: string
  phone: string
  phoneEn: string
  activity: string
  activityEn: string
  trade: string
  tradeEn: string
  plaque: string
  floor: string
  unit: string
  postal: string
}

function text(value: string | null | undefined) {
  const trimmed = value?.trim()
  return trimmed ? trimmed : '—'
}

function faDigits(value: string | null | undefined) {
  const trimmed = value?.trim()
  return trimmed ? localizeDigits(trimmed, 'fa') : '—'
}

function addressLine(
  license: ActivityLicense,
  copy: LicenseCopy,
  side: 'fa' | 'en',
) {
  const complex = side === 'fa' ? license.complexName : license.complexNameEn || license.complexName
  const city = side === 'fa' ? license.cityNameFa : license.cityNameEn || license.cityNameFa
  const plaque = side === 'fa' ? copy.plaque : 'No.'
  const floor = side === 'fa' ? copy.floor : 'Floor'
  const unit = side === 'fa' ? copy.unit : 'Unit'
  const postal = side === 'fa' ? copy.postal : 'Postal'
  const street = side === 'fa' ? license.address : license.addressEn
  const parts = [
    complex,
    street,
    license.plaque ? `${plaque} ${license.plaque}` : null,
    license.floor ? `${floor} ${license.floor}` : null,
    license.unitNo ? `${unit} ${license.unitNo}` : null,
    city,
    license.postalCode ? `${postal} ${license.postalCode}` : null,
  ]
    .map((part) => part?.trim())
    .filter(Boolean)
  if (!parts.length) return '—'
  return side === 'fa' ? localizeDigits(parts.join('، '), 'fa') : parts.join(', ')
}

function faDate(value: string | null) {
  return value ? formatJalaliDate(value, 'fa') : '—'
}

function enDate(value: string | null) {
  return value ? formatGregorianDate(value, 'en') : '—'
}

export function buildLicenseView(
  license: ActivityLicense,
  copy: LicenseCopy,
  photoUrl: string | null,
): LicenseView {
  const fullName = `${license.firstName} ${license.lastName}`.replace(/\s+/g, ' ').trim()
  const genderFa = license.gender === 'MALE' ? copy.male : license.gender === 'FEMALE' ? copy.female : null
  const genderEn = license.gender === 'MALE' ? copy.maleEn : license.gender === 'FEMALE' ? copy.femaleEn : null
  return {
    org: copy.org,
    orgEn: copy.orgEn,
    title: copy.title,
    titleEn: copy.titleEn,
    site: copy.site,
    photoUrl,
    rows: [
      {
        fa: copy.number,
        en: copy.numberEn,
        faValue: faDigits(license.licenseNumber),
        enValue: license.licenseNumber,
      },
      {
        fa: copy.issued,
        en: copy.issuedEn,
        faValue: faDate(license.issuedAt),
        enValue: enDate(license.issuedAt),
      },
      {
        fa: copy.expires,
        en: copy.expiresEn,
        faValue: faDate(license.expiresAt),
        enValue: enDate(license.expiresAt),
      },
      {
        fa: copy.name,
        en: copy.nameEn,
        faValue: text(fullName),
        enValue: text(license.lastNameEn),
      },
      {
        fa: copy.gender,
        en: copy.genderEn,
        faValue: text(genderFa),
        enValue: text(genderEn),
      },
      {
        fa: copy.birth,
        en: copy.birthEn,
        faValue: faDate(license.birthDate),
        enValue: enDate(license.birthDate),
      },
      {
        fa: copy.nationality,
        en: copy.nationalityEn,
        faValue: text(license.nationalityFa),
        enValue: text(license.nationalityEn || license.nationalityFa),
      },
      {
        fa: copy.passport,
        en: copy.passportEn,
        faValue: faDigits(license.passportNumber),
        enValue: text(license.passportNumber),
      },
      {
        fa: copy.address,
        en: copy.addressEn,
        faValue: addressLine(license, copy, 'fa'),
        enValue: addressLine(license, copy, 'en'),
      },
      {
        fa: copy.phone,
        en: copy.phoneEn,
        faValue: faDigits(license.phone),
        enValue: text(license.phone),
      },
      {
        fa: copy.activity,
        en: copy.activityEn,
        faValue: text(license.activityTitle),
        enValue: text(license.activityTitleEn || license.activityTitle),
      },
      {
        fa: copy.trade,
        en: copy.tradeEn,
        faValue: text(license.tradeName),
        enValue: text(license.tradeName),
      },
    ],
  }
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function activityLicenseHtml(view: LicenseView) {
  const rows = view.rows
    .map(
      (row) => `<div class="row">
        <div class="cell"><div class="label">${escapeHtml(row.fa)}</div><div class="value">${escapeHtml(row.faValue)}</div></div>
        <div class="cell en"><div class="label">${escapeHtml(row.en)}</div><div class="value">${escapeHtml(row.enValue)}</div></div>
      </div>`,
    )
    .join('')
  const photo = view.photoUrl ? `<img src="${escapeHtml(view.photoUrl)}" alt="" />` : ''
  return `<!DOCTYPE html><html lang="fa" dir="rtl"><head><meta charset="utf-8"><title>${escapeHtml(view.title)}</title>
<style>
  body{margin:0;background:#eef3f8;font-family:Vazirmatn,Tahoma,sans-serif;color:#14222b}
  .sheet{display:flex;max-width:920px;margin:24px auto;background:#fff;border:1px solid #d5deea;min-height:640px}
  .band{width:168px;flex:none;background:#14356e;color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;padding:28px 16px;text-align:center}
  .mark{width:72px;height:72px}
  .org{font-size:15px;font-weight:700;line-height:1.7}
  .org-en{font-size:11px;letter-spacing:.04em;opacity:.85}
  .title{font-size:18px;font-weight:800;line-height:1.6}
  .title-en{font-size:12px;opacity:.9}
  .body{flex:1;padding:22px 26px 18px;display:flex;flex-direction:column}
  .row{display:grid;grid-template-columns:1fr 1fr;gap:18px;border-bottom:1px solid #e6edf4;padding:8px 0}
  .label{font-size:11px;color:#5d7284}
  .value{font-size:14px;font-weight:700;line-height:1.7}
  .en{direction:ltr;text-align:left}
  .foot{display:flex;align-items:flex-end;justify-content:space-between;margin-top:auto;padding-top:16px}
  .photo{width:92px;height:112px;border-radius:8px;background:#eef3f8;border:1px solid #d5deea;overflow:hidden}
  .photo img{width:100%;height:100%;object-fit:cover}
  .site{font-size:12px;color:#14356e;font-weight:700;direction:ltr}
  @media print{body{background:#fff}.sheet,.band{-webkit-print-color-adjust:exact;print-color-adjust:exact}.sheet{margin:0;border:0;max-width:none}}
</style></head><body>
<article class="sheet">
  <aside class="band">
    <svg class="mark" viewBox="0 0 72 72" aria-hidden="true"><circle cx="36" cy="28" r="10" fill="#f0c14d"/><path d="M8 46c8-8 14-8 22 0s14 8 22 0 14-8 12 0" fill="none" stroke="#7ec8e3" stroke-width="3"/><path d="M8 54c8-8 14-8 22 0s14 8 22 0 14-8 12 0" fill="none" stroke="#fff" stroke-width="3"/></svg>
    <div class="org">${escapeHtml(view.org)}</div>
    <div class="org-en">${escapeHtml(view.orgEn)}</div>
    <div class="title">${escapeHtml(view.title)}</div>
    <div class="title-en">${escapeHtml(view.titleEn)}</div>
  </aside>
  <div class="body">${rows}<div class="foot"><div class="photo">${photo}</div><div class="site">${escapeHtml(view.site)}</div></div></div>
</article></body></html>`
}

export async function licensePhotoDataUrl(photoId: string | null) {
  if (!photoId) return null
  const { data } = await api.get<Blob>(`/images/${photoId}`, { responseType: 'blob' })
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(data)
  })
}

export function downloadActivityLicense(filename: string, html: string) {
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

export function printActivityLicense(html: string) {
  const frame = document.createElement('iframe')
  frame.setAttribute('aria-hidden', 'true')
  frame.style.position = 'fixed'
  frame.style.width = '0'
  frame.style.height = '0'
  frame.style.border = '0'
  document.body.appendChild(frame)
  const win = frame.contentWindow
  const doc = frame.contentDocument
  if (!win || !doc) {
    frame.remove()
    return
  }
  let started = false
  const run = () => {
    if (started) return
    started = true
    win.focus()
    win.print()
  }
  win.addEventListener('afterprint', () => frame.remove(), { once: true })
  doc.open()
  doc.write(html)
  doc.close()
  if (doc.readyState === 'complete') window.setTimeout(run, 50)
  else win.addEventListener('load', run, { once: true })
  window.setTimeout(run, 400)
  window.setTimeout(() => {
    if (frame.isConnected) frame.remove()
  }, 60_000)
}
