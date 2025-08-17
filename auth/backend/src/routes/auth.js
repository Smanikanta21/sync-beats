import express from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

const router = express.Router();
const prisma = new PrismaClient();



router.post('/signup',async(req,res)=>{
    const { email,username,password } = req.body;
    try{
        const existingUser = await prisma.user.findUnique({where:{email}})
        if(existingUser){
            return res.status(400).json({message:"User already exists"})
        }

        const hashedPw = await bcrypt.hash(password,10);

        const newUser = await prisma.user.create({
            data:{
                email,
                username,
                password:hashedPw
            }
        })
        return res.status(201).json({message:"User created successfully",user:newUser})
    }catch(err){
        console.error(err);
        return res.status(500).json({message:"Internal server error"})
    }
})

router.post('/login',async(req,res)=>{
    const {email,password} = req.body;
    try{
        const user = await prisma.user.findUnique({where:email})
        if(!user){
            return res.status(400).json({message:"User does not exist"})
        }

        const validPw = await bcrypt.compare(password,user.password);
        if(!validPw){
            return res.status(400).json({message:"Invalid password"})
        }

        const token = jwt.sign({id:user.id},process.env.JWT_SECRET,{expiresIn:'1h'});
        return res.status(200).json({message:"Login successful",token,user})
    }catch(err){
        console.error(err);
        return res.status(500).json({message:"Internal server error"})
    }
})

export default router;