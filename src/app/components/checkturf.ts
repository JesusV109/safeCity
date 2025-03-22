import * as turf from '@turf/turf';

export function isRouteSafe(
  route: GeoJSON.LineString,
  dangerZones: Array<[number, number]>
): boolean {
  // Turn each [lng, lat] danger point into a buffered area
  const bufferedZones = dangerZones.map((coords) =>
    turf.buffer(turf.point(coords), 0.1, { units: 'kilometers' })
  ).filter((zone): zone is GeoJSON.Feature<GeoJSON.Polygon> => zone !== undefined);

  // Create a Turf line from the route coordinates
  const routeLine = turf.lineString(route.coordinates);

  // Check if the route intersects any danger zone
  for (const zone of bufferedZones) {
    if (turf.booleanIntersects(routeLine, zone)) {
      return false; // ⚠️ Route touches a danger zone
    }
  }

  return true; //
}
