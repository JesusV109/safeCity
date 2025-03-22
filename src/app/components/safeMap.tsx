// File: src/app/page.tsx
"use client";

import React, { useState } from "react";
import Image from "next/image";
import Map, { ViewStateChangeEvent, Marker, Popup } from "react-map-gl";

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
  // Map state
  const [viewState, setViewState] = useState({
    latitude: 40.0583,
    longitude: -74.4057,
    zoom: 7,
  });

  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lon: number } | null>(
    null
  );
  const [safetyData, setSafetyData] = useState<SafetyData | null>(null);
  const [popupOpen, setPopupOpen] = useState(false);

  // For a simple search bar:
  const [searchInput, setSearchInput] = useState("");

  // If you have a geocoding API, you can do an actual search:
  const handleSearch = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // e.g., call a geocoding service for `searchInput`, then setViewState with the coords
    console.log("Search for:", searchInput);
  };

  // On map click, fetch safety data
  async function handleMapClick(e: MapClickEvent) {
    const lat = e.lngLat.lat;
    const lon = e.lngLat.lng;

    setSelectedLocation({ lat, lon });
    setSafetyData(null);
    setPopupOpen(true);

    try {
      const res = await fetch(`/api/safety?lat=${lat}&lon=${lon}`);
      const data = await res.json();
      if (data.error) {
        console.error("API Error:", data.error);
        setSafetyData(null);
      } else {
        setSafetyData(data);
      }
    } catch (err) {
      console.error("Request Error:", err);
      setSafetyData(null);
    }
  }

  return (
    <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-8 sm:p-20">
      {/* MAIN SECTION */}
      <main className="flex flex-col gap-6 row-start-2 items-center w-full">
        {/* If you want a small brand image or text on top, you can keep or remove this */}
        <Image
          className="dark:invert"
          src="/next.svg"
          alt="Next.js logo"
          width={120}
          height={28}
          priority
        />

        {/* SEARCH BAR */}
        <form onSubmit={handleSearch} className="flex gap-2 items-center">
          <input
            className="rounded border px-3 py-1 w-60"
            type="text"
            placeholder="Search a location..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
          <button
            type="submit"
            className="rounded-full border border-solid border-gray-300 hover:bg-gray-200 py-1 px-4"
          >
            Search
          </button>
        </form>

        {/* MAP CONTAINER */}
        <div className="w-full h-[600px] mt-4 shadow-md border border-gray-300 rounded-md overflow-hidden">
          <Map
            {...viewState}
            onMove={(evt: ViewStateChangeEvent) => setViewState(evt.viewState)}
            style={{ width: "100%", height: "100%" }}
            mapStyle="mapbox://styles/mapbox/streets-v11"
            mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
            onClick={handleMapClick}
          >
            {/* If user clicked, show marker */}
            {selectedLocation && (
              <Marker
                longitude={selectedLocation.lon}
                latitude={selectedLocation.lat}
                color="blue"
              />
            )}

            {/* Popup with safety data */}
            {popupOpen && selectedLocation && safetyData && (
              <Popup
                longitude={selectedLocation.lon}
                latitude={selectedLocation.lat}
                onClose={() => setPopupOpen(false)}
                closeButton={true}
                closeOnClick={false}
              >
                <div style={{ minWidth: "180px" }}>
                  <h4 className="font-bold mb-1">Safety Info</h4>
                  <p>
                    <strong>Brightness:</strong> {safetyData.brightness}
                  </p>
                  <p>
                    <strong>Crime Rate:</strong> {safetyData.crimeRate} /1k
                  </p>
                  <p>
                    <strong>Open Places:</strong> {safetyData.openPlacesCount}
                  </p>
                  <p>
                    <strong>AI Analysis:</strong> {safetyData.safetyAnalysis}
                  </p>
                </div>
              </Popup>
            )}
          </Map>
        </div>
      </main>

      {/* FOOTER */}
      <footer className="row-start-3 flex gap-4 flex-wrap items-center justify-center text-sm text-gray-600">
        <p>© 2025 My App Name. All rights reserved.</p>
      </footer>
    </div>
  );
}
