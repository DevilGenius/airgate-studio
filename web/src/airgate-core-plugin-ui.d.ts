declare module '@devilgenius/airgate-core/plugin-ui' {
  import type { ReactElement } from 'react';

  export interface PluginBreadcrumbItem {
    to?: string;
    href?: string;
    labelKey?: string;
    labelFallback: string;
  }

  export interface PluginBreadcrumbsProps {
    items: PluginBreadcrumbItem[];
    pluginName?: string;
    ariaLabel?: string;
    className?: string;
  }

  export function PluginBreadcrumbs(props: PluginBreadcrumbsProps): ReactElement;
}
