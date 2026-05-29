import React from 'react';

const YEARS = [2020, 2023, 2026];

function TimelineSlider({ currentYear, onYearChange }) {
  const handleChange = (event) => {
    onYearChange(Number(event.target.value));
  };

  return (
    <div className="absolute bottom-5 left-1/2 z-[600] w-[min(92%,560px)] -translate-x-1/2 rounded-2xl border border-slate-700 bg-slate-900/78 p-4 shadow-2xl shadow-slate-950/50 backdrop-blur-xl transition-all duration-300">
      <div className="mb-3 flex items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Ajatelg</p>
          <p className="text-sm font-medium text-white">Metsasuse aasta</p>
        </div>
        <span className="rounded-full border border-emerald-300/30 bg-emerald-400/10 px-4 py-1.5 text-sm font-semibold text-emerald-200 shadow-glow">
          {currentYear}
        </span>
      </div>

      <input
        aria-label="Vali andmeaasta"
        className="h-2 w-full cursor-pointer appearance-none rounded-full bg-slate-700 transition-all duration-300 [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white [&::-moz-range-thumb]:bg-emerald-400 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:bg-emerald-400"
        type="range"
        min="2020"
        max="2026"
        step="3"
        value={currentYear}
        onChange={handleChange}
      />

      <div className="mt-3 flex justify-between text-xs font-medium text-slate-400">
        {YEARS.map((year) => (
          <button
            className={`rounded-full px-2 py-1 transition-all duration-300 ${
              year === currentYear ? 'bg-emerald-400/10 text-emerald-200' : 'hover:text-white'
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
