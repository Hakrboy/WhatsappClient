const { Router }=require ('express')
const router = Router()

const instanceRoutes =require('./instanceRoute') 

router.use('/instance', instanceRoutes)

module.exports= router