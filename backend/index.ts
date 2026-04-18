import express from 'express'
import http from 'http'
import cors from 'cors'
import dotenv from 'dotenv'
import connectDB from './config/db.js';
dotenv.config();

import authRouter from './routes/auth.route.js'
import { initializeSocket } from './socket/socket.js';


const app=express()

app.use(express.json())
app.use(cors())


app.get("/",(req,res)=>{
    res.send("server is running")

})

app.use("/auth",authRouter)


const PORT=process.env.PORT||3000

const server=http.createServer(app)


initializeSocket(server)

connectDB().then(()=>{

    console.log("database connected")
    server.listen(PORT,()=>{
    console.log("server is running :",PORT)

})

    
}).catch((error)=>{
    console.log("Failed to start server due to database connection error",error)
})




