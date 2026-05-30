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
    const response = await fetch(`/images/${year+1}.webp`);
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    imageCacheRef.current.set(year, url);
    return url;
  }

  function getMapPadding() {
    const w = containerRef.current.clientWidth;
    const h = containerRef.current.clientHeight;
    return {
      top: h * 0.08,
      bottom: h * 0.25,
      left: w * 0.06,
      right: w * 0.06,
    };
  }

  async function animateYears(years, onYearChange, delayMs = 800) {
    if (isAnimatingRef.current) return;
    isAnimatingRef.current = true;
    for (const year of years) {
      if (!isAnimatingRef.current) break;
      await loadImage(year);
      onYearChange(year);
      await new Promise((resolve) => {
        const map = mapRef.current;
        if (!map) return resolve();
        const onIdle = () => { map.off('idle', onIdle); resolve(); };
        map.once('idle', onIdle);
        setTimeout(resolve, 2000);
      });
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
    isAnimatingRef.current = false;
  }

  function stopAnimation() {
    isAnimatingRef.current = false;
  }

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
              'fill-color': 'rgba(255,255,255,0)',
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
            id: 'counties-hover-line',
            type: 'line',
            source: 'counties',
            paint: {
              'line-color': '#004708',
              'line-width': 2.5,
            },
            filter: ['==', 'MKOOD', ''],
          },
        ],
      },
      center: [24.75, 58.4],
      zoom: 7,
      dragPan: false,
      keyboard: false,
      scrollZoom: false,
    });

    mapRef.current = map;

    map.on('load', () => {
      const YEARS = Array.from({ length: 2025 - 2008 + 1 }, (_, i) => 2008 + i);
      YEARS.forEach((y) => loadImage(y));

      const resetView = () => {
        selectedCountyRef.current = null;
        onCountySelect?.(null);
        map.setPaintProperty('counties-fill', 'fill-color', 'rgba(255,255,255,0)');
        map.setFilter('counties-hover-line', ['==', 'MKOOD', '']);
        map.flyTo({
          center: [24.75, 58.75],
          zoom: 7,
          duration: 500,
          padding: getMapPadding(),
        });
      };

      function zoomToFeature(feature) {
        const bounds = new maplibregl.LngLatBounds();
        const coords =
          feature.geometry.type === 'MultiPolygon'
            ? feature.geometry.coordinates.flat(2)
            : feature.geometry.coordinates.flat(1);
        coords.forEach(([lng, lat]) => bounds.extend([lng, lat]));

        map.setPadding({ top: 0, bottom: 0, left: 0, right: 0 });
        const camera = map.cameraForBounds(bounds, { padding: getMapPadding() });

        map.flyTo({
          center: camera?.center ?? bounds.getCenter(),
          zoom: camera?.zoom ?? 8,
          duration: 800,
          curve: 1,
          speed: 0.6,
        });
      }

      map.on('mousemove', 'counties-fill', (e) => {
        if (e.features.length > 0) {
          map.getCanvas().style.cursor = 'pointer';
          map.setFilter('counties-hover-line', ['==', 'MKOOD', e.features[0].properties.MKOOD]);
        }
      });

      map.on('mouseleave', 'counties-fill', () => {
        map.getCanvas().style.cursor = '';
        map.setFilter('counties-hover-line', ['==', 'MKOOD', '']);
      });

      containerRef.current.addEventListener('wheel', (e) => {
        e.preventDefault();
        e.stopPropagation();

        if (e.deltaY > 0) {
          resetView();
          return;
        }

        const rect = containerRef.current.getBoundingClientRect();
        const point = new maplibregl.Point(e.clientX - rect.left, e.clientY - rect.top);
        const features = map.queryRenderedFeatures(point, { layers: ['counties-fill'] });
        if (features.length === 0) return;

        const feature = features[0];
        const { MKOOD: mkood, MNIMI: mnimi } = feature.properties;

        selectedCountyRef.current = mkood;
        onCountySelect?.(mnimi);
        zoomToFeature(feature);

        map.setPaintProperty('counties-fill', 'fill-color', [
          'case',
          ['==', ['get', 'MKOOD'], mkood],
          'rgba(255,255,255,0)',
          'rgba(255,255,255,0.6)',
        ]);
      }, { passive: false });

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
        zoomToFeature(feature);
        map.setPaintProperty('counties-fill', 'fill-color', [
          'case',
          ['==', ['get', 'MKOOD'], mkood],
          'rgba(255,255,255,0)',
          'rgba(255,255,255,0.6)',
        ]);
      });
    });

    return () => {
      map.remove();
      imageCacheRef.current.forEach((url) => URL.revokeObjectURL(url));
      imageCacheRef.current.clear();
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;

    const newSourceId = `forest-${year}`;
    const newLayerId = `forest-layer-${year}`;

    loadImage(year).then((url) => {
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