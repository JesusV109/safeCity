// lib/crimeData.ts

/**
 * Minimal interface for county-level crime data.
 * boundingBox is a simple rectangle: { west, south, east, north }
 */
interface CountyCrimeData {
    county: string;
    crimeRate: number; // incidents per 1k population
    boundingBox: {
      west: number;
      south: number;
      east: number;
      north: number;
    };
  }
  
  /**
   * Example data for demonstration.
   * In reality, you'd store or fetch real crime stats from a file, database, or API.
   */
  const mockCrimeData: CountyCrimeData[] = [
    {
      county: "ExampleCounty1",
      crimeRate: 15.2,
      boundingBox: {
        west: -75.0,
        south: 40.0,
        east: -74.5,
        north: 40.5,
      },
    },
    {
      county: "ExampleCounty2",
      crimeRate: 9.8,
      boundingBox: {
        west: -74.5,
        south: 40.0,
        east: -74.0,
        north: 40.5,
      },
    },
    // Add more counties...
  ];
  
  /**
   * Determines the crime rate for a location by finding which county bounding box
   * the (lat, lon) falls into. Returns a default if no match is found.
   *
   * @param lat - latitude
   * @param lon - longitude
   * @returns incidents per 1k population (placeholder)
   */
  export async function getCrimeRateForLocation(lat: number, lon: number): Promise<number> {
    // 1. Attempt to find the county whose boundingBox contains (lat, lon).
    const found = mockCrimeData.find((record) =>
      lon >= record.boundingBox.west &&
      lon <= record.boundingBox.east &&
      lat >= record.boundingBox.south &&
      lat <= record.boundingBox.north
    );
  
    // 2. If we don’t find a match, return a default or fallback.
    if (!found) {
      console.warn(`No county match for lat=${lat}, lon=${lon}. Returning default 12.5`);
      return 12.5;
    }
  
    return found.crimeRate;
  }
  