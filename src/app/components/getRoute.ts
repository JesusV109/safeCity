// File: src/app/components/getRoute.ts

export async function getRouteFromMapbox(
    origin: [number, number],
    destination: [number, number]
  ): Promise<GeoJSON.LineString | null> {
    const accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  
    const url = `https://api.mapbox.com/directions/v5/mapbox/walking/${origin.join(',')};${destination.join(',')}?geometries=geojson&access_token=${accessToken}`;
  
    try {
      const res = await fetch(url);
      const data = await res.json();
  
      if (!data.routes || data.routes.length === 0) {
        console.warn('No route found.');
        return null;
      }
  
      return data.routes[0].geometry;
    } catch (error) {
      console.error('Failed to get route from Mapbox:', error);
      return null;
    }
  }
  