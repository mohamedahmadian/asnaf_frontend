import type { Religion, UserGender } from '../../types/app'

export const FORMATION_STEPS = [
  'identity',
  'activity',
  'location',
  'inquiries',
  'places',
  'managementReview',
  'issuance',
] as const

export const PLACES_FORMATION_STEP = FORMATION_STEPS.indexOf('places')
export const MANAGEMENT_FORMATION_STEP = FORMATION_STEPS.indexOf('managementReview')

export const EDUCATION_LEVELS = [
  'ILLITERATE',
  'ELEMENTARY',
  'MIDDLE_SCHOOL',
  'DIPLOMA',
  'ASSOCIATE',
  'BACHELOR',
  'MASTER',
  'DOCTORATE',
  'SEMINARY',
  'OTHER',
] as const

export type EducationLevel = (typeof EDUCATION_LEVELS)[number]

export const PREVIOUS_OCCUPATIONS = [
  'OTHER',
  'ACTIVE_MILITARY',
  'RETIRED_MILITARY',
  'ACTIVE_EMPLOYEE',
  'RETIRED_EMPLOYEE',
] as const

export type PreviousOccupation = (typeof PREVIOUS_OCCUPATIONS)[number]

export type CaseActivity = {
  businessUnitTitle: string | null
  jobGroupId: string | null
  jobId: string | null
  previousOccupation: PreviousOccupation | null
  posDeviceCount: number | null
}

export const PREMISE_ESTABLISHMENTS = ['INDEPENDENT', 'COMMERCIAL_COMPLEX', 'RESIDENTIAL_COMPLEX'] as const
export const PREMISE_GEO_POSITIONS = ['MAIN_FRONTAGE', 'SIDE_FRONTAGE', 'ALLEY'] as const
export const PREMISE_PUBLIC_ACCESSES = ['MEN', 'WOMEN', 'PUBLIC', 'SEPARATE'] as const
export const PREMISE_OWNERSHIPS = ['OWNED', 'RENTED'] as const

export type PremiseEstablishment = (typeof PREMISE_ESTABLISHMENTS)[number]
export type PremiseOwnership = (typeof PREMISE_OWNERSHIPS)[number]

export type CaseLocation = {
  cityId: string | null
  establishment: PremiseEstablishment | null
  complexId: string | null
  address: string | null
  plaque: string | null
  plaqueSeries: string | null
  floor: string | null
  unitNo: string | null
  postalCode: string | null
  phone: string | null
  fax: string | null
  geoPosition: (typeof PREMISE_GEO_POSITIONS)[number] | null
  publicAccess: (typeof PREMISE_PUBLIC_ACCESSES)[number] | null
  registrationPlaceId: string | null
  ownership: PremiseOwnership | null
  deedNo: string | null
  area: string | null
  leaseIssuedAt: string | null
  leaseExpiresAt: string | null
  leaseAgency: string | null
  ownerName: string | null
}

export type LocationForm = {
  cityId: string
  establishment: string
  complexId: string
  address: string
  plaque: string
  plaqueSeries: string
  floor: string
  unitNo: string
  postalCode: string
  phone: string
  fax: string
  geoPosition: string
  publicAccess: string
  registrationPlaceId: string
  ownership: string
  deedNo: string
  area: string
  leaseIssuedAt: string
  leaseExpiresAt: string
  leaseAgency: string
  ownerName: string
}

export function emptyLocationForm(): LocationForm {
  return {
    cityId: '',
    establishment: '',
    complexId: '',
    address: '',
    plaque: '',
    plaqueSeries: '',
    floor: '',
    unitNo: '',
    postalCode: '',
    phone: '',
    fax: '',
    geoPosition: '',
    publicAccess: '',
    registrationPlaceId: '',
    ownership: '',
    deedNo: '',
    area: '',
    leaseIssuedAt: '',
    leaseExpiresAt: '',
    leaseAgency: '',
    ownerName: '',
  }
}

export function locationFormFrom(location: CaseLocation | null): LocationForm {
  return {
    ...emptyLocationForm(),
    cityId: location?.cityId ?? '',
    establishment: location?.establishment ?? '',
    complexId: location?.complexId ?? '',
    address: location?.address ?? '',
    plaque: location?.plaque ?? '',
    plaqueSeries: location?.plaqueSeries ?? '',
    floor: location?.floor ?? '',
    unitNo: location?.unitNo ?? '',
    postalCode: location?.postalCode ?? '',
    phone: location?.phone ?? '',
    fax: location?.fax ?? '',
    geoPosition: location?.geoPosition ?? '',
    publicAccess: location?.publicAccess ?? '',
    registrationPlaceId: location?.registrationPlaceId ?? '',
    ownership: location?.ownership ?? '',
    deedNo: location?.deedNo ?? '',
    area: location?.area ?? '',
    leaseIssuedAt: location?.leaseIssuedAt ?? '',
    leaseExpiresAt: location?.leaseExpiresAt ?? '',
    leaseAgency: location?.leaseAgency ?? '',
    ownerName: location?.ownerName ?? '',
  }
}

