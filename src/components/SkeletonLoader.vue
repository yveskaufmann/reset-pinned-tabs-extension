<template>
  <div class="w-full divide-y divide-gray-100">
    <div v-for="i in 4" :key="i" class="flex items-center justify-between p-3 animate-pulse">

      <div class="flex items-center space-x-3 w-full">
        <div class="w-6 h-6 bg-gray-200 rounded-md flex-shrink-0"></div>

        <div class="flex flex-col space-y-2 w-full max-w-[150px]">
          <div class="h-3 bg-gray-200 rounded w-3/4"></div>
          <div class="h-2 bg-gray-100 rounded w-1/2"></div>
        </div>
      </div>

      <div class="flex items-center space-x-2 ml-2">
        <div class="w-6 h-6 bg-gray-200 rounded-md flex-shrink-0"></div>
        <div class="w-6 h-6 bg-gray-200 rounded-md flex-shrink-0"></div>
        <div class="w-6 h-6 bg-gray-200 rounded-md flex-shrink-0"></div>
      </div>
    </div>
  </div>
</template>
