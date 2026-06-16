<script lang="ts">
  interface Props {
    icon: string;
    title: string;
    subtitle: string;
  }

  let { icon, title, subtitle }: Props = $props();
</script>

<div class="page">
  <div class="placeholder">
    <i class="ti {icon}" aria-hidden="true"></i>
    <h2>{title}</h2>
    <p>{subtitle}</p>
  </div>
</div>

<style>
  .page {
    display: flex;
    height: 100%;
    padding: 14px;
    overflow: hidden;
  }

  .placeholder {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    width: 100%;
    gap: 12px;
    color: var(--text-faint);
  }

  .placeholder i {
    font-size: 40px;
  }

  .placeholder h2 {
    font-size: 18px;
    font-weight: 500;
    color: var(--text-muted);
  }

  .placeholder p {
    font-size: 13px;
    color: var(--text-faint);
  }
</style>
