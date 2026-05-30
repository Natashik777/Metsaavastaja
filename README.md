# Metsaavastaja

An interactive dashboard for exploring Estonian forest coverage data across counties and years.

## Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher)
- [Python](https://www.python.org/) 3.9+ (for generating forest overlay images)
- npm

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/yourusername/metsaavastaja.git
cd metsaavastaja
```

### 2. Install dependencies

```bash
npm install
```

### 3. Start the development server

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

## Building for production

```bash
npm run build
```

The production build will be output to the `dist/` directory.

To preview the production build locally:

```bash
npm run preview
```

## Project structure

```
├── public/
│   ├── data/           # GeoJSON county boundaries and analytics JSON
│   └── images/         # Generated forest overlay WebP images (by year)
├── scripts/
│   └── generate_images.py  # Python script for generating WebP overlays
├── src/
│   ├── components/     # React components
│   │   ├── ForestMap.jsx
│   │   ├── TimelineSlider.jsx
│   │   ├── LandUseCharts.jsx
│   │   └── ...
│   ├── lib/            # Data and utility functions
│   └── App.jsx
└── README.md
```

## Data sources

- Eesti metsa aastaraamatud: https://keskkonnaportaal.ee/et/metsa-aastaraamatud
- Statistikaamet, tabelid KK51, MM04, MM10 — andmed.stat.ee
- SMI metaandmed ja mõisted — stat.ee/et/metaandmed/21001
