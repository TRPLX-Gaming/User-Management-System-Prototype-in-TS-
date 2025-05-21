export interface User {
  username: string,
  passkey: string,
  friends: string[],
  info: number | string,
  posts:string[],//post ids for matching
}

export interface PublicUser {
  username:string,
  friends:string[],
  info:number | string,
  posts: string[]
}

export interface Post {
  id:string,
  author: string,
  title: string,
  body: string,
  comments:Comment[]
}

export interface Comment {
  author:string,
  body:string,
  time:string
}