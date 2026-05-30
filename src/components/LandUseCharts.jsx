import React, { useEffect, useRef } from 'react';
import {
  ArcElement,
  BarController,
  BarElement,
  CategoryScale,
  Chart,
  DoughnutController,
  Filler,
  LinearScale,
  LineController,
  LineElement,
  PointElement,
  Tooltip,
} from 'chart.js';
import {
  getCountyDisplayName,
  getForestRow,
  getForestTimeline,
  getHarvestTimeline,
  getTreeComposition,
} from '../lib/forestData.js';

import CarbonChart from './CarbonChart.jsx';

Chart.register(
  LineElement,
  PointElement,
  LineController,
  BarElement,
  BarController,
  ArcElement,
  DoughnutController,
  CategoryScale,
  LinearScale,
  Filler,
  Tooltip,
);

const C = {
  green: '#8DA101',
  greenFill: 'rgba(141, 161, 1, 0.1)',
  red: '#F85552',
  redFill: 'rgba(248, 85, 82, 0.08)',
  blue: '#3A94C5',
  blueFill: 'rgba(58, 148, 197, 0.06)',
  yellow: '#DFA000',
  purple: '#DF69BA',
  grey: '#A6B0A0',
  greyDark: '#3D4A50',
  fg: '#5C6A72',
  bg: 'white',
  card: '#FFFBEF',
};

const verticalLinePlugin = {
  id: 'verticalLine',
  afterDraw(chart, _args, opts) {
    if (opts.index == null || opts.index < 0) {
      return;
    }

    const { ctx, chartArea, scales } = chart;
    const xPos = scales.x.getPixelForValue(opts.index);

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(xPos, chartArea.top);
    ctx.lineTo(xPos, chartArea.bottom);
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = C.red;
    ctx.stroke();
    ctx.restore();
  },
};

Chart.register(verticalLinePlugin);

const tooltipBase = {
  backgroundColor: C.bg,
  borderColor: C.grey,
  borderWidth: 1,
  titleColor: C.fg,
  bodyColor: C.fg,
  padding: 10,
  cornerRadius: 6,
};

function applyChartConfig(chart, nextConfig) {
  chart.data.labels = nextConfig.data.labels;
  chart.data.datasets.length = nextConfig.data.datasets.length;

  nextConfig.data.datasets.forEach((nextDataset, index) => {
    if (!chart.data.datasets[index]) {
      chart.data.datasets[index] = nextDataset;
      return;
    }

    Object.assign(chart.data.datasets[index], nextDataset);
  });

  chart.options.animation = nextConfig.options.animation;
  chart.options.plugins = nextConfig.options.plugins;
  chart.options.scales = nextConfig.options.scales;
  chart.update('default');
}

const scaleX = (rotate = false) => ({
  grid: { display: false },
  border: { display: true, color: C.greyDark },
  ticks: {
    color: C.fg,
    font: { size: 10 },
    ...(rotate ? { autoSkip: true, maxRotation: 45, minRotation: 45 } : {}),
  },
});

const scaleY = (tickExtra = {}) => ({
  grid: { color: 'rgba(92, 106, 114, 0.08)', drawTicks: false },
  border: { display: true, color: C.greyDark },
  ticks: { color: C.fg, font: { size: 10 }, padding: 6, ...tickExtra },
});

function useChart(configFactory, deps) {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);

  useEffect(
    () => () => {
      chartRef.current?.destroy();
      chartRef.current = null;
    },
    [],
  );

  useEffect(() => {
    if (!canvasRef.current) {
      return undefined;
    }

    const nextConfig = configFactory();

    if (!chartRef.current) {
      chartRef.current = new Chart(canvasRef.current, nextConfig);
      return undefined;
    }

    applyChartConfig(chartRef.current, nextConfig);

    return undefined;
  }, deps);

  return canvasRef;
}

function ChartShell({ title, children }) {
  return (
    <section className="rounded-xl border border-[#d8cbb1] bg-[white] p-4 shadow-[0_16px_40px_rgba(61,74,80,0.12)]">
      <div className="mb-3">
        <h3 className="mt-1 text-[17px] font-semibold text-[#3D4A50]">{title}</h3>
      </div>
      {children}
    </section>
  );
}

