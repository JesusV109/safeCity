import * as turf from "@turf/turf";
import { Feature, Polygon, MultiPolygon } from "geojson";

/**
 * Checks if a route intersects any "danger zone".
 * Each "danger zone" is a point [lng, lat]; we buffer it to create
 * a polygon, then check intersection with the route line.
 */
export function isRouteSafe(
  route: GeoJSON.LineString,
  dangerZones: Array<[number, number]>
): boolean {
  // Convert route coords into a turf LineString Feature
  const routeLine = turf.lineString(route.coordinates);

  // For each danger zone, create a ~100m buffer
  const bufferedZones = dangerZones
    .map((coords) =>
      turf.buffer(turf.point(coords), 0.1, { units: "kilometers" })
    )
    .filter(
      (zone): zone is Feature<Polygon | MultiPolygon> => !!zone
    );

  // If the route intersects any zone, it's unsafe
  for (const zone of bufferedZones) {
    if (turf.booleanIntersects(routeLine, zone)) {
      return false;
    }
  }

  return true; // If no intersections, the route is safe
}
