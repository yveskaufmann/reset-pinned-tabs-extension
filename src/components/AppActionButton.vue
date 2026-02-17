<script setup>

const props = defineProps({
  title: String,
  variant: {
    type: String,
    default: 'blue',
    validator: (value) => ['red', 'green', 'blue', 'gray'].includes(value)
  }
});

const variantStyles = {
  red: 'bg-red-50 text-red-600 hover:bg-red-600',
  green: 'bg-green-50 text-green-600 hover:bg-green-600',
  blue: 'bg-blue-50 text-blue-600 hover:bg-blue-600',
  gray: 'bg-gray-50 text-gray-600 hover:bg-gray-600'
};

</script>
<template>

  <button type="button" class="cursor-pointer p-1.5 rounded-md hover:text-white transition-all"
    :class="variantStyles[variant]" :title="title">
    <slot />
  </button>
</template>
