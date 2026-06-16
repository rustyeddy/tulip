<script lang="ts">
  interface Props {
    open: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    danger?: boolean;
    onconfirm?: () => void;
    oncancel?: () => void;
  }

  let {
    open = $bindable(),
    title,
    message,
    confirmLabel = 'Confirm',
    danger = false,
    onconfirm,
    oncancel,
  }: Props = $props();

  function cancel() {
    open = false;
    oncancel?.();
  }

  function confirm() {
    open = false;
    onconfirm?.();
  }

  function handleKeydown(e: KeyboardEvent) {
    if (!open) return;
    if (e.key === 'Escape') cancel();
    if (e.key === 'Enter') confirm();
  }
</script>

<svelte:window onkeydown={handleKeydown} />

{#if open}
  <div class="backdrop" role="presentation" onclick={cancel}>
    <div class="dialog" role="dialog" aria-modal="true" aria-labelledby="dialog-title"
         tabindex="-1"
         onclick={(e) => e.stopPropagation()}
         onkeydown={(e) => e.stopPropagation()}>
      <h2 id="dialog-title" class="dialog-title">{title}</h2>
      <p class="dialog-message">{message}</p>
      <div class="dialog-actions">
        <button class="btn-cancel" onclick={cancel}>Cancel</button>
        <button class="btn-confirm {danger ? 'danger' : ''}" onclick={confirm}>
          {confirmLabel}
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.6);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 100;
  }

  .dialog {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    padding: 24px;
    width: 360px;
    max-width: calc(100vw - 32px);
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .dialog-title {
    font-size: 15px;
    font-weight: 600;
    color: var(--text-primary);
  }

  .dialog-message {
    font-size: 13px;
    color: var(--text-secondary);
    line-height: 1.6;
  }

  .dialog-actions {
    display: flex;
    gap: 8px;
    justify-content: flex-end;
    margin-top: 4px;
  }

  .btn-cancel {
    padding: 6px 14px;
    border-radius: var(--radius-sm);
    border: 1px solid var(--border);
    color: var(--text-secondary);
    font-size: 13px;
    cursor: pointer;
    background: var(--bg-hover);
    transition: background 0.15s;
  }
  .btn-cancel:hover { background: var(--border); }

  .btn-confirm {
    padding: 6px 14px;
    border-radius: var(--radius-sm);
    background: var(--purple-mid);
    color: #fff;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    border: none;
    transition: background 0.15s;
  }
  .btn-confirm:hover { background: var(--purple-strong); }
  .btn-confirm.danger { background: var(--red-mid); }
  .btn-confirm.danger:hover { background: var(--red-dark); }
</style>
