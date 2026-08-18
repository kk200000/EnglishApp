import { createRouter, createWebHistory } from 'vue-router'
import home from './home/index'
import wordBook from './word-book/index'
import Setting from './setting/index'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    ...home, //主页
    ...wordBook, //词库
    ...Setting, //设置
  ]
})

export default router
