<script lang="ts">
  import type { Tone } from '../data/mockData';

  interface Props {
    label: string;
    value: string;
    delta: string;
    tone?: Tone;
  }

  let { label, value, delta, tone = 'neutral' }: Props = $props();
</script>

<div class="metric-card">
  <span class="metric-label">{label}</span>
  <span class="metric-value" class:positive={tone === 'positive'} class:negative={tone === 'negative'}>
    {value}
  </span>
  <span class="metric-delta" class:positive={tone === 'positive'} class:neutral={tone === 'neutral'}>
    {delta}
  </span>
</div>

<style>
  .metric-card {
    background: var(--bg-card);
    border-radius: var(--radius-md);
    padding: 11px 13px;
    display: flex;
    flex-direction: column;
    gap: 3px;
  }

  .metric-label {
    font-size: 11px;
    color: var(--text-hint);
  }

  .metric-value {
    font-size: 20px;
    font-weight: 500;
    color: var(--text-primary);
    line-height: 1.2;
  }

  .metric-delta {
    font-size: 11px;
  }
</style>
