<template>
    <div v-if="isShowLogin" class="fixed inset-0 bg-black opacity-30 filter blur-sm z-40"></div>
    <div v-if="isShowLogin" class="fixed inset-30  flex items-center justify-center z-50">
        <div class="w-[1200px] h-[700px] bg-white rounded-[20px] shadow-2xl overflow-hidden flex">
            <!-- 左侧 3D 模型区域 -->
            <ModelViewer @change-type="changeType" ref="modelViewerRef" />

            <!-- 右侧登录表单区域 -->
            <div class="flex-1 flex flex-col justify-center px-12 py-10 bg-white">
                <LoginForm v-if="loginType === 'login'" />
                <RegisterForm v-else="loginType === 'register'" />
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import ModelViewer from './ModelViewer.vue'
import LoginForm from './LoginForm.vue'
import RegisterForm from './RegisterForm.vue'
import { useLogin } from '@/hooks/useLogin.ts'
import { inject, onMounted, ref } from 'vue'
import { IS_SHOW_LOGIN } from './type.ts'
const isShowLogin = inject(IS_SHOW_LOGIN)

const loginType = ref('login')

const changeType = (type: string) => {
    loginType.value = type
}

onMounted(() => {
})


</script>