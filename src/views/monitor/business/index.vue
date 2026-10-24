<template>
  <MonitorPage client="B" title="B 端在线用户" description="管理后台账号的在线状态与访问情况" />
</template>

<script setup lang="ts">
  import MonitorPage from '../components/MonitorPage.vue'
  defineOptions({ name: 'BusinessOnlineMonitor' })
</script>
