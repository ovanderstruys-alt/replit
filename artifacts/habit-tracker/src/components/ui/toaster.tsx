import { useToast } from "@/hooks/use-toast"

export function Toaster() {
  const { toasts } = useToast()

  return (
    <div className="fixed top-0 z-[100] flex max-h-screen w-full flex-col-reverse p-4 sm:bottom-0 sm:right-0 sm:top-auto sm:flex-col md:max-w-[420px]">
      {toasts.map(function ({ id, title, description, action, ...props }) {
        return (
          <div key={id} className="mb-2 bg-card border-2 border-card-border p-4 rounded-2xl shadow-lg font-sans">
            <div className="grid gap-1">
              {title && <div className="font-bold">{title}</div>}
              {description && (
                <div className="text-sm font-medium text-muted-foreground">{description}</div>
              )}
            </div>
            {action}
          </div>
        )
      })}
    </div>
  )
}
