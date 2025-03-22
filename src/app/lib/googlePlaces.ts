// lib/googlePlaces.ts

/**
 * Minimal interface for Nearby Search results.
 */
interface NearbySearchResult {
    place_id?: string;
  }
  
  interface NearbySearchResponse {
    results?: NearbySearchResult[];
    status?: string;
    error_message?: string;
  }
  
  /**
   * Each "period" typically has an open and close with { day, time }.
   * day=0 means Sunday, 1=Monday, ... 6=Saturday
   * time is "HHmm" in 24-hour format.
   */
  interface OpeningPeriod {
    open?: {
      day: number;
      time: string; // "HHmm"
    };
    close?: {
      day: number;
      time: string; // "HHmm"
    };
  }
  
  interface PlaceDetailsResult {
    opening_hours?: {
      periods?: OpeningPeriod[];
    };
  }
  
  interface PlaceDetailsResponse {
    result?: PlaceDetailsResult;
    status?: string;
    error_message?: string;
  }
  
  /**
   * Checks if a single period covers the specified dayOfWeek and HHmm time.
   * For simplicity, we assume open.day == close.day and ignore crossing midnight.
   */
  function isOpenAtTime(period: OpeningPeriod, dayOfWeek: number, hhmm: string): boolean {
    if (!period.open) return false;
    // If no close, assume open 24h for that day
    if (!period.close) {
      return period.open.day === dayOfWeek;
    }
  
    // If day doesn't match, it's not open
    if (period.open.day !== dayOfWeek || period.close.day !== dayOfWeek) {
      return false;
    }
  
    // Compare strings like "0800" <= "1300" < "2000"
    return (period.open.time <= hhmm) && (hhmm < period.close.time);
  }
  
  /**
   * Gets how many places are open at the specified local date/time near (lat, lon).
   * 
   * 1) Calls Nearby Search to get up to 20 place IDs.
   * 2) For each place, calls Place Details to parse opening_hours.periods.
   * 3) Compares with the specified date/time (day of week + HHmm).
   * 
   * @param lat  Latitude
   * @param lon  Longitude
   * @param date A Date object representing the *local* date/time to check
   * @returns Number of places open at that time
   */
  export async function getOpenPlacesCountAtTime(
    lat: number,
    lon: number,
    date: Date
  ): Promise<number> {
    const apiKey = process.env.GOOGLE_PLACES_API_KEY;
    if (!apiKey) {
      console.warn("No GOOGLE_PLACES_API_KEY found. Returning 0.");
      return 0;
    }
  
    // Step 1: Nearby Search to get place IDs
    const radius = 1000; // 1 km example
    const nearbyUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lon}&radius=${radius}&key=${apiKey}`;
  
    let placeIds: string[] = [];
  
    try {
      const nearbyRes = await fetch(nearbyUrl);
      if (!nearbyRes.ok) {
        console.warn(`Nearby Search failed: ${nearbyRes.status} ${nearbyRes.statusText}`);
        return 0;
      }
  
      const nearbyData = (await nearbyRes.json()) as NearbySearchResponse;
      const results = nearbyData.results ?? [];
      placeIds = results
        .map((r) => r.place_id)
        .filter((id): id is string => Boolean(id)); // type guard to ensure string
    } catch (err) {
      console.error("Error fetching Nearby Search:", err);
      return 0;
    }
  
    if (placeIds.length === 0) {
      return 0;
    }
  
    // Convert date to dayOfWeek + HHmm
    const dayOfWeek = date.getDay(); // Sunday=0, Monday=1, ...
    const hh = String(date.getHours()).padStart(2, "0");
    const mm = String(date.getMinutes()).padStart(2, "0");
    const hhmm = `${hh}${mm}`;
  
    let openCount = 0;
  
    // Step 2: For each place ID, call Place Details
    for (const placeId of placeIds) {
      const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=opening_hours&key=${apiKey}`;
      try {
        const detailsRes = await fetch(detailsUrl);
        if (!detailsRes.ok) {
          console.warn(`Details fetch failed for placeId=${placeId}: ${detailsRes.status} ${detailsRes.statusText}`);
          continue;
        }
  
        const detailsData = (await detailsRes.json()) as PlaceDetailsResponse;
        const periods = detailsData.result?.opening_hours?.periods;
        if (!periods) {
          // No opening_hours data
          continue;
        }
  
        // If *any* period covers dayOfWeek/hhmm, it's open
        const isOpen = periods.some((p) => isOpenAtTime(p, dayOfWeek, hhmm));
        if (isOpen) {
          openCount++;
        }
      } catch (err) {
        console.error(`Error fetching details for placeId=${placeId}:`, err);
      }
    }
  
    return openCount;
  }
  