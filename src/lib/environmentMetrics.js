export const NATIONAL_CO2_TARGET = 4100;

export const COUNTY_CO2_TARGETS = {
  'Harju maakond': 720,
  'Hiiu maakond': 180,
  'Ida-Viru maakond': 430,
  'Jõgeva maakond': 360,
  'Järva maakond': 330,
  'Lääne maakond': 260,
  'Lääne-Viru maakond': 440,
  'Põlva maakond': 280,
  'Pärnu maakond': 500,
  'Rapla maakond': 340,
  'Saare maakond': 420,
  'Tartu maakond': 390,
  'Valga maakond': 260,
  'Viljandi maakond': 380,
  'Võru maakond': 300,
};

export function getCo2Target(selectedCounty) {
  return selectedCounty ? COUNTY_CO2_TARGETS[selectedCounty] ?? 350 : NATIONAL_CO2_TARGET;
}

export function getCountyMetricScale(selectedCounty) {
  return selectedCounty ? getCo2Target(selectedCounty) / NATIONAL_CO2_TARGET : 1;
}
