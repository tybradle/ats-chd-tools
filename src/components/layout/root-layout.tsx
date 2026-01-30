import { Outlet, NavLink } from "react-router-dom";
import { useState } from "react";
import {
  Home,
  FileSpreadsheet,
  Package,
  Settings,
  Cpu,
  RefreshCw,
  CheckCircle,
  Info,
  Menu,
  ChevronLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

const navItems = [
  { to: "/", icon: Home, label: "Home" },
  { to: "/bom", icon: FileSpreadsheet, label: "BOM Translation" },
  { to: "/parts", icon: Package, label: "Parts Library" },
  { to: "/glenair", icon: Cpu, label: "Glenair Builder" },
];

export function RootLayout() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="flex flex-col h-screen bg-background">
      <div className="flex flex-1 overflow-hidden min-h-0">
        {/* Sidebar */}
        <aside className={cn("border-r bg-muted/30 flex flex-col min-h-0 transition-all", collapsed ? "w-20" : "w-56")}>
          {/* Logo/Title */}
          <div className="h-14 flex items-center px-3 border-b justify-between">
            <div className="flex items-center gap-3">
              {/* Colored bars logo */}
              <div className="flex flex-col gap-1">
                <span className="block h-1.5 w-5 rounded bg-sidebar-primary"></span>
                <span className="block h-1.5 w-4 rounded bg-sidebar-accent"></span>
                <span className="block h-1.5 w-3 rounded bg-secondary"></span>
              </div>
              {!collapsed && <h1 className="font-semibold text-lg">ATS</h1>}
            </div>
            <button
              aria-label="Toggle sidebar"
              onClick={() => setCollapsed((prev: boolean) => !prev)}
              className="p-2 rounded hover:bg-muted/50"
            >
              {collapsed ? <Menu className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </button>
          </div>

          {/* Navigation */}
          <ScrollArea className="flex-1 h-full py-2">
            <nav className="space-y-1 px-2">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === "/"}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                      isActive
                        ? "bg-sidebar-primary text-sidebar-primary-foreground"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )
                  }
                >
                  <item.icon className="h-4 w-4" />
                  {!collapsed && item.label}
                </NavLink>
              ))}
            </nav>
          </ScrollArea>

          {/* Bottom section */}
          <Separator />
          <div className="p-2">
            <NavLink
              to="/settings"
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )
              }
            >
              <Settings className="h-4 w-4" />
              {!collapsed && 'Settings'}
            </NavLink>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 flex flex-col overflow-hidden min-h-0">
          <ScrollArea className="flex-1 h-full">
            <div className="p-6">
              <Outlet />
            </div>
          </ScrollArea>
        </main>
      </div>

        {/* Status Footer */}
        <footer className="h-10 bg-muted/50 border-t border-border flex items-center justify-between px-6 text-xs font-medium text-muted-foreground shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <RefreshCw className="h-4 w-4 text-sidebar-accent-foreground" />
            <span className="text-muted-foreground">SQLite Sync Active</span>
          </div>
          <Separator orientation="vertical" className="h-3" />
          <div className="flex items-center gap-1.5">
            <CheckCircle className="h-4 w-4" />
            <span>All changes saved</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span>v0.1.0</span>
          <Separator orientation="vertical" className="h-3" />
          <button className="flex items-center gap-1 text-muted-foreground hover:text-foreground">
            <Info className="h-3.5 w-3.5" />
          </button>
        </div>
      </footer>
    </div>
  );
}
