// File: src/app/components/tryBestSafeRoute.ts

import { getRouteFromMapbox } from "@/app/components/getRoute";
import { isRouteSafe } from "@/app/components/checkturf";
import { shiftCoords } from "@/app/components/shiftCoords";
import length from "@turf/length";
import * as turf from "@turf/turf";


/**
 * Attempts multiple route variations from origin -> destination,
 * shifting destination slightly (N/S/E/W) to see if a safe route
 * can be found. Then picks the shortest safe route.
 */
export async function tryBestSafeRoute(
  origin: [number, number],
  destination: [number, number],
  dangerZones: Array<[number, number]>
): Promise<GeoJSON.LineString | null> {
  const directions: Array<'original' | 'north' | 'south' | 'east' | 'west'> = [
    'original',
    'north',
    'south',
    'east',
    'west',
  ];

  const safeRoutes: {
    route: GeoJSON.LineString;
    direction: string;
    distance: number;
  }[] = [];

  for (const dir of directions) {
    const targetCoords =
      dir === 'original' ? destination : shiftCoords(destination, dir);

    const route = await getRouteFromMapbox(origin, targetCoords);
    if (!route) continue;

    const safe = isRouteSafe(route, dangerZones);
    if (!safe) continue;

    // Convert to a Feature before calculating length with Turf
    const routeFeature = turf.feature(route);
    const dist = length(routeFeature, { units: 'kilometers' });
    safeRoutes.push({ route, direction: dir, distance: dist });
  }

  if (safeRoutes.length === 0) {
    console.warn('⚠️ No safe routes found using any shift approach.');
    return null;
  }

  // Sort by distance ascending, pick shortest
  safeRoutes.sort((a, b) => a.distance - b.distance);
  console.log(
    '✅ Safe route chosen:',
    safeRoutes[0].direction,
    safeRoutes[0].distance.toFixed(2),
    'km'
  );
  return safeRoutes[0].route;
}
