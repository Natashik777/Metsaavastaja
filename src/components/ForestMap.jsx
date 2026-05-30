import React, { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import {
  CircleMarker,
  GeoJSON,
  ImageOverlay,
  MapContainer,
  Pane,
  TileLayer,
  Tooltip,
  useMap,
  useMapEvents,
} from 'react-leaflet';
import { getForestCoverage } from '../lib/forestData.js';

const INITIAL_MAP_CENTER = [58.65, 25.35];
const INITIAL_MAP_ZOOM = 7.49;
const WAQI_TOKEN = '42a959977b5acab37395e6362bb9a79a921f92e6';
const AIR_QUALITY_CACHE_KEY = 'wildInData.airQualityStations.v1';
const AIR_QUALITY_CACHE_TTL = 60 * 60 * 1000;
const AIR_QUALITY_GRID_SIZE = 5;
const AIR_QUALITY_BAND_SIZE = 12;
const AIR_QUALITY_MAX_DISTANCE_KM = 260;
const AIR_QUALITY_BOUNDS = [
  [57.35, 21.55],
  [59.85, 28.35],
];
const AIR_QUALITY_CANVAS_WIDTH = 680;
const AIR_QUALITY_CANVAS_HEIGHT = 320;
const AIR_QUALITY_CITIES = [
  { name: 'Tallinn', lat: 59.437, lng: 24.7536 },
  { name: 'Tartu', lat: 58.3776, lng: 26.729 },
  { name: 'Narva', lat: 59.3797, lng: 28.1791 },
  { name: 'Pärnu', lat: 58.3859, lng: 24.4971 },
  { name: 'Kohtla-Järve', lat: 59.3986, lng: 27.2731 },
  { name: 'Viljandi', lat: 58.3639, lng: 25.59 },
  { name: 'Rakvere', lat: 59.3464, lng: 26.3558 },
  { name: 'Võru', lat: 57.8428, lng: 27.0194 },
  { name: 'Valga', lat: 57.7778, lng: 26.0473 },
  { name: 'Kuressaare', lat: 58.2524, lng: 22.4897 },
];
const AIR_QUALITY_COLOR_SCALE = [
  [0, '#8da101'],
  [40, '#b7c84a'],
  [70, '#dfc345'],
  [100, '#dfa000'],
  [140, '#f97316'],
  [180, '#f85552'],
  [240, '#df69ba'],
  [320, '#7f1d7d'],
];
const COUNTY_RENDERER = L.svg({
  padding: 0.5,
});

function getAirQualityMeta(aqi) {
  if (aqi == null || Number.isNaN(aqi)) {
    return { color: '#94a3b8', label: 'Andmed puuduvad', radius: 9 };
  }

  if (aqi <= 50) {
    return { color: '#8da101', label: 'Hea', radius: 10 };
  }

  if (aqi <= 100) {
    return { color: '#dfa000', label: 'Mõõdukas', radius: 12 };
  }

  if (aqi <= 150) {
    return { color: '#f97316', label: 'Tundlikele halb', radius: 14 };
  }

  if (aqi <= 200) {
    return { color: '#f85552', label: 'Halb', radius: 16 };
  }

  if (aqi <= 300) {
    return { color: '#df69ba', label: 'Väga halb', radius: 18 };
  }

  return { color: '#7f1d1d', label: 'Ohtlik', radius: 20 };
}

function hexToRgb(hex) {
  const value = Number.parseInt(hex.replace('#', ''), 16);

  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255,
  };
}

function mixRgb(from, to, ratio) {
  const a = hexToRgb(from);
  const b = hexToRgb(to);
  const t = Math.min(Math.max(ratio, 0), 1);

  return {
    r: Math.round(a.r + (b.r - a.r) * t),
    g: Math.round(a.g + (b.g - a.g) * t),
    b: Math.round(a.b + (b.b - a.b) * t),
  };
}

