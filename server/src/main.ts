import express from 'express';
import cors from 'cors';
import { Server, Socket } from 'socket.io';
import { createServer } from 'http';
import { credential } from 'firebase-admin';
import querystring from 'querystring';
import { initializeApp, ServiceAccount } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore'
import { DefaultEventsMap } from 'socket.io/dist/typed-events';
import Constants from './constants';
import axios from 'axios'
import imgbbUploader from 'imgbb-uploader';
import credentials from './whatsapp-clone-5b851-firebase-adminsdk-cdnt8-7c49ac8e0c.json';
import path from 'path';

const firebaseApp = initializeApp({
  credential: credential.cert(credentials as ServiceAccount)
})

interface Contact {
  profileUrl?: string,
  name?: string,
  phone: string
}

interface Message {
  time: number,
  message: string,
  from: string,
  to: string
}


const auth = getAuth(firebaseApp);
const firestore = getFirestore(firebaseApp);

const PORT = process.env.PORT || 5000;

const app = express();
app.use(cors());
app.use(express.json({limit: '50mb'}));
app.use(express.urlencoded({limit: '50mb'}));
app.use(express.static('public'))

app.use(function(req, res, next) {
  if (req.url == '/' || req.url == '/upload_img' || req.url == '/login') {
    next();
  } else {
    res.redirect('/404');
  }
});

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
})

const server = createServer(app);
const io = new Server(server);
const activeUsers = new Set<string>();

const sockets = new Map<string, Socket<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>>();

