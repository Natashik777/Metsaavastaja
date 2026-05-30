import React, { useEffect, useRef } from 'react';
import {
  BarController,
  BarElement,
  CategoryScale,
  Chart,
  LinearScale,
  Tooltip,
} from 'chart.js';

Chart.register(BarController, BarElement, CategoryScale, LinearScale, Tooltip);

const C = {
  green: '#8DA101',
  greenFill: 'rgba(141, 161, 1, 0.1)',
  red: '#F85552',
  grey: '#A6B0A0',
  greyDark: '#3D4A50',
  fg: '#5C6A72',
  bg: 'white',
};

const CO2_YEARS = ["2009","2010","2011","2012","2013","2014","2015","2016","2017","2018","2019","2020","2021","2022","2023"];
const CO2_DATA = {
  "Harju maakond":      [166.28, 165.17, 165.17, 165.17, 165.17, 162.50, 161.06, 159.62, 166.28, 164.43, 167.61, 167.39, 165.91, 162.02, 158.14],
  "Hiiu maakond":       [52.02,  53.72,  53.72,  53.72,  53.72,  54.83,  54.20,  53.58,  53.87,  51.87,  49.95,  50.17,  52.39,  51.84,  51.28],
  "Ida-Viru maakond":   [145.04, 145.26, 145.26, 145.26, 145.26, 150.37, 156.59, 162.80, 157.62, 146.15, 138.45, 139.05, 139.19, 138.68, 138.16],
  "Järva maakond":      [93.68,  94.20,  94.20,  94.20,  94.20,  90.35,  91.50,  92.65,  93.61,  98.27, 104.71, 106.12, 108.26, 110.03, 111.81],
  "Jõgeva maakond":     [93.54,  96.79,  96.79,  96.79,  96.79,  93.76,  92.80,  91.83,  95.02,  99.16,  99.38, 100.12, 101.60, 102.82, 104.04],
  "Lääne maakond":      [78.59,  76.89,  76.89,  76.89,  76.89,  84.14,  86.32,  88.50,  88.06,  84.51,  71.63,  71.34,  69.41,  70.93,  72.45],
  "Lääne-Viru maakond": [123.58, 123.28, 123.28, 123.28, 123.28, 138.45, 141.00, 143.56, 143.78, 140.75, 139.49, 139.49, 140.97, 142.12, 143.26],
  "Pärnu maakond":      [177.23, 179.60, 179.60, 179.60, 179.60, 190.77, 192.48, 194.18, 193.95, 199.58, 208.38, 209.79, 208.61, 210.83, 213.05],
  "Põlva maakond":      [84.43,  86.80,  86.80,  86.80,  86.80,  87.99,  85.32,  82.66,  86.51,  82.81,  69.86,  67.86,  68.15,  65.68,  63.20],
  "Rapla maakond":      [117.29, 115.14, 115.14, 115.14, 115.14, 118.25, 116.40, 114.55, 113.74, 114.55, 110.33, 109.22, 110.04, 108.49, 106.93],
  "Saare maakond":      [117.29, 118.70, 118.70, 118.70, 118.70, 124.54, 128.35, 132.16, 135.79, 131.35, 131.57, 127.72, 123.88, 125.80, 127.72],
  "Tartu maakond":      [86.36,  86.95,  86.95,  86.95,  86.95,  90.87,  96.75, 102.64,  98.64, 100.05, 104.41, 106.26, 104.41, 105.00, 105.60],
  "Valga maakond":      [85.54,  86.43,  86.43,  86.43,  86.43,  87.32,  86.43,  85.54,  85.10,  84.21,  85.54,  86.80,  90.87,  91.02,  91.17],
  "Viljandi maakond":   [124.17, 124.39, 124.39, 124.39, 124.39, 123.95, 122.47, 120.99, 121.66, 126.32, 129.06, 124.91, 124.76, 125.36, 125.95],
  "Võru maakond":       [81.18,  83.55,  83.55,  83.55,  83.55,  84.58,  85.32,  86.06,  91.02, 100.71, 115.59, 114.26, 112.63, 113.63, 114.63],
  "Kokku":              [1626.22,1636.87,1636.87,1636.87,1636.87,1682.67,1696.99,1711.32,1724.65,1724.72,1725.96,1720.50,1721.08,1724.24,1727.39],
};

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

function CarbonChart({ county, year }) {
  const canvasRef = useRef(null);
  const chartRef  = useRef(null);

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

    const values = CO2_DATA[county] ?? CO2_DATA['Kokku'];
    const selStr = String(year);
    const min = Math.min(...values);
    const max = Math.max(...values);

    const bgColors = CO2_YEARS.map((y, i) => {
      if (y === selStr) return C.green;
      const t = (values[i] - min) / (max - min || 1);
      const r = Math.round(192 + t * (59  - 192));
      const g = Math.round(221 + t * (109 - 221));
      const b = Math.round(151 + t * (17  - 151));
      return `rgba(${r},${g},${b},0.55)`;
    });
    const borderColors = CO2_YEARS.map((y) => (y === selStr ? C.red : 'transparent'));
    const borderWidths = CO2_YEARS.map((y) => (y === selStr ? 2 : 0));

    const nextConfig = {
      type: 'bar',
      data: {
        labels: CO2_YEARS,
        datasets: [{
          label: 'Süsiniku siduvus',
          data: values,
          backgroundColor: bgColors,
          borderColor: borderColors,
          borderWidth: borderWidths,
          borderRadius: 4,
          borderSkipped: false,
        }],
      },
      options: {
        animation: { duration: 400, easing: 'easeOutQuart' },
        maintainAspectRatio: false,
        responsive: true,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: C.bg,
            borderColor: C.grey,
            borderWidth: 1,
            bodyColor: C.fg,
            callbacks: {
              label: (ctx) => ` ${ctx.parsed.y.toFixed(2)} kt CO₂`,
            },
            cornerRadius: 6,
            padding: 10,
            titleColor: C.fg,
          },
        },
        scales: {
          x: {
            border: { color: C.greyDark },
            grid: { display: false },
            ticks: { color: C.fg, font: { size: 10 }, maxRotation: 45, minRotation: 45, autoSkip: false },
          },
          y: {
            border: { color: C.greyDark },
            grid: { color: 'rgba(92, 106, 114, 0.08)', drawTicks: false },
            min: 0,
            ticks: { color: C.fg, font: { size: 10 }, padding: 6, callback: (v) => `${v} kt` },
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
  }, [county, year]);

  return (
    <section className="rounded-xl border border-[#d8cbb1] bg-[white] p-4 shadow-[0_16px_40px_rgba(61,74,80,0.1)]">
      <div className="mb-3">
        <h2 className="mt-1 text-[17px] font-semibold text-[#3D4A50]">Süsiniku sidumine</h2>
      </div>
      <div className="mb-2 flex flex-wrap gap-4">
        <span className="flex items-center gap-1.5 text-[11px]" style={{ color: C.fg }}>
          <span className="inline-block h-3 w-3 rounded-sm" style={{ background: `linear-gradient(135deg, #C0DD97, ${C.green})` }} />
          Siduvus
        </span>
        <span className="flex items-center gap-1.5 text-[11px]" style={{ color: C.fg }}>
          <span className="inline-block h-3 w-3 rounded-sm" style={{ background: C.green, border: `2px solid ${C.red}` }} />
          Valitud aasta
        </span>
      </div>
      <div className="h-[230px]">
        <canvas ref={canvasRef} />
      </div>
    </section>
  );
}

export default CarbonChart;