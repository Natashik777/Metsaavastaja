import React, { useEffect, useMemo, useState } from 'react';
import AnalyticsCharts from './components/AnalyticsCharts.jsx';
import AnimatedCounter from './components/AnimatedCounter.jsx';
import ForestMap from './components/ForestMap.jsx';
import LandUseCharts from './components/LandUseCharts.jsx';
import TimelineSlider from './components/TimelineSlider.jsx';
import { getCountyMetricScale } from './lib/environmentMetrics.js';

const DEFAULT_YEAR = 2026;
const LAND_USE_COLORS = {
  forest: '#10b981',
  agriculture: '#eab308',
  urban: '#64748b',
  wetlands: '#365314',
  water: '#38bdf8',
};
const REGION_AREAS_KM2 = {
  'Harju maakond': 4333,
  'Hiiu maakond': 1032,
  'Ida-Viru maakond': 2971,
  'Jõgeva maakond': 2604,
  'Järva maakond': 2674,
  'Lääne maakond': 1816,
  'Lääne-Viru maakond': 3696,
  'Põlva maakond': 1823,
  'Pärnu maakond': 5419,
  'Rapla maakond': 2765,
  'Saare maakond': 2922,
  'Tartu maakond': 3349,
  'Valga maakond': 1917,
  'Viljandi maakond': 3422,
  'Võru maakond': 2305,
};
const LAND_USE_PROFILES = {
  default: { forest: 51, agriculture: 31, urban: 4.8, wetlands: 8.2, water: 5 },
  'Harju maakond': { forest: 42, agriculture: 28, urban: 15, wetlands: 5, water: 10 },
  'Ida-Viru maakond': { forest: 55, agriculture: 19, urban: 8, wetlands: 13, water: 5 },
  'Pärnu maakond': { forest: 54, agriculture: 25, urban: 4, wetlands: 12, water: 5 },
  'Rapla maakond': { forest: 56, agriculture: 31, urban: 3, wetlands: 7, water: 3 },
  'Saare maakond': { forest: 48, agriculture: 25, urban: 4, wetlands: 6, water: 17 },
  'Tartu maakond': { forest: 43, agriculture: 37, urban: 7, wetlands: 6, water: 7 },
};

function normalizeLandUseProfile(profile) {
  const clamped = Object.fromEntries(
    Object.entries(profile).map(([key, value]) => [key, Math.max(value, 0.5)]),
  );
  const total = Object.values(clamped).reduce((sum, value) => sum + value, 0);

  return Object.fromEntries(
    Object.entries(clamped).map(([key, value]) => [key, (value / total) * 100]),
  );
}

function generateLandUseData(selectedCounty, currentYear, selectedYearData) {
  const regionAreaKm2 = selectedCounty ? REGION_AREAS_KM2[selectedCounty] ?? 2500 : 45339;
  const profile = { ...(LAND_USE_PROFILES[selectedCounty] ?? LAND_USE_PROFILES.default) };
  const yearUrbanGrowth = (currentYear - 2020) * 0.1;
  const forestBalance = selectedYearData
    ? (selectedYearData.reforestation - selectedYearData.harvesting) / 600
    : 0;

  profile.urban += yearUrbanGrowth;
  profile.forest += forestBalance - yearUrbanGrowth * 0.35;
  profile.agriculture -= yearUrbanGrowth * 0.45;
  profile.wetlands -= forestBalance * 0.2;

  const normalized = normalizeLandUseProfile(profile);
  const categories = [
    ['forest', 'Metsamaa'],
    ['agriculture', 'Põllumaa'],
    ['urban', 'Ehitusalune maa'],
    ['wetlands', 'Sood ja rabad'],
    ['water', 'Veekogud'],
  ];

  return categories.map(([key, label]) => {
    const percent = normalized[key];
    const valueKm2 = Math.round((regionAreaKm2 * percent) / 100);

    return {
      key,
      label,
      percent,
      valueKm2,
      valueHa: valueKm2 * 100,
      color: LAND_USE_COLORS[key],
    };
  });
}

