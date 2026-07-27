import { useGetDailySummary } from "@workspace/api-client-react"
import { format } from "date-fns"
import { Layout } from "@/components/Layout"
import { CircularProgress } from "@/components/ui/circular-progress"
import { Card } from "@/components/ui/card"
import { Camera, CheckCircle2, XCircle, Flame, Loader2, Image as ImageIcon } from "lucide-react"
import { Link } from "wouter"

export default function Home() {
  const today = format(new Date(), 'yyyy-MM-dd')
  const { data: summary, isLoading } = useGetDailySummary({ date: today })

  if (isLoading) {
    return (
      <Layout>
        <div className="flex h-full items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </Layout>
    )
  }

  const tasks = summary?.tasks || []
  const hasTasks = tasks.length > 0
  const allComplete = hasTasks && tasks.every(t => t.completion?.verified)

  return (
    <Layout>
      <div className="p-6 pt-12 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        
        {/* Header & Progress */}
        <div className="text-center space-y-6">
          <div className="space-y-1">
            <h1 className="text-4xl font-black text-foreground uppercase tracking-tight">
              {format(new Date(), 'EEEE')}
            </h1>
            <p className="text-muted-foreground font-bold">
              {format(new Date(), 'MMM do, yyyy')}
            </p>
          </div>

          <div className="flex justify-center py-4">
            <CircularProgress 
              value={summary?.pointsEarned || 0} 
              max={summary?.pointsGoal || 100} 
            />
          </div>

          {allComplete && (
            <div className="inline-flex items-center gap-2 bg-accent/20 text-accent-foreground px-4 py-2 rounded-full font-bold">
              <Flame className="w-5 h-5 text-accent" />
              <span className="text-accent">Goal crushed!</span>
            </div>
          )}
        </div>

        {/* Task List */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold flex items-center justify-between">
            <span>Today's Actions</span>
            <span className="text-sm font-bold text-muted-foreground bg-secondary px-3 py-1 rounded-full">
              {summary?.completedTaskCount || 0} / {summary?.totalTaskCount || 0}
            </span>
          </h2>

          {!hasTasks && (
            <div className="text-center py-12 bg-secondary rounded-3xl border-2 border-dashed border-border">
              <div className="text-4xl mb-4">🎯</div>
              <p className="font-bold text-lg mb-2">No tasks active today.</p>
              <p className="text-muted-foreground text-sm mb-4">Time to set some goals!</p>
              <Link href="/tasks" className="text-primary font-bold hover:underline">
                Manage Tasks &rarr;
              </Link>
            </div>
          )}

          <div className="grid gap-4">
            {tasks.map((task) => {
              const isCompleted = !!task.completion
              const isVerified = task.completion?.verified
              const isFailed = task.completion && !task.completion.verified

              return (
                <Card 
                  key={task.id} 
                  className={`overflow-hidden transition-all duration-300 ${
                    isVerified ? 'border-primary/50 bg-primary/5 scale-[0.98] opacity-75' : ''
                  } ${isFailed ? 'border-destructive/50 bg-destructive/5' : ''}`}
                >
                  <div className="flex items-center p-4 gap-4">
                    
                    {/* Emoji / Icon Box */}
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shrink-0 shadow-sm ${
                      isVerified ? 'bg-primary text-primary-foreground' : 'bg-secondary'
                    }`}>
                      {task.emoji ? task.emoji : <span className="text-sm font-black text-muted-foreground">T</span>}
                    </div>
                    
                    {/* Task Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-lg truncate leading-tight">
                        {task.name}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-sm font-bold text-accent bg-accent/10 px-2 py-0.5 rounded-md">
                          {task.points} pts
                        </span>
                        {isVerified && (
                          <span className="flex items-center text-xs font-bold text-primary gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Verified
                          </span>
                        )}
                        {isFailed && (
                          <span className="flex items-center text-xs font-bold text-destructive gap-1">
                            <XCircle className="w-3 h-3" /> Failed
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Action Button */}
                    <div className="shrink-0">
                      {!isCompleted ? (
                        <Link href={`/proof/${task.id}`}>
                          <div className="w-14 h-14 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center shadow-md active:scale-90 transition-transform cursor-pointer">
                            <Camera className="w-6 h-6" />
                          </div>
                        </Link>
                      ) : (
                        <div className="w-14 h-14 rounded-2xl overflow-hidden relative border-2 border-border cursor-pointer group">
                          {task.completion?.proofData ? (
                            <img 
                              src={task.completion.proofData} 
                              alt="Proof" 
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-secondary">
                              <ImageIcon className="w-5 h-5 text-muted-foreground" />
                            </div>
                          )}
                          {/* Overlay on hover for details maybe */}
                        </div>
                      )}
                    </div>
                    
                  </div>
                  
                  {isFailed && task.completion?.verificationMessage && (
                    <div className="px-4 pb-4 pt-1 text-sm font-medium text-destructive">
                      {task.completion.verificationMessage}
                    </div>
                  )}
                </Card>
              )
            })}
          </div>
        </div>
      </div>
    </Layout>
  )
}
