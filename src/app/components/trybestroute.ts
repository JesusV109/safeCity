import { getRouteFromMapbox } from './getRoute';
import { isRouteSafe } from './checkturf';
import { shiftCoords } from './shiftCoords';
import length from '@turf/length';
import * as turf from '@turf/turf';

export async function tryBestSafeRoute(
  origin: [number, number],
  destination: [number, number],
  dangerZones: Array<[number, number]>
): Promise<GeoJSON.LineString | null> {
  const directions: Array<'original' | 'north' | 'south' | 'east' | 'west'> = [
    'original', 'north', 'south', 'east', 'west'
  ];

  const safeRoutes: { route: GeoJSON.LineString; direction: string; distance: number }[] = [];

  for (const dir of directions) {
    const targetCoords =
      dir === 'original' ? destination : shiftCoords(destination, dir);

    const route = await getRouteFromMapbox(origin, targetCoords);
    if (!route) continue;

    const isSafe = isRouteSafe(route, dangerZones);
    if (!isSafe) continue;

    // Convert LineString to Feature before calculating length
    const routeFeature = turf.feature(route);
    const dist = length(routeFeature, { units: 'kilometers' });
    safeRoutes.push({ route, direction: dir, distance: dist });
  }

  if (safeRoutes.length === 0) {
    console.warn("⚠️ No safe routes found");
    return null;
  }

  // Sort by distance and return shortest safe route
  safeRoutes.sort((a, b) => a.distance - b.distance);
  console.log("✅ Safe route chosen:", safeRoutes[0].direction, safeRoutes[0].distance.toFixed(2), "km");
  return safeRoutes[0].route;
}