function ForestAreaChart({ county, year }) {
  const timeline = getForestTimeline(county);
  const labels = timeline.map((item) => String(item.year));
  const currentIndex = labels.indexOf(String(year));
  const canvasRef = useChart(
    () => ({
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Metsamaa pindala',
            data: timeline.map((item) => item.areaHa),
            borderColor: C.green,
            backgroundColor: C.greenFill,
            borderWidth: 2.5,
            fill: true,
            pointBackgroundColor: C.bg,
            pointBorderColor: C.green,
            pointBorderWidth: 2,
            pointRadius: 3,
            tension: 0.35,
          },
        ],
      },
      options: {
        animation: { duration: 300 },
        maintainAspectRatio: false,
        responsive: true,
        plugins: {
          legend: { display: false },
          tooltip: {
            ...tooltipBase,
            callbacks: {
              label: (ctx) => ` ${ctx.parsed.y.toLocaleString('et-EE')} ha`,
            },
          },
          verticalLine: { index: currentIndex },
        },
        scales: {
          x: scaleX(true),
          y: scaleY({ callback: (value) => `${Math.round(value / 1000)}k` }),
        },
      },
    }),
    [county, year],
  );

  return (
    <ChartShell title="Metsamaa pindala">
      <div className="h-[210px]">
        <canvas ref={canvasRef} />
      </div>
    </ChartShell>
  );
}

function ForestShareChart({ county, year }) {
  const row = getForestRow(county, year);
  const forestPct = row?.forestPct ?? 0;
  const canvasRef = useChart(
    () => ({
      type: 'doughnut',
      data: {
        labels: ['Metsad', 'Muu'],
        datasets: [
          {
            data: [forestPct, Math.max(0, 100 - forestPct)],
            backgroundColor: [C.green, C.grey],
            borderWidth: 0,
          },
        ],
      },
      options: {
        animation: { duration: 300 },
        cutout: '62%',
        maintainAspectRatio: false,
        responsive: true,
        plugins: {
          legend: { display: false },
          tooltip: {
            ...tooltipBase,
            callbacks: {
              label: (ctx) => ` ${ctx.label}: ${ctx.parsed.toFixed(1)}%`,
            },
          },
        },
      },
    }),
    [county, year],
  );

  return (
    <ChartShell title="Metsasus">
      <div className="relative h-[180px]">
        <canvas ref={canvasRef} />
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-[#8DA101]">{forestPct.toFixed(1)}%</span>
          <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#5C6A72]">
            Metsad
          </span>
        </div>
      </div>
    </ChartShell>
  );
}

function HarvestChart({ county, year }) {
  const timeline = getHarvestTimeline(county);
  const labels = timeline.map((item) => String(item.year));
  const selectedYear = String(year);
  const canvasRef = useChart(
    () => ({
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Raie',
            data: timeline.map((item) => item.harvesting),
            backgroundColor: labels.map((label) => (label === selectedYear ? C.purple : 'rgba(223, 105, 186, 0.2)')),
            borderRadius: 5,
          },
          {
            label: 'Uuendamine',
            data: timeline.map((item) => item.renewal),
            backgroundColor: labels.map((label) => (label === selectedYear ? C.green : 'rgba(141, 161, 1, 0.2)')),
            borderRadius: 5,
          },
        ],
      },
      options: {
        animation: { duration: 300 },
        maintainAspectRatio: false,
        responsive: true,
        plugins: {
          legend: {
            labels: { boxWidth: 10, color: C.fg, font: { size: 11 } },
            position: 'bottom',
          },
          tooltip: {
            ...tooltipBase,
            callbacks: {
              label: (ctx) => ` ${ctx.dataset.label}: ${ctx.parsed.y.toLocaleString('et-EE')} ha`,
            },
          },
        },
        scales: {
          x: scaleX(true),
          y: scaleY({ callback: (value) => `${Math.round(value / 1000)}k` }),
        },
      },
    }),
    [county, year],
  );

  return (
    <ChartShell title="Raie ja uuendamine">
      <div className="h-[220px]" style = {{marginBottom : "1.25rem"}}>
        <div style={{ display: "flex", gap: 16, marginBottom: "0.75rem" }}>
          {[["Raie", C.purple], ["Taasmetsastamine", C.green]].map(([label, color]) => (
            <span key={label} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: C.fg }}>
              <span style={{ width: 12, height: 12, background: color, borderRadius: 2, display: "inline-block" }} />
              {label}
            </span>
          ))}
          <span style={{ fontSize: 12, color: C.fgLight, marginLeft: 4 }}></span>
        </div>
        <canvas ref={canvasRef} />
      </div>
    </ChartShell>
  );
}

