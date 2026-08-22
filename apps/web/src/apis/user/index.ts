import { serverApi, type Response } from '..'
import type { UserLogin, UserRegister, WebResultUser, AvatarResult } from '@en/common/user'

export const login = (data: UserLogin) =>
	serverApi.post('/user/login', data) as Promise<Response<WebResultUser>>
export const register = (data: UserRegister) =>
	serverApi.post('/user/register', data) as Promise<Response<WebResultUser>>
export const updateUser = (data: any) =>
	serverApi.post('/user/update-user', data) as Promise<Response<WebResultUser>>
export const uploadAvatar = (data: FormData) =>
	serverApi.post('/user/upload-avatar', data) as Promise<Response<AvatarResult>>
