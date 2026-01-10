import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Bell, LogOut, User, Home, Activity } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export default function AgentHeader() {
  const { user } = useAuth();
  const [notifications] = useState(3); // Mock notification count

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo and Brand */}
          <div className="flex items-center">
            <Link href="/comprehensive-agent">
              <div className="flex items-center space-x-3 cursor-pointer">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <Activity className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">Airea Agent Portal</h1>
                  <p className="text-xs text-gray-500">Business Intelligence Platform</p>
                </div>
              </div>
            </Link>
          </div>

          {/* Navigation and User Menu */}
          <div className="flex items-center space-x-6">
            {/* Quick Navigation */}
            <nav className="hidden md:flex items-center space-x-6">
              <Link href="/comprehensive-agent">
                <Button variant="ghost" className="text-gray-600 hover:text-gray-900">
                  Dashboard
                </Button>
              </Link>
              <Link href="/comprehensive-agent?tab=analytics">
                <Button variant="ghost" className="text-gray-600 hover:text-gray-900">
                  Analytics
                </Button>
              </Link>
              <Link href="/comprehensive-agent?tab=financial">
                <Button variant="ghost" className="text-gray-600 hover:text-gray-900">
                  Financial
                </Button>
              </Link>
            </nav>

            {/* Notifications */}
            <div className="relative">
              <Button variant="ghost" size="sm" className="relative">
                <Bell className="h-5 w-5 text-gray-600" />
                {notifications > 0 && (
                  <Badge className="absolute -top-1 -right-1 px-1 min-w-[1.2rem] h-5 text-xs">
                    {notifications}
                  </Badge>
                )}
              </Button>
            </div>

            {/* User Profile - Agent Portal only accessible to authenticated users */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full p-0">
                  <Avatar className="h-8 w-8">
                    <AvatarImage 
                      src={user?.profileImageUrl || undefined} 
                      alt={user?.firstName || "Agent"} 
                    />
                    <AvatarFallback>
                      {user?.firstName?.[0] || user?.email?.[0] || "A"}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {user?.firstName} {user?.lastName}
                    </p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {user?.email}
                    </p>
                    <Badge variant="secondary" className="w-fit mt-1">
                      Property Agent
                    </Badge>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <Link href="/agent/profile">
                  <DropdownMenuItem>
                    <User className="mr-2 h-4 w-4" />
                    <span>Profile</span>
                  </DropdownMenuItem>
                </Link>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <Home className="mr-2 h-4 w-4" />
                  <Link href="/">Back to Main Site</Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <LogOut className="mr-2 h-4 w-4" />
                  <a href="/api/logout">Log out</a>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  );
}