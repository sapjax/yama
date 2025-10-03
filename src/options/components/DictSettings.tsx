import { useEffect, useState } from 'react'
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { restrictToVerticalAxis } from '@dnd-kit/modifiers'
import { GripVertical } from 'lucide-react'
import { getSettings, updateSettings, DictSettingItem } from '@/lib/settings'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'

// --- Sortable Item Component ---
function SortableItem({ item, onToggle }: { item: DictSettingItem, onToggle: (id: string, enabled: boolean) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: item.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div ref={setNodeRef} style={style} {...attributes} className="flex touch-none items-center justify-between rounded-lg border border-border bg-muted p-3 text-muted-foreground shadow-sm">
      <div className="flex items-center gap-3">
        <button {...listeners} className="cursor-grab p-1">
          <GripVertical className="h-5 w-5 text-muted-foreground" />
        </button>
        <Checkbox
          id={`dict-toggle-${item.id}`}
          checked={item.enabled}
          onCheckedChange={checked => onToggle(item.id, !!checked)}
        />
        <Label htmlFor={`dict-toggle-${item.id}`} className="flex-1 cursor-pointer font-medium uppercase">
          {item.id}
        </Label>
      </div>
    </div>
  )
}

// --- Main Dictionary Settings Component ---
export function DictSettings() {
  const [items, setItems] = useState<DictSettingItem[] | null>(null)
  const sensors = useSensors(useSensor(PointerSensor))

  useEffect(() => {
    getSettings().then((settings) => {
      setItems(settings.dicts)
    })
  }, [])

  const handleDragEnd = (event: any) => {
    const { active, over } = event
    if (active.id !== over.id && items) {
      const oldIndex = items.findIndex(item => item.id === active.id)
      const newIndex = items.findIndex(item => item.id === over.id)
      const newItems = arrayMove(items, oldIndex, newIndex)
      setItems(newItems)
      updateSettings({ dicts: newItems })
    }
  }

  const handleToggle = (id: string, enabled: boolean) => {
    if (!items) return
    const newItems = items.map(item => item.id === id ? { ...item, enabled } : item)
    setItems(newItems)
    updateSettings({ dicts: newItems })
  }

  if (!items) {
    return <div>Loading...</div>
  }

  return (
    <div>
      <h2 className="mb-4 text-2xl font-bold">Dictionary</h2>
      <p className="mb-6 text-muted-foreground">Drag and drop to reorder dictionaries. The order determines lookup priority.</p>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd} modifiers={[restrictToVerticalAxis]}>
        <SortableContext items={items} strategy={verticalListSortingStrategy}>
          <div className="flex flex-col gap-3">
            {items.map(item => (
              <SortableItem key={item.id} item={item} onToggle={handleToggle} />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  )
}
