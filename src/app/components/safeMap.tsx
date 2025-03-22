'use client';

import { useEffect, useRef, useState } from 'react';
import mapboxgl, { Map } from 'mapbox-gl';
import { getRouteFromMapbox } from './getRoute';
import { isRouteSafe } from './checkturf';
import { tryBestSafeRoute } from './trybestroute';

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || '';
const openWeatherApiKey = process.env.NEXT_PUBLIC_OPENWEATHER_API_KEY || '';

export default function SafeRouteMap() {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<Map | null>(null);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [destinationQuery, setDestinationQuery] = useState<string>('');
  const [destination, setDestination] = useState<[number, number] | null>(null);
  const [dangerZones, setDangerZones] = useState<Array<[number, number]>>([
    [-73.9851, 40.7589] // Example: Times Square
  ]);

  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords: [number, number] = [pos.coords.longitude, pos.coords.latitude];
        setUserLocation(coords);
      },
      (err) => {
        console.warn('Using fallback location:', err);
        setUserLocation([-73.9851, 40.7589]); // Times Square fallback
      },
      { enableHighAccuracy: true }
    );
  }, []);

  useEffect(() => {
    if (!userLocation || mapRef.current || !mapContainerRef.current) return;

    mapRef.current = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: 'mapbox://styles/mapbox/satellite-streets-v12',
      center: userLocation,
      zoom: 17,
      pitch: 70,
      bearing: 30,
      antialias: true
    });

    mapRef.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

    new mapboxgl.Marker({ color: 'red' })
      .setLngLat(userLocation)
      .setPopup(new mapboxgl.Popup().setText('You are here'))
      .addTo(mapRef.current);

    mapRef.current.on('load', () => {
      mapRef.current!.addSource('mapbox-dem', {
        type: 'raster-dem',
        url: 'mapbox://mapbox.terrain-rgb',
        tileSize: 512,
        maxzoom: 14
      });

      mapRef.current!.setTerrain({ source: 'mapbox-dem', exaggeration: 1.5 });

      const now = new Date();
      const hour = now.getHours();
      const azimuth = (hour / 24) * 2 * Math.PI;
      const altitude = Math.PI / 3;
      const sunPosition: [number, number] = [azimuth, altitude];

      mapRef.current!.addLayer({
        id: 'sky',
        type: 'sky',
        paint: {
          'sky-type': 'atmosphere',
          'sky-atmosphere-sun': sunPosition,
          'sky-atmosphere-sun-intensity': 15
        }
      });

      mapRef.current!.setLight({
        anchor: 'viewport',
        position: [1.5, 90, 80],
        intensity: hour < 6 || hour > 18 ? 0.3 : 1.0
      });

      let buildingColor = '#d1d1d1';

      fetch(
        `https://api.openweathermap.org/data/2.5/weather?lat=${userLocation[1]}&lon=${userLocation[0]}&appid=${openWeatherApiKey}`
      )
        .then((res) => res.json())
        .then((data) => {
          const weather = data?.weather?.[0]?.main?.toLowerCase() || '';
          if (weather.includes('rain')) buildingColor = '#5e718d';
          else if (weather.includes('cloud')) buildingColor = '#9e9e9e';
          else buildingColor = '#e8e8e8';
        })
        .catch((err) => {
          console.warn('Weather fetch failed, using default color.', err);
        })
        .finally(() => {
          mapRef.current!.addLayer({
            id: '3d-buildings',
            source: 'composite',
            'source-layer': 'building',
            filter: ['==', 'extrude', 'true'],
            type: 'fill-extrusion',
            minzoom: 15,
            paint: {
              'fill-extrusion-color': buildingColor,
              'fill-extrusion-height': ['get', 'height'],
              'fill-extrusion-base': ['get', 'min_height'],
              'fill-extrusion-opacity': 0.95,
              'fill-extrusion-vertical-gradient': true
            }
          });
        });
    });
  }, [userLocation]);

  useEffect(() => {
    const drawRoute = async () => {
      if (!userLocation || !destination || !mapRef.current) return;

      const route = await tryBestSafeRoute(userLocation, destination, dangerZones);
      if (!route) {
        alert("⚠️ No safe route found.");
        return;
      }

      const routeGeoJSON = {
        type: 'Feature',
        properties: {},
        geometry: route
      };

      const map = mapRef.current;

      if (map.getLayer('route-line')) map.removeLayer('route-line');
      if (map.getSource('route')) map.removeSource('route');

      map.addSource('route', {
        type: 'geojson',
        data: routeGeoJSON as GeoJSON.Feature<GeoJSON.LineString>
      });

      map.addLayer({
        id: 'route-line',
        type: 'line',
        source: 'route',
        layout: {
          'line-cap': 'round',
          'line-join': 'round'
        },
        paint: {
          'line-color': '#1DA1F2',
          'line-width': 6
        }
      });

      const bounds = new mapboxgl.LngLatBounds();
      route.coordinates.forEach((coord) => bounds.extend(coord as [number, number]));
      map.fitBounds(bounds, { padding: 60 });
    };

    drawRoute();
  }, [destination, userLocation, dangerZones]);

  return (
    <div style={{ position: 'relative', perspective: '1000px' }}>
      <div style={{ position: 'absolute', top: '3rem', left: '2rem', zIndex: 1 }}>
        <input
          type="text"
          value={destinationQuery}
          onChange={(e) => setDestinationQuery(e.target.value)}
          placeholder="Enter destination"
          style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '0.5rem',
            width: '20rem',
            fontFamily: 'Arial',
            fontSize: '1.2rem',
            color: 'black'
          }}
        />
        <button
          onClick={() => {
            fetch(
              `https://api.mapbox.com/search/geocode/v6/forward?q=${destinationQuery}&access_token=${mapboxgl.accessToken}`
            )
              .then((response) => response.json())
              .then((data) => {
                setDestination(data.features[0].geometry.coordinates);
              });
          }}
        >
          Search
        </button>
      </div>
      <div
        ref={mapContainerRef}
        style={{
          position: 'absolute',
          width: '100vw',
          height: '100vh',
          borderRadius: '12px',
          marginTop: '0',
          border: '2px solid #ccc'
        }}
      />
    </div>
  );
}