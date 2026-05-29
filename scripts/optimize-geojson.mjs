import fs from 'node:fs';

const [, , inputPath, outputPath = inputPath, toleranceArg = '0.0008'] = process.argv;
const tolerance = Number(toleranceArg);

if (!inputPath || Number.isNaN(tolerance)) {
  console.error('Usage: node scripts/optimize-geojson.mjs <input> [output] [tolerance]');
  process.exit(1);
}

function squaredSegmentDistance(point, start, end) {
  let x = start[0];
  let y = start[1];
  let dx = end[0] - x;
  let dy = end[1] - y;

  if (dx !== 0 || dy !== 0) {
    const t = ((point[0] - x) * dx + (point[1] - y) * dy) / (dx * dx + dy * dy);

    if (t > 1) {
      x = end[0];
      y = end[1];
    } else if (t > 0) {
      x += dx * t;
      y += dy * t;
    }
  }

  dx = point[0] - x;
  dy = point[1] - y;

  return dx * dx + dy * dy;
}

function simplifyDouglasPeucker(points, squaredTolerance) {
  if (points.length <= 2) {
    return points;
  }

  let maxDistance = 0;
  let index = 0;
  const lastIndex = points.length - 1;

  for (let i = 1; i < lastIndex; i += 1) {
    const distance = squaredSegmentDistance(points[i], points[0], points[lastIndex]);

    if (distance > maxDistance) {
      index = i;
      maxDistance = distance;
    }
  }

  if (maxDistance > squaredTolerance) {
    const left = simplifyDouglasPeucker(points.slice(0, index + 1), squaredTolerance);
    const right = simplifyDouglasPeucker(points.slice(index), squaredTolerance);

    return left.slice(0, -1).concat(right);
  }

  return [points[0], points[lastIndex]];
}

function roundPoint(point) {
  return [Number(point[0].toFixed(5)), Number(point[1].toFixed(5))];
}

function simplifyRing(ring) {
  const isClosed =
    ring.length > 2 &&
    ring[0][0] === ring[ring.length - 1][0] &&
    ring[0][1] === ring[ring.length - 1][1];
  const openRing = isClosed ? ring.slice(0, -1) : ring;
  let simplified = simplifyDouglasPeucker(openRing, tolerance * tolerance).map(roundPoint);

  if (simplified.length < 3) {
    simplified = openRing.slice(0, 3).map(roundPoint);
  }

  if (isClosed) {
    simplified.push(simplified[0]);
  }

  return simplified;
}

function simplifyCoordinates(coordinates, type) {
  if (type === 'Polygon') {
    return coordinates.map(simplifyRing);
  }

  if (type === 'MultiPolygon') {
    return coordinates.map((polygon) => polygon.map(simplifyRing));
  }

  return coordinates;
}

function countPoints(geoJson) {
  let points = 0;

  function visit(coordinates) {
    if (typeof coordinates?.[0] === 'number') {
      points += 1;
      return;
    }

    coordinates?.forEach(visit);
  }

  geoJson.features?.forEach((feature) => visit(feature.geometry?.coordinates));

  return points;
}

const bytesBefore = fs.statSync(inputPath).size;
const source = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
const optimized = {
  ...source,
  features: source.features.map((feature) => ({
    ...feature,
    geometry: {
      ...feature.geometry,
      coordinates: simplifyCoordinates(feature.geometry.coordinates, feature.geometry.type),
    },
  })),
};

fs.writeFileSync(outputPath, JSON.stringify(optimized));

console.log(
  JSON.stringify({
    inputPath,
    outputPath,
    tolerance,
    pointsBefore: countPoints(source),
    pointsAfter: countPoints(optimized),
    bytesBefore,
    bytesAfter: fs.statSync(outputPath).size,
  }),
);
