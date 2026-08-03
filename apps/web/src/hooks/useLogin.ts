import { IS_SHOW_LOGIN } from "@/components/login/type"
import { inject, ref } from "vue"

export const useLogin = () => {
  const isShowLogin = inject(IS_SHOW_LOGIN, ref(false))
  const login = () => {
    isShowLogin.value = true
  }

  const logout = () => {
    isShowLogin.value = false
  }

  return { login, logout }
}
