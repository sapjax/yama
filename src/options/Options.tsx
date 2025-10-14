import { useEffect, useState } from 'react'
import { AiSettings } from './components/AiSettings'
import { ColorSettings } from './components/ColorSettings'
import { DictSettings } from './components/DictSettings'
import { JpdbSettings } from './components/JpdbSettings'
import { ShortcutSettings } from './components/ShortcutSettings'
import { ThemeSettings } from './components/ThemeSettings'
import { SegmenterSettings } from './components/SegmenterSettings'
import { cn } from '@/lib/utils'

const tabs = {
  colors: {
    label: 'Colors',
    component: <ColorSettings />,
  },
  dictionaries: {
    label: 'Dictionaries',
    component: <DictSettings />,
  },
  jpdb: {
    label: 'JPDB Sync',
    component: <JpdbSettings />,
  },
  ai: {
    label: 'AI',
    component: <AiSettings />,
  },
  shortcuts: {
    label: 'Shortcuts',
    component: <ShortcutSettings />,
  },
  theme: {
    label: 'Theme',
    component: <ThemeSettings />,
  },
  segmenter: {
    label: 'Segmenter',
    component: <SegmenterSettings />,
  },
}

type TabName = keyof typeof tabs
const tabNames = Object.keys(tabs) as TabName[]

const getTabFromHash = (): TabName => {
  const hash = window.location.hash.slice(1)
  if (tabNames.includes(hash as TabName)) {
    return hash as TabName
  }
  return 'colors'
}

export function Options() {
  const [activeTab, setActiveTab] = useState<TabName>(getTabFromHash)

  useEffect(() => {
    const handleHashChange = () => {
      setActiveTab(getTabFromHash())
    }
    window.addEventListener('hashchange', handleHashChange)
    return () => {
      window.removeEventListener('hashchange', handleHashChange)
    }
  }, [])

  return (
    <div className="flex min-h-screen bg-background font-sans text-foreground">
      <div className="w-64 border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
        <div className="flex items-center gap-2 p-4">
          <img src="/logo.png" alt="yama" className="h-10 w-10" />
          <h1 className="text-xl font-bold text-muted-foreground">Settings</h1>
        </div>
        <nav className="flex flex-col">
          {tabNames.map(tabName => (
            <a
              key={tabName}
              className={
                cn(
                  'p-4 ml-4 rounded-l-lg',
                  activeTab === tabName
                    ? 'border border-sidebar-border bg-background text-foreground -mr-[1px]'
                    : 'hover:bg-accent hover:text-accent-foreground',
                  'border-r-0',
                )
              }
              href={`#${tabName}`}
            >
              {tabs[tabName as TabName].label}
            </a>
          ))}
        </nav>
      </div>
      <main className="container mx-auto flex-1 p-8">
        {tabs[activeTab].component}
      </main>
    </div>
  )
}
