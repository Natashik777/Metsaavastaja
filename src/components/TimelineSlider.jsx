import React from 'react';
import { DATA_YEARS } from '../lib/forestData.js';

const YEAR_STEP = 1;

function TimelineSlider({ currentYear, onYearChange }) {
  const minYear = DATA_YEARS[0];
  const maxYear = DATA_YEARS.at(-1);
  const progress = ((currentYear - minYear) / (maxYear - minYear)) * 100;

  const handleChange = (event) => {
    onYearChange(Number(event.target.value));
  };

  return (
    <div className="absolute bottom-5 left-1/2 z-[600] w-[min(92%,560px)] -translate-x-1/2 rounded-2xl border border-[#3D4A50] bg-white/86 px-4 pb-4 pt-5 shadow-[0_20px_55px_rgba(61,74,80,0.22)] backdrop-blur-xl transition-all duration-300">
      <div className="mb-8 flex items-start justify-between gap-4">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#9BA7B0]">Ajatelg</p>
        <span className="rounded-full border border-[#8DA101]/20 bg-[#8DA101]/10 px-4 py-2 text-sm font-semibold text-[#8DA101] shadow-[0_0_28px_rgba(141,161,1,0.18)]">
          {currentYear}
        </span>
      </div>

      <input
        aria-label="Vali andmeaasta"
        className="timeline-slider__input"
        style={{ '--slider-progress': `${progress}%` }}
        type="range"
        min={minYear}
        max={maxYear}
        step={YEAR_STEP}
        value={currentYear}
        onChange={handleChange}
      />

      <div className="mt-4 flex items-center justify-between text-xs font-semibold text-[#8EA0AF]">
        {DATA_YEARS.filter((year) => year === minYear || year === currentYear || year === maxYear).map((year) => (
          <button
            className={`rounded-full px-3 py-1.5 transition-all duration-300 ${
              year === currentYear
                ? 'bg-[#8DA101]/10 text-[#8DA101] shadow-[0_0_24px_rgba(141,161,1,0.18)]'
                : 'hover:bg-[#8DA101]/5 hover:text-[#5C6A72]'
            }`}
            key={year}
            type="button"
            onClick={() => onYearChange(year)}
          >
            {year}
          </button>
        ))}
      </div>
    </div>
  );
}

export default TimelineSlider;
