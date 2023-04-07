const Firestore = require('../helper/firebaseClient');
const config = require('../config/config')
async function DeleteAuth() {
    const firebase = new Firestore();
    try {
        firebase.deleteCollection(config.client_code)
        return true
    } catch (error) {
        return false
    }
}

module.exports = DeleteAuth