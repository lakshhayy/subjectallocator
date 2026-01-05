import { Link, useLocation } from "wouter";
import { BookOpen, LayoutDashboard, GraduationCap, LogOut, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { user, logout } = useAuth();

  // FIX: Admin should only see the Dashboard, not the Subject Allotment page
  const navItems = user?.role === "admin" 
    ? [
        { href: "/admin", label: "Admin Dashboard", icon: LayoutDashboard },
      ]
    : [
        { href: "/", label: "Dashboard", icon: LayoutDashboard },
        { href: "/allotment", label: "Subject Allotment", icon: BookOpen },
      ];

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background font-sans flex">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border bg-sidebar hidden md:flex flex-col fixed h-full z-10">
        <div className="p-4 border-b border-border flex items-center gap-3">
          <div className="p-0 overflow-hidden shrink-0">
            <img 
              src="/assets/university-logo.png" 
              alt="Logo" 
              className="h-10 w-10 object-contain"
            />
          </div>
          <div>
            <h1 className="font-serif font-bold text-base leading-tight">CSE Dept.</h1>
            <p className="text-[10px] text-muted-foreground">Faculty Portal</p>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.href;

            return (
              <Link key={item.href} href={item.href} className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all duration-200 cursor-pointer",
                  isActive 
                    ? "bg-primary/10 text-primary" 
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}>
                  <Icon className="h-4 w-4" />
                  {item.label}
              </Link>
            );
          })}

          {user?.role === "admin" && location.startsWith("/admin") && (
            <div className="pt-4 mt-4 border-t border-border space-y-1">
              <p className="px-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Dashboard Sections</p>
              <div id="sidebar-tabs-portal"></div>
            </div>
          )}
        </nav>

        <div className="p-4 border-t border-border">
          <div className="flex items-center justify-between gap-2 p-2 rounded-lg hover:bg-muted/50 transition-colors">
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-medium text-foreground truncate">{user.name}</p>
              <p className="text-[10px] text-muted-foreground truncate capitalize">{user.role}</p>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <User className="h-4 w-4 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive cursor-pointer" onClick={logout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 md:ml-64 min-h-screen bg-background">
        <div className="max-w-6xl mx-auto p-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {children}
        </div>
      </main>
    </div>
  );
}