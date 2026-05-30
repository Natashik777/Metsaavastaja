import React, { useEffect, useRef } from 'react';
import {
  CategoryScale,
  Chart,
  Filler,
  LinearScale,
  LineController,
  LineElement,
  PointElement,
  Tooltip,
} from 'chart.js';
import { getCarbonTimeline } from '../lib/forestData.js';

Chart.register(LineElement, PointElement, LineController, CategoryScale, LinearScale, Filler, Tooltip);

const C = {
  green: '#8DA101',
  greenFill: 'rgba(141, 161, 1, 0.1)',
  red: '#F85552',
  redFill: 'rgba(248, 85, 82, 0.08)',
  blue: '#3A94C5',
  blueFill: 'rgba(58, 148, 197, 0.06)',
  grey: '#A6B0A0',
  greyDark: '#3D4A50',
  fg: '#5C6A72',
  bg: '#F3EAD3',
};

const verticalLinePlugin = {
  id: 'leftPanelVerticalLine',
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

const chartAnimation = { duration: 800, easing: 'easeOutQuart' };

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

function CarbonChart({ year }) {
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

    const timeline = getCarbonTimeline();
    const labels = timeline.map((item) => String(item.year));
    const currentIndex = labels.indexOf(String(year));
    const nextConfig = {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Seotud CO2',
            data: timeline.map((item) => item.sequestered),
            borderColor: C.green,
            backgroundColor: C.greenFill,
            borderWidth: 2.5,
            fill: true,
            pointRadius: 3,
            tension: 0.35,
          },
          {
            label: 'Vabastatud CO2',
            data: timeline.map((item) => item.released),
            borderColor: C.red,
            backgroundColor: C.redFill,
            borderWidth: 2.5,
            fill: true,
            pointRadius: 3,
            tension: 0.35,
          },
          {
            label: 'Netoneelamine',
            data: timeline.map((item) => item.net),
            borderColor: C.blue,
            backgroundColor: C.blueFill,
            borderDash: [6, 3],
            borderWidth: 2,
            fill: false,
            pointRadius: 3,
            tension: 0.35,
          },
        ],
      },
      options: {
        animation: chartAnimation,
        maintainAspectRatio: false,
        responsive: true,
        plugins: {
          legend: {
            labels: { boxWidth: 10, color: C.fg, font: { size: 11 } },
            position: 'bottom',
          },
          tooltip: {
            backgroundColor: C.bg,
            borderColor: C.grey,
            borderWidth: 1,
            bodyColor: C.fg,
            callbacks: {
              label: (ctx) => ` ${ctx.dataset.label}: ${ctx.parsed.y.toLocaleString('et-EE')} kt CO2`,
            },
            cornerRadius: 6,
            padding: 10,
            titleColor: C.fg,
          },
          leftPanelVerticalLine: { index: currentIndex },
        },
        scales: {
          x: {
            border: { color: C.greyDark },
            grid: { display: false },
            ticks: { color: C.fg, font: { size: 10 }, maxRotation: 45, minRotation: 45 },
          },
          y: {
            border: { color: C.greyDark },
            grid: { color: 'rgba(92, 106, 114, 0.08)', drawTicks: false },
            ticks: { color: C.fg, font: { size: 10 }, padding: 6 },
          },
        },
      },
    };

    if (!chartRef.current) {
      chartRef.current = new Chart(canvasRef.current, nextConfig);
      return undefined;
    }

    applyChartConfig(chartRef.current, nextConfig);

    return undefined;
  }, [year]);

  return (
    <section className="rounded-xl border border-[#d8cbb1] bg-[#fffbef] p-4 shadow-[0_16px_40px_rgba(61,74,80,0.1)]">
      <div className="mb-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8DA101]">
          Kogu Eesti
        </p>
        <h2 className="mt-1 text-[17px] font-semibold text-[#3D4A50]">Süsiniku sidumine</h2>
      </div>
      <div className="h-[230px]">
        <canvas ref={canvasRef} />
      </div>
    </section>
  );
}

export default CarbonChart;
