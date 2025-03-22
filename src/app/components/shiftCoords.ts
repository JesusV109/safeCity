// components/shiftCoords.ts
export function shiftCoords(
  coords: [number, number],
  direction: 'north' | 'south' | 'east' | 'west',
  offset = 0.002 // ~200m shift
): [number, number] {
  const [lng, lat] = coords;
  switch (direction) {
    case 'north': return [lng, lat + offset];
    case 'south': return [lng, lat - offset];
    case 'east': return [lng + offset, lat];
    case 'west': return [lng - offset, lat];
  }
}
