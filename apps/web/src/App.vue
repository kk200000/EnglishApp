<template>
  <RouterView />
  <Search />
  <Login />
</template>

<script setup lang="ts">
import { RouterView } from 'vue-router'
import Search from './components/Search/index.vue'
import Login from './components/login/index.vue'
import { provide,ref } from 'vue';
import { IS_SHOW_LOGIN } from './components/login/type.ts';

provide(IS_SHOW_LOGIN, ref(false))

</script>