function getAirQualityRgb(aqi) {
  for (let index = 1; index < AIR_QUALITY_COLOR_SCALE.length; index += 1) {
    const [stop, color] = AIR_QUALITY_COLOR_SCALE[index];
    const [previousStop, previousColor] = AIR_QUALITY_COLOR_SCALE[index - 1];

    if (aqi <= stop) {
      return mixRgb(previousColor, color, (aqi - previousStop) / (stop - previousStop));
    }
  }

  return hexToRgb(AIR_QUALITY_COLOR_SCALE.at(-1)[1]);
}

function getAirQualityColor(aqi) {
  const rgb = getAirQualityRgb(aqi);

  return `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
}

function getGeoJsonPolygons(geoData) {
  if (!geoData?.features) {
    return [];
  }

  return geoData.features.flatMap((feature) => {
    const geometry = feature.geometry;

    if (geometry?.type === 'Polygon') {
      return [geometry.coordinates];
    }

    if (geometry?.type === 'MultiPolygon') {
      return geometry.coordinates;
    }

    return [];
  });
}

function getDistanceKm(a, b) {
  const earthRadiusKm = 6371;
  const toRad = (value) => (value * Math.PI) / 180;
  const latDistance = toRad(b.lat - a.lat);
  const lngDistance = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const sinLat = Math.sin(latDistance / 2);
  const sinLng = Math.sin(lngDistance / 2);
  const value = sinLat * sinLat + Math.cos(lat1) * Math.cos(lat2) * sinLng * sinLng;

  return 2 * earthRadiusKm * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

function interpolateAqi(lat, lng, stations) {
  let weightSum = 0;
  let valueSum = 0;
  let nearestDistance = Infinity;

  stations.forEach((station) => {
    const distance = Math.max(getDistanceKm({ lat, lng }, station), 6);
    const weight = 1 / distance ** 2.15;

    nearestDistance = Math.min(nearestDistance, distance);
    weightSum += weight;
    valueSum += station.aqi * weight;
  });

  if (!weightSum || nearestDistance > AIR_QUALITY_MAX_DISTANCE_KM) {
    return null;
  }

  return valueSum / weightSum;
}

function getReadyAirStations(stations) {
  return stations.filter((station) => Number.isFinite(station.aqi));
}

function getNearestAirStation(lat, lng, stations) {
  return getReadyAirStations(stations).reduce(
    (nearest, station) => {
      const distance = getDistanceKm({ lat, lng }, station);

      if (!nearest || distance < nearest.distance) {
        return { ...station, distance };
      }

      return nearest;
    },
    null,
  );
}

function formatAirValue(value, suffix = '') {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return null;
  }

  return `${number.toLocaleString('et-EE', { maximumFractionDigits: 1 })}${suffix}`;
}

function renderAirPopup(countyName, layer, stations) {
  const readyStations = getReadyAirStations(stations);

  if (!readyStations.length) {
    const isLoading = stations.some((station) => station.status === 'loading');

    return `
      <div class="county-popup county-popup--air">
        <p class="county-popup__eyebrow">Õhukvaliteet</p>
        <p><strong>Maakond:</strong> ${countyName}</p>
        <p>${isLoading ? 'Laadin mõõteandmeid...' : 'Mõõteandmeid ei õnnestunud laadida.'}</p>
      </div>
    `;
  }

  const center = layer.getBounds().getCenter();
  const aqi = interpolateAqi(center.lat, center.lng, readyStations);
  const nearestStation = getNearestAirStation(center.lat, center.lng, readyStations);
  const meta = getAirQualityMeta(aqi);

  return `
    <div class="county-popup county-popup--air">
      <p class="county-popup__eyebrow">Õhukvaliteet</p>
      <p><strong>Maakond:</strong> ${countyName}</p>
      <div class="air-popup-score">
        <span class="air-popup-score__value">${aqi == null ? '-' : Math.round(aqi)}</span>
        <span>
          <strong>${meta.label}</strong>
          <small>AQI hinnang</small>
        </span>
      </div>
      ${
        nearestStation
          ? `<p><strong>Mõõtepunkt:</strong> ${nearestStation.stationName ?? nearestStation.name}</p>`
          : ''
      }
    </div>
  `;
}

function stationFromWaqiPayload(city, payload) {
  const aqi = Number(payload.data?.aqi);
  const iaqi = payload.data?.iaqi ?? {};

  return {
    ...city,
    aqi: Number.isFinite(aqi) ? aqi : null,
    metrics: {
      co: iaqi.co?.v,
      no2: iaqi.no2?.v,
      o3: iaqi.o3?.v,
      pm10: iaqi.pm10?.v,
      so2: iaqi.so2?.v,
    },
    stationName: payload.data?.city?.name ?? city.name,
    source: 'WAQI',
    status: 'ready',
    temperature: iaqi.t?.v,
    updatedAt: payload.data?.time?.s,
  };
}

function getClosestHourlyIndex(times) {
  const now = Date.now();

  return times.reduce(
    (best, time, index) => {
      const distance = Math.abs(new Date(time).getTime() - now);

      if (distance < best.distance) {
        return { distance, index };
      }

      return best;
    },
    { distance: Infinity, index: 0 },
  ).index;
}

function stationFromOpenMeteoPayload(city, payload) {
  const hourly = payload.hourly ?? {};
  const index = getClosestHourlyIndex(hourly.time ?? []);
  const aqi = Number(hourly.us_aqi?.[index] ?? hourly.european_aqi?.[index]);

  return {
    ...city,
    aqi: Number.isFinite(aqi) ? aqi : null,
    metrics: {
      co: hourly.carbon_monoxide?.[index],
      no2: hourly.nitrogen_dioxide?.[index],
      o3: hourly.ozone?.[index],
      pm10: hourly.pm10?.[index],
      pm25: hourly.pm2_5?.[index],
      so2: hourly.sulphur_dioxide?.[index],
    },
    source: 'Open-Meteo',
    stationName: `${city.name} air model`,
    status: 'ready',
    updatedAt: hourly.time?.[index],
  };
}

async function fetchJsonWithTimeout(url, timeoutMs = 6000) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, { signal: controller.signal });

    if (!response.ok) {
      throw new Error(`Request failed with ${response.status}`);
    }

    return await response.json();
  } finally {
    window.clearTimeout(timeout);
  }
}

function loadWaqiJsonp(city) {
  return new Promise((resolve, reject) => {
    const callbackName = `waqiCallback_${Date.now()}_${Math.random()
      .toString(36)
      .slice(2)}`;
    const script = document.createElement('script');
    const timeout = window.setTimeout(() => {
      cleanup();
      reject(new Error('WAQI JSONP timeout'));
    }, 3500);

    function cleanup() {
      window.clearTimeout(timeout);
      script.remove();
      delete window[callbackName];
    }

    window[callbackName] = (payload) => {
      cleanup();

      if (payload.status !== 'ok') {
        reject(new Error(payload.data || 'WAQI JSONP request failed'));
        return;
      }

      resolve(stationFromWaqiPayload(city, payload));
    };

    script.onerror = () => {
      cleanup();
      reject(new Error('WAQI JSONP script failed'));
    };
    script.src = `https://api.waqi.info/feed/geo:${city.lat};${city.lng}/?token=${WAQI_TOKEN}&callback=${callbackName}`;
    document.head.appendChild(script);
  });
}

