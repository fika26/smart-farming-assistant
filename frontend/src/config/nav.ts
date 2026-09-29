import {
  Activity,
  BarChart3,
  Bell,
  Bot,
  CloudSun,
  Droplets,
  FileText,
  LayoutDashboard,
  Leaf,
  Map,
  Radio,
  ScanSearch,
  Settings,
  ShieldAlert,
  Sprout,
  TriangleAlert,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface NavItem {
  href: string;
  label: string;
  /** Key into the i18n dictionary (`nav.<key>`); falsy items keep the English label everywhere. */
  labelKey: string;
  icon: LucideIcon;
  description: string;
  badge?: 'alerts' | 'actions' | 'notifications';
}

export interface NavSection {
  id: string;
  label: string;
  labelKey: string;
  items: NavItem[];
}

/** Single source of truth for the sidebar, breadcrumbs and page titles. */
export const NAV_SECTIONS: NavSection[] = [
  {
    id: 'today',
    label: 'Today',
    labelKey: 'nav.section.today',
    items: [
      {
        href: '/dashboard',
        label: 'Overview',
        labelKey: 'nav.overview',
        icon: LayoutDashboard,
        description: 'What needs your attention today',
      },
      {
        href: '/alerts',
        label: 'Alerts',
        labelKey: 'nav.alerts',
        icon: TriangleAlert,
        description: 'Problems found, why they matter and what to do',
        badge: 'alerts',
      },
    ],
  },
  {
    id: 'farm',
    label: 'Farm',
    labelKey: 'nav.section.farm',
    items: [
      { href: '/fields', label: 'Fields', labelKey: 'nav.fields', icon: Sprout, description: 'Every field and how it is doing right now' },
      { href: '/map', label: 'Field Map', labelKey: 'nav.map', icon: Map, description: 'Where your fields and sensor nodes sit' },
      { href: '/soil-irrigation', label: 'Irrigation', labelKey: 'nav.soil-irrigation', icon: Droplets, description: 'Soil moisture, thresholds and the water plan' },
      { href: '/weather', label: 'Weather', labelKey: 'nav.weather', icon: CloudSun, description: 'Conditions now and the days ahead' },
    ],
  },
  {
    id: 'ai',
    label: 'AI',
    labelKey: 'nav.section.ai',
    items: [
      { href: '/ai-assistant', label: 'AI Assistant', labelKey: 'nav.ai-assistant', icon: Bot, description: 'Ask a question, or see what your readings mean in plain language' },
      { href: '/crop-health', label: 'Crop Health', labelKey: 'nav.crop-health', icon: Leaf, description: 'Stage, stress and health indicators' },
      { href: '/disease-detection', label: 'Disease Detection', labelKey: 'nav.disease-detection', icon: ScanSearch, description: 'Photograph a leaf to check for disease or pests' },
      { href: '/risk-forecast', label: 'Risk Forecast', labelKey: 'nav.risk-forecast', icon: ShieldAlert, description: 'What could go wrong in the next seven days' },
    ],
  },
  {
    id: 'system',
    label: 'System',
    labelKey: 'nav.section.system',
    items: [
      { href: '/sensors', label: 'Sensors', labelKey: 'nav.sensors', icon: Radio, description: 'Live readings from the sensors in your fields' },
      { href: '/analytics', label: 'Analytics', labelKey: 'nav.analytics', icon: BarChart3, description: 'Water use, trends and yield estimates' },
      { href: '/reports', label: 'Reports', labelKey: 'nav.reports', icon: FileText, description: 'Season records you can keep or share' },
      { href: '/notifications', label: 'Notifications', labelKey: 'nav.notifications', icon: Bell, description: 'Delivery log and channels', badge: 'notifications' },
      { href: '/settings', label: 'Settings', labelKey: 'nav.settings', icon: Settings, description: 'Farm, thresholds and system' },
    ],
  },
];

export const NAV_ITEMS: NavItem[] = NAV_SECTIONS.flatMap((section) => section.items);

export function findNavItem(pathname: string): NavItem | undefined {
  return (
    NAV_ITEMS.find((item) => item.href === pathname) ??
    NAV_ITEMS.find((item) => pathname.startsWith(`${item.href}/`))
  );
}

export const ACTIVITY_ICON = Activity;
