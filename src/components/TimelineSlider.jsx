import React from 'react';
//import { DATA_YEARS } from '../lib/forestData.js';

const YEAR_STEP = 1;
const DATA_YEARS = Array.from({ length: 2025 - 2008 + 1 }, (_, i) => 2008 + i);

function TimelineSlider({ currentYear, onYearChange }) {
  const minYear = DATA_YEARS[0];
  const maxYear = DATA_YEARS.at(-1);
  const progress = ((currentYear - minYear) / (maxYear - minYear)) * 100;

  const handleChange = (event) => {
    onYearChange(Number(event.target.value));
  };
  return (
    <div className="absolute bottom-0 left-1/2 z-[600] w-[100%] border-t border-[#d8cbb1] -translate-x-1/2 bg-white px-4 pb-8 pt-4 shadow-2xl shadow-slate-950/20 backdrop-blur-xl transition-all duration-300">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="pl-4 h-8 w-8 flex-shrink-0">
            <svg width="36" height="36" viewBox="0 0 57 55" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M32.6667 44.6667V52.6667M30 44.6667H52.1333C52.6553 44.6593 53.1636 44.499 53.5952 44.2055C54.0269 43.912 54.3629 43.4983 54.5617 43.0156C54.7604 42.5329 54.8132 42.0025 54.7133 41.4902C54.6135 40.9778 54.3654 40.5061 54 40.1333L46 31.3333H46.8C47.3219 31.326 47.8302 31.1656 48.2619 30.8722C48.6936 30.5787 49.0296 30.1649 49.2284 29.6823C49.4271 29.1996 49.4798 28.6692 49.38 28.1569C49.2801 27.6445 49.0321 27.1727 48.6667 26.8L40.6667 18H41.2C41.7447 18.0491 42.2913 17.9296 42.7657 17.6576C43.2402 17.3857 43.6196 16.9744 43.8524 16.4796C44.0853 15.9847 44.1604 15.4303 44.0675 14.8913C43.9747 14.3524 43.7184 13.855 43.3333 13.4667L32.6667 2L28.9333 6M2 48.5L14.572 35.928M17.6446 37.5355C11.5299 34.0052 9.43489 26.1864 12.9652 20.0716C16.4955 13.9569 24.3144 11.8619 30.4291 15.3922C36.5438 18.9225 38.6388 26.7414 35.1085 32.8561C31.5782 38.9708 23.7593 41.0658 17.6446 37.5355Z" stroke="#8DA101" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
          <p className="pl-4 text-2xl font-semibold normalcase text-[var(--foreground)]">Metsaavastaja</p>
        </div>
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

      <div className="mt-4 grid text-s font-semibold text-[var(--foreground)]" style={{ gridTemplateColumns: `repeat(${DATA_YEARS.length}, 1fr)` }}>
        {DATA_YEARS.map((year) => (
          <button
            className={`flex justify-center rounded-full transition-all duration-300 ${
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