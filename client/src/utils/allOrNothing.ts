export type AllOrNothingResult = 'payerPaysAll' | 'othersPayAll'

export const coinRotationToLand = (currentRotation: number, result: AllOrNothingResult) => {
  const target = result === 'payerPaysAll' ? 0 : 180
  const offset = (((target - currentRotation) % 360) + 360) % 360
  return currentRotation + 360 * 5 + offset
}