function TreeIcon({ item }) {
  const maxHeight = 100;
  const minHeight = 28;
  const height = minHeight + (Math.min(item.percent, 65) / 65) * (maxHeight - minHeight);
  const trunkHeight = height * 0.28;
  const crownHeight = height - trunkHeight;
  const crownWidth = crownHeight * 0.86;
  const width = Math.max(crownWidth + 8, 38);
  const centerX = width / 2;
  const trunkWidth = Math.max(4, height * 0.07);
  const isConifer = item.key === 'pine' || item.key === 'spruce';

  return (
    <div className="flex min-w-[44px] flex-col items-center gap-1">
      <span className="text-[11px] font-semibold text-[#3D4A50]">{Math.round(item.percent)}%</span>
      <svg className="block" height={maxHeight + 4} width={width}>
        <rect
          fill="#6B5B45"
          height={trunkHeight}
          rx="2"
          width={trunkWidth}
          x={centerX - trunkWidth / 2}
          y={maxHeight - trunkHeight}
        />
        {isConifer ? (
          <>
            <polygon
              fill={item.color}
              points={`${centerX},${maxHeight - trunkHeight - crownHeight} ${centerX - crownWidth / 2},${maxHeight - trunkHeight - crownHeight * 0.34} ${centerX + crownWidth / 2},${maxHeight - trunkHeight - crownHeight * 0.34}`}
            />
            <polygon
              fill={item.color}
              opacity="0.86"
              points={`${centerX},${maxHeight - trunkHeight - crownHeight * 0.56} ${centerX - crownWidth * 0.62},${maxHeight - trunkHeight - crownHeight * 0.05} ${centerX + crownWidth * 0.62},${maxHeight - trunkHeight - crownHeight * 0.05}`}
            />
          </>
        ) : (
          <ellipse
            cx={centerX}
            cy={maxHeight - trunkHeight - crownHeight * 0.5}
            fill={item.color}
            rx={crownWidth / 2}
            ry={crownHeight / 2}
          />
        )}
      </svg>
      <span className="text-[11px] text-[#3D4A50]">{item.label}</span>
    </div>
  );
}

function ForestCompositionChart({ county, year }) {
  const composition = getTreeComposition(county, year).slice(0, 6);

  return (
    <ChartShell title="Metsade liigiline koosseis">
      <div className="flex items-end justify-between gap-2 overflow-hidden pt-1">
        {composition.map((item) => (
          <TreeIcon item={item} key={item.key} />
        ))}
      </div>
    </ChartShell>
  );
}

function LandUseCharts({ selectedCounty, currentYear }) {
  const titleRegion = getCountyDisplayName(selectedCounty);

  return (
    <aside className="relative z-20 flex w-full flex-col border-t border-[#d8cbb1] bg-[white] text-[#3D4A50] shadow-2xl shadow-slate-950/20 lg:h-screen lg:w-[550px] lg:min-w-[420px] lg:max-w-[600px] lg:border-l lg:border-t-0">
      <header className="border-b border-[#d8cbb1] px-5 py-4">
        {/* <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8DA101]">
          Metsaavastaja graafikud
        </p> */}
        <h2 className="mt-1 text-2xl font-bold tracking-tight">{titleRegion}</h2>
      </header>

      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4">
        <ForestAreaChart county={selectedCounty} year={currentYear} />
        <ForestShareChart county={selectedCounty} year={currentYear} />
        <HarvestChart county={selectedCounty} year={currentYear} />
        <ForestCompositionChart county={selectedCounty} year={currentYear} />
        <CarbonChart county={selectedCounty} year={currentYear} />
      </div>
    </aside>
  );
}

export default LandUseCharts;