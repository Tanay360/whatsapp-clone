<script lang="ts">
  import { defineStore } from 'pinia';
  interface Contact {
    profileUrl?: string,
    name?: string,
    phone: string
  }

  interface Message {
    id: string,
    time: number,
    message: string,
    from: string,
    to: string
  }

  export const useContactsStore = defineStore('contacts', {
    state() {
      return {
        contacts: [] as Contact[]
      }
    },
    actions: {
      setContacts(contacts: Contact[]) {
        this.contacts = contacts;
      },
      addContacts(...contacts: Contact[]) {
        this.contacts.push(...contacts);
      },
      deleteContact(contact: Contact) {
        const index = this.contacts.indexOf(contact);
        if (index > -1) {
          this.contacts.splice(index, 1);
        }
      },
      changeItem(index: number, contact: Contact) {
        this.contacts[index] = contact;
      }
    }
  })

  export const usePhoneStore = defineStore('phone', {
    state() {
      return {
        phone: null as string | null
      }
    },
    actions: {
      updatePhone(phone: string | null) {
        this.phone = phone
      }
    }
  });
  export const useSelectContactStore = defineStore('selected_contact', {
    state() {
      return {
        selectedContact: null as Contact | null
      }
    },
    actions: {
      updateContact(contact: Contact) {
        this.selectedContact = contact;
      }
    }
  });
  export const useEmojiOpenStore = defineStore('emoji', {
    state() {
      return {
        open: false
      }
    },
    actions: {
      revert() {
        this.open = !this.open;
      }
    }
  });
  export const useMessageStore = defineStore('message', {
    state() {
      return {
        message: ''
      }
    },
    actions: {
      updateMessage(msg: string){ 
        this.message = msg;
      }
    }
  });
  export const useContactMessagesStore = defineStore('messages', {
    state() {
      return {
        messages: [] as Message[]
      }
    },
    actions: {
      updateMessages(messages: Message[]) {
        this.messages = messages.sort((a,b) => a.time - b.time);
      },
      addMessages(...messages: Message[]) {
        this.messages.push(...messages);
        this.messages.sort((a,b) => a.time - b.time)
      },
      deleteMessage(message: Message) {
        const index = this.messages.indexOf(message);
        if (index > -1) {
          this.messages.splice(index, 1);
        } 
      },
      deleteAll() {
        this.messages = []
      }
    }
  });

  export const useSelectedMessageStore = defineStore('selectedMessage', {
    state() {
      return {
        id: null as string | null
      }
    },
    actions: {
      changeSelection(id: string) {
        this.id = id;
      },
      unselect() {
        this.id = null;
      }
    }
  })
</script>

