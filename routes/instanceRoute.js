
const { Router } =require( 'express')
const { init, qr, qrbase64, info, logout, _delete, sendButton } =require( '../controllers/instance.controller')
const keyVerify =require( '../middlewares/keyCheck')
const loginVerify =require( '../middlewares/loginCheck')

const router = Router()
router.route('/init').get(init)
router.route('/sendbutton/:userId').get(sendButton)
router.route('/qr').get(keyVerify, qr)
router.route('/qrbase64').get(keyVerify, qrbase64)
router.route('/info').get(keyVerify, info)
// router.route('/restore').get(restore)
router.route('/logout').delete(keyVerify, loginVerify, logout)
router.route('/delete').delete(keyVerify, _delete)
// router.route('/list').get(list)

module.exports= router

