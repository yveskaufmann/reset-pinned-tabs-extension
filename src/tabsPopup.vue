<script setup>
import { onMounted, ref } from 'vue';
import AppActionButton from './components/AppActionButton.vue';
import IconRepin from './components/icons/IconRepin.vue';
import IconRestore from './components/icons/IconRestore.vue';
import IconSettings from './components/icons/IconSettings.vue';

import IconUnpin from './components/icons/IconUnpin.vue';
import SkeletonLoader from './components/SkeletonLoader.vue';
import {
  getPinnedTabs,
  getShouldUnloadResetTabs,
  repinTab,
  resetAllPinnedTabs,
  resetTab,
  setShouldUnloadResetTabs,
  toggleTabPin,
} from './tabManagement.js';

const pinnedTabs = ref([]);
const isLoading = ref(true);
const shouldUnloadResetTabs = ref(false);
const settingsOpen = ref(false);

onMounted(async () => {
  console.info('Popup mounted, fetching pinned tabs...');
  shouldUnloadResetTabs.value = await getShouldUnloadResetTabs();
  await refreshPinnedTabs();
});

async function refreshPinnedTabs() {
  isLoading.value = true;
  pinnedTabs.value = [];
  try {
    const tabs = await getPinnedTabs();
    console.log('Received pinned tabs:', tabs);
    pinnedTabs.value = tabs || [];
  } catch (error) {
    console.error('Failed to fetch pinned tabs:', error);
  } finally {
    isLoading.value = false;
  }
}

async function onRestoreTabClick(tab) {
  console.log('Restoring tab:', tab.id);
  await resetTab(tab.id);
  await refreshPinnedTabs();
}

async function onUnpinTabClick(tab) {
  console.log('Unpinning tab:', tab.id);
  await toggleTabPin(tab.id, false);
  await refreshPinnedTabs();
}

async function onRepinTabClick(tab) {
  console.log('Re-pinning tab with current URL:', tab.id);
  await repinTab(tab.id);
  await refreshPinnedTabs();
}

async function onRestoreAllTabsClick() {
  console.log('Restoring all pinned tabs');
  await resetAllPinnedTabs();
  await refreshPinnedTabs();
}

function toggleSettings() {
  settingsOpen.value = !settingsOpen.value;
}

async function onUnloadAfterResetToggle(event) {
  const checked = event.target.checked;
  shouldUnloadResetTabs.value = checked;
  await setShouldUnloadResetTabs(checked);
}
</script>

<template>

  <div class="w-175 bg-gray-50 p-3 antialiased">

    <div class="flex items-center justify-between mb-4">
      <h1 class="text-sm font-bold text-gray-700 uppercase tracking-wider">Pinned Shortcuts</h1>

      <div class="flex items-center gap-2">
        <AppActionButton title="Open settings" variant="gray" @click="toggleSettings()">
          <IconSettings />
        </AppActionButton>

        <AppActionButton title="Restore all pinned tabs to their original URLs" variant="blue"
          @click="onRestoreAllTabsClick()">
          <IconRestore />
        </AppActionButton>
      </div>
    </div>

    <div v-if="settingsOpen" class="mb-4 rounded-md border border-gray-200 bg-white p-3 shadow-sm">
      <div class="flex items-center justify-between gap-3">
        <div>
          <p class="text-xs font-semibold uppercase tracking-wide text-gray-600">Settings</p>
          <p class="text-xs text-gray-500">Choose whether reset also unloads the tab.</p>
        </div>

        <label class="flex items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" :checked="shouldUnloadResetTabs" @change="onUnloadAfterResetToggle" />
          <span>Unload tabs after reset</span>
        </label>
      </div>
    </div>

    <div class="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">

      <div v-if="isLoading" class="p-8 text-center text-gray-400">
        <SkeletonLoader />
      </div>

      <div v-if="!isLoading && pinnedTabs.length === 0" class="p-8 text-center text-gray-400">
        <p class="font-bold mb-2">No pinned tabs found.</p>
        <p class="text-sm">You can pin tabs from the browser's tab context menu.</p>
      </div>

      <ul v-if="!isLoading && pinnedTabs.length > 0" id="tab-list" class="divide-y divide-gray-100">
        <li v-for="tab in pinnedTabs" :key="tab.id"
          class="flex items-center justify-between p-3 hover:bg-gray-50 transition-colors">
          <div class="flex items-center space-x-3 overflow-hidden">
            <img :src="tab.favIconUrl" class="w-5 h-5 flex-shrink-0" />
            <div class="truncate">
              <p class="text-sm font-medium text-gray-900 truncate" :title="tab.title">{{ tab.title }}</p>
              <p class="text-[11px] text-gray-500 truncate italic" :title="tab.pinnedURL">Pinned: {{ tab.pinnedURL }}
              </p>
            </div>
          </div>

          <div class="flex items-center space-x-2 ml-2">

            <AppActionButton title="Restore to original URL" variant="blue" @click="onRestoreTabClick(tab)">
              <IconRestore />
            </AppActionButton>

            <AppActionButton title="Re-pin with current URL" variant="green" @click="onRepinTabClick(tab)">
              <IconRepin />
            </AppActionButton>

            <AppActionButton title="Un-pin this tab" variant="red" @click="onUnpinTabClick(tab)">
              <IconUnpin />
            </AppActionButton>
          </div>
        </li>
      </ul>
    </div>
  </div>
</template>