<script setup lang="ts">
  import { getAuth, updateProfile } from 'firebase/auth';
  import { io } from "socket.io-client";
  import Constants from '@/constants/constants';
  import axios from 'axios'
  import WhatsApp from '@/components/WhatsApp.vue';
  import { VuemojiPicker, EmojiClickEventDetail } from 'vuemoji-picker'
  import Vue from 'vue';

  const contactsStore = useContactsStore();
  const selectedContactStore = useSelectContactStore();
  const contactMessagesStore = useContactMessagesStore();
  const emojiOpen = useEmojiOpenStore();
  const messageStore = useMessageStore();
  const phone = usePhoneStore()
  const selectedMessage = useSelectedMessageStore();

  let showMessageDropdown = false;
  let showDropDown = false;
  function getBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      var reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = function () {
        if (typeof reader.result == 'string') {
          resolve(reader.result.split(',')[1]);
        } else {
          reject('Result is not string')
        }
      };
      reader.onerror = function (error) {
        reject(error)
      };
    })
  }

  // const socket = io('https://whatsapp-clone-server-7715.herokuapp.com/',  { transports : ['websocket'] })
  const socket = io();

  const auth = getAuth()
  auth.onAuthStateChanged(() => {
    if (auth.currentUser == null) {
      Vue.$toast.error('Please login to continue', {
        message: 'Please login to continue',
        position: 'top-right'
      })
      setTimeout(() => {
        loginUser()
      }, 1000);
    } else {
      phone.updatePhone(auth.currentUser.phoneNumber);
      if (phone.phone == null) {
        Vue.$toast.error('Some error occurred!', {
          message: 'Some error occurred!',
          position: 'top-right'
        })
      } else {
        socket.emit(Constants.EMIT.NEW_USER, phone.phone) 
      }
    }
  });

  const showError = (msg: string) => {
    Vue.$toast.error(msg, {
      message: msg,
      position: 'top-right'
    })
  }

  const showSuccess = (msg: string) => {
    Vue.$toast.success(msg, {
      message: msg,
      position: 'top-right'
    })
  }

  const showInfo = (msg: string) => {
    Vue.$toast.info(msg, {
      message: msg,
      position: 'top-right'
    })
  }

  const sendMessage = () => {
    if (phone.phone == null) {
      showError('Please login first!');
      loginUser();
    } else {
      if (messageStore.message == '') {
        showError('Please type something to send!');
      } else {
        if (selectedContactStore.selectedContact == null) {
          showError('Please select a contact to message to!');
        } else {
          socket.emit(Constants.EMIT.MESSAGE, {
            message: messageStore.message,
            toNumber: selectedContactStore.selectedContact.phone
          });
          messageStore.message = ''
        }
      }
    }
  }

  const handleEmojiClick = (detail: EmojiClickEventDetail) => {
    messageStore.updateMessage(messageStore.message + detail.unicode!)
    emojiOpen.revert()
  }

  const loginUser = () => {
    window.open('login', '_self')
  }

  const selectNewContact = (contact:Contact) => {
    if (selectedContactStore.selectedContact == null || contact.phone != selectedContactStore.selectedContact.phone) {
      selectedContactStore.updateContact(contact)
      contactMessagesStore.updateMessages([]);
      socket.emit(Constants.EMIT.GET_ALL_MESSAGES, contact.phone);
    }
  }

  const messageSendOnEnter = (e: KeyboardEvent) => {
    if (e.key == 'Enter' || e.keyCode == 13) {
      sendMessage()
    }
  }

  const showAddContactDialog = () => {
    (Vue as any).dialog.prompt({
      title: 'Add new contact',
      body: 'Type the number of the contact with +(country-code)'
    }).then((dialog: any)  => {
      console.log(dialog)
      const phone = dialog.data || ''
      if (phone == '') {
        showError('Please enter the phone number correctly!');
      } else {
        socket.emit(Constants.EMIT.ADD_CONTACT, phone);
      }
    }).catch(console.error)  
  }

  
  const changeDisplayName = () => {
    (Vue as any).dialog.prompt({
      title: 'Change Display Name',
      body: 'Enter your new name:'
    }).then((dialog: any)  => {
      console.log(dialog)
      const name = dialog.data || ''
      if (name == '') {
        showError('Please enter your name correctly!');
      } else {
        socket.emit(Constants.EMIT.CHANGE_DISPLAY_NAME, name);
      }
    }).catch(console.error)
  }

  const changeProfilePicture = () => {
    const fileInput = document.createElement('input')
    fileInput.type = 'file';
    fileInput.accept = 'image/png, image/jpeg, image/jpg';
    fileInput.click();
    fileInput.addEventListener('change', async () => {
      if (fileInput.files != null) {
        const file = fileInput.files[0]
        if (['image/jpg', 'image/jpeg', 'image/png'].indexOf(file.type) > -1) {
          const res = await axios.post('/upload_img', {
            image: await getBase64(file)
          })
          // socket.emit(Constants.EMIT.SET_PICTURE, res.data);
          if (auth.currentUser == null) {
            showError('Please login to continue!');
            return;
          }
          await updateProfile(auth.currentUser, {
            photoURL: res.data
          })
          showInfo('Updated profile picture!');
          const index = contactsStore.contacts.findIndex((v) => {
            return v.phone == auth.currentUser?.phoneNumber
          })
          contactsStore.changeItem(index, {
            ...contactsStore.contacts[index],
            profileUrl: res.data
          })
        } else {
          showError('Please upload an image file to continue!');
        }
      }
    });
  }
  
  socket.on(Constants.ON.CONNECTED, () => {
    console.error('Connected');
    socket.emit(Constants.EMIT.GET_ALL_CONTACTS);
  });

  socket.on(Constants.ON.CLOSE_OLD_SESSION, () => {
    showError('Close the other session to continue!');
  });

  socket.on(Constants.ON.LOGIN_FIRST, () => {
    showError('Please login to continue!');
    setTimeout(() => {
      loginUser();
    }, 1000);
  });
  
  socket.on(Constants.ON.CONTACT_EXISTS, (contact: string) => {
    showError(`Contact already exists: ${contact}`);
  });

  socket.on(Constants.ON.CONTACT_DOES_NOT_EXIST, () => {
    showError('Contact does not exist!');
  })

  socket.on(Constants.ON.CONTACT_ADDED, (contact: Contact) => {
    contactsStore.addContacts(contact);
    showSuccess(`Contact added: ${contact.phone}`)
  });


  socket.on(Constants.ON.GOT_ALL_MESSAGES, ({messages}: {messages: Message[]}) => {
    console.error(messages);
    contactMessagesStore.updateMessages(messages);
  });

  socket.on(Constants.ON.NEW_MESSAGE, (msg: Message) => {
    if (selectedContactStore.selectedContact == null || selectedContactStore.selectedContact.phone != msg.from) {
      showInfo(`New message from ${msg.from}`);
    } else {
      contactMessagesStore.addMessages(msg);
    }
  })

  socket.on(Constants.ON.MESSAGE_SENT, (message: Message) => {
    contactMessagesStore.addMessages(message);
  });
  
  socket.on(Constants.ON.GOT_ALL_CONTACTS, ({contacts}: {contacts: Contact[]}) => {
    contactsStore.setContacts(contacts)
  });

  socket.on(Constants.ON.CHANGED_NAME, (ob: string | { id: string, name: string }) => {
    if (typeof ob === "string") {
      showInfo(`Changed name successfully to ${ob}`);
    } else {
      const index = contactsStore.contacts.findIndex((value) => {
        return value.phone == ob.id
      })
      if (index > -1) {
        const contact = contactsStore.contacts[index];
        if (contact.phone == ob.id) {
          contactsStore.changeItem(index, {
            ...contact,
            phone: ob.id
          })
        }
      }
    }
  });
  
  socket.on(Constants.ON.FAILED_TO_ADD_CONTACT, (contact: string) => {
    showError(`Failed to add contact: ${contact}`)
  });

  socket.on(Constants.ON.FAILED_TO_GET_MESSAGES, () => {
    showError('Failed to load messages!');
  });

  socket.on(Constants.ON.FAILED_TO_SEND_MESSAGE, () => {
    showError('Failed to send message!');
  })

  socket.on(Constants.ON.FAILED_TO_GET_CONTACTS, () => {
    showError('Failed to load contacts!');
  });

  socket.on(Constants.ON.FAILED_TO_CHANGE_NAME, () => {
    showError('Failed to change name!');
  });

  socket.on(Constants.ON.USER_DOES_NOT_EXIST, () => {
    showError('User does not exist!');
  })

  socket.on(Constants.ON.FAILED_TO_FIND_USER, () => {
    showError('Failed to find user!');
  })

  socket.on(Constants.ON.FAILED_TO_ACHIEVE_CONNECTION, () => {
    showError('Failed to establish connection with server!');
  })
