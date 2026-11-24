export interface RouletteCandidate {
  id: string
  name: string
}

export const pickRandomIndex = (count: number) => {
  const values = new Uint32Array(1)
  crypto.getRandomValues(values)
  return values[0]! % count
}

export const rotationToLand = (currentRotation: number, winnerIndex: number, count: number) => {
  const segment = 360 / count
  const center = (winnerIndex + 0.5) * segment
  const offset = (((-center - currentRotation) % 360) + 360) % 360
  return currentRotation + 360 * 5 + offset
}
