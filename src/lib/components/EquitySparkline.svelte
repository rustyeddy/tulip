<script lang="ts">
  interface Props {
    values?:      number[];
    width?:       number;
    height?:      number;
    strokeWidth?: number;
  }

  let { values = [], width = 300, height = 60, strokeWidth = 1.5 }: Props = $props();

  let pts    = $derived(values.length > 1 ? values : [0, 0]);
  let min    = $derived(Math.min(...pts));
  let max    = $derived(Math.max(...pts));
  let range  = $derived(max - min || 1);

  let points = $derived(pts.map((v, i) => {
    const x = (i / (pts.length - 1)) * width;
    const y = height - ((v - min) / range) * (height - 4) - 2;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }));

  let polyline = $derived(points.join(' '));
  let trend    = $derived(pts[pts.length - 1] - pts[0]);
  let stroke   = $derived(trend >= 0 ? '#1D9E75' : '#E24B4A');
  let area     = $derived(`M${points[0]} L${points.join(' L')} L${width},${height} L0,${height} Z`);
</script>

<svg {width} {height} viewBox="0 0 {width} {height}" style="overflow: visible; width: 100%; height: {height}px;">
  <defs>
    <linearGradient id="equity-fill" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%"   stop-color={stroke} stop-opacity="0.25" />
      <stop offset="100%" stop-color={stroke} stop-opacity="0.02" />
    </linearGradient>
  </defs>
  <path d={area} fill="url(#equity-fill)" />
  <polyline
    points={polyline}
    fill="none"
    stroke={stroke}
    stroke-width={strokeWidth}
    stroke-linejoin="round"
    stroke-linecap="round"
  />
</svg>
