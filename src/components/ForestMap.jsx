import React, { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import { GeoJSON, MapContainer, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import { getForestCoverage } from '../lib/forestData.js';

const INITIAL_MAP_CENTER = [58.65, 25.35];
const INITIAL_MAP_ZOOM = 7.49;
const COUNTY_RENDERER = L.svg({
  padding: 0.5,
});
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

function ForestMap({ year, onCountySelect }) {
  const [geoData, setGeoData] = useState(null);
  const [status, setStatus] = useState('loading');
  const [isLayerReady, setIsLayerReady] = useState(false);
  const [selectedBounds, setSelectedBounds] = useState(null);
  const selectedLayerRef = useRef(null);
  const hoveredLayerRef = useRef(null);
  const isPopupPinnedRef = useRef(false);
  const geoJsonLayerRef = useRef(null);

  const clearHoveredLayer = useMemo(
    () => () => {
      const hoveredLayer = hoveredLayerRef.current;

      if (!hoveredLayer) {
        return;
      }

      setLayerClass(hoveredLayer, 'county-region--hovered', false);

      if (selectedLayerRef.current === hoveredLayer) {
        hoveredLayer.setStyle(getCountyStyle(hoveredLayer.feature, year, true));
        setLayerClass(hoveredLayer, 'county-region--selected', true);
      } else {
        hoveredLayer.setStyle(getCountyStyle(hoveredLayer.feature, year));

        if (!isPopupPinnedRef.current) {
          hoveredLayer.closePopup();
        }
      }

      hoveredLayerRef.current = null;
    },
    [year],
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
      selectedLayer.setStyle(getCountyStyle(selectedLayer.feature, year));
      selectedLayer.closePopup();
      selectedLayerRef.current = null;
      hoveredLayerRef.current = null;
      setSelectedBounds(null);
      isPopupPinnedRef.current = false;
      onCountySelect?.(null);
    },
    [onCountySelect, year],
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
  }, [clearHoveredLayer, onCountySelect, year]);

  const styleFeature = useMemo(
    () => (feature) => getCountyStyle(feature, year),
    [year],
  );

  const bindCountyPopup = useMemo(
    () => (feature, layer) => {
      const countyName = feature.properties?.MNIMI ?? 'Tundmatu maakond';
      const coverage = getForestCoverage(countyName, year);

      layer.bindPopup(`
        <div class="county-popup">
          <p class="county-popup__eyebrow">Metsasus</p>
          <p><strong>Maakond:</strong> ${countyName}</p>
          <p><strong>Metsasus:</strong> ${coverage}%</p>
        </div>
      `);
      layer.on({
        mouseover: () => {
          if (hoveredLayerRef.current !== layer) {
            clearHoveredLayer();
          }

          hoveredLayerRef.current = layer;
          layer.setStyle({
            color: '#064e3b',
            fillColor: getCoverageColor(coverage),
            fillOpacity: 0.84,
            weight: selectedLayerRef.current === layer ? 3.2 : 2.8,
          });
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
          layer.setStyle(getCountyStyle(feature, year, true));
          setLayerClass(layer, 'county-region--selected', true);
          layer.bringToFront();
          layer.openPopup();
        },
      });
    },
    [clearHoveredLayer, clearSelectedLayer, onCountySelect, styleFeature, year],
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
            key={year}
            ref={geoJsonLayerRef}
            data={geoData}
            eventHandlers={{
              add: () => setIsLayerReady(true),
            }}
            renderer={COUNTY_RENDERER}
            style={styleFeature}
            onEachFeature={bindCountyPopup}
          />
        )}
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
