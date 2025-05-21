import fs from 'fs/promises'
import * as Crypt from './module/config'
import {User,Post,PublicUser,Comment} from './module/models'

interface DBQuery {
  status: number,
  value: any
}

//util functs


export default class Database {
  private db: string
  private users: User[] = []
  private posts: Post[] = []
  
  constructor(dbfile:string = './server/db.json') {
    this.db = dbfile
  }
  
  private async readDB(): Promise<void> {
    try {
      const data = await fs.readFile(this.db,'utf8')
      const dbdata = JSON.parse(data)
      this.users = dbdata.users || []
      this.posts = dbdata.posts || []
    } catch(err) {
      console.error('db error',err)
      throw err
    }
  }
  
  private async updateDB(): Promise<void> {
    try {
      const data = JSON.stringify({
        users:this.users,
        posts:this.posts
      })
      await fs.writeFile(this.db,data)
      await this.readDB()
      console.log('db updated')
    } catch(err) {
      console.error('update db err',err)
    }
  }
  
  private async deleteAllUsers(): Promise<void> {
    try {
      await this.readDB()
      this.users.length = 0
      await this.updateDB()
      console.log('all users cleared')
    } catch(err) {
      console.error(err)
    }
  }
  
  private async clearAllRecords(): Promise<void> {
    try {
      await this.deleteAllUsers()
      this.posts.length = 0
      await this.updateDB()
    } catch(err) {
      console.log(err)
    }
  }
  
  async listUsers(): Promise<void> {
    await this.readDB()
    const usernames:any[] = []
    this.users.forEach(user => {
      const userPosts:Post[] = []
      const commentsGotten:number[] = []
      //mapping out user post objs
      this.posts.forEach(post => {
        user.posts.forEach(userPost => {
          if(userPost === post.id) userPosts.push(post)
        })
      })
      //map out the comment lengths
      userPosts.forEach(post => commentsGotten.push(post.comments.length))
      
      //populating the resulting arr
      usernames.push([user.username,user.info],{
        posts:user.posts.length,
        commentsGotten:commentsGotten.reduce((a,b) => {return a+b},0),
        friends:'nil'
      })
    })
    if(usernames.length > 0) {
      console.log(usernames)
    } else {
      console.log('no users')
    }
  }
  
  async registerUser(username:string,passkey:string,info:number =
  0,friends:string[] = []): Promise<DBQuery> {
    await this.readDB()
    //check if user already exists
    const existingCheck:boolean = this.users.findIndex(user => user.username ===
    username) === -1 ? false : true
    //exists
    if(existingCheck) {
      const login = await this.loginUser(username,passkey)
      return login
    } else {
      //no exists
      const hashedPasskey = await Crypt.hash(passkey)
      const userData = Object.freeze({
        username,
        passkey:hashedPasskey,
        info,
        friends,
        posts: []
      })
      this.users.push(userData)
      await this.updateDB()
      return {
        status:1,
        value: null
      }
    }
    return {
      status: -5,
      value:null
    }
  }
  
  async loginUser(username:string,passkey:string): Promise<DBQuery> {
    await this.readDB()
    if(this.users.length > 0) {
      const userExists = this.users.findIndex(user => user.username ===
      username) === -1 ? false : true
      if(userExists) {
        const userIndex = this.users.findIndex(user => user.username === username)
        const targetUser = this.users[userIndex]
        //passkey verify
        let hashedPasskey = await Crypt.hash(passkey)
        if(hashedPasskey === targetUser.passkey) {
          //success login
          const userData:PublicUser = Object.freeze({
            username,
            info:targetUser.info,
            friends:targetUser.friends,
            posts:targetUser.posts
          })
          return {
            status: 2,
            value: userData
          }
        } else {
          //invalid passkey
          return {
            status: -2,
            value:null
          }
        }
      } else {
        //non existent user
        const register = await this.registerUser(username,passkey)
        return register
      }
    }
    //empty db arr
    return {
      status: -5,
      value:null
    }
  }
  
