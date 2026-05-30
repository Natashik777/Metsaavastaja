import React, { useMemo, useState } from 'react';
import AnimatedCounter from './components/AnimatedCounter.jsx';
import CarbonChart from './components/CarbonChart.jsx';
import ForestMap from './components/ForestMap.jsx';
import LandUseCharts from './components/LandUseCharts.jsx';
import TimelineSlider from './components/TimelineSlider.jsx';
import {
  DEFAULT_DATA_YEAR,
  getCountyDisplayName,
  getForestRow,
  getHarvestTimeline,
} from './lib/forestData.js';

function App() {
  const [currentYear, setCurrentYear] = useState(DEFAULT_DATA_YEAR);
  const [selectedCounty, setSelectedCounty] = useState(null);

  const selectedForestRow = useMemo(
    () => getForestRow(selectedCounty, currentYear),
    [currentYear, selectedCounty],
  );
  const selectedHarvest = useMemo(() => {
    const timeline = getHarvestTimeline(selectedCounty);
    return timeline.find((item) => item.year === currentYear) ?? timeline.at(-1);
  }, [currentYear, selectedCounty]);
  const regionName = getCountyDisplayName(selectedCounty);

  return (
    <main className="min-h-screen bg-[#F3EAD3] text-[#3D4A50] lg:h-screen lg:overflow-hidden">
      <div className="flex min-h-screen flex-col lg:h-screen lg:min-h-0 lg:flex-row">
        <aside className="relative z-20 flex w-full flex-col gap-5 border-b border-[#d8cbb1] bg-[#F3EAD3] p-5 shadow-2xl shadow-slate-950/15 lg:h-screen lg:w-[360px] lg:min-w-[360px] lg:max-w-[420px] lg:gap-4 lg:overflow-hidden lg:border-b-0 lg:border-r lg:p-6 xl:w-[420px]">
          <div className="pointer-events-none absolute inset-x-6 top-0 h-32 rounded-full bg-[#8DA101]/10 blur-3xl" />

          <header className="relative flex items-start justify-between gap-4">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#8DA101]/30 bg-[#8DA101]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#8DA101]">
                Reaalsed metsaandmed
              </div>
              <h1 className="text-3xl font-bold tracking-tight text-[#3D4A50] lg:text-[34px]">
                Wild in Data
              </h1>
              <p className="mt-2 max-w-md text-sm leading-6 text-[#5C6A72] lg:leading-5">
                Eesti maakondade metsasus, raiemaht, uuendamine ja puuliikide koosseis
                interaktiivsel kaardil.
              </p>
            </div>

            <div className="rounded-xl border border-[#d8cbb1] bg-[#fffbef] px-4 py-3 text-right shadow-[0_16px_40px_rgba(61,74,80,0.12)]">
              <p className="text-xs uppercase tracking-[0.2em] text-[#5C6A72]">Aasta</p>
              <p className="text-2xl font-bold text-[#8DA101]">{currentYear}</p>
            </div>
          </header>

          <section className="relative grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-[#d8cbb1] bg-[#fffbef] p-4 shadow-[0_16px_40px_rgba(61,74,80,0.1)] lg:p-3.5">
              <p className="text-xs uppercase tracking-[0.18em] text-[#5C6A72]">Metsasus</p>
              <p className="mt-2 text-2xl font-semibold text-[#3D4A50]">
                <AnimatedCounter
                  value={selectedForestRow?.forestPct ?? 0}
                  formatOptions={{ maximumFractionDigits: 1, minimumFractionDigits: 1 }}
                />
                <span className="ml-1 text-sm font-medium text-[#5C6A72]">%</span>
              </p>
              <p className="mt-1 text-xs text-[#7A8478]">{regionName}</p>
            </div>
            <div className="rounded-xl border border-[#d8cbb1] bg-[#fffbef] p-4 shadow-[0_16px_40px_rgba(61,74,80,0.1)] lg:p-3.5">
              <p className="text-xs uppercase tracking-[0.18em] text-[#5C6A72]">Raiemaht</p>
              <p className="mt-2 text-2xl font-semibold text-[#3D4A50]">
                <AnimatedCounter value={selectedHarvest?.harvesting ?? 0} />
                <span className="ml-1 text-sm font-medium text-[#5C6A72]">ha</span>
              </p>
              <p className="mt-1 text-xs text-[#7A8478]">{selectedHarvest?.year ?? currentYear}</p>
            </div>
          </section>

          <CarbonChart year={currentYear} />
        </aside>

        <section className="relative min-h-[680px] flex-1 overflow-hidden bg-slate-100 lg:h-screen lg:min-h-0">
          <ForestMap year={currentYear} onCountySelect={setSelectedCounty} />
          <TimelineSlider currentYear={currentYear} onYearChange={setCurrentYear} />
        </section>

        <LandUseCharts currentYear={currentYear} selectedCounty={selectedCounty} />
      </div>
    </main>
  );
}

export default App;
