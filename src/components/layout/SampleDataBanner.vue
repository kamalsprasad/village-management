<template>
  <div class="sample-data-banner">
    <div class="banner-content">
      <div class="banner-text">
        <q-icon name="science" size="sm" class="q-mr-sm" />
        <span class="text-weight-medium">
          🏷️ SAMPLE DATA MODE - Exploring Katete Model Village
        </span>
      </div>
      <div>
        Refer to
        <a
          href="https://github.com/kamalsprasad/village-management/blob/main/ROADMAP.md"
          target="_blank"
        >
          ROADMAP</a
        >
        to see switch features are functional. Sample Data will be reset at midnight.
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.sample-data-banner {
  background: linear-gradient(90deg, #ffc107 0%, #ffca28 100%);
  color: #000;
  padding: 6px 16px;
  position: relative;
  border-bottom: 1px solid rgba(0, 0, 0, 0.1);
  /* No fixed z-index needed as it is inside QHeader */
}

.banner-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  max-width: 100%;
  margin: 0 auto;
  flex-wrap: wrap;
  gap: 8px;
}

.banner-text {
  display: flex;
  align-items: center;
  font-size: 13px;
  letter-spacing: 0.3px;
}

.wipe-btn {
  background: rgba(0, 0, 0, 0.05);
  border-radius: 4px;
  font-size: 12px;
  padding: 4px 12px;

  &:hover {
    background: rgba(0, 0, 0, 0.1);
  }
}

@media (max-width: 600px) {
  .banner-content {
    justify-content: center;
  }

  .wipe-btn {
    width: 100%;
    margin-top: 4px;
  }
}
</style>
