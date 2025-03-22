"use client";

import React, { useState } from "react";
import Map, {
  ViewStateChangeEvent,
  Marker,
  Popup,
  Source,
  Layer,
} from "react-map-gl";
import { tryBestSafeRoute } from "@/app/components/trybestroute";
import * as turf from "@turf/turf";

// ✅ Import type definitions from geojson (or @turf/helpers)
import type { Feature, Polygon } from "geojson";

/**
 * Danger zone points: [lng, lat]
 */
const dangerZones: Array<[number, number]> = [
  [-74.3, 40.2],
  [-74.5, 40.1],
];

/**
 * We'll buffer these points to highlight them visually.
 * This function returns a FeatureCollection of polygons,
 * each representing a ~100m radius around the points.
 */
function makeDangerZonePolygons() {
  // Use Feature<Polygon> from 'geojson' for type
  const features: Array<Feature<Polygon>> = [];

  for (const [lng, lat] of dangerZones) {
    const point = turf.point([lng, lat]);
    // Buffer by 0.1km (~100m)
    const buffered = turf.buffer(point, 0.1, { units: "kilometers" });

    // Check that we have a polygon
    if (
      buffered &&
      buffered.geometry &&
      (buffered.geometry.type === "Polygon" || buffered.geometry.type === "MultiPolygon")
    ) {
      // Cast to Feature<Polygon> if it's definitely a polygon
      features.push(buffered as Feature<Polygon>);
    }
  }

  // Return a standard FeatureCollection with typed polygons
  return {
    type: "FeatureCollection",
    features: features,
  } as const;
}

const dangerZonePolygons = makeDangerZonePolygons();

interface MapClickEvent {
  lngLat: {
    lat: number;
    lng: number;
  };
}

type SafetyData = {
  brightness: number;
  crimeRate: number;
  openPlacesCount: number;
  safetyAnalysis: string;
};

export default function Home() {
  // Basic map state
  const [viewState, setViewState] = useState({
    latitude: 40.0583,
    longitude: -74.4057,
    zoom: 7,
  });

  // Route logic
  const [origin, setOrigin] = useState<[number, number] | null>(null);
  const [destination, setDestination] = useState<[number, number] | null>(null);
  const [routeGeoJson, setRouteGeoJson] = useState<GeoJSON.LineString | null>(null);

  // Safety popup
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lon: number } | null>(null);
  const [safetyData, setSafetyData] = useState<SafetyData | null>(null);
  const [popupOpen, setPopupOpen] = useState(false);

  // Chat box state
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<string[]>([]);

  // When user clicks on the map
  async function handleMapClick(e: MapClickEvent) {
    const { lat, lng } = e.lngLat;

    if (!origin) {
      // 1) If no origin, set origin
      setOrigin([lng, lat]);
      return;
    }

    if (!destination) {
      // 2) If no destination, set it & compute route
      setDestination([lng, lat]);
      try {
        const route = await tryBestSafeRoute(origin, [lng, lat], dangerZones);
        if (!route) {
          setRouteGeoJson(null);
        } else {
          setRouteGeoJson(route);
        }
      } catch (err) {
        console.error("Error computing route:", err);
      }
      return;
    }

    // 3) If origin & destination exist, show safety popup
    setSelectedLocation({ lat, lon: lng });
    setSafetyData(null);
    setPopupOpen(true);

    try {
      const res = await fetch(`/api/safety?lat=${lat}&lon=${lng}`);
      const data = await res.json();
      if (!data.error) setSafetyData(data);
    } catch (err) {
      console.error("Request Error:", err);
    }
  }

  // Build a Feature for the route if we have one
  const routeFeature = routeGeoJson
    ? {
        type: "Feature",
        geometry: routeGeoJson,
        properties: {},
      }
    : null;

  // Minimal chat send
  function handleChatSend() {
    if (!chatInput.trim()) return;
    setChatMessages((prev) => [...prev, `User: ${chatInput}`]);
    setChatInput("");
  }

  return (
    <div className="w-full h-screen relative">
      {/* Minimal chat box in bottom-right */}
      <div className="absolute bottom-4 right-4 bg-white p-2 w-64 rounded shadow-md z-10 flex flex-col">
        <div className="overflow-y-auto h-24 mb-2 text-xs border rounded p-1">
          {chatMessages.map((msg, i) => (
            <p key={i} className="mb-1">{msg}</p>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            className="border flex-1 rounded px-1 text-xs"
            type="text"
            placeholder="Ask AI..."
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
          />
          <button
            onClick={handleChatSend}
            className="bg-blue-500 text-white px-2 py-1 text-xs rounded"
          >
            Send
          </button>
        </div>
      </div>

      {/* Map */}
      <Map
        {...viewState}
        onMove={(evt: ViewStateChangeEvent) => setViewState(evt.viewState)}
        style={{ width: "100%", height: "100%" }}
        mapStyle="mapbox://styles/mapbox/streets-v11"
        mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
        onClick={handleMapClick}
      >
        {/* If we have an origin/destination, place markers */}
        {origin && <Marker longitude={origin[0]} latitude={origin[1]} color="red" />}
        {destination && (
          <Marker longitude={destination[0]} latitude={destination[1]} color="green" />
        )}

        {/* If we have a route, draw it */}
        {routeFeature && (
          <Source id="safeRoute" type="geojson" data={routeFeature}>
            <Layer
              id="safeRouteLine"
              type="line"
              paint={{
                "line-color": "#00BFFF",
                "line-width": 4,
              }}
            />
          </Source>
        )}

        {/* Danger zone polygons to highlight unsafe areas */}
        <Source id="dangerZones" type="geojson" data={dangerZonePolygons}>
          <Layer
            id="dangerZones-fill"
            type="fill"
            paint={{
              "fill-color": "#FF0000",
              "fill-opacity": 0.3,
            }}
          />
          <Layer
            id="dangerZones-outline"
            type="line"
            paint={{
              "line-color": "#FF0000",
              "line-width": 2,
            }}
          />
        </Source>

        {/* Popup for NASA safety info if user clicked a third time */}
        {popupOpen && selectedLocation && safetyData && (
          <Popup
            longitude={selectedLocation.lon}
            latitude={selectedLocation.lat}
            onClose={() => setPopupOpen(false)}
            closeButton={true}
            closeOnClick={false}
          >
            <div style={{ minWidth: "180px" }}>
              <h4 className="font-bold mb-1 text-sm">Safety Info</h4>
              <p className="text-xs">
                <strong>Brightness:</strong> {safetyData.brightness}
              </p>
              <p className="text-xs">
                <strong>Crime Rate:</strong> {safetyData.crimeRate} /1k
              </p>
              <p className="text-xs">
                <strong>Open Places:</strong> {safetyData.openPlacesCount}
              </p>
              <p className="text-xs">
                <strong>AI Analysis:</strong> {safetyData.safetyAnalysis}
              </p>
            </div>
          </Popup>
        )}
      </Map>
    </div>
  );
}
