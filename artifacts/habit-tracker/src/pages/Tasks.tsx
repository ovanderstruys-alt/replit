import React, { useState } from "react"
import { useListTasks, useCreateTask, useUpdateTask, useDeleteTask, getListTasksQueryKey } from "@workspace/api-client-react"
import { useQueryClient } from "@tanstack/react-query"
import { Layout } from "@/components/Layout"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Plus, Loader2, Edit2, Trash2, X } from "lucide-react"

export default function Tasks() {
  const queryClient = useQueryClient()
  const { data: tasks, isLoading } = useListTasks()
  const createTask = useCreateTask()
  const updateTask = useUpdateTask()
  const deleteTask = useDeleteTask()

  const [isEditing, setIsEditing] = useState<number | 'new' | null>(null)
  
  const defaultForm = { name: '', description: '', emoji: '', points: 10, recurrence: 'daily' as const, isActive: true }
  const [formData, setFormData] = useState(defaultForm)

  const handleEdit = (task: any) => {
    setFormData({
      name: task.name,
      description: task.description || '',
      emoji: task.emoji || '',
      points: task.points,
      recurrence: task.recurrence,
      isActive: task.isActive
    })
    setIsEditing(task.id)
  }

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim()) return

    const onSuccess = () => {
      queryClient.invalidateQueries({ queryKey: getListTasksQueryKey() })
      setIsEditing(null)
    }

    if (isEditing === 'new') {
      createTask.mutate({ data: formData }, { onSuccess })
    } else if (typeof isEditing === 'number') {
      updateTask.mutate({ id: isEditing, data: formData }, { onSuccess })
    }
  }

  const handleDelete = (id: number) => {
    if(window.confirm('Delete this task?')) {
      deleteTask.mutate({ id }, {
        onSuccess: () => queryClient.invalidateQueries({ queryKey: getListTasksQueryKey() })
      })
    }
  }

  const toggleActive = (id: number, currentActive: boolean) => {
    updateTask.mutate({ id, data: { isActive: !currentActive } }, {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getListTasksQueryKey() })
    })
  }

  if (isLoading) {
    return (
      <Layout>
        <div className="flex h-full items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="p-6 pt-12 space-y-6 pb-32">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-black uppercase tracking-tight">Tasks</h1>
          {isEditing === null && (
            <Button size="icon" onClick={() => { setFormData(defaultForm); setIsEditing('new'); }}>
              <Plus className="w-6 h-6" />
            </Button>
          )}
        </div>

        {isEditing !== null && (
          <Card className="p-6 border-primary bg-primary/5 animate-in slide-in-from-top-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">{isEditing === 'new' ? 'New Task' : 'Edit Task'}</h2>
              <button onClick={() => setIsEditing(null)} className="text-muted-foreground p-1"><X className="w-5 h-5"/></button>
            </div>
            
            <form onSubmit={handleSave} className="space-y-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input 
                  value={formData.name} 
                  onChange={e => setFormData({...formData, name: e.target.value})} 
                  placeholder="e.g. Read 10 pages"
                  autoFocus
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Emoji (text)</Label>
                  <Input 
                    value={formData.emoji} 
                    onChange={e => setFormData({...formData, emoji: e.target.value})} 
                    placeholder="📚"
                    maxLength={2}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Points</Label>
                  <Input 
                    type="number" 
                    min="1"
                    max="100"
                    value={formData.points} 
                    onChange={e => setFormData({...formData, points: Number(e.target.value)})} 
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Description (optional)</Label>
                <Input 
                  value={formData.description} 
                  onChange={e => setFormData({...formData, description: e.target.value})} 
                  placeholder="Details on what counts..."
                />
              </div>

              <div className="pt-2">
                <Button type="submit" className="w-full" disabled={createTask.isPending || updateTask.isPending}>
                  {createTask.isPending || updateTask.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Save Task'}
                </Button>
              </div>
            </form>
          </Card>
        )}

        <div className="space-y-4">
          {tasks?.map(task => (
            <Card key={task.id} className={`p-4 transition-opacity ${!task.isActive ? 'opacity-50 grayscale' : ''}`}>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center text-xl shrink-0">
                  {task.emoji || '🎯'}
                </div>
                
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-lg truncate">{task.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs font-bold text-accent bg-accent/10 px-2 py-0.5 rounded-md">
                      {task.points} pts
                    </span>
                    <span className="text-xs font-medium text-muted-foreground capitalize">
                      {task.recurrence.replace('_', ' ')}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Switch 
                    checked={task.isActive} 
                    onCheckedChange={() => toggleActive(task.id, task.isActive)}
                  />
                  <div className="flex flex-col gap-1">
                    <button onClick={() => handleEdit(task)} className="p-2 text-muted-foreground hover:text-primary transition-colors bg-secondary rounded-lg">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    {/* Delete hidden inside edit usually, but let's expose it */}
                    {/* Actually, a bit dense. Let's keep it simple. */}
                  </div>
                </div>
              </div>
            </Card>
          ))}
          
          {tasks?.length === 0 && isEditing === null && (
            <div className="text-center p-8 text-muted-foreground font-medium">
              No tasks yet. Create one to get started!
            </div>
          )}
        </div>
      </div>
    </Layout>
  )
}
