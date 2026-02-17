<script setup>
import { ref, onMounted } from 'vue';
import { getPinnedTabs, resetTab, toggleTabPin, resetAllPinnedTabs, repinTab } from './tabManagement.js';

import SkeletonLoader from './components/SkeletonLoader.vue';
import AppActionButton from './components/AppActionButton.vue';

import IconUnpin from './components/icons/IconUnpin.vue';
import IconRepin from './components/icons/IconRepin.vue';
import IconRestore from './components/icons/IconRestore.vue';


const pinnedTabs = ref([]);
const isLoading = ref(true);

onMounted(async () => {
  console.info("Popup mounted, fetching pinned tabs...");
  await refreshPinnedTabs();
});

async function refreshPinnedTabs() {
  isLoading.value = true;
  pinnedTabs.value = [];
  try {
    const tabs = await getPinnedTabs();
    console.log("Received pinned tabs:", tabs);
    pinnedTabs.value = tabs || [];
  } catch (error) {
    console.error("Failed to fetch pinned tabs:", error);
  } finally {
    isLoading.value = false;
  }
}

async function onRestoreTabClick(tab) {
  console.log("Restoring tab:", tab.id);
  await resetTab(tab.id);
  await refreshPinnedTabs();
}

async function onUnpinTabClick(tab) {
  console.log("Unpinning tab:", tab.id);
  await toggleTabPin(tab.id, false);
  await refreshPinnedTabs();
}

async function onRepinTabClick(tab) {
  console.log("Re-pinning tab with current URL:", tab.id);
  await repinTab(tab.id);
  await refreshPinnedTabs();
}

async function onRestoreAllTabsClick() {
  console.log("Restoring all pinned tabs");
  await resetAllPinnedTabs();
  await refreshPinnedTabs();
}


</script>

<template>

  <div class="w-[700px] bg-gray-50 p-3 antialiased">

    <div class="flex items-center justify-between mb-4">
      <h1 class="text-sm font-bold text-gray-700 uppercase tracking-wider">Pinned Shortcuts</h1>

      <AppActionButton title="Restore all pinned tabs to their original URLs" variant="blue"
        @click="onRestoreAllTabsClick()">
        <IconRestore />
      </AppActionButton>

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
