import {Request, Response, NextFunction} from 'express'
import {db} from './../Database'
import {PublicUser,Post} from './models'

//type defs
interface TaskResponse {
  status:string,
  message:string
}

interface TaskResponseData {
  status:string,
  data: object | null,
  message: string
}

interface RegisterRes extends TaskResponse {}

interface LoginData extends TaskResponseData {
  data:PublicUser | null
}

interface ChangeRes extends TaskResponse {}

interface NewPostRes extends TaskResponse {}

interface PostListRes extends TaskResponseData {}

// db stats code
// registered user = -1(in registration)
// new user = 1
// success logn = 2
// verification err = -2
// success passkey change = 3
// success post create = 4
// valid post list = 6
// invalid/empty post list = -6
// invalid post id = -6.5
// success post deletion = 7
// non existent user = -8
// empty db = -5.5
// any db err = -5
// any success operation = 10

//util functs
async function checkParams(params:string[]):Promise<boolean> {
  const length = params.length
  let count = 0
  params.forEach(item => {
    if(item && typeof item === 'string' || typeof item === 'number' || item.length > 0) count++
  })
  return count === length
}

const registration = async (req: Request, res: Response):Promise<RegisterRes |
null> =>
{
  const {username,passkey} = req.body
  if(await checkParams([username,passkey])) {
    const dbprocess = await db.registerUser(username,passkey)
    console.log(dbprocess.status)
    switch(dbprocess.status) {
      case 1:
        return {
          status:'success',
          message:`welcome ${username}`
        }
        break
      case -1:
        return {
          status:'success',
          message:`pls log back in, ${username}`
        }
        break
      case 2:
        return await login(req,res)
        break
      case -5:
        return {
          status:'failure',
          message:`sorry ${username}`
        }
        break
      default:
        return null
    }
  }
  return null
}

const login = async (req:Request, res:Response): Promise<LoginData | null> => {
  const {username,passkey} = req.body
  if(await checkParams([username,passkey])) {
    const dbprocess = await db.loginUser(username,passkey)
    switch(dbprocess.status) {
      case 2:
        return {
          status:'success',
          data:dbprocess.value,
          message:`welcome back, ${username}!`
        }
        break
      case -2:
        return {
          status:'auth err',
          data:null,
          message:'invalid username or passkey'
        }
        break
      case 1:
        return await registration(req,res) as LoginData
        break
      case -5:
        return {
          status:'no user',
          data:null,
          message:`user: ${username} does not exist`
        }
      default:
      return null
    }
  }
  return null
}

const passkeyChange = async (req:Request,res:Response):Promise<ChangeRes | null> => {
  const {username, passkey, newPasskey} = req.body
  if(await checkParams([username,passkey,newPasskey])) {
    const dbprocess = await db.changeUserPasskey(username,passkey,newPasskey)
    switch(dbprocess.status) {
      case 1:
        return await registration(req,res)
        break
      case 2:
        return await login(req,res)
        break
      case -2:
        return await login(req,res)
        break
      case 3:
        return {
          status:'success',
          message:`successfully changed ${username}'s passkey`
        }
        break
      default:
      return null
    }
  }
  return null
}

const postCreation = async (req:Request, res:Response):Promise<NewPostRes | null> => {
  const {username, passkey, title, body} = req.body
  if(await checkParams([username,passkey,title,body])) {
    const dbprocess = await db.createPost(username,passkey,title,body)
    switch(dbprocess.status) {
      case 4:
        return {
          status:'success update',
          message:`new post created, id:${dbprocess.value.id} by ${dbprocess.value.author}`
        }
        break
      case 1:
        return await registration(req,res)
        break
      case 2:
        return await login(req,res)
        break
      case -2:
        return await login(req,res)
        break
      default:
      return null
    }
    return null
  }
  return {
    status: 'missing info',
    message:'some params are empty'
  }
}

const listPosts = async (req:Request,res:Response):Promise<PostListRes | null> => {
  const {username} = req.body
  if(await checkParams([username])) {
    const dbprocess = await db.listPostsByUser(username)
    switch(dbprocess.status) {
      case 6:
        return {
          status:'success',
          data:dbprocess.value,
          message:`listed posts made by user: ${username}`
        }
        break
      case -6:
        return {
          status:'no data',
          data:null,
          message: `no post found for user: ${username}`
        }
        break
      case -5:
        return {
          status:'user not found',
          data:null,
          message:`user: ${username} does not exist`
        }
        break
      case -5.5:
        return {
          status:'empty db',
          data:null,
          message:'no users found'
        }
        break
      default:
      return null
    }
  }
  return null
}

const deletePost = async (req:Request,res:Response):Promise<TaskResponse | null> => {
  const {username,passkey,postUID} = req.body
  if(await checkParams([username,passkey,postUID])) {
    const dbprocess = await db.deleteUserPost(username,passkey,postUID)
    switch(dbprocess.status) {
      case -2:
        return {
          status:'auth err',
          message:'invalid creds'
        }
        break
      case 7:
        return {
          status:'success',
          message:`successfully deleted post: ${postUID} from db`
        }
        break
      case -7:
        return {
          status:'invalid post id',
          message:`could not find post: ${postUID}`
        }
      case -5:
        return {
          status:'db err',
          message:'uncaught err'
        }
        break
      default:
      return null
    }
  }
  return null
}

const getInfo = async (username:string):Promise<TaskResponseData | null> => {
  if(await checkParams([username])) {
    const dbprocess = await db.getUserInfo(username)
    switch(dbprocess.status) {
      case 10:
        return {
          status:'success',
          data:dbprocess.value,
          message:`got user: ${username} info`
        }
        break
      case -8:
        return {
          status:'no user',
          data:null,
          message:'invalid username'
        }
        break
      case -5.5:
        return {
          status:'no data',
          data:null,
          message:'user list is empty'
        }
        break
      case -5:
        return {
          status:'uncaught err',
          data:null,
          message:'unregistered db err'
        }
        break
      default:
      return null
    }
  }
  return null
}

const setInfo = async (req:Request,res:Response):Promise<TaskResponse | null> => {
  const {username,passkey,newInfo} = req.body
  if(await checkParams([username,passkey,newInfo])) {
    const dbprocess = await db.setUserInfo(username,passkey,newInfo)
    switch(dbprocess.status) {
      case 10:
        return {
          status:'success',
          message:'updated user info'
        }
        break
      case -2:
        return await login(req,res) as TaskResponseData
        break
      case -5:
        return {
          status:'uncaught err',
          message:'unregistered db err'
        }
        break
      default:
      return null
    }
  }
  return null
}

const listUsers = (req:Request,res:Response,next:NextFunction) => {
  db.listUsers()
  next()
}

const postComment = async (req:Request,res:Response):Promise<TaskResponse | null> => {
  const {username,passkey,postUID,comment} = req.body
  if(await checkParams([username,passkey,comment])) {
    const dbprocess = await db.commentOnPost(username,passkey,postUID,comment)
    switch(dbprocess.status) {
      case 10:
        return {
          status: 'success',
          message:`${username} commented on post(${postUID})`
        }
        break
      case -6.5:
        return {
          status:'invalid post id',
          message:'no posts match provided id'
        }
        break
      case -6:
        return {
          status:'empty post list',
          message:'no posts to search'
        }
        break
      case -2:
        return await login(req,res)
        break
      case -5:
        return {
          status:'db err',
          message:'unable to comment'
        }
        break
      default:
      return null
    }
  }
  return null
}

const listComments = async (postUID:string):Promise<TaskResponseData | null> => {
  if(await checkParams([postUID])) {
    const dbprocess = await db.listPostComments(postUID)
    switch(dbprocess.status) {
      case 10:
        return {
          status:'success',
          data:dbprocess.value,
          message:`listed comments for post(${postUID})`
        }
        break
      case -6.5:
        return {
          status:'no post',
          data:null,
          message:'invalid post id'
        }
        break
      case -6:
        return {
          status:'post list empty',
          data:null,
          message:'no posts recorded yet'
        }
        break
      default:
      return null
    }
  }
  return null
}

// const addFriend = async (req:Request,res:Response):Promise<TaskResponse | null> => {
  
// }

export {
  registration,
  login,
  passkeyChange,
  postCreation,
  listPosts,
  deletePost,
  getInfo,
  setInfo,
  listUsers,
  postComment,
  listComments
}