//type defs
type Elem = HTMLElement | Element | null

//dom elems
const title: Elem = document.querySelector('.title')
const app:Elem = document.querySelector('.app')
const nameInput = document.querySelector('.name-input') as HTMLInputElement
const confirmBtn: Elem = document.querySelector('.confirm')

const initConfirm = () => {
  if(confirmBtn && app) {
    confirmBtn.addEventListener('click',()=>{
      let username = nameInput.value
      username = username.trim()
      username = username.replace(' ','')
      console.log(username)
      fetch('/enter',{
        method:'POST',
        headers:{
          'Content-Type':'text/plain'
        },
        body:username
      })
      .then(res => {
        if(res.ok) return res.json()
        else {
          console.error('fetch err',res.status,res.statusText)
          alert(res.statusText)
          return
        }
      })
      .then(data => {
        if(data) {
          console.log(data.status)
          const doc = document.createDocumentFragment() as DocumentFragment
          const text:Elem = document.createElement('h1')
          text.textContent = data.message
          doc.appendChild(text)
          app.replaceChildren()
          app.appendChild(doc)
        }
      })
      .catch(err => {
        console.error(err)
      })
    })
  }
}
initConfirm()

