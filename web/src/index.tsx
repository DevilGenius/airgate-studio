import type { PluginFrontendModule } from '@doudou-start/airgate-theme/plugin';
import StudioPage from './StudioPage';

const plugin: PluginFrontendModule = {
  routes: [
    { path: '/studio', component: StudioPage },
  ],
};

export default plugin;