async function loadWaqiStation(city) {
  try {
    const payload = await fetchJsonWithTimeout(
      `https://api.waqi.info/feed/geo:${city.lat};${city.lng}/?token=${WAQI_TOKEN}`,
      4500,
    );

    if (payload.status !== 'ok') {
      throw new Error(payload.data || 'WAQI request failed');
    }

    return stationFromWaqiPayload(city, payload);
  } catch (error) {
    console.warn(`WAQI fetch failed for ${city.name}; trying Open-Meteo`, error);

    try {
      const payload = await fetchJsonWithTimeout(
        `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${city.lat}&longitude=${city.lng}&hourly=european_aqi,us_aqi,pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone&forecast_days=1&timezone=Europe%2FTallinn`,
        8000,
      );

      return stationFromOpenMeteoPayload(city, payload);
    } catch (openMeteoError) {
      console.warn(`Open-Meteo failed for ${city.name}; trying WAQI JSONP`, openMeteoError);
      return loadWaqiJsonp(city);
    }
  }
}

function readCachedAirStations() {
  try {
    const raw = window.localStorage.getItem(AIR_QUALITY_CACHE_KEY);

    if (!raw) {
      return null;
    }

    const cached = JSON.parse(raw);

    if (!cached?.savedAt || !Array.isArray(cached.stations)) {
      return null;
    }

    const age = Date.now() - cached.savedAt;

    if (age < 0 || age > AIR_QUALITY_CACHE_TTL) {
      return null;
    }

    return {
      expiresIn: AIR_QUALITY_CACHE_TTL - age,
      stations: cached.stations,
    };
  } catch (error) {
    console.warn('Unable to read cached air quality data', error);
    return null;
  }
}