export type IdentityPerson = {
  id: string
  firstName: string
  lastName: string
  fatherName: string | null
  lastNameEn: string | null
  gender: UserGender | null
  religion: Religion | null
  religionOther: string | null
  nationalId: string | null
  birthDate: string | null
  residencyStatus: 'RESIDENT' | 'NON_RESIDENT' | null
  passportNumber: string | null
  nationalCardExpiresAt: string | null
  passportExpiresAt: string | null
  identityCertificateNo: string | null
  birthPlace: string | null
  identityIssuedIn: string | null
  countryId: string | null
  phone: string | null
  homePhone: string | null
  postalCode: string | null
  address: string | null
  email: string | null
  educationLevel: EducationLevel | null
  citizenGroup: string | null
  jobId: string | null
  formationStep: number
  caseTrackingCode: string | null
}

export type DocumentTypeRow = {
  id: string
  code: string | null
  title: string
  isRequired: boolean
  gender: 'MALE' | 'FEMALE' | 'BOTH'
}

type ActivityDocumentSource = {
  id: string
  title: string
  isRequired: boolean
  gender: DocumentTypeRow['gender']
  isFixed?: boolean
}

function matchesActivityDocumentGender(
  gender: DocumentTypeRow['gender'],
  personGender: 'MALE' | 'FEMALE' | null | undefined,
) {
  return gender === 'BOTH' || !personGender || gender === personGender
}

export function activityDocumentRows(
  jobDocuments: ActivityDocumentSource[],
  catalog: ActivityDocumentSource[],
  personGender: 'MALE' | 'FEMALE' | null | undefined,
): DocumentTypeRow[] {
  const rows = new Map<string, DocumentTypeRow>()
  for (const item of catalog) {
    if (!item.isFixed || !item.isRequired || !matchesActivityDocumentGender(item.gender, personGender)) continue
    rows.set(item.id, {
      id: item.id,
      code: null,
      title: item.title,
      isRequired: true,
      gender: item.gender,
    })
  }
  for (const item of jobDocuments) {
    if (rows.has(item.id) || !matchesActivityDocumentGender(item.gender, personGender)) continue
    rows.set(item.id, {
      id: item.id,
      code: null,
      title: item.title,
      isRequired: item.isRequired,
      gender: item.gender,
    })
  }
  return [...rows.values()].sort((left, right) => left.title.localeCompare(right.title, 'fa'))
}

export type StoredVersion = {
  id: string
  version: number
  source: string
  originalName: string | null
  mimeType: string
  byteSize: number
}

export function emptyPerson(nationalId: string): IdentityPerson {
  return {
    id: '',
    firstName: '',
    lastName: '',
    fatherName: '',
    lastNameEn: '',
    gender: null,
    religion: null,
    religionOther: '',
    nationalId,
    birthDate: '',
    residencyStatus: null,
    passportNumber: '',
    nationalCardExpiresAt: '',
    passportExpiresAt: '',
    identityCertificateNo: '',
    birthPlace: '',
    identityIssuedIn: '',
    countryId: '',
    phone: '',
    homePhone: '',
    postalCode: '',
    address: '',
    email: '',
    educationLevel: null,
    citizenGroup: '',
    jobId: '',
    formationStep: 0,
    caseTrackingCode: null,
  }
}

export function fillPerson(person: IdentityPerson): IdentityPerson {
  return {
    ...emptyPerson(person.nationalId ?? ''),
    ...person,
    fatherName: person.fatherName ?? '',
    lastNameEn: person.lastNameEn ?? '',
    religionOther: person.religionOther ?? '',
    birthDate: person.birthDate ?? '',
    passportNumber: person.passportNumber ?? '',
    nationalCardExpiresAt: person.nationalCardExpiresAt ?? '',
    passportExpiresAt: person.passportExpiresAt ?? '',
    identityCertificateNo: person.identityCertificateNo ?? '',
    birthPlace: person.birthPlace ?? '',
    identityIssuedIn: person.identityIssuedIn ?? '',
    countryId: person.countryId ?? '',
    phone: person.phone ?? '',
    homePhone: person.homePhone ?? '',
    postalCode: person.postalCode ?? '',
    address: person.address ?? '',
    email: person.email ?? '',
    citizenGroup: person.citizenGroup ?? '',
    jobId: person.jobId ?? '',
    formationStep: person.formationStep ?? 0,
    caseTrackingCode: person.caseTrackingCode ?? null,
  }
}
