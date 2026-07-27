import { useGetStreak, useGetHistory } from "@workspace/api-client-react"
import { Layout } from "@/components/Layout"
import { Card } from "@/components/ui/card"
import { Flame, Trophy, CalendarDays, Target, Loader2 } from "lucide-react"
import { format, subDays, parseISO } from "date-fns"

export default function History() {
  const { data: streak, isLoading: loadingStreak } = useGetStreak()
  const { data: history, isLoading: loadingHistory } = useGetHistory({ days: 30 })

  if (loadingStreak || loadingHistory) {
    return (
      <Layout>
        <div className="flex h-full items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </Layout>
    )
  }

  // Create calendar map for last 30 days
  const today = new Date()
  const daysArray = Array.from({ length: 30 }).map((_, i) => {
    const d = subDays(today, 29 - i)
    return format(d, 'yyyy-MM-dd')
  })

  const historyMap = new Map((history || []).map(h => [h.date, h]))

  return (
    <Layout>
      <div className="p-6 pt-12 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tight mb-2">History & Stats</h1>
          <p className="text-muted-foreground font-medium">Your progress over time</p>
        </div>

        {/* Hero Stat */}
        <div className="bg-gradient-to-br from-accent to-orange-500 rounded-3xl p-8 text-white shadow-lg text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-20">
            <Flame className="w-32 h-32" />
          </div>
          <div className="relative z-10 space-y-2">
            <h2 className="text-6xl font-black tracking-tighter">{streak?.currentStreak || 0}</h2>
            <p className="text-lg font-bold uppercase tracking-widest opacity-90">Day Streak</p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4">
          <Card className="p-4 flex flex-col items-center text-center">
            <Trophy className="w-8 h-8 text-primary mb-2" />
            <span className="text-2xl font-black">{streak?.longestStreak || 0}</span>
            <span className="text-xs font-bold text-muted-foreground uppercase mt-1">Longest Streak</span>
          </Card>
          <Card className="p-4 flex flex-col items-center text-center">
            <Target className="w-8 h-8 text-accent mb-2" />
            <span className="text-2xl font-black">{streak?.totalPointsEarned || 0}</span>
            <span className="text-xs font-bold text-muted-foreground uppercase mt-1">Total Points</span>
          </Card>
        </div>

        {/* Heatmap / Activity */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-primary" /> Last 30 Days
          </h2>
          
          <Card className="p-6">
            <div className="grid grid-cols-7 gap-2">
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                <div key={i} className="text-center text-[10px] font-black text-muted-foreground">
                  {d}
                </div>
              ))}
              
              {/* Padding for start of the month/period could go here, but let's just show a simple 30 day sequence wrap */}
              {/* To align with actual days of week, we need to know the DOW of the first item */}
              {Array.from({ length: parseISO(daysArray[0]).getDay() }).map((_, i) => (
                 <div key={`pad-${i}`} className="aspect-square" />
              ))}

              {daysArray.map((dateStr) => {
                const dayData = historyMap.get(dateStr)
                const isGoalReached = dayData?.goalReached
                const hasActivity = dayData && dayData.pointsEarned > 0
                
                let bgClass = "bg-secondary"
                if (isGoalReached) bgClass = "bg-primary"
                else if (hasActivity) bgClass = "bg-primary/40"

                return (
                  <div 
                    key={dateStr}
                    className={`aspect-square rounded-md ${bgClass} transition-colors flex items-center justify-center`}
                    title={`${dateStr}: ${dayData?.pointsEarned || 0} pts`}
                  />
                )
              })}
            </div>
            <div className="flex items-center justify-end gap-2 mt-4 text-xs font-bold text-muted-foreground">
              <span>Less</span>
              <div className="flex gap-1">
                <div className="w-3 h-3 rounded bg-secondary" />
                <div className="w-3 h-3 rounded bg-primary/40" />
                <div className="w-3 h-3 rounded bg-primary" />
              </div>
              <span>More</span>
            </div>
          </Card>
        </div>

      </div>
    </Layout>
  )
}