function App() {
  const [currentYear, setCurrentYear] = useState(DEFAULT_YEAR);
  const [analyticsData, setAnalyticsData] = useState([]);
  const [selectedCounty, setSelectedCounty] = useState(null);
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    let isMounted = true;

    async function loadDashboardData() {
      try {
        const analyticsResponse = await fetch('/data/analytics.json');

        if (!analyticsResponse.ok) {
          throw new Error('Unable to load local dashboard data.');
        }

        const analyticsJson = await analyticsResponse.json();

        if (isMounted) {
          setAnalyticsData(analyticsJson);
          setStatus('ready');
        }
      } catch (error) {
        console.error(error);
        if (isMounted) {
          setStatus('error');
        }
      }
    }

    loadDashboardData();

    return () => {
      isMounted = false;
    };
  }, []);

  const selectedYearData = useMemo(
    () => analyticsData.find((item) => item.year === currentYear),
    [analyticsData, currentYear],
  );
  const metricScale = getCountyMetricScale(selectedCounty);
  const co2CaptureValue = selectedYearData
    ? Math.round(selectedYearData.co2_capture * metricScale)
    : null;
  const netForestValue = selectedYearData
    ? Math.round((selectedYearData.reforestation - selectedYearData.harvesting) * metricScale)
    : null;
  const landUseData = useMemo(
    () => generateLandUseData(selectedCounty, currentYear, selectedYearData),
    [currentYear, selectedCounty, selectedYearData],
  );

  return (
    <main className="min-h-screen bg-slate-950 text-white lg:h-screen lg:overflow-hidden">
      <div className="flex min-h-screen flex-col lg:h-screen lg:min-h-0 lg:flex-row">
        <aside className="relative z-20 flex w-full flex-col gap-5 border-b border-slate-800/80 bg-slate-950/96 p-5 shadow-2xl shadow-slate-950/40 lg:h-screen lg:w-[360px] lg:min-w-[360px] lg:max-w-[420px] lg:gap-4 lg:overflow-hidden lg:border-b-0 lg:border-r lg:p-6 xl:w-[420px]">
          <div className="pointer-events-none absolute inset-x-6 top-0 h-32 rounded-full bg-emerald-500/10 blur-3xl" />

          <header className="relative flex items-start justify-between gap-4">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-400/25 bg-emerald-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-200">
                Häkatoniprojekt
              </div>
              <h1 className="text-3xl font-bold tracking-tight text-white lg:text-[34px]">
                Wild in Data
              </h1>
              <p className="mt-2 max-w-md text-sm leading-6 text-slate-400 lg:leading-5">
                Eesti keskkonnaandmete ülevaade: metsasus, süsiniku sidumine ja
                maakasutuse surve ühes interaktiivses vaates.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-700 bg-slate-900/70 px-4 py-3 text-right shadow-glow backdrop-blur-md">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Aasta</p>
              <p className="text-2xl font-bold text-emerald-300">{currentYear}</p>
            </div>
          </header>

          <section className="relative grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 backdrop-blur-md lg:p-3.5">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">CO2 sidumine</p>
              <p className="mt-2 text-2xl font-semibold text-white">
                <AnimatedCounter value={co2CaptureValue} />
                <span className="ml-1 text-sm font-medium text-slate-400">kt</span>
              </p>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 backdrop-blur-md lg:p-3.5">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Metsa netomuutus</p>
              <p className="mt-2 text-2xl font-semibold text-white">
                <AnimatedCounter value={netForestValue} />
                <span className="ml-1 text-sm font-medium text-slate-400">kha</span>
              </p>
            </div>
          </section>

          <AnalyticsCharts
            data={analyticsData}
            currentYear={currentYear}
            selectedCounty={selectedCounty}
          />

          {status === 'error' && (
            <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-100">
              Kohalikke andmeid ei õnnestunud laadida kaustast{' '}
              <span className="font-mono">public/data</span>.
            </div>
          )}
        </aside>

        <section className="relative min-h-[680px] flex-1 overflow-hidden bg-slate-950 lg:h-screen lg:min-h-0">
          <ForestMap year={currentYear} onCountySelect={setSelectedCounty} />
          <TimelineSlider currentYear={currentYear} onYearChange={setCurrentYear} />
        </section>

        <LandUseCharts
          currentYear={currentYear}
          data={landUseData}
          selectedCounty={selectedCounty}
        />
      </div>
    </main>
  );
}

export default App;