io.sockets.on("connection", function (socket) {
  console.error("Made socket connection");
  let userId: string | null = null;
  socket.on(Constants.ON.NEW_USER, async (data: string) => {
    if (sockets.has(data)) {
      io.emit(Constants.EMIT.CLOSE_OLD_SESSION);
      return;
    }
    try {
      const user = await auth.getUserByPhoneNumber(data)
      if (user == null) {
        console.error(Constants.EMIT.FAILED_TO_ACHIEVE_CONNECTION, data);
        socket.emit(Constants.EMIT.FAILED_TO_ACHIEVE_CONNECTION, data);
      } else {
        socket.emit(Constants.EMIT.CONNECTED, data);
      }
    } catch (e) {
      socket.emit(Constants.EMIT.FAILED_TO_ACHIEVE_CONNECTION, data)
    }
    userId = data;
    sockets.set(userId, socket);
    activeUsers.add(data);
  });

  socket.on(Constants.ON.ADD_CONTACT, async (contactNumber: string) => {
    try {
      const user = await auth.getUserByPhoneNumber(contactNumber);
      if (user != null) {
        if (userId == null) {
          socket.emit(Constants.EMIT.LOGIN_FIRST);
          return;
        }
        const contactPath = `${userId}/contacts/contacts/${contactNumber}`;
        const doc = await firestore.doc(contactPath).get();
        if (doc.exists) {
          socket.emit(Constants.EMIT.CONTACT_EXISTS, contactNumber);
        } else {
          await firestore.doc(contactPath).set({});
          const contact: Contact = await getContact(contactNumber)
          socket.emit(Constants.EMIT.CONTACT_ADDED, contact);
        }
      } else {
        socket.emit(Constants.EMIT.USER_DOES_NOT_EXIST, contactNumber);
      }
    } catch (e) {
      console.error(`Error occurred while adding contact for ${userId}: ${e}`);
      socket.emit(Constants.EMIT.FAILED_TO_ADD_CONTACT, contactNumber);
    }
  });


  socket.on(Constants.ON.GET_ALL_MESSAGES, async (contactNumber: string) => {
    try {
      const user = await auth.getUserByPhoneNumber(contactNumber);
      if (user != null) {
        if (userId == null) {
          socket.emit(Constants.EMIT.LOGIN_FIRST);
          return;
        }
        console.log(`Request for messages: ${contactNumber}`)
        const messagesPath = `${userId}/messages/${contactNumber}`;
        const collection = await firestore.collection(messagesPath).get();
        const data = collection.docs.map((e) => { return {...(e.data() as Message), id: e.id}})
        socket.emit(Constants.EMIT.GOT_ALL_MESSAGES, {
          messages: data
        });
      } else {
        socket.emit(Constants.EMIT.USER_DOES_NOT_EXIST, contactNumber);
      }
    } catch (e) {
      console.error(`Error occurred while getting messages for ${userId}: ${e}`);
      socket.emit(Constants.EMIT.FAILED_TO_GET_MESSAGES, contactNumber)
    }
  });

  socket.on(Constants.ON.CHANGE_DISPLAY_NAME, async (name: string) => {
    try {
      if (userId == null) {
        socket.emit(Constants.EMIT.LOGIN_FIRST);
        return;
      }
      await setDisplayName(userId, name);
      const id = userId;
      socket.emit(Constants.EMIT.CHANGED_NAME, name);
      sockets.forEach((s) => {
        if (s != socket) {
          s.emit(Constants.EMIT.CHANGED_NAME, {
            id: id,
            name: name
          });
        }
      });
    } catch (e) {
      console.error(`Error occurred while changing display name for ${userId}: ${e}`);
      socket.emit(Constants.EMIT.FAILED_TO_CHANGE_NAME);
    }
  });

  socket.on(Constants.ON.GET_ALL_CONTACTS, async () => {
    try {
      if (userId == null) {
        socket.emit(Constants.EMIT.LOGIN_FIRST);
        return;
      }
      console.log(`Request for contacts: ${userId}`)
      const contactsPath = `${userId}/contacts/contacts`;
      const collection = await firestore.collection(contactsPath).listDocuments();
      const contacts: Contact[] = [];
      for (let item of collection) {
        const c = ((await item.get()).id);
        contacts.push(await getContact(c));
      }
      socket.emit(Constants.EMIT.GOT_ALL_CONTACTS, {
        contacts: contacts
      });
    } catch (e) {
      console.error(`Error occurred while getting contacts for ${userId}: ${e}`);
      socket.emit(Constants.EMIT.FAILED_TO_GET_CONTACTS);
    }
  });

  socket.on(Constants.ON.MESSAGE, async ({message, toNumber}: {message: string, toNumber: string}) => {
    try {
      const user = await auth.getUserByPhoneNumber(toNumber);
      if (user != null) {
        if (userId == null) {
          socket.emit(Constants.EMIT.LOGIN_FIRST);
          return;
        }
        const messagesPath = `${userId}/messages/${toNumber}`;
        const newMsg = {
          time: new Date().getTime(),
          message: message,
          from: userId,
          to: toNumber,
          reply: null
        };
        const doc = await firestore.collection(messagesPath).add(newMsg);
        if (userId == toNumber) {
          socket.emit(Constants.EMIT.MESSAGE_SENT, {
            ...newMsg,
            id: doc.id
          });
          return;
        }
        try {
          await firestore.collection(`${toNumber}/messages/${newMsg.from}`).doc(doc.id).set(newMsg);
          socket.emit(Constants.EMIT.MESSAGE_SENT, {
            ...newMsg,
            id: doc.id
          });
          sockets.get(toNumber)?.emit(Constants.EMIT.NEW_MESSAGE, {
            ...newMsg,
            id: doc.id
          });  
        } catch (e) {
          console.error(`Error occurred while adding message for ${userId}: ${e}`);
          socket.emit(Constants.EMIT.FAILED_TO_SEND_MESSAGE, toNumber);  
          doc.delete();
        }
      } else {
        socket.emit(Constants.EMIT.USER_DOES_NOT_EXIST, toNumber);
      }
    } catch (e) {
      console.error(`Error occurred while adding message for ${userId}: ${e}`);
      socket.emit(Constants.EMIT.FAILED_TO_SEND_MESSAGE, toNumber);
    }
  });

  socket.on(Constants.ON.DISCONNECT, () => {
    if (userId != null)  {
      activeUsers.delete(userId);
      sockets.delete(userId);
      userId = null;
    }
  });
});

app.post('/upload_img', async (req, res) => {
  console.log(req.body)
  if (typeof req.body === "undefined" || typeof req.body.image !== "string") {
    res.status(400);
    res.end();
  } else {
    var payload = querystring.stringify({
        image: req.body.image,
    });
    const response = await axios({
      method: 'post',
      url: 'https://api.imgbb.com/1/upload?key=225b5f433f6631161aed055eb1272e7a',
      headers: {},
      data: payload
    })
    res.end(response.data.data.image.url)
  }
  res.end('');
})

const getContact = async (phone: string): Promise<Contact> => {
  const user = await auth.getUserByPhoneNumber(phone)
  return {
    phone: phone,
    name: user.displayName,
    profileUrl: user.photoURL
  }
}

const setDisplayName = async (phone: string, name: string) => {
  const user = await auth.getUserByPhoneNumber(phone)
  await auth.updateUser(user.uid, {
    displayName: name   
  })
}

server.listen(PORT)