function writeCachedAirStations(stations) {
  try {
    window.localStorage.setItem(
      AIR_QUALITY_CACHE_KEY,
      JSON.stringify({
        savedAt: Date.now(),
        stations,
      }),
    );
  } catch (error) {
    console.warn('Unable to cache air quality data', error);
  }
}

function drawEstoniaClipPath(ctx, map, polygons, topLeft) {
  ctx.beginPath();

  polygons.forEach((polygon) => {
    polygon.forEach((ring) => {
      ring.forEach(([lng, lat], index) => {
        const point = map.latLngToLayerPoint([lat, lng]).subtract(topLeft);

        if (index === 0) {
          ctx.moveTo(point.x, point.y);
          return;
        }

        ctx.lineTo(point.x, point.y);
      });
      ctx.closePath();
    });
  });
}

function drawEstoniaOverlayClipPath(ctx, polygons) {
  const [[south, west], [north, east]] = AIR_QUALITY_BOUNDS;

  ctx.beginPath();

  polygons.forEach((polygon) => {
    polygon.forEach((ring) => {
      ring.forEach(([lng, lat], index) => {
        const x = ((lng - west) / (east - west)) * AIR_QUALITY_CANVAS_WIDTH;
        const y = ((north - lat) / (north - south)) * AIR_QUALITY_CANVAS_HEIGHT;

        if (index === 0) {
          ctx.moveTo(x, y);
          return;
        }

        ctx.lineTo(x, y);
      });
      ctx.closePath();
    });
  });
}

function createAirQualitySurfaceUrl(geoData, stations) {
  const readyStations = getReadyAirStations(stations);

  if (!geoData || readyStations.length < 2) {
    return null;
  }

  const [[south, west], [north, east]] = AIR_QUALITY_BOUNDS;
  const polygons = getGeoJsonPolygons(geoData);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { alpha: true });
  canvas.width = AIR_QUALITY_CANVAS_WIDTH;
  canvas.height = AIR_QUALITY_CANVAS_HEIGHT;

  const columns = Math.ceil(AIR_QUALITY_CANVAS_WIDTH / AIR_QUALITY_GRID_SIZE);
  const rows = Math.ceil(AIR_QUALITY_CANVAS_HEIGHT / AIR_QUALITY_GRID_SIZE);
  const surface = document.createElement('canvas');
  const surfaceCtx = surface.getContext('2d', { alpha: true });
  surface.width = columns;
  surface.height = rows;
  const image = surfaceCtx.createImageData(columns, rows);

  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const lng = west + ((column + 0.5) / columns) * (east - west);
      const lat = north - ((row + 0.5) / rows) * (north - south);
      const value = interpolateAqi(lat, lng, readyStations);

      if (value == null) {
        continue;
      }

      const bandedValue = Math.round(value / AIR_QUALITY_BAND_SIZE) * AIR_QUALITY_BAND_SIZE;
      const color = getAirQualityRgb(bandedValue);
      const offset = (row * columns + column) * 4;
      image.data[offset] = color.r;
      image.data[offset + 1] = color.g;
      image.data[offset + 2] = color.b;
      image.data[offset + 3] = 150;
    }
  }

  surfaceCtx.putImageData(image, 0, 0);
  ctx.save();
  drawEstoniaOverlayClipPath(ctx, polygons);
  ctx.clip('evenodd');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(surface, 0, 0, AIR_QUALITY_CANVAS_WIDTH, AIR_QUALITY_CANVAS_HEIGHT);
  ctx.restore();

  return canvas.toDataURL('image/png');
}

