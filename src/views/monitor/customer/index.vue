<template>
  <MonitorPage client="C" title="C 端在线用户" description="已登录小程序用户的在线状态与访问情况" />
</template>

<script setup lang="ts">
  import MonitorPage from '../components/MonitorPage.vue'
  defineOptions({ name: 'CustomerOnlineMonitor' })
</script>
