export interface RouletteCandidate {
  id: string
  name: string
}

export const rotationToLand = (currentRotation: number, winnerIndex: number, count: number) => {
  const segment = 360 / count
  const center = (winnerIndex + 0.5) * segment
  const offset = (((-center - currentRotation) % 360) + 360) % 360
  return currentRotation + 360 * 5 + offset
}
