import React, { useMemo, useState } from 'react';
import AnimatedCounter from './components/AnimatedCounter.jsx';
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
    <main className="min-h-screen lg:h-screen lg:overflow-hidden" style={{ background: 'var(--background-0)', color: 'var(--foreground)' }}>
      <div className="flex min-h-screen flex-col lg:h-screen lg:min-h-0 lg:flex-row">
        <section className="relative min-h-[680px] flex-1 overflow-hidden lg:h-screen lg:min-h-0" style={{ background: 'var(--background-0)' }}>
          <ForestMap year={currentYear} onCountySelect={setSelectedCounty} />
          <TimelineSlider currentYear={currentYear} onYearChange={setCurrentYear} />
        </section>

        <LandUseCharts currentYear={currentYear} selectedCounty={selectedCounty} />
      </div>
    </main>
  );
}

export default App;
