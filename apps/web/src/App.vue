<template>
  <RouterView />
  <Search />
  <Login />
</template>

<script setup lang="ts">
import { RouterView } from 'vue-router'
import Search from './components/Search/index.vue'
import Login from './components/Login/index.vue'
import { provide,ref } from 'vue'
import { IS_SHOW_LOGIN } from './components/Login/type'
provide(IS_SHOW_LOGIN,ref(false)) // 是否显示登录框 并且扩展为全局调用 默认不显示
</script>
