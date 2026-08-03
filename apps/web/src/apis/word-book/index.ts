import { serverApiClient, type Response } from "..";
import type { WordList, WordQuery } from "@en/common/word";


export const getWordBookList = (params: WordQuery): Promise<Response<WordList>> => {
  return serverApiClient.get('/word-book', { params }) as Promise<Response<WordList>>
}