</script>

<template>
  <main>
    <div class="side-bar">
      <div class="app-bar">
        <v-app-bar
          elevation="4"
          dark
        >
          <v-app-bar-nav-icon><WhatsApp style="width: 30px; height: 30px;"/></v-app-bar-nav-icon>
          <v-app-bar-title>WhatsApp Clone</v-app-bar-title>
          <v-spacer></v-spacer>
          <dropdown-menu
            v-model="showDropDown"
            :right="false"
            :hover="false"
            :interactive="true"
          >
            <v-btn fab v-tooltip="'Account details'" class="dropdown-toggle">
              <v-icon style="font-size: 2.5rem;" v-if="auth.currentUser == null || auth.currentUser.photoURL == null">mdi-account-circle</v-icon>
              <img v-else :src="auth.currentUser.photoURL" alt="" width="35" height="35" style="border-radius: 50%;">
            </v-btn>

            <div slot="dropdown" class="dropdown">
              <v-btn class="normal-case rounded" @click="loginUser" v-if="auth.currentUser == null">Login</v-btn>
              <template v-else>
                <v-btn style="background: #008080;" @click="changeDisplayName">Change Display Name</v-btn>
                <v-btn style="background: #008080; margin-top: 5px;" @click="changeProfilePicture">Change Profile Picture</v-btn>
              </template>
            </div>
          </dropdown-menu>
        </v-app-bar>
      </div>
      <v-divider></v-divider>
      <div class="contacts-list">
        <v-list dark class="contacts-list-inner">
          <v-btn 
            style="text-transform: none; width: 100%; text-align: initial; padding: 0; height: fit-content;" 
            v-for="({profileUrl, phone, name}) in contactsStore.contacts" 
            :key="phone"
            @click="() => selectNewContact({profileUrl, phone, name})"
          >
            <v-list-item 
              style="padding: 5px 10px;"
            >
              <v-icon v-if="profileUrl == null" style="font-size: 3rem;">mdi-account-circle</v-icon>
              <v-list-item-icon v-else>
                <img :src="profileUrl" alt="" width="35" height="35" style="border-radius: 50%;">
              </v-list-item-icon>
              <v-list-item-title style="margin-left: 10px; font-size: 1.1rem;">{{name || phone}}</v-list-item-title>
            </v-list-item>
          </v-btn>
        </v-list>
        <v-btn 
          fab 
          text 
          style="position: absolute; bottom: 10px; right: 0; z-index: 999;" 
          dark 
          v-tooltip="'New Contact'"
          @click="showAddContactDialog"
        >
          <v-icon style="transform: rotateY(180deg);">mdi-message-text-outline</v-icon>
        </v-btn>
        
      </div>
    </div>
    <div class="divider-vertical"></div>
    <div class="msg-container" v-if="selectedContactStore.selectedContact != null">
      <v-toolbar dark v-tooltip="`Phone Number: ${selectedContactStore.selectedContact.phone}`">
        <div class="toolicon">
          <v-icon v-if="selectedContactStore.selectedContact.profileUrl == null" style="font-size: 2rem;">mdi-account-circle</v-icon>
          <img v-else :src="selectedContactStore.selectedContact.profileUrl" alt="" width="35" height="35" style="border-radius: 50%;">
        </div>
        <v-toolbar-title style="margin-left: 10px;">{{selectedContactStore.selectedContact.name || selectedContactStore.selectedContact.phone}}</v-toolbar-title>
      </v-toolbar>
      <div class="contact-person">
        <v-list dark style="width: 100%;" class="messages-list">
          <v-list-item v-for="(message) in contactMessagesStore.messages" :key="message.id" style="width: 100%; margin: 0; padding: 0;" dark>
            <v-col style="width: 100%; padding: 0;">
              <span
                style="float: right; background: #008080;"
                class="msg"
                v-if="message.to == selectedContactStore.selectedContact.phone"
              >
                {{message.message}}
              </span>  
              <span
                v-else
                style="background: #333; float: left; float: left;" 
                class="msg"
              >
                {{message.message}}
              </span>
            </v-col>
          </v-list-item>
        </v-list>
        <div class="msg-person">
          <VuemojiPicker v-if="emojiOpen.open" @emojiClick="handleEmojiClick" id="emojiPicker" style="position: absolute; bottom: 3rem; z-index: 999;"/>
          <v-row>
            <v-btn 
              v-tooltip="'Emoji'"
              text 
              elevation="0" 
              style="position: relative; bottom: -5px;" 
              fab
              @click="emojiOpen.revert"
            >
              <v-icon style="color: white;">mdi-emoticon</v-icon>
            </v-btn>
            <v-text-field 
              style="max-width: 85%;"
              placeholder="Type your message here" 
              dark
              @keydown="messageSendOnEnter"
              v-model="messageStore.message"
              append-icon="mdi-send"
              @click:append="sendMessage"
            ></v-text-field>
          </v-row>
        </div>
      </div>
    </div>

  </main>
