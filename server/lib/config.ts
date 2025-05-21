import dotenv from 'dotenv'
import crypto from 'crypto'

dotenv.config()

const Config = Object.freeze({
  salt() {
    if(process.env.SALT_VALUE) return process.env.SALT_VALUE
    throw new Error('undefined env file string')
  },
  keyLength() {
    if(process.env.KEY_LENGTH) return parseInt(process.env.KEY_LENGTH)
    return 72
  },
  algo() {
    if(process.env.ALGO) return process.env.ALGO
    throw new Error('undefined env file string')
  },
  itr() {
    if(process.env.ITR) return parseInt(process.env.ITR)
    return 10000
  }
})

const hashingProcess = (passkey:string): Promise<string> => {
  return new Promise((res,rej) => {
    crypto.pbkdf2(passkey, Config.salt(), Config.itr(), Config.keyLength(),
    Config.algo(), (err:Error | null,key:any) => {
      if(err) {
        rej(err)
        console.error(err)
      }
      res(key.toString('base64'))
    })
  })
}

const hash = async (passkey:string): Promise<string> => {
  try {
    const hashedPasskey = await hashingProcess(passkey)
    return hashedPasskey
  } catch(err) {
    console.error(err)
    throw err
  }
}

const compareHash = async (passkey:string,hashedPasskey:string): Promise<boolean> => {
  try {
    const newHashed = await hash(passkey)
    return newHashed === hashedPasskey
  } catch(err) {
    console.error(err)
    throw err
  }
}

const randomUID = (strLength:number = 8): string => {
  return crypto.randomBytes(strLength).toString('hex')
}

export {
  hash,
  compareHash,
  randomUID
}