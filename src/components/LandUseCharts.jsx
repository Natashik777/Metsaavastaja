import React from 'react';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import AnimatedCounter from './AnimatedCounter.jsx';

function LandUseTooltip({ active, payload }) {
  if (!active || !payload?.length) {
    return null;
  }

  const item = payload[0].payload;

  return (
    <div className="rounded-2xl border border-slate-700 bg-slate-950/95 px-4 py-3 text-sm text-slate-100 shadow-2xl backdrop-blur-md">
      <p className="font-semibold" style={{ color: item.color }}>
        {item.label}
      </p>
      <p className="mt-1 text-slate-300">{item.valueKm2.toLocaleString('et-EE')} km²</p>
      <p className="text-slate-400">{item.percent.toLocaleString('et-EE')}%</p>
    </div>
  );
}

function LandUseCharts({ data, selectedCounty, currentYear }) {
  const titleRegion = selectedCounty ?? 'Kogu Eesti';
  const totalKm2 = data.reduce((sum, item) => sum + item.valueKm2, 0);

  return (
    <aside className="relative z-20 flex w-full flex-col gap-5 border-t border-slate-800/80 bg-slate-950/96 p-5 shadow-2xl shadow-slate-950/40 lg:h-screen lg:w-[340px] lg:min-w-[320px] lg:max-w-[380px] lg:gap-4 lg:overflow-hidden lg:border-l lg:border-t-0 lg:p-6 xl:w-[380px]">
      <div className="pointer-events-none absolute inset-x-6 top-0 h-32 rounded-full bg-cyan-500/10 blur-3xl" />

      <header className="relative">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-cyan-300/25 bg-cyan-300/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-100">
          Maakasutus
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-white">MAAKASUTUS: {titleRegion}</h2>
        <p className="mt-2 text-sm leading-5 text-slate-400">
          Maa struktuur aastal {currentYear}, hinnangulised osakaalud ja pindalad.
        </p>
      </header>

      <section className="relative rounded-2xl border border-slate-700 bg-slate-900/80 p-4 shadow-2xl shadow-slate-950/30 backdrop-blur-md">
        <div className="absolute left-4 top-4 rounded-full border border-slate-700 bg-slate-950/60 px-3 py-1 text-xs font-semibold text-slate-300">
          <AnimatedCounter value={totalKm2} /> km²
        </div>

        <div className="h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Tooltip content={<LandUseTooltip />} />
              <Pie
                animationDuration={650}
                animationEasing="ease-out"
                data={data}
                dataKey="percent"
                innerRadius="58%"
                outerRadius="82%"
                paddingAngle={2}
                stroke="rgba(15, 23, 42, 0.9)"
                strokeWidth={3}
              >
                {data.map((item) => (
                  <Cell fill={item.color} key={item.key} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="relative flex min-h-0 flex-1 flex-col gap-2 overflow-hidden rounded-2xl border border-slate-700 bg-slate-900/80 p-4 backdrop-blur-md">
        {data.map((item) => (
          <div
            className="grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-xl border border-slate-800 bg-slate-950/35 px-3 py-2.5"
            key={item.key}
          >
            <span
              className="h-3 w-3 rounded-full shadow-glow"
              style={{ backgroundColor: item.color }}
            />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-white">{item.label}</p>
              <p className="text-xs text-slate-500">
                <AnimatedCounter value={item.valueHa} /> ha
              </p>
            </div>
            <p className="text-sm font-bold text-slate-100">
              <AnimatedCounter
                value={item.percent}
                formatOptions={{ minimumFractionDigits: 1, maximumFractionDigits: 1 }}
              />
              %
            </p>
          </div>
        ))}
      </section>
    </aside>
  );
}

export default LandUseCharts;
