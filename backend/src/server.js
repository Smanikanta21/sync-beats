const express = require('express')
const app = require('./app')

const Port = process.env.PORT || 5001;
app.listen(Port,()=>{
    console.log(`server running on 'http://localhost:${Port}`)
})