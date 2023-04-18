const firebase = require('firebase/app');
const { getFirestore,doc,collection, updateDoc,setDoc,addDoc,getDoc,getDocs,deleteDoc,query }=require ('firebase/firestore');
const firebaseConfig = require('../firebaseConfig')
class Firestore {
  
  constructor() {
   
        this.app =  firebase.initializeApp(firebaseConfig);
        this.db = getFirestore(this.app);
  }

  async addCollection(collectionName) {
  
    try {
      await addDoc(collection(this.db, collectionName), {})
      console.log(`Collection ${collectionName} created successfully.`);
      return  collectionName
    } catch (error) {
      return (`Error creating collection ${collectionName}:`, error);
    }
  }

  async addDataById(collectionName,  documentId,data) {
    try {
      await setDoc(doc(this.db,collectionName,documentId),data)
        return(`Document ${documentId} added to collection ${collectionName} successfully.`);
        
    } catch (error) {
      return(`Error adding document ${documentId} to collection ${collectionName}:`, error);
    }
  }
  async updateDataById(collectionName, data, documentId) {
    try {
      await updateDoc(doc(this.db,collectionName,documentId),data)
        return(`Document ${documentId} updated to collection ${collectionName} successfully.`);
        
    } catch (error) {
      return(`Error adding document ${documentId} to collection ${collectionName}:`, error);
    }
  }

  async readDataById(collectionName, documentId) {
    try {
      const docRef = doc(this.db, collectionName, documentId);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists) {
        return (`Document ${documentId} does not exist in collection ${collectionName}.`);
      } else {
        const data = JSON.stringify( docSnap.data())
        return data
      }
    } catch (error) {
      return (`Error retrieving document ${documentId} from collection ${collectionName}:`, error);
    }
  }

  async deleteDataById(collectionName, documentId) {
    try {
      await deleteDoc(doc(this.db,collectionName,documentId))
      return (`Document ${documentId} deleted from collection ${collectionName} successfully.`);
    } catch (error) {
      return (`Error deleting document ${documentId} from collection ${collectionName}:`, error);
    }
  }

  async  deleteCollection(collectionName) {
    const q = query(collection(this.db, collectionName));
    const querySnapshot = await getDocs(q);
    const deleteOps = [];
    querySnapshot.forEach((doc) => {
      deleteOps.push(deleteDoc(doc.ref));      
    });

    Promise.all(deleteOps).then(() => console.log('documents deleted'))
  }

  async SaveChat(documentId) {
    try {
      const docRef = doc(this.db, 'chats', documentId)
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists) {
        await setDoc(doc(this.db,'chats',documentId),{key:documentId})
      }
    } catch (error) {
      return (`Error creating document ${documentId} in collection chats:`, error);
    }
  }
}

module.exports = Firestore;
