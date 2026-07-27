import { Link, useLocation } from "wouter"
import { Home, Calendar, ListTodo, Settings } from "lucide-react"
import { cn } from "@/lib/utils"

interface LayoutProps {
  children: React.ReactNode
}

export function Layout({ children }: LayoutProps) {
  const [location] = useLocation()

  const navItems = [
    { href: "/", icon: Home, label: "Today" },
    { href: "/history", icon: Calendar, label: "History" },
    { href: "/tasks", icon: ListTodo, label: "Tasks" },
    { href: "/settings", icon: Settings, label: "Settings" },
  ]

  // Hide nav on proof submit overlay route
  const hideNav = location.startsWith("/proof/")

  return (
    <div className="flex flex-col min-h-[100dvh] max-w-md mx-auto relative bg-background shadow-2xl overflow-hidden">
      <main className="flex-1 overflow-y-auto pb-24 relative z-0">
        {children}
      </main>

      {!hideNav && (
        <nav className="fixed bottom-0 w-full max-w-md bg-card border-t-2 border-border pb-safe z-50 rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
          <div className="flex justify-around items-center h-20 px-2">
            {navItems.map((item) => {
              const isActive = location === item.href
              const Icon = item.icon
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex flex-col items-center justify-center w-16 h-16 rounded-2xl transition-all duration-200",
                    isActive 
                      ? "text-primary bg-primary/10 scale-110" 
                      : "text-muted-foreground hover:bg-secondary"
                  )}
                >
                  <Icon className="w-6 h-6 mb-1" strokeWidth={isActive ? 3 : 2} />
                  <span className={cn(
                    "text-[10px] font-bold",
                    isActive ? "opacity-100" : "opacity-0 h-0 overflow-hidden"
                  )}>
                    {item.label}
                  </span>
                </Link>
              )
            })}
          </div>
        </nav>
      )}
    </div>
  )
}
