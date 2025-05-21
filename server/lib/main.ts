import {registration, login, passkeyChange, postCreation, listPosts, deletePost,
getInfo, setInfo, listUsers, postComment, listComments} from './module/middleware'
import path from 'path'
import express, {Request, Response, NextFunction} from 'express'

process.on('uncaughtException',(err) => {
  console.error('err ',err,err.stack)
  process.exit(1)
})

const app = express()
app.use(express.json())
app.use(express.urlencoded({extended:true}))
app.use(express.text())

const PATH = path.join(__dirname,'../../client')
const TARGET = path.join(PATH,'index.html')
const PORT = 5400

app.get('/',async (req: Request, res: Response) => {
  console.log('connected')
  res.sendFile(TARGET)
})

app.use(express.static(PATH))

app.use(listUsers)// always giving updates for every operation

app.post('/enter',async (req: Request, res: Response) => {
  const process = await registration(req,res)
  if(process) {
    res.json({
      status:process.status,
      message:process.message
    })
    return
  }
  res.status(400).json({
    message:'err while creating new user'
  })
})

app.post('/login',async (req:Request, res:Response) => {
  const process = await login(req,res)
  if(process) {
    res.json({
      status:process.status,
      data:process?.data,
      message:process.message
    })
    return
  }
  res.status(401).json({
    message:'auth err'
  })
})

app.post('/change-pk',async (req:Request, res:Response) => {
  const process = await passkeyChange(req,res)
  if(process) {
    res.json({
      status:process.status,
      message:process.message
    })
    return
  }
  res.status(400).end()
})

app.post('/new-post',async (req:Request, res:Response) => {
  const process = await postCreation(req,res)
  if(process) {
    res.json({
      status:process.status,
      message:process.message
    })
    return
  }
  res.status(400).json({
    message:'missing info err'
  })
})

app.post('/list-posts',async (req:Request,res:Response) => {
  const process = await listPosts(req,res)
  if(process) {
    res.json({
      status:process.status,
      data:process?.data,
      message:process.message
    })
    return
  }
  res.status(400).json({
    message:'unable to list posts'
  })
})

app.post('/delete-post',async (req:Request,res:Response) => {
  const process = await deletePost(req,res)
  if(process) {
    res.json({
      status:process.status,
      message:process.message
    })
    return
  }
  res.status(401).json({
    message:'auth err'
  })
})

app.get('/get-info/:username',async (req:Request,res:Response) => {
  const username = req.params.username
  const process = await getInfo(username)
  if(process) {
    res.json({
      status:process.status,
      data:process?.data,
      message:process.message
    })
    return
  }
  res.status(401).json({
    message:'missing info or invalid username'
  })
})

app.post('/set-info',async (req:Request,res:Response) => {
  const process = await setInfo(req,res)
  if(process) {
    res.json({
      status:process.status,
      message:process.message
    })
    return
  }
  res.status(400).json({
    message:'missing info or invalid creds'
  })
})

app.post('/comment',async (req:Request,res:Response) => {
  const process = await postComment(req,res)
  if(process) {
    res.json({
      status:process.status,
      message:process.message
    })
    return
  }
  res.status(400).json({
    message:'invalid creds or unauth user'
  })
})

app.get('/comments/:postID',async (req:Request,res:Response) => {
  const postID = req.params.postID
  const process = await listComments(postID)
  if(process) {
    res.json({
      status:process.status,
      data:process?.data,
      message:process.message
    })
    return
  }
  res.status(400).json({
    message:'invalid post id or post list is empty'
  })
})

app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(err)
  res.status(500).send('Internal server error')
})

app.listen(PORT,()=>{console.log('hosted at',PORT)})
