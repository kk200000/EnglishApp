import { IS_SHOW_LOGIN } from "@/components/login/type"
import { useUserStore } from "@/stores/user"
import { inject, ref } from "vue"



export const useLogin = () => {
  const isShowLogin = inject(IS_SHOW_LOGIN, ref(false))
  const user = useUserStore()
  const login = () => {
    return new Promise((resolve, reject) => {
      if (user.getUser) {
        resolve(true)
      } else {
        reject(null)
        isShowLogin.value = true

      }
    })
  }

  const hide = () => {
    isShowLogin.value = false
  }

  return { login, hide }
}
