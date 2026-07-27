import React, { useState, useEffect } from "react"
import { useGetSettings, useUpdateSettings, useGetDailySummary } from "@workspace/api-client-react"
import { useQueryClient } from "@tanstack/react-query"
import { format } from "date-fns"
import { Layout } from "@/components/Layout"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Settings as SettingsIcon, Loader2, Save } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

export default function Settings() {
  const { data: settings, isLoading } = useGetSettings()
  const today = format(new Date(), 'yyyy-MM-dd')
  const { data: summary } = useGetDailySummary({ date: today })
  const updateSettings = useUpdateSettings()
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const [goal, setGoal] = useState<number>(100)

  useEffect(() => {
    if (settings) {
      setGoal(settings.dailyPointGoal)
    }
  }, [settings])

  const handleSave = () => {
    updateSettings.mutate({ data: { dailyPointGoal: goal } }, {
      onSuccess: () => {
        toast({ title: "Settings saved", description: "Daily goal updated successfully." })
        queryClient.invalidateQueries()
      }
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

  const activeTasksPoints = summary?.tasks?.reduce((acc, t) => acc + t.points, 0) || 0
  const isGoalReachable = activeTasksPoints >= goal

  return (
    <Layout>
      <div className="p-6 pt-12 space-y-8 animate-in fade-in duration-500">
        
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tight flex items-center gap-3">
            <SettingsIcon className="w-8 h-8 text-primary" />
            Settings
          </h1>
        </div>

        <Card className="p-6 space-y-6">
          <div className="space-y-2">
            <Label className="text-lg">Daily Point Goal</Label>
            <p className="text-sm text-muted-foreground pb-2">
              How many points do you want to aim for each day?
            </p>
            <div className="flex gap-4">
              <Input 
                type="number" 
                value={goal} 
                onChange={e => setGoal(Number(e.target.value))}
                min="10"
                className="text-2xl font-black text-center"
              />
            </div>
          </div>

          <div className={`p-4 rounded-xl text-sm font-bold ${isGoalReachable ? 'bg-primary/10 text-primary' : 'bg-destructive/10 text-destructive'}`}>
            {isGoalReachable ? (
              <>Your current active tasks provide up to {activeTasksPoints} points today, covering your goal.</>
            ) : (
              <>Warning: Your active tasks only provide {activeTasksPoints} points today. You won't be able to reach your goal.</>
            )}
          </div>

          <Button 
            onClick={handleSave} 
            className="w-full" 
            disabled={updateSettings.isPending || goal === settings?.dailyPointGoal}
          >
            {updateSettings.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Save className="w-5 h-5 mr-2" /> Save Changes</>}
          </Button>
        </Card>

      </div>
    </Layout>
  )
}
