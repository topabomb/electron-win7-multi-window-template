<script setup lang="ts">
import { ref, nextTick, onMounted, onUnmounted } from 'vue'
import { useProcessStore } from '../store/process'

// 使用进程状态管理
const processStore = useProcessStore()

// 当前选中的进程标签
const activeTab = ref(0) // 初始值设为0，等待进程数据加载后再更新

// 日志显示相关
const logContainers = ref({})
const setActiveTab = (id: number) => {
  activeTab.value = id
  onTabChange(id)
}
// 处理日志自动滚动
const handleLogUpdate = (processId) => {
  const autoScroll = processStore.getAutoScrollSetting(processId)
  // 只有当进程的自动滚动开关打开，且当前选中的是该进程时，才滚动
  if (autoScroll && activeTab.value === processId) {
    nextTick(() => {
      const container = logContainers.value[processId]
      if (container) {
        container.scrollTop = container.scrollHeight
      }
    })
  }
}

// 设置DOM引用
const setLogRef = (el, processId) => {
  if (el) {
    logContainers.value[processId] = el
  }
}

// 清除日志
const clearLogs = (processId) => {
  processStore.clearLogs(processId)
}

// 切换自动滚动
const toggleAutoScroll = (processId, value) => {
  processStore.toggleAutoScroll(processId, value)
}

// 当标签页切换时，滚动到底部
const onTabChange = (newTabId) => {
  const autoScroll = processStore.getAutoScrollSetting(newTabId)
  if (autoScroll) {
    handleLogUpdate(newTabId)
  }
}

// 初始化进程数据和IPC监听
onMounted(async () => {
  // 设置日志更新回调
  processStore.setLogUpdateCallback(handleLogUpdate)

  // 初始化数据 - 这会同时初始化系统进程和IPC监听器
  await processStore.initializeProcessData()

  // 设置初始选中的标签为系统进程（ID=1）
  activeTab.value = 1
})

// 组件卸载时移除回调
onUnmounted(() => {
  processStore.setLogUpdateCallback(null)
})

// 判断是否为系统进程
const isSystemProcess = (process) => {
  return process.id === 1 && process.name === 'System'
}
</script>

<template>
  <q-page>
    <!-- 日志显示区域 -->
    <div class="row q-pt-xs">
      <q-btn
        v-for="(v, i) in processStore.backendProcesses"
        :key="i"
        size="sm"
        flat
        no-caps
        :color="activeTab == v.id ? 'primary' : ''"
        @click="setActiveTab(v.id)"
      >
        {{ v.name }}
        <q-badge :color="processStore.getStatusColor(v.status)" floating>
          {{ v.logs.length }}
        </q-badge>
      </q-btn>
    </div>
    <!--
    <q-tabs
      v-model="activeTab"
      class="text-primary"
      indicator-color="primary"
      align="left"
      dense
      @update:model-value="onTabChange"
    >
      <q-tab
        v-for="process in processStore.backendProcesses"
        :key="process.id"
        :name="process.id"
        no-caps
      >
        {{ process.name
        }}<q-badge :color="processStore.getStatusColor(process.status)" floating>
          {{ process.logs.length }}
        </q-badge>
      </q-tab>
    </q-tabs>
-->
    <q-separator />

    <q-tab-panels v-model="activeTab" animated>
      <q-tab-panel
        v-for="process in processStore.backendProcesses"
        :key="process.id"
        :name="process.id"
        class="q-pa-none q-px-xs"
      >
        <div class="row justify-between items-center">
          <div>
            <q-badge :color="processStore.getStatusColor(process.status)" class="q-mr-xs">
              {{
                process.status === 'running'
                  ? '运行中'
                  : process.status === 'stopped'
                    ? '已停止'
                    : '错误'
              }}
            </q-badge>
            <span class="text-caption">启动: {{ process.startTime }}</span>
            <span class="text-caption q-ml-md">最近响应: {{ process.lastResponseTime }}</span>
            <!-- 显示进程ID，系统进程不显示 -->
            <span v-if="!isSystemProcess(process) && process.pid" class="text-caption q-ml-md">
              PID: {{ process.pid }}
            </span>
          </div>
          <div>
            <q-toggle
              :model-value="processStore.getAutoScrollSetting(process.id)"
              label="自动滚动"
              dense
              @update:model-value="toggleAutoScroll(process.id, $event)"
            />
            <q-btn flat dense label="清除日志" color="primary" @click="clearLogs(process.id)" />
          </div>
        </div>

        <div :ref="(el) => setLogRef(el, process.id)" class="log-container">
          <div v-if="process.logs.length > 0">
            <div
              v-for="(log, index) in process.logs"
              :key="index"
              class="log-item"
              :class="{ 'text-negative': log.isError }"
            >
              [{{ log.timestamp }}] {{ log.message }}
            </div>
          </div>
          <div v-else class="text-center q-pa-md text-grey">暂无日志</div>
        </div>
      </q-tab-panel>
    </q-tab-panels>
  </q-page>
</template>

<style scoped>
.log-container {
  height: calc(100vh - 130px);
  overflow-y: auto;
  font-family: 'Courier New', monospace;
  font-size: 0.9em;
  background-color: #f8f8f8;
  border-radius: 4px;
  padding: 8px;
}

.log-item {
  white-space: pre-wrap;
  word-break: break-all;
  line-height: 1.4;
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
  padding: 2px 0;
}
</style>
