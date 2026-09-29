/**
 * Central design tokens.
 *
 * Tailwind classes are generated from the same values in tailwind.config.ts.
 * This module exists for the places that need real colour values in JavaScript
 * (Recharts, inline SVG). Nothing should hard-code a hex outside this file.
 */

export const COLORS = {
  // Surfaces — cream page, near-white cards, warm beige for supporting blocks
  canvas: '#F5F0E6',
  surface: '#FFFFFF',
  raised: '#FBF9F4',
  sand: '#E8DFCF',
  line: '#D9D4C8',
  lineStrong: '#C3BCAA',

  // Text — dark charcoal-green
  ink: '#263229',
  inkSoft: '#3E4C42',
  inkMuted: '#68736A',
  inkFaint: '#8D968E',

  // Green ramp — deep green for emphasis, sage for support
  leaf: {
    50: '#F1F5EE',
    100: '#E3EADD',
    200: '#C9D6C0',
    300: '#A8B99A',
    400: '#829B80',
    500: '#5F8062',
    600: '#456B4C',
    700: '#315B3D',
    800: '#2A4E35',
    900: '#23452F',
  },

  // Semantic status — green stays "healthy", amber warns, muted red is critical
  healthy: '#456B4C',
  warning: '#B8832A',
  caution: '#C79A3F',
  critical: '#A8442F',
  info: '#55706B',
  neutral: '#A3906B',
} as const;

/** Chart styling. Series colours are semantic first, decorative never. */
export const CHART = {
  grid: '#E7E1D4',
  axis: '#C3BCAA',
  axisText: '#68736A',
  cursor: '#C3BCAA',
  barCursor: '#EFEADE',
  track: '#E7E1D4',
  series: ['#315B3D', '#5F8062', '#A8B99A', '#A3906B', '#B8832A'],
  moisture: '#315B3D',
  temperature: '#A8442F',
  humidity: '#5F8062',
  light: '#B8832A',
  soilTemperature: '#A3906B',
} as const;

/** Measured series keys mapped to a stable colour so a metric looks the same everywhere. */
export const SERIES_COLOR: Record<string, string> = {
  soil_moisture: CHART.moisture,
  air_temperature: CHART.temperature,
  humidity: CHART.humidity,
  light: CHART.light,
  soil_temperature: CHART.soilTemperature,
};

export function seriesColor(key: string, index = 0): string {
  return SERIES_COLOR[key] ?? CHART.series[index % CHART.series.length];
}
