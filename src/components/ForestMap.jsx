import React, { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import { Protocol } from 'pmtiles';
import 'maplibre-gl/dist/maplibre-gl.css';

const FOREST_IMAGE_COORDS = [
  [21.774546, 59.684934], // top-left
  [28.207891, 59.684934], // top-right
  [28.207891, 57.509352], // bottom-right
  [21.774546, 57.509352], // bottom-left
];

function ForestMap({ year, onCountySelect }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const selectedCountyRef = useRef(null);
  const imageCacheRef = useRef(new Map());
  const currentForestLayerRef = useRef({ layerId: 'forest-layer', sourceId: 'forest' });

  async function loadImage(year) {
    if (imageCacheRef.current.has(year)) {
      return imageCacheRef.current.get(year);
    }
    const response = await fetch(`/images/${year}.webp`);
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    imageCacheRef.current.set(year, url);
    return url;
  }

  async function animateYears(years, onYearChange, delayMs = 800) {
    if (isAnimatingRef.current) return;
    isAnimatingRef.current = true;

    for (const year of years) {
      if (!isAnimatingRef.current) break;

      // Preload the image first
      await loadImage(year);

      // Switch to this year
      onYearChange(year);

      // Wait for the map to finish rendering the new layer
      await new Promise((resolve) => {
        const map = mapRef.current;
        if (!map) return resolve();

        const onIdle = () => {
          map.off('idle', onIdle);
          resolve();
        };

        map.once('idle', onIdle);

        // Fallback in case idle never fires
        setTimeout(resolve, 2000);
      });

      // Hold on this year before moving to next
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }

    isAnimatingRef.current = false;
  }

  function stopAnimation() {
    isAnimatingRef.current = false;
  }

  // Initialise map once
  useEffect(() => {
    const protocol = new Protocol();
    maplibregl.addProtocol('pmtiles', protocol.tile);

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: {
        version: 8,
        sources: {
          'carto-basemap': {
            type: 'raster',
            tiles: ['https://a.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}.png'],
            tileSize: 256,
          },
          'forest': {
            type: 'image',
            url: '/images/2026.webp',
            coordinates: FOREST_IMAGE_COORDS,
          },
          'counties': {
            type: 'geojson',
            data: '/data/maakond.geojson',
          },
        },
        layers: [
          {
            id: 'basemap',
            type: 'raster',
            source: 'carto-basemap',
          },
          {
            id: 'forest-layer',
            type: 'raster',
            source: 'forest',
            paint: { 'raster-opacity': 0.8 },
          },
          {
            id: 'counties-fill',
            type: 'fill',
            source: 'counties',
            paint: {
              'fill-color': [
                'case',
                ['==', ['get', 'MKOOD'], selectedCountyRef.current ?? ''],
                'rgba(0,0,0,0.15)',
                'rgba(0,0,0,0)',
              ],
            },
          },
          {
            id: 'counties-line',
            type: 'line',
            source: 'counties',
            paint: {
              'line-color': '#333',
              'line-width': 1,
            },
          },
          {
            id: 'counties-hover',
            type: 'fill',
            source: 'counties',
            paint: { 'fill-color': 'rgba(0,0,0,0.1)' },
            filter: ['==', 'MKOOD', ''],
          },
        ],
      },
      center: [24.75, 58.75],
      zoom: 6.5,
      dragPan: false,
      keyboard: false,
    });

    mapRef.current = map;

    map.on('load', () => {
      // Preload all years in the background
      const YEARS = Array.from({ length: 2026 - 2009 + 1 }, (_, i) => 2009 + i);
      YEARS.forEach((y) => loadImage(y));

      const resetView = () => {
        selectedCountyRef.current = null;
        onCountySelect?.(null);
        map.setPaintProperty('counties-fill', 'fill-color', [
          'case',
          ['==', ['get', 'MKOOD'], ''],
          'rgba(0,0,0,0.15)',
          'rgba(0,0,0,0)',
        ]);
        map.setFilter('counties-hover', ['==', 'MKOOD', '']);
        map.flyTo({ center: [24.75, 58.75], zoom: 6.5, duration: 500 });
      };

      map.on('mousemove', 'counties-fill', (e) => {
        if (e.features.length > 0) {
          map.setFilter('counties-hover', ['==', 'MKOOD', e.features[0].properties.MKOOD]);
          map.getCanvas().style.cursor = 'pointer';
        }
      });

      map.on('mouseleave', 'counties-fill', () => {
        map.setFilter('counties-hover', ['==', 'MKOOD', '']);
        map.getCanvas().style.cursor = '';
      });

      map.on('click', (e) => {
        const features = map.queryRenderedFeatures(e.point, { layers: ['counties-fill'] });

        if (features.length === 0) {
          resetView();
          return;
        }

        const feature = features[0];
        const { MKOOD: mkood, MNIMI: mnimi } = feature.properties;

        if (selectedCountyRef.current === mkood) {
          resetView();
          return;
        }

        selectedCountyRef.current = mkood;
        onCountySelect?.(mnimi);

        map.setPaintProperty('counties-fill', 'fill-color', [
          'case',
          ['==', ['get', 'MKOOD'], mkood],
          'rgba(0,0,0,0.15)',
          'rgba(0,0,0,0)',
        ]);

        const bounds = new maplibregl.LngLatBounds();
        const coords =
          feature.geometry.type === 'MultiPolygon'
            ? feature.geometry.coordinates.flat(2)
            : feature.geometry.coordinates.flat(1);
        coords.forEach(([lng, lat]) => bounds.extend([lng, lat]));
        map.fitBounds(bounds, { padding: 80, duration: 500 });
      });
    });

    return () => {
      map.remove();
      imageCacheRef.current.forEach((url) => URL.revokeObjectURL(url));
      imageCacheRef.current.clear();
    };
  }, []);

  // Swap forest image when year changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;

    const newSourceId = `forest-${year}`;
    const newLayerId = `forest-layer-${year}`;

    loadImage(year).then((url) => {
      // Image is already decoded in cache, add source and layer
      if (!map.getSource(newSourceId)) {
        map.addSource(newSourceId, {
          type: 'image',
          url,
          coordinates: FOREST_IMAGE_COORDS,
        });

        map.addLayer(
          {
            id: newLayerId,
            type: 'raster',
            source: newSourceId,
            paint: { 'raster-opacity': 0.8 },
          },
          'counties-fill',
        );
      }

      // Remove old layer after adding new one
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const { layerId, sourceId } = currentForestLayerRef.current;
          if (map.getLayer(layerId)) map.removeLayer(layerId);
          if (map.getSource(sourceId)) map.removeSource(sourceId);
          currentForestLayerRef.current = { layerId: newLayerId, sourceId: newSourceId };
        });
      });
    });
  }, [year]);

  return (
    <div className="relative h-full min-h-[680px] lg:min-h-0">
      <div ref={containerRef} className="h-full w-full" />
    </div>
  );
}

export default ForestMap;