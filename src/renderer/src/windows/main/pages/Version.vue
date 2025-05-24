<script setup lang="ts">
import { reactive, onMounted, ref } from 'vue'
import { useQuasar } from 'quasar'
const $q = useQuasar()
onMounted(() => {
  window.api.onPong((val) => {
    $q.notify(`pong return value:${val}`)
    setTimeout(() => {
      btnPingLoading.value = false
    }, 1000)
  })
})
const [btnPingLoading, btnInvokeLoading] = [ref(false), ref(false)]
const versions = reactive({ ...window.electron.process.versions })
const sendPing = () => {
  btnPingLoading.value = true
  window.electron.ipcRenderer.send('ping')
}
const invokeCall = () => {
  btnInvokeLoading.value = true
  window.electron.ipcRenderer.invoke('invokeCall', 'value').then((val) => {
    $q.notify(`invoke return value:${val}`)
    setTimeout(() => {
      btnInvokeLoading.value = false
    }, 1000)
  })
}
</script>
<template>
  <q-page class="q-pa-xs">
    <q-card bordered flat>
      <q-card-section>
        <div class="text-h6">Runtime version</div>
        <div class="text-subtitle2">by Topabomb</div>
      </q-card-section>
      <q-separator inset />
      <q-card-section>
        <q-list bordered separator>
          <q-item>
            <q-item-section>
              <q-item-label>Electron</q-item-label>
              <q-item-label caption>v{{ versions.electron }}</q-item-label>
            </q-item-section>
          </q-item>
          <q-item>
            <q-item-section>
              <q-item-label>Chromium</q-item-label>
              <q-item-label caption>v{{ versions.chrome }}</q-item-label>
            </q-item-section>
          </q-item>
          <q-item>
            <q-item-section>
              <q-item-label>Node</q-item-label>
              <q-item-label caption>v{{ versions.node }}</q-item-label>
            </q-item-section>
          </q-item>
        </q-list>
      </q-card-section>
      <q-card-actions>
        <q-btn label="Ping主进程" :loading="btnPingLoading" @click="sendPing" />
        <q-btn label="Invoke主进程" :loading="btnInvokeLoading" @click="invokeCall" />
      </q-card-actions>
    </q-card>
  </q-page>
</template>