function getCoverageColor(coverage) {
  if (coverage > 50) {
    return '#065f46';
  }

  if (coverage >= 45) {
    return '#10b981';
  }

  return '#d97706';
}

function getCountyStyle(feature, year, isSelected = false) {
  const countyName = feature.properties?.MNIMI ?? '';
  const coverage = getForestCoverage(countyName, year);

  return {
    className: 'county-region',
    color: isSelected ? '#064e3b' : '#cbd5e1',
    fillColor: isSelected ? getCoverageColor(coverage) : '#ffffff',
    fillOpacity: isSelected ? 0.84 : 1,
    opacity: 1,
    weight: isSelected ? 2.8 : 1,
  };
}

function getAirBoundaryStyle(isSelected = false) {
  return {
    className: 'county-region county-region--air',
    color: isSelected ? '#3d4a50' : '#9fb4c8',
    fillColor: '#ffffff',
    fillOpacity: isSelected ? 0.24 : 0.1,
    opacity: isSelected ? 0.95 : 0.76,
    weight: isSelected ? 2.8 : 1,
  };
}

function getFeatureStyle(feature, year, isAirMode, isSelected = false) {
  return isAirMode ? getAirBoundaryStyle(isSelected) : getCountyStyle(feature, year, isSelected);
}

function getHoverStyle(feature, year, isAirMode, isSelected = false) {
  if (isAirMode) {
    return {
      color: '#3d4a50',
      fillColor: '#ffffff',
      fillOpacity: 0.28,
      opacity: 1,
      weight: isSelected ? 3.2 : 2.6,
    };
  }

  const countyName = feature.properties?.MNIMI ?? '';
  const coverage = getForestCoverage(countyName, year);

  return {
    color: '#064e3b',
    fillColor: getCoverageColor(coverage),
    fillOpacity: 0.84,
    weight: isSelected ? 3.2 : 2.8,
  };
}

function setLayerClass(layer, className, shouldAdd) {
  const element = layer.getElement?.();

  if (element) {
    element.classList.toggle(className, shouldAdd);
  }
}

function blurLayer(layer) {
  const element = layer.getElement?.();

  if (element && typeof element.blur === 'function') {
    element.blur();
  }
}

function MapInteractionReset({ onClearHover, onClearSelection }) {
  useMapEvents({
    click: (event) => {
      const target = event.originalEvent?.target;

      if (target?.classList?.contains('county-region')) {
        return;
      }

      onClearSelection();
    },
    mouseout: onClearHover,
  });

  return null;
}

function MapCameraController({ selectedBounds }) {
  const map = useMap();
  const hasMountedRef = useRef(false);

  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      return;
    }

    if (selectedBounds) {
      map.flyToBounds(selectedBounds, {
        padding: [50, 50],
        duration: 1.2,
      });
      return;
    }

    map.flyTo(INITIAL_MAP_CENTER, INITIAL_MAP_ZOOM, {
      duration: 1.2,
    });
  }, [map, selectedBounds]);

  return null;
}

