import express from 'express'
import http from 'http'
import cors from 'cors'
import dotenv from 'dotenv'
import connectDB from './config/db.js';
import { initializeFirebase } from './Utils/sendPush.js';
dotenv.config();

import authRouter from './routes/auth.route.js'
import conversationRouter from './routes/conversation.route.js'
import reportRouter from './routes/report.route.js'
import { purgeExpiredDeactivatedAccounts } from './Utils/accountLifecycle.js';
import { initializeSocket } from './socket/socket.js';


const app=express()

app.use(express.json())
app.use(cors())


app.get("/",(req,res)=>{
    res.send("server is running")

})

app.use("/auth",authRouter)
app.use("/conversations", conversationRouter)
app.use("/report", reportRouter)


const PORT=process.env.PORT|| 3001

const server=http.createServer(app)
const io = initializeSocket(server)

app.set("io", io)

connectDB().then(async ()=>{
    purgeExpiredDeactivatedAccounts()
      .then((count) => {
        if (count > 0) {
          console.log("Purged expired deactivated accounts:", count)
        }
      })
      .catch((error) => {
        console.log("Failed to purge expired accounts", error)
      })

    await initializeFirebase()
    
    console.log("database connected")
    server.listen(PORT,()=>{
    console.log("server is running :",PORT)

})

    
}).catch((error)=>{
    console.log("Failed to start server due to database connection error",error)
})

