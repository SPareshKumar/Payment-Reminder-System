'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, FileText, Users, Menu } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button, buttonVariants } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"

export default function Navbar() {
  const pathname = usePathname()
  // This state allows us to automatically close the menu when a link is clicked
  const [isOpen, setIsOpen] = useState(false)

  const navItems = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Invoices', href: '/invoices', icon: FileText },
    { name: 'Customers', href: '/customers', icon: Users },
  ]

  if (pathname === '/') return null

  return (
    <nav className="border-b bg-card">
      {/* Changed to justify-between to push the logo left and menu right */}
      <div className="flex h-16 items-center px-4 md:px-8 max-w-7xl mx-auto justify-between">
        
        {/* Brand Logo / Name */}
        <div className="font-bold text-lg md:text-xl tracking-tight text-primary whitespace-nowrap">
          Binary Automates
        </div>
        
        {/* DESKTOP NAVIGATION: Hidden on phones, visible on tablets/laptops (md:flex) */}
        <div className="hidden md:flex items-center gap-2">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname.startsWith(item.href)
            
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 md:px-4 rounded-md text-sm font-medium transition-colors whitespace-nowrap",
                  isActive 
                    ? "bg-secondary text-secondary-foreground" 
                    : "text-muted-foreground hover:bg-secondary/50 hover:text-primary"
                )}
              >
                <Icon className="h-4 w-4" />
                {item.name}
              </Link>
            )
          })}
        </div>

        {/* MOBILE NAVIGATION: Visible on phones, hidden on tablets/laptops (md:hidden) */}
        <div className="md:hidden">
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            
            {/* NEW FIX: Remove asChild and the inner <Button>. Style the trigger directly! */}
            <SheetTrigger className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "shrink-0")}>
              <Menu className="h-6 w-6 text-foreground" />
              <span className="sr-only">Open menu</span>
            </SheetTrigger>
            
            {/* The slide-out menu panel */}
            <SheetContent side="right" className="w-[280px] sm:w-[350px]">
              <SheetHeader>
                <SheetTitle className="text-left font-bold text-lg text-primary mb-4">
                  Menu
                </SheetTitle>
              </SheetHeader>
              
              <div className="flex flex-col gap-3">
                {navItems.map((item) => {
                  const Icon = item.icon
                  const isActive = pathname.startsWith(item.href)
                  
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      // Close the slide-out menu the moment they click a link!
                      onClick={() => setIsOpen(false)} 
                      className={cn(
                        "flex items-center gap-3 px-4 py-3 rounded-lg text-base font-medium transition-colors",
                        isActive 
                          ? "bg-secondary text-secondary-foreground" 
                          : "text-muted-foreground hover:bg-secondary/50 hover:text-primary"
                      )}
                    >
                      <Icon className="h-5 w-5" />
                      {item.name}
                    </Link>
                  )
                })}
              </div>
            </SheetContent>
          </Sheet>
        </div>

      </div>
    </nav>
  )
}