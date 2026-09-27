export const commercialComplexesPath = () => '/base-info/commercial-complexes'
export const commercialComplexNewPath = () => `${commercialComplexesPath()}/new`
export const commercialComplexPath = (complexId: string) =>
  `${commercialComplexesPath()}/${complexId}`
export const commercialComplexEditPath = (complexId: string) =>
  `${commercialComplexPath(complexId)}/edit`

export const commercialFloorsPath = (complexId: string) =>
  `${commercialComplexPath(complexId)}/floors`
export const commercialFloorNewPath = (complexId: string) =>
  `${commercialFloorsPath(complexId)}/new`
export const commercialFloorPath = (complexId: string, floorId: string) =>
  `${commercialFloorsPath(complexId)}/${floorId}`
export const commercialFloorEditPath = (complexId: string, floorId: string) =>
  `${commercialFloorPath(complexId, floorId)}/edit`

export const commercialLanesPath = (complexId: string, floorId: string) =>
  `${commercialFloorPath(complexId, floorId)}/lanes`
export const commercialLaneNewPath = (complexId: string, floorId: string) =>
  `${commercialLanesPath(complexId, floorId)}/new`
export const commercialLanePath = (
  complexId: string,
  floorId: string,
  laneId: string,
) => `${commercialLanesPath(complexId, floorId)}/${laneId}`
export const commercialLaneEditPath = (
  complexId: string,
  floorId: string,
  laneId: string,
) => `${commercialLanePath(complexId, floorId, laneId)}/edit`

export const commercialUnitsPath = (
  complexId: string,
  floorId: string,
  laneId: string,
) => `${commercialLanePath(complexId, floorId, laneId)}/units`
export const commercialUnitNewPath = (
  complexId: string,
  floorId: string,
  laneId: string,
) => `${commercialUnitsPath(complexId, floorId, laneId)}/new`
export const commercialUnitPath = (
  complexId: string,
  floorId: string,
  laneId: string,
  unitId: string,
) => `${commercialUnitsPath(complexId, floorId, laneId)}/${unitId}`
export const commercialUnitEditPath = (
  complexId: string,
  floorId: string,
  laneId: string,
  unitId: string,
) => `${commercialUnitPath(complexId, floorId, laneId, unitId)}/edit`

export const commercialComplexesApi = () => '/commercial-complexes'
export const commercialComplexApi = (complexId: string) =>
  `${commercialComplexesApi()}/${complexId}`
export const commercialFloorsApi = (complexId: string) =>
  `${commercialComplexApi(complexId)}/floors`
export const commercialFloorApi = (complexId: string, floorId: string) =>
  `${commercialFloorsApi(complexId)}/${floorId}`
export const commercialLanesApi = (complexId: string, floorId: string) =>
  `${commercialFloorApi(complexId, floorId)}/lanes`
export const commercialLaneApi = (
  complexId: string,
  floorId: string,
  laneId: string,
) => `${commercialLanesApi(complexId, floorId)}/${laneId}`
export const commercialUnitsApi = (
  complexId: string,
  floorId: string,
  laneId: string,
) => `${commercialLaneApi(complexId, floorId, laneId)}/units`
export const commercialUnitApi = (
  complexId: string,
  floorId: string,
  laneId: string,
  unitId: string,
) => `${commercialUnitsApi(complexId, floorId, laneId)}/${unitId}`