function MapRedrawController({ geoJsonLayerRef }) {
  const map = useMap();

  useEffect(() => {
    function redrawLayer() {
      geoJsonLayerRef.current?.eachLayer?.((layer) => {
        layer.redraw?.();
      });
      map.invalidateSize({ animate: false });
    }

    map.on('moveend zoomend resize', redrawLayer);

    return () => {
      map.off('moveend zoomend resize', redrawLayer);
    };
  }, [geoJsonLayerRef, map]);

  return null;
}

function AirQualityStationMarkers({ stations }) {
  return (
    <>
      {stations.map((station) => {
        const meta = getAirQualityMeta(station.aqi);

        return (
          <CircleMarker
            center={[station.lat, station.lng]}
            className="air-quality-station"
            color="#fffbef"
            fillColor={meta.color}
            fillOpacity={0.95}
            interactive
            key={station.name}
            opacity={1}
            pane="airQualityMarkerPane"
            radius={Math.max(5, meta.radius * 0.48)}
            stroke
            weight={2}
          >
            <Tooltip
              className="air-quality-station-label"
              direction="top"
              offset={[0, -7]}
              opacity={0.95}
              permanent
            >
              <span>{station.name}</span>
            </Tooltip>
          </CircleMarker>
        );
      })}
    </>
  );
}

function AirQualityLayer({ geoData, stations }) {
  const surfaceUrl = useMemo(() => createAirQualitySurfaceUrl(geoData, stations), [geoData, stations]);

  return (
    <>
      <Pane name="airQualitySurfacePane" style={{ zIndex: 390, pointerEvents: 'none' }}>
        {surfaceUrl && (
          <ImageOverlay
            bounds={AIR_QUALITY_BOUNDS}
            className="air-quality-surface"
            interactive={false}
            opacity={1}
            url={surfaceUrl}
          />
        )}
      </Pane>
      <Pane name="airQualityMarkerPane" style={{ zIndex: 535 }}>
        <AirQualityStationMarkers stations={stations} />
      </Pane>
    </>
  );
}