  async changeUserPasskey(username:string, oldPasskey:string,newPasskey:string): Promise<DBQuery> {
    await this.readDB()
    const loginProcess = await this.loginUser(username,oldPasskey)
    if(loginProcess.status === 2) {
      //success login
      const userIndex = this.users.findIndex(user => user.username === username)
      const newHashedPasskey = await Crypt.hash(newPasskey)
      this.users[userIndex].passkey = newHashedPasskey
      await this.updateDB()
      return {
        status:3,
        value:null
      }
    }
    return {
      status:-5,
      value:null
    }
  }
  
  private async unsafePasskeyChange(index:number, oldPasskey:string,newPasskey:string):Promise<void> {
    this.users[index].passkey = await Crypt.hash(newPasskey)
  }
  
  private async updateSecurity():Promise<void> {
    await this.readDB()
    const dbUsernames:string[] = []
    this.users.forEach(user => {
      dbUsernames.push(user.username)
    })
    console.log(dbUsernames)
    
    dbUsernames.forEach(async (username) => {
      const userIndex = this.users.findIndex(user => user.username === username)
      const passkey = this.users[userIndex].passkey
      console.log(userIndex,passkey)
      await this.unsafePasskeyChange(userIndex,passkey,passkey)
    })
    
    await this.updateDB()
  }
  
  async getUserInfo(username:string): Promise<DBQuery> {
    await this.readDB()
    if(this.users.length > 0) {
      const userExists = this.users.findIndex(user => user.username === username) !== -1 ? true : false
      if(userExists) {
        const userIndex = this.users.findIndex(user => user.username === username)
        const targetUser = this.users[userIndex]
        const userInfo = targetUser.info
        return {
          status:10,
          value:userInfo
        }
      } else {
        // user no exist
        return {
          status:-8,
          value:null
        }
      }
    } else {
      // empty db
      return {
        status:-5.5,
        value:null
      }
    }
    return {
      status:-5,
      value:null
    }
  }
  
  async setUserInfo(username:string,passkey:string,newInfo:string | number):Promise<DBQuery> {
    await this.readDB()
    const authProcess = await this.loginUser(username,passkey)
    if(authProcess.status === 2) {
      const userIndex = this.users.findIndex(user => user.username === username)
      const targetUser = this.users[userIndex]
      targetUser.info = newInfo
      await this.updateDB()
      return {
        status:10,
        value:null
      }
    } else {
      // invalid creds
      return {
        status:-2,
        value:null
      }
    }
    return {
      status:-5,
      value:null
    }
  }
  
  async createPost(username:string,passkey:string,title:string,body:string): Promise<DBQuery> {
    await this.readDB()
    const auth = await this.loginUser(username,passkey)
    if(auth.status === 2) {
      //success auth
      if(title.length > 0 && body.length > 0) {
        //non empty post check
        const postUID = Crypt.randomUID()
        const newPost: Post = Object.freeze({
          id:postUID,
          author:username,
          title,
          body,
          comments:[]
        })
        const userIndex = this.users.findIndex(user => user.username === username)
        const targetUser = this.users[userIndex]
        targetUser.posts.push(postUID)
        this.posts.push(newPost)
        await this.updateDB()
        return {
          status: 4,
          value: newPost
        }
      }
      
    }
    return {
      status: -5,
      value:null
    }
  }
  
