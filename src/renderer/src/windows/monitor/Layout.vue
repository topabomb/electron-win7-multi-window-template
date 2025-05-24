<template>
  <q-layout view="hHh lpR fFf">
    <q-header reveal class="bg-primary text-white">
      <q-bar class="q-electron-drag">
        <div>MonitorApp</div>
        <q-space />
        <q-btn dense flat icon="minimize" @click="windowUtils.minimize" />
        <q-btn dense flat icon="crop_square" @click="windowUtils.toggleMaximize" />
        <q-btn dense flat icon="close" @click="windowUtils.closeApp" />
      </q-bar>
    </q-header>

    <q-page-container>
      <q-scroll-area style="height: calc(100vh - 32px)" class="q-ma-none q-pa-none">
        <router-view />
      </q-scroll-area>
    </q-page-container>
    <!--
    <q-footer reveal elevated class="bg-grey-8 text-white">
      <q-toolbar>
        <q-toolbar-title>
          <div></div>
        </q-toolbar-title>
      </q-toolbar>
    </q-footer>
    -->
  </q-layout>
</template>
<script setup lang="ts">
import { windowUtils } from '../../composables/window'
</script>
