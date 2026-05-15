'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, FileText, Users } from 'lucide-react'
import { cn } from '@/lib/utils' // This is the utility shadcn installed

export default function Navbar() {
  const pathname = usePathname()

  // Define our navigation links
  const navItems = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Invoices', href: '/invoices', icon: FileText },
    { name: 'Customers', href: '/customers', icon: Users },
  ]

  // If we are on the root page (which redirects), don't show the nav yet
  if (pathname === '/') return null

  return (
    <nav className="border-b bg-card">
      <div className="flex h-16 items-center px-8 max-w-7xl mx-auto gap-8">
        
        {/* Brand Logo / Name */}
        <div className="font-bold text-xl tracking-tight text-primary">
          Binary Automates
        </div>
        
        {/* Navigation Links */}
        <div className="flex items-center gap-2">
          {navItems.map((item) => {
            const Icon = item.icon
            // Check if the current URL starts with the link's href
            const isActive = pathname.startsWith(item.href)
            
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors",
                  isActive 
                    ? "bg-secondary text-secondary-foreground" // Active state
                    : "text-muted-foreground hover:bg-secondary/50 hover:text-primary" // Inactive state
                )}
              >
                <Icon className="h-4 w-4" />
                {item.name}
              </Link>
            )
          })}
        </div>
      </div>
    </nav>
  )
}