  async listPostsByUser(username:string):Promise<DBQuery> {
    await this.readDB()
    if(this.users.length > 0) {
      //if db is populated
      const userIndex = this.users.findIndex(user => user.username === username)
      if(userIndex !== -1) {
        //user exists
        const targetUser = this.users[userIndex]
        const postIDs = targetUser.posts
        const userPosts:Post[] = []
        postIDs.forEach(postID => {
          const userPost = this.posts.filter(post => post.id === postID) // will give an arr of posts so itrtvely add them
          userPost.forEach(uPost => {
            userPosts.push(uPost)
          })
        })
        if(userPosts.length > 0) {
          return {
            status:6,
            value:userPosts
          }
        } else {
          return {
            status: -6,
            value: null
          }
        }
      }
      return {
        status: -5,
        value:null
      }
    }
    return {
      status: -5.5,
      value:null
    }
  }
  
  async commentOnPost(username:string,passkey:string,postUID:string,comment:string):Promise<DBQuery> {
    await this.readDB()
    if(this.posts.length > 0) {
      //if there are any posts
      const authProcess = await this.loginUser(username,passkey)
      if(authProcess.status === 2) {
        const userIndex = this.users.findIndex(user => user.username === username)
        const targetUser = this.users[userIndex]
        const postIndex = this.posts.findIndex(post => post.id === postUID)
        if(postIndex !== -1) {
          // if post exists
          const targetPost = this.posts[postIndex]
          const newComment:Comment = Object.freeze({
            author:targetUser.username,
            body:comment,
            time:new Date().toLocaleTimeString()
          })
          targetPost.comments.push(newComment)
          await this.updateDB()
          return {
            status:10,
            value:null
          }
        } else {
          // non exist post
          return {
            status:-6.5,
            value:null
          }
        }
      } else {
        // not auth user
        return {
          status:-2,
          value:null
        }
      }
    } else {
      // no uploaded posts
      return {
        status:-6,
        value:null
      }
    }
    return {
      status:-5,
      value:null
    }
  }
  
  async listPostComments(postUID:string): Promise<DBQuery> {
    await this.readDB()
    if(this.posts.length > 0) {
      const postIndex = this.posts.findIndex(post => post.id === postUID)
      if(postIndex !== -1) {
        // if post is found
        const targetPost = this.posts[postIndex]
        const comments = targetPost.comments
        return {
          status:10,
          value:comments
        }
      } else {
        // post not found
        return {
          status:-6.5,
          value:null
        }
      }
    }
    //empty post collection
    return {
      status:-6,
      value:null
    }
  }
  
  async deleteUserPost(username:string,passkey:string,postUID:string):Promise<DBQuery> {
    await this.readDB()
    const authProcess = await this.loginUser(username,passkey)
    if(authProcess.status === 2) {
      //  check if user is verified
      const userIndex = this.users.findIndex(user => user.username === username)
      const targetUser = this.users[userIndex]
      // check if post exists
      const postsExists = (this.posts.filter(post => post.id === postUID).length> 0) && (targetUser.posts.filter(post => post === postUID).length > 0)
      if(postsExists) {
        const userPostIndex = targetUser.posts.findIndex(post => post === postUID)
        const globalPostIndex:number = this.posts.findIndex(post => post.id === postUID)
        targetUser.posts.splice(userPostIndex,1)
        this.posts.splice(globalPostIndex,1)
        await this.updateDB()
        return {
          status:7,
          value:null
        }
      } else {
        // post no exist
        return {
          status: -7,
          value:null
        }
      }
    } else {
      // unauth err
      return {
        status:-2,
        value:null
      }
    }
    // any unforseen errs
    return {
      status:-5,
      value:null
    }
  }
  
  async listAllPosts(): Promise<void> {
    await this.readDB()
    if(this.posts.length > 0) {
      console.log(this.posts)
    } else {
      console.log('no posts created')
    }
  }
  
  // consider friend request system
  // async addFriend(username:string,passkey:string,targetUserame:string): Promise<DBQuery> {
    
  // }
  
  // async listUserFriends(username:string):Promise<DBQuery> {
      
  // }
  
  // private async deleteAllPosts():Promise<void> {
    
  // }
  
}

const db = new Database()
//db.clearAllRecords()
db.listUsers()
db.listAllPosts()
export {
  db
}