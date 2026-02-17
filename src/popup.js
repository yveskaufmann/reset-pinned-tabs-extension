import './pollyfill.js';
import { createApp } from 'vue';
import App from './popup.vue';
import './style.css'; // Hier liegen deine Tailwind @tailwind directives

createApp(App).mount('#app');
