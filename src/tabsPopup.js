import './pollyfill.js';
import { createApp } from 'vue';
import TabsPopup from './tabsPopup.vue';
import './style.css'; // Hier liegen deine Tailwind @tailwind directives

createApp(TabsPopup).mount('#app');
