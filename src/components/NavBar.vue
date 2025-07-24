<!-- src/components/NavBar.vue -->
<template>
  <nav class="navbar" role="navigation" aria-label="主菜单">
    <div class="nav-buttons">
      <button 
        @click="setMode('manifest')" 
        :class="{ active: mode === 'manifest' }"
        :aria-pressed="mode === 'manifest' ? 'true' : 'false'"
        class="manifest-btn"
      >
        <span class="nav-text">
          <span class="nav-label">manifest内容</span>
          <span class="nav-underline"></span>
        </span>
      </button>
      <button 
        @click="setMode('csv')" 
        :class="{ active: mode === 'csv' }"
        :aria-pressed="mode === 'csv' ? 'true' : 'false'"
      >
        <span class="nav-text">
          <span class="nav-label">CSV 生成</span>
          <span class="nav-underline"></span>
        </span>
      </button>
    </div>
  </nav>
</template>

<script setup lang="ts">

const props = defineProps({
  mode: {
    type: String as () => 'manifest' | 'csv',
    required: true
  }
})

const emit = defineEmits(['update:mode'])

const setMode = (newMode: 'manifest' | 'csv') => {
  emit('update:mode', newMode)
}
</script>

<style scoped>
.navbar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  display: flex;
  justify-content: center;
  align-items: center;
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border-bottom: 1px solid #e5e7eb;
  padding: 0 1rem;
  z-index: 1000;
  font-family: "MiSans", system-ui, sans-serif;
  height: 48px;
  width: 100vw;
  user-select: none;
}

.nav-buttons {
  display: flex;
  gap: 2rem;
  align-items: baseline; /* 确保基线对齐 */
}

.navbar button {
  position: relative;
  background: none;
  border: none;
  font-weight: 500;
  color: #6b7280;
  cursor: pointer;
  padding: 0.5rem 0;
  transition: color 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

/* 单独设置manifest按钮样式 */
.manifest-btn {
  font-size: 1.02rem; /* 比默认稍大 */
}

/* CSV按钮保持默认大小 */
.navbar button:not(.manifest-btn) {
  font-size: 0.9375rem;
}

.nav-text {
  position: relative;
  display: inline-block;
}

.nav-label {
  position: relative;
  z-index: 1;
  transition: inherit;
}

.nav-underline {
  position: absolute;
  bottom: -4px;
  left: 50%;
  width: 0;
  height: 2px;
  background-color: #000;
  transform: translateX(-50%);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.navbar button:hover {
  color: #000;
}

.navbar button:hover .nav-underline {
  width: 100%;
  left: 50%;
}

.navbar button.active {
  color: #000;
}

.navbar button.active .nav-underline {
  width: 100%;
  left: 50%;
  background-color: #0e467c;
}
</style>