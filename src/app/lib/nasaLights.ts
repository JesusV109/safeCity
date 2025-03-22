// File: /app/lib/nasaLights.ts
import { fromUrl } from 'geotiff';

/**
 * Fetches a NASA nighttime lights GeoTIFF from Google Cloud Storage and
 * extracts the brightness at the given lat/lon.
 *
 * We have two files:
 *   1) lights.tif     covering lat from 40 to 50
 *   2) lightslower.tif covering lat from 30 to 40
 *
 * If lat >= 40 -> use lights.tif
 * If lat < 40  -> use lightslower.tif
 *
 * @param lat - Latitude
 * @param lon - Longitude
 * @returns A brightness (radiance) value in nW/(cm^2 sr) or similar units
 */
export async function getBrightnessFromNasaData(lat: number, lon: number): Promise<number> {
  // 1. Decide which file + bounding box to use based on lat
  let GCS_TIFF_URL: string;
  let west: number;
  let north: number;
  let east: number;
  let south: number;

  if (lat >= 40) {
    // lights.tif covers lat=40..50
    GCS_TIFF_URL = 'https://storage.googleapis.com/safecity/lights.tif';
    west = -80;
    north = 50;
    east = -70;
    south = 40;
  } else {
    // lightslower.tif covers lat=30..40
    GCS_TIFF_URL = 'https://storage.googleapis.com/safecity/lightslower.tif';
    west = -80;
    north = 40;
    east = -70;
    south = 30;
  }

  // 2. Load the selected GeoTIFF from the URL using geotiff.js
  const tiff = await fromUrl(GCS_TIFF_URL);
  const image = await tiff.getImage();

  // 3. Get the raster dimensions
  const width = image.getWidth();   // e.g., 2400
  const height = image.getHeight(); // e.g., 2400

  // 4. Convert (lat, lon) to fraction within the chosen bounding box
  const xFrac = (lon - west) / (east - west);
  const yFrac = (north - lat) / (north - south);

  // 5. Compute pixel indices
  const x = Math.floor(xFrac * width);
  const y = Math.floor(yFrac * height);

  // 6. Bounds check
  if (x < 0 || x >= width || y < 0 || y >= height) {
    console.warn(`Coordinates (lat=${lat}, lon=${lon}) out of GeoTIFF bounds for ${GCS_TIFF_URL}.`);
    return -9999; // sentinel for "no data"
  }

  // 7. Read a single pixel window
  const window = [x, y, x + 1, y + 1] as [number, number, number, number];
  const result = await image.readRasters({ window });

  // 8. Runtime checks
  if (!Array.isArray(result) || result.length < 1) {
    console.warn('readRasters() returned an empty or invalid array.');
    return -9999;
  }

  const firstBand = result[0];
  if (!(firstBand instanceof Float32Array)) {
    console.warn('readRasters() did not return a Float32Array for the first band.');
    return -9999;
  }

  // 9. The pixel value
  const brightness = firstBand[0];

  // 10. Handle NoData
  if (brightness === -999.9) {
    return -9999;
  }

  return brightness;
}
