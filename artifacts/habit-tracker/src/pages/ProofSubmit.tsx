import React, { useRef, useState } from "react"
import { useParams, useLocation } from "wouter"
import { useGetTask, useSubmitCompletion, getGetDailySummaryQueryKey } from "@workspace/api-client-react"
import { useQueryClient } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { ChevronLeft, Camera, Image as ImageIcon, Loader2, CheckCircle2, XCircle } from "lucide-react"

export default function ProofSubmit() {
  const { taskId } = useParams<{ taskId: string }>()
  const [, setLocation] = useLocation()
  const queryClient = useQueryClient()
  
  const { data: task, isLoading: loadingTask } = useGetTask(Number(taskId), { 
    query: { enabled: !!taskId } 
  })
  
  const submitProof = useSubmitCompletion()

  const [previewData, setPreviewData] = useState<string | null>(null)
  const [result, setResult] = useState<{verified: boolean, message: string, points: number} | null>(null)

  const cameraInputRef = useRef<HTMLInputElement>(null)
  const galleryInputRef = useRef<HTMLInputElement>(null)

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      setPreviewData(event.target?.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleSubmit = () => {
    if (!previewData) return

    submitProof.mutate(
      { data: { taskId: Number(taskId), proofType: 'photo', proofData: previewData } },
      {
        onSuccess: (data) => {
          setResult({
            verified: data.verified,
            message: data.verificationMessage || (data.verified ? "Verified!" : "Failed verification"),
            points: data.pointsAwarded
          })
          queryClient.invalidateQueries({ queryKey: getGetDailySummaryQueryKey() })
          
          // Auto redirect after a short delay if success
          if (data.verified) {
            setTimeout(() => setLocation('/'), 2000)
          }
        }
      }
    )
  }

  if (loadingTask) {
    return (
      <div className="fixed inset-0 bg-background z-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!task) return null

  return (
    <div className="fixed inset-0 bg-background z-50 overflow-y-auto animate-in slide-in-from-bottom-full duration-300">
      {/* Header */}
      <div className="sticky top-0 bg-background/80 backdrop-blur-lg border-b-2 border-border flex items-center px-4 h-16 z-10">
        <button onClick={() => setLocation('/')} className="p-2 -ml-2 text-muted-foreground hover:text-foreground">
          <ChevronLeft className="w-8 h-8" />
        </button>
        <h1 className="font-bold text-lg ml-2 uppercase tracking-wide">Submit Proof</h1>
      </div>

      <div className="p-6 space-y-8 pb-32">
        {/* Task Info */}
        <div className="text-center space-y-2">
          <div className="w-20 h-20 bg-secondary rounded-3xl mx-auto flex items-center justify-center text-4xl shadow-sm mb-4">
            {task.emoji || '🎯'}
          </div>
          <h2 className="text-2xl font-black">{task.name}</h2>
          {task.description && (
            <p className="text-muted-foreground font-medium">{task.description}</p>
          )}
          <div className="inline-block bg-accent/20 text-accent font-bold px-3 py-1 rounded-full text-sm">
            {task.points} Points Available
          </div>
        </div>

        {/* Status / Result State */}
        {result ? (
          <div className={`p-8 rounded-3xl text-center space-y-4 animate-in zoom-in-95 ${result.verified ? 'bg-primary/10 border-2 border-primary/20' : 'bg-destructive/10 border-2 border-destructive/20'}`}>
            {result.verified ? (
              <CheckCircle2 className="w-16 h-16 text-primary mx-auto animate-bounce" />
            ) : (
              <XCircle className="w-16 h-16 text-destructive mx-auto" />
            )}
            <div>
              <h3 className={`text-xl font-black ${result.verified ? 'text-primary' : 'text-destructive'}`}>
                {result.verified ? 'Verified!' : 'Proof Rejected'}
              </h3>
              <p className="font-medium mt-2 text-foreground/80">{result.message}</p>
            </div>
            {result.verified ? (
              <p className="text-2xl font-black text-accent mt-4">+{result.points} PTS</p>
            ) : (
              <Button onClick={() => setResult(null)} variant="outline" className="mt-4">
                Try Again
              </Button>
            )}
            {!result.verified && (
               <Button onClick={() => setLocation('/')} variant="ghost" className="w-full mt-2">
                Cancel
              </Button>
            )}
          </div>
        ) : submitProof.isPending ? (
          /* Loading State */
          <div className="py-12 text-center space-y-6">
            <div className="relative w-32 h-32 mx-auto">
              <div className="absolute inset-0 rounded-full border-4 border-primary/20"></div>
              <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <Camera className="w-10 h-10 text-primary animate-pulse" />
              </div>
            </div>
            <h3 className="text-xl font-black animate-pulse">AI is reviewing your proof...</h3>
            <p className="text-muted-foreground font-medium">Looking for receipts!</p>
          </div>
        ) : (
          /* Input State */
          <div className="space-y-6">
            {previewData ? (
              <div className="space-y-4">
                <div className="relative aspect-[4/5] rounded-3xl overflow-hidden border-4 border-card-border shadow-lg bg-black">
                  <img src={previewData} alt="Preview" className="w-full h-full object-cover" />
                  <button 
                    onClick={() => setPreviewData(null)}
                    className="absolute top-4 right-4 w-10 h-10 bg-black/50 backdrop-blur text-white rounded-full flex items-center justify-center hover:bg-black/70"
                  >
                    <XCircle className="w-6 h-6" />
                  </button>
                </div>
                <Button size="lg" className="w-full text-lg h-16" onClick={handleSubmit}>
                  Submit for Verification
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <input 
                  type="file" 
                  accept="image/*" 
                  capture="environment" 
                  className="hidden" 
                  ref={cameraInputRef}
                  onChange={handleFile}
                />
                <input 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  ref={galleryInputRef}
                  onChange={handleFile}
                />
                
                <button 
                  onClick={() => cameraInputRef.current?.click()}
                  className="aspect-square bg-primary text-primary-foreground rounded-3xl flex flex-col items-center justify-center gap-3 shadow-lg hover:bg-primary/90 transition-transform active:scale-95"
                >
                  <Camera className="w-10 h-10" />
                  <span className="font-bold">Take Photo</span>
                </button>

                <button 
                  onClick={() => galleryInputRef.current?.click()}
                  className="aspect-square bg-secondary text-secondary-foreground rounded-3xl flex flex-col items-center justify-center gap-3 border-2 border-border shadow-sm hover:bg-secondary/80 transition-transform active:scale-95"
                >
                  <ImageIcon className="w-10 h-10" />
                  <span className="font-bold">Upload</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
