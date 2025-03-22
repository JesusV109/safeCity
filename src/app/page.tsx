"use client";
import React, { useState } from "react";
import Map, { Marker, Popup, ViewStateChangeEvent } from "react-map-gl";

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

export default function HomePage() {
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
    <main style={{ width: "100%", height: "100vh" }}>
      <Map
        {...viewState}
        onMove={(evt: ViewStateChangeEvent) => setViewState(evt.viewState)}
        style={{ width: "100%", height: "100%" }}
        mapStyle="mapbox://styles/mapbox/streets-v11"
        mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
        onClick={handleMapClick}
      >
        {selectedLocation && (
          <Marker longitude={selectedLocation.lon} latitude={selectedLocation.lat} />
        )}
        {popupOpen && selectedLocation && safetyData && (
          <Popup
            longitude={selectedLocation.lon}
            latitude={selectedLocation.lat}
            onClose={() => setPopupOpen(false)}
            closeButton={true}
            closeOnClick={false}
          >
            <div style={{ minWidth: "200px" }}>
              <h4>Safety Info</h4>
              <p><strong>Brightness:</strong> {safetyData.brightness}</p>
              <p><strong>Crime Rate:</strong> {safetyData.crimeRate} per 1k</p>
              <p><strong>Open Places:</strong> {safetyData.openPlacesCount}</p>
              <p><strong>AI Analysis:</strong> {safetyData.safetyAnalysis}</p>
            </div>
          </Popup>
        )}
      </Map>
    </main>
  );
}
