<script setup lang="ts">
  import { initializeApp } from "firebase/app";
  const firebaseConfig = {
    apiKey,
    authDomain,
    projectId,
    storageBucket,
    messagingSenderId,
    appId,
    measurementId
  }; // Write credentials

  initializeApp(firebaseConfig);
</script>

<template>
  <div id="app">
    <router-view />
  </div>
</template>

<style>
  @import '@/assets/base.css';
</style>
