import axios from 'axios'

const timeout = 10000
export const serverApi= axios.create({
  baseURL: '/api/v1',
  timeout,

})

serverApi.interceptors.response.use(
  res => res.data
)

export interface Response<T = any> {
  timestamp: string,
  path: string,
  message: string,
  code: number,
  success: boolean,
  data: T
}

export const aiApiClient = axios.create({
  baseURL: '/api/ai/v1',
  timeout,
})