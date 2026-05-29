import type { PluginFrontendModule } from '@devilgenius/airgate-theme/plugin';
import StudioPage from './StudioPage';

const plugin: PluginFrontendModule = {
  routes: [
    { path: '/studio', component: StudioPage },
  ],
};

export default plugin;
