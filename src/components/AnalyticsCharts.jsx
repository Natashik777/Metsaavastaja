import React from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { getCo2Target, getCountyMetricScale } from '../lib/environmentMetrics.js';

function ChartCard({ title, eyebrow, children }) {
  return (
    <article className="flex min-h-0 flex-1 flex-col rounded-2xl border border-slate-700 bg-slate-800/40 p-4 shadow-2xl shadow-slate-950/30 backdrop-blur-md transition-all duration-300 hover:border-emerald-400/50 lg:p-3.5">
      <div className="mb-3 shrink-0">
        <p className="text-xs uppercase tracking-[0.18em] text-emerald-300/80">{eyebrow}</p>
        <h2 className="mt-1 text-base font-semibold text-white xl:text-lg">{title}</h2>
      </div>
      {children}
    </article>
  );
}

function CurrentYearDot({ cx, cy, payload, currentYear }) {
  if (payload.year !== currentYear) {
    return null;
  }

  return (
    <circle
      cx={cx}
      cy={cy}
      r={7}
      fill="#10b981"
      stroke="#ecfeff"
      strokeWidth={3}
      filter="drop-shadow(0 0 10px rgba(16, 185, 129, 0.8))"
    />
  );
}

function Co2Tooltip({ active, payload, label, target }) {
  if (!active || !payload?.length) {
    return null;
  }

  const value = Number(payload[0].value);
  const isInNorm = value >= target;
  const delta = Math.abs(value - target);

  return (
    <div className="rounded-2xl border border-slate-700 bg-slate-950/95 px-4 py-3 text-sm text-slate-100 shadow-2xl backdrop-blur-md">
      <p className="text-xs uppercase tracking-[0.18em] text-emerald-300">{label}</p>
      <p className="mt-1 font-semibold">CO2 sidumine: {value.toLocaleString('et-EE')} kt</p>
      <p className="text-slate-400">Eesmärk: {target.toLocaleString('et-EE')} kt</p>
      <p className={`mt-2 font-bold ${isInNorm ? 'text-emerald-300' : 'text-rose-300'}`}>
        {isInNorm ? 'Normis' : 'Alla normi'}
      </p>
      <p className="text-xs text-slate-400">
        {isInNorm ? 'Üle eesmärgi' : 'Puudu eesmärgist'}: {delta.toLocaleString('et-EE')} kt
      </p>
    </div>
  );
}

function AnalyticsCharts({ data, currentYear, selectedCounty }) {
  const co2Target = getCo2Target(selectedCounty);
  const metricScale = getCountyMetricScale(selectedCounty);
  const co2ChartData = data.map((item) => ({
    ...item,
    co2_capture_display: Math.round(item.co2_capture * metricScale),
  }));
  const selectedYearData = data.find((item) => item.year === currentYear);
  const comparisonData = selectedYearData
    ? [
        {
          year: currentYear,
          Metsastamine: Math.round(selectedYearData.reforestation * metricScale),
          Raie: Math.round(selectedYearData.harvesting * metricScale),
        },
      ]
    : [];

  return (
    <div className="relative flex min-h-0 flex-1 flex-col gap-4">
      <ChartCard
        eyebrow={selectedCounty ?? 'Kogu Eesti'}
        title={`CO2 sidumine ajas · Eesmärk ${co2Target.toLocaleString('et-EE')} kt`}
      >
        <div className="min-h-[160px] flex-1 lg:min-h-0">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={co2ChartData} margin={{ top: 12, right: 8, left: -22, bottom: 0 }}>
              <defs>
                <linearGradient id="co2Gradient" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.55} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#334155" strokeDasharray="4 4" vertical={false} />
              <XAxis dataKey="year" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip
                cursor={{ stroke: '#5eead4', strokeWidth: 1 }}
                content={(props) => <Co2Tooltip {...props} target={co2Target} />}
              />
              <ReferenceLine
                y={co2Target}
                stroke="#fb7185"
                strokeDasharray="6 6"
                strokeWidth={2}
                label={{
                  value: 'Eesmärk',
                  position: 'insideTopRight',
                  fill: '#fecdd3',
                  fontSize: 12,
                  fontWeight: 700,
                }}
              />
              <Area
                type="monotone"
                dataKey="co2_capture_display"
                name="CO2 sidumine"
                stroke="#34d399"
                strokeWidth={3}
                fill="url(#co2Gradient)"
                activeDot={{ r: 6, fill: '#ecfeff', stroke: '#10b981', strokeWidth: 3 }}
                dot={(props) => <CurrentYearDot {...props} currentYear={currentYear} />}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      <ChartCard eyebrow="Maakasutus" title={`Metsastamine vs raie, ${currentYear}`}>
        <div className="min-h-[160px] flex-1 lg:min-h-0">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={comparisonData} margin={{ top: 12, right: 10, left: -22, bottom: 0 }}>
              <CartesianGrid stroke="#334155" strokeDasharray="4 4" vertical={false} />
              <XAxis dataKey="year" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip
                cursor={{ fill: 'rgba(15, 23, 42, 0.45)' }}
                contentStyle={{
                  background: 'rgba(15, 23, 42, 0.94)',
                  border: '1px solid rgba(51, 65, 85, 0.95)',
                  borderRadius: 16,
                  color: '#f8fafc',
                }}
                labelStyle={{ color: '#a7f3d0' }}
              />
              <Legend wrapperStyle={{ color: '#cbd5e1', fontSize: 12 }} />
              <Bar dataKey="Metsastamine" radius={[10, 10, 0, 0]}>
                <Cell fill="#10b981" />
              </Bar>
              <Bar dataKey="Raie" radius={[10, 10, 0, 0]}>
                <Cell fill="#f59e0b" />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>
    </div>
  );
}

export default AnalyticsCharts;