function ForestMap({ mapMode = 'forest', onAirStationsChange, year, onCountySelect }) {
  const [geoData, setGeoData] = useState(null);
  const [airStations, setAirStations] = useState(
    AIR_QUALITY_CITIES.map((city) => ({ ...city, aqi: null, status: 'idle' })),
  );
  const [status, setStatus] = useState('loading');
  const [isLayerReady, setIsLayerReady] = useState(false);
  const [selectedBounds, setSelectedBounds] = useState(null);
  const selectedLayerRef = useRef(null);
  const hoveredLayerRef = useRef(null);
  const isPopupPinnedRef = useRef(false);
  const geoJsonLayerRef = useRef(null);
  const isAirMode = mapMode === 'air';

  useEffect(() => {
    onAirStationsChange?.(airStations);
  }, [airStations, onAirStationsChange]);

  useEffect(() => {
    if (!isAirMode) {
      return undefined;
    }

    let isMounted = true;

    async function loadAirQuality() {
      const cached = readCachedAirStations();

      if (cached) {
        setAirStations(cached.stations);
        return;
      }

      setAirStations(
        AIR_QUALITY_CITIES.map((city) => ({ ...city, aqi: null, status: 'loading' })),
      );

      const results = await Promise.all(
        AIR_QUALITY_CITIES.map(async (city) => {
          try {
            const result = await loadWaqiStation(city);

            if (isMounted) {
              setAirStations((currentStations) =>
                {
                  const nextStations = currentStations.map((station) =>
                    station.name === city.name ? result : station,
                  );
                  const hasPending = nextStations.some((station) => station.status === 'loading');

                  if (!hasPending) {
                    writeCachedAirStations(nextStations);
                  }

                  return nextStations;
                },
              );
            }

            return result;
          } catch (error) {
            console.error(`Unable to load air quality for ${city.name}`, error);

            const result = { ...city, aqi: null, status: 'error' };

            if (isMounted) {
              setAirStations((currentStations) =>
                {
                  const nextStations = currentStations.map((station) =>
                    station.name === city.name ? result : station,
                  );
                  const hasPending = nextStations.some((station) => station.status === 'loading');

                  if (!hasPending) {
                    writeCachedAirStations(nextStations);
                  }

                  return nextStations;
                },
              );
            }

            return result;
          }
        }),
      );

      if (isMounted) {
        setAirStations(results);
        writeCachedAirStations(results);
      }
    }

    loadAirQuality();
    const refreshInterval = window.setInterval(loadAirQuality, AIR_QUALITY_CACHE_TTL);

    return () => {
      isMounted = false;
      window.clearInterval(refreshInterval);
    };
  }, [isAirMode]);

  const clearHoveredLayer = useMemo(
    () => () => {
      const hoveredLayer = hoveredLayerRef.current;

      if (!hoveredLayer) {
        return;
      }

      setLayerClass(hoveredLayer, 'county-region--hovered', false);

      if (selectedLayerRef.current === hoveredLayer) {
        hoveredLayer.setStyle(getFeatureStyle(hoveredLayer.feature, year, isAirMode, true));
        setLayerClass(hoveredLayer, 'county-region--selected', true);
      } else {
        hoveredLayer.setStyle(getFeatureStyle(hoveredLayer.feature, year, isAirMode));

        if (!isPopupPinnedRef.current) {
          hoveredLayer.closePopup();
        }
      }

      hoveredLayerRef.current = null;
    },
    [isAirMode, year],
  );

  const clearSelectedLayer = useMemo(
    () => () => {
      const selectedLayer = selectedLayerRef.current;

      if (!selectedLayer) {
        isPopupPinnedRef.current = false;
        onCountySelect?.(null);
        return;
      }

      setLayerClass(selectedLayer, 'county-region--selected', false);
      setLayerClass(selectedLayer, 'county-region--hovered', false);
      blurLayer(selectedLayer);
      selectedLayer.setStyle(getFeatureStyle(selectedLayer.feature, year, isAirMode));
      selectedLayer.closePopup();
      selectedLayerRef.current = null;
      hoveredLayerRef.current = null;
      setSelectedBounds(null);
      isPopupPinnedRef.current = false;
      onCountySelect?.(null);
    },
    [isAirMode, onCountySelect, year],
  );

  useEffect(() => {
    let isMounted = true;

    async function loadGeoData() {
      try {
        setStatus('loading');
        setIsLayerReady(false);

        const response = await fetch('/data/maakond.json');

        if (!response.ok) {
          throw new Error('Unable to load county boundaries.');
        }

        const data = await response.json();

        if (isMounted) {
          setGeoData(data);
          setStatus('ready');
        }
      } catch (error) {
        console.error(error);

        if (isMounted) {
          setStatus('error');
        }
      }
    }

    loadGeoData();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    clearHoveredLayer();
    selectedLayerRef.current = null;
    isPopupPinnedRef.current = false;
    setSelectedBounds(null);
    onCountySelect?.(null);
    setIsLayerReady(false);
  }, [clearHoveredLayer, mapMode, onCountySelect, year]);

  const styleFeature = useMemo(
    () => (feature) => getFeatureStyle(feature, year, isAirMode),
    [isAirMode, year],
  );

  const bindCountyPopup = useMemo(
    () => (feature, layer) => {
      const countyName = feature.properties?.MNIMI ?? 'Tundmatu maakond';
      const coverage = getForestCoverage(countyName, year);

      layer.bindPopup(
        isAirMode
          ? renderAirPopup(countyName, layer, airStations)
          : `
            <div class="county-popup">
              <p class="county-popup__eyebrow">Metsasus</p>
              <p><strong>Maakond:</strong> ${countyName}</p>
              <p><strong>Metsasus:</strong> ${coverage}%</p>
            </div>
          `,
      );
      layer.on({
        mouseover: () => {
          if (hoveredLayerRef.current !== layer) {
            clearHoveredLayer();
          }

          hoveredLayerRef.current = layer;
          if (isAirMode) {
            layer.setPopupContent(renderAirPopup(countyName, layer, airStations));
          }

          layer.setStyle(getHoverStyle(feature, year, isAirMode, selectedLayerRef.current === layer));
          setLayerClass(layer, 'county-region--hovered', true);
          layer.bringToFront();

          if (!isPopupPinnedRef.current || selectedLayerRef.current === layer) {
            layer.openPopup();
          }
        },
        mouseout: () => {
          if (hoveredLayerRef.current === layer) {
            clearHoveredLayer();
          }
        },
        click: (event) => {
          event.originalEvent?.stopPropagation();

          if (selectedLayerRef.current === layer) {
            clearSelectedLayer();
            return;
          }

          if (selectedLayerRef.current && selectedLayerRef.current !== layer) {
            setLayerClass(selectedLayerRef.current, 'county-region--selected', false);
            selectedLayerRef.current.setStyle(styleFeature(selectedLayerRef.current.feature));
            selectedLayerRef.current.closePopup();
          }

          selectedLayerRef.current = layer;
          isPopupPinnedRef.current = true;
          setSelectedBounds(layer.getBounds());
          onCountySelect?.(countyName);
          layer.setStyle(getFeatureStyle(feature, year, isAirMode, true));
          setLayerClass(layer, 'county-region--selected', true);
          layer.bringToFront();
          layer.openPopup();
        },
      });
    },
    [
      airStations,
      clearHoveredLayer,
      clearSelectedLayer,
      isAirMode,
      onCountySelect,
      styleFeature,
      year,
    ],
  );

  return (
    <div className="relative h-full min-h-[680px] lg:min-h-0">
      <MapContainer
        center={INITIAL_MAP_CENTER}
        zoom={INITIAL_MAP_ZOOM}
        zoomSnap={0.1}
        zoomDelta={0.25}
        minZoom={6}
        maxZoom={10}
        scrollWheelZoom
        className="z-0"
      >
        <MapInteractionReset
          onClearHover={clearHoveredLayer}
          onClearSelection={clearSelectedLayer}
        />
        <MapCameraController selectedBounds={selectedBounds} />
        <MapRedrawController geoJsonLayerRef={geoJsonLayerRef} />

        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
          className="map-basemap-tiles"
          url="https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png"
        />

        {geoData && (
          <GeoJSON
            key={`${mapMode}-${year}`}
            ref={geoJsonLayerRef}
            data={geoData}
            eventHandlers={{
              add: () => setIsLayerReady(true),
            }}
            interactive
            renderer={COUNTY_RENDERER}
            style={styleFeature}
            onEachFeature={bindCountyPopup}
          />
        )}

        {geoData && isAirMode && <AirQualityLayer geoData={geoData} stations={airStations} />}
      </MapContainer>

      {status !== 'error' && (status === 'loading' || !isLayerReady) && (
        <div className="absolute inset-0 z-[500] grid place-items-center bg-white/90 backdrop-blur-sm">
          <div className="rounded-2xl border border-slate-200 bg-white/90 px-5 py-4 text-sm text-slate-700 shadow-lg">
            Laadin kaarti ja maakonnakihte...
          </div>
        </div>
      )}

      {status === 'error' && (
        <div className="absolute inset-0 z-[500] grid place-items-center bg-white/90 backdrop-blur-sm">
          <div className="rounded-2xl border border-amber-300 bg-amber-50 px-5 py-4 text-sm text-amber-900">
            Faili <span className="font-mono">/data/maakond.json</span> laadimine ebaõnnestus.
          </div>
        </div>
      )}
    </div>
  );
}

export default ForestMap;