</template>

<style scoped>
  main {
    width: 100%;
    height: 100%;
    display: flex;
    overflow: hidden;
  }

  .msg {
    color: #fff; 
    padding: 5px 10px; 
    border-radius: 10px; 
    max-width: 50%;
    word-wrap: break-word;
  }

  .contacts-list {
    overflow-y: scroll;
  }

  .messages-list {
    overflow-x: hidden;
    overflow-y: scroll;
    max-height: 92%;
    padding-right: 5px;
  }

  .contacts-list::-webkit-scrollbar, .messages-list::-webkit-scrollbar {
    width: 3px;
  }

  .contacts-list::-webkit-scrollbar-thumb, .messages-list::-webkit-scrollbar-thumb {
    background: gray;
  }
  

  .divider-vertical {
    width: 2px;
    height: 100%;
    background: #222;
  }

  .msg-container {
    width: 60%;
    height: 100%;
  }

  .contact-person {
    width: 100%;
    padding: 10px;
    height: 90vh;
    display: flex;
    flex-direction: column;
  }

  .msg-person {
    /* max-height: 50px;  */
    position: absolute;
    bottom: 0;
    width: 100%;
  }

  .side-bar {
    width: 40%;
    height: 100%;
  }

  .dropdown {
    text-align: center;
    display:flex;
    flex-direction: column;
  }

  .contacts-list {
    height: 90vh;
  }

  .app-bar {
    z-index: 999;
  }

  .contacts-list-inner {
    height: 100%;
    background: #202020;
  }
</style>

<style>
  .normal-case {
    text-transform: none;
  }
  .rounded {
    border-radius: 5px;
  }
  .dropdown-menu {
    position: fixed;
    border-radius: 5px;
    top: 70px;
    min-width: 100px;
    right: 10px;
    z-index: 999 !important;
    background: #333;
  }
</style>