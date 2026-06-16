<template>
  <div
    class="skeleton-loader"
    role="status"
    aria-label="Loading content"
  >
    <div class="skeleton-header">
      <div class="skeleton-line skeleton-title" />
      <div class="skeleton-line skeleton-subtitle" />
    </div>
    <div class="skeleton-card">
      <div class="skeleton-card-header" />
      <div class="skeleton-card-body">
        <div class="skeleton-line" />
        <div class="skeleton-line skeleton-short" />
        <div class="skeleton-line skeleton-medium" />
      </div>
    </div>
    <div class="skeleton-card">
      <div class="skeleton-card-header" />
      <div class="skeleton-card-body">
        <div class="skeleton-line" />
        <div class="skeleton-line skeleton-medium" />
      </div>
    </div>
  </div>
</template>

<script setup>
</script>

<style scoped>
.skeleton-loader {
  max-width: 100%;
  padding: 20px 0;
}

.skeleton-header {
  margin-bottom: var(--flagr-space-5, 24px);
}

.skeleton-line {
  height: 14px;
  background: var(--flagr-color-bg-muted, #f4f4f5);
  border-radius: var(--flagr-radius-sm, 6px);
  margin-bottom: var(--flagr-space-2, 8px);
  animation: shimmer 1.5s infinite;
  background-image: linear-gradient(
    90deg,
    var(--flagr-color-bg-muted, #f4f4f5) 25%,
    var(--flagr-color-bg-subtle, #fafafa) 50%,
    var(--flagr-color-bg-muted, #f4f4f5) 75%
  );
  background-size: 200% 100%;
}

.skeleton-title {
  width: 35%;
  height: 20px;
  margin-bottom: var(--flagr-space-3, 12px);
}

.skeleton-subtitle {
  width: 20%;
  height: 12px;
}

.skeleton-short {
  width: 40%;
}

.skeleton-medium {
  width: 70%;
}

.skeleton-card {
  border: 1px solid var(--flagr-color-border, #e4e4e7);
  border-radius: var(--flagr-radius-md, 10px);
  overflow: hidden;
  margin-bottom: var(--flagr-space-4, 16px);
}

.skeleton-card-header {
  height: 48px;
  background: var(--flagr-color-bg-subtle, #fafafa);
  border-bottom: 1px solid var(--flagr-color-border, #e4e4e7);
  animation: shimmer 1.5s infinite;
  background-image: linear-gradient(
    90deg,
    var(--flagr-color-bg-subtle, #fafafa) 25%,
    var(--flagr-color-bg-muted, #f4f4f5) 50%,
    var(--flagr-color-bg-subtle, #fafafa) 75%
  );
  background-size: 200% 100%;
}

.skeleton-card-body {
  padding: var(--flagr-space-4, 16px);
}

@keyframes shimmer {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .skeleton-line,
  .skeleton-card-header {
    animation: none;
  }
}
</style>
