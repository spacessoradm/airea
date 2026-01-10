import React, { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Heart, MessageCircle, User, LogOut, LayoutDashboard, Menu, TrendingUp, MapPin, Star, Trophy, BarChart3 } from "lucide-react";
import { LanguageDropdown } from "@/components/LanguageDropdown";

const Header: React.FC = () => {
  const [location] = useLocation();
  const { user, isAuthenticated, isLoading } = useAuth();
  const { t } = useLanguage();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const { data: unreadCountData } = useQuery({
    queryKey: ["/api/messages/unread/count"],
    enabled: isAuthenticated,
  });

  const unreadCount = (unreadCountData as { count: number })?.count || 0;

  const handleLogin = () => {
    window.location.href = "/login";
  };

  const handleLogout = () => {
    window.location.href = "/api/logout";
  };

  const handleLogoClick = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const getUserInitials = (user: any) => {
    if (user?.firstName && user?.lastName) {
      return `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase();
    }
    if (user?.email) {
      return user.email.charAt(0).toUpperCase();
    }
    return "U";
  };

  const getUserDisplayName = (user: any) => {
    if (user?.firstName && user?.lastName) {
      return `${user.firstName} ${user.lastName}`;
    }
    if (user?.firstName) {
      return user.firstName;
    }
    if (user?.email) {
      return user.email.split('@')[0];
    }
    return "User";
  };

  return (
    <header className="bg-white shadow-sm border-b sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center" onClick={handleLogoClick}>
            <div className="flex-shrink-0">
              <h1 className="text-2xl font-bold text-primary">Airea</h1>
              <span className="text-xs text-neutral-400">AI-driven real estate, tailored to you</span>
            </div>
          </Link>
          
          {/* Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <Link href="/" onClick={handleLogoClick}>
              <span className={`font-medium hover:text-primary transition-colors cursor-pointer ${
                location === "/" ? "text-primary" : "text-gray-700"
              }`}>
                {t('explore')}
              </span>
            </Link>
            
            {/* Insights Dropdown - Temporarily Disabled */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="font-medium text-gray-400 cursor-not-allowed flex items-center">
                    {t('insights')}
                    <svg className="ml-1 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Exciting features coming up!</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            {/* Rewards - Temporarily Disabled */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="font-medium text-gray-400 cursor-not-allowed">
                    {t('rewards')}
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Exciting features coming up!</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            {isAuthenticated && (user as any)?.role === 'agent' && (
              <Link href="/agent/dashboard">
                <span className={`font-medium hover:text-primary transition-colors cursor-pointer ${
                  location === "/agent/dashboard" ? "text-primary" : "text-gray-700"
                }`}>
                  {t('dashboard')}
                </span>
              </Link>
            )}
          </nav>
          
          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="sm">
                  <Menu className="h-6 w-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-80">
                <SheetHeader>
                  <SheetTitle>{t('menu')}</SheetTitle>
                </SheetHeader>
                <div className="mt-6 space-y-6">
                  {/* Navigation Links */}
                  <div className="space-y-4">
                    <Link href="/" onClick={(e) => {
                      handleLogoClick();
                      setMobileMenuOpen(false);
                    }}>
                      <div className={`flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 ${
                        location === "/" ? "bg-primary/10 text-primary" : "text-gray-700"
                      }`}>
                        <MapPin className="h-5 w-5" />
                        <span className="font-medium">{t('exploreProperties')}</span>
                      </div>
                    </Link>
                    
                    {/* Agent Dashboard */}
                    {isAuthenticated && (user as any)?.role === 'agent' && (
                      <Link href="/agent/dashboard" onClick={() => setMobileMenuOpen(false)}>
                        <div className={`flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 ${
                          location === "/agent/dashboard" ? "bg-primary/10 text-primary" : "text-gray-700"
                        }`}>
                          <LayoutDashboard className="h-5 w-5" />
                          <span>{t('agentDashboard')}</span>
                        </div>
                      </Link>
                    )}
                  </div>
                  
                  {/* Language Selector - Hidden temporarily */}
                  {/* <div className="border-t pt-6">
                    <div className="text-sm font-medium text-gray-500 mb-3 px-3">Language / Bahasa / 语言</div>
                    <div className="px-3">
                      <LanguageDropdown />
                    </div>
                  </div> */}

                  {/* User Account Section */}
                  {isAuthenticated ? (
                    <div className="border-t pt-6">
                      <div className="flex items-center space-x-3 p-3 mb-4">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={(user as any)?.profileImageUrl} alt={getUserDisplayName(user)} />
                          <AvatarFallback>{getUserInitials(user)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-gray-900">{getUserDisplayName(user)}</p>
                          <p className="text-sm text-gray-500">{(user as any)?.email}</p>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Link href="/profile" onClick={() => setMobileMenuOpen(false)}>
                          <button className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 w-full text-left">
                            <User className="h-5 w-5 text-gray-500" />
                            <span>{t('profile')}</span>
                          </button>
                        </Link>
                        <Link href="/favorites" onClick={() => setMobileMenuOpen(false)}>
                          <button className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 w-full text-left">
                            <Heart className="h-5 w-5 text-gray-500" />
                            <span>{t('favorites')}</span>
                          </button>
                        </Link>
                        <Link href="/messages" onClick={() => setMobileMenuOpen(false)}>
                          <button className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 w-full text-left">
                            <MessageCircle className="h-5 w-5 text-gray-500" />
                            <div className="flex items-center justify-between flex-1">
                              <span>{t('messages')}</span>
                              {unreadCount > 0 && (
                                <Badge variant="destructive" className="text-xs">
                                  {unreadCount}
                                </Badge>
                              )}
                            </div>
                          </button>
                        </Link>
                        <button 
                          onClick={handleLogout}
                          className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 w-full text-left text-red-600"
                        >
                          <LogOut className="h-5 w-5" />
                          <span>{t('logout')}</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="border-t pt-6">
                      <Button onClick={handleLogin} className="w-full">
                        {t('signIn')}
                      </Button>
                    </div>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>

          {/* Right Side */}
          <div className="hidden md:flex items-center space-x-4">
            {/* Language Dropdown - Hidden temporarily */}
            {/* <LanguageDropdown /> */}
            
            {isAuthenticated ? (
              <>
                {/* Favorites */}
                <Link href="/favorites">
                  <Button variant="ghost" size="sm" className="relative">
                    <Heart className="h-5 w-5" />
                  </Button>
                </Link>
                
                {/* Messages */}
                <Link href="/messages">
                  <Button variant="ghost" size="sm" className="relative">
                    <MessageCircle className="h-5 w-5" />
                    {unreadCount > 0 && (
                      <Badge 
                        variant="destructive" 
                        className="absolute -top-1 -right-1 h-5 w-5 text-xs flex items-center justify-center p-0 min-w-[1.25rem]"
                      >
                        {unreadCount > 99 ? "99+" : unreadCount}
                      </Badge>
                    )}
                  </Button>
                </Link>
                
                {/* My Account Dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="flex items-center space-x-2 hover:bg-gray-50">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={(user as any)?.profileImageUrl} alt={getUserDisplayName(user)} />
                        <AvatarFallback className="text-xs">
                          {getUserInitials(user)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium text-gray-700 hidden sm:block">
                        {t('myAccount')}
                      </span>
                      {(user as any)?.role === 'agent' && (
                        <Badge variant="secondary" className="text-xs hidden sm:block">
                          {t('agent')}
                        </Badge>
                      )}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <div className="px-2 py-1.5">
                      <p className="text-sm font-medium">{getUserDisplayName(user)}</p>
                      <p className="text-xs text-gray-500">{(user as any)?.email}</p>
                    </div>
                    <DropdownMenuSeparator />
                    
                    <Link href="/profile">
                      <DropdownMenuItem>
                        <User className="mr-2 h-4 w-4" />
                        {t('profile')}
                      </DropdownMenuItem>
                    </Link>
                    
                    <Link href="/favorites">
                      <DropdownMenuItem>
                        <Heart className="mr-2 h-4 w-4" />
                        {t('favorites')}
                      </DropdownMenuItem>
                    </Link>
                    
                    <Link href="/messages">
                      <DropdownMenuItem>
                        <MessageCircle className="mr-2 h-4 w-4" />
                        {t('messages')}
                        {unreadCount > 0 && (
                          <Badge variant="destructive" className="ml-auto text-xs">
                            {unreadCount}
                          </Badge>
                        )}
                      </DropdownMenuItem>
                    </Link>
                    
                    {(user as any)?.role === 'agent' && (
                      <>
                        <DropdownMenuSeparator />
                        <Link href="/agent/dashboard">
                          <DropdownMenuItem>
                            <LayoutDashboard className="mr-2 h-4 w-4" />
                            {t('agentDashboard')}
                          </DropdownMenuItem>
                        </Link>
                      </>
                    )}
                    
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout}>
                      <LogOut className="mr-2 h-4 w-4" />
                      {t('signOut')}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <>
                {isLoading ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 rounded-full bg-gray-200 animate-pulse"></div>
                    <div className="w-16 h-4 bg-gray-200 rounded animate-pulse"></div>
                  </div>
                ) : (
                  <div className="bg-gray-50 rounded-lg p-1 flex items-center space-x-2">
                    <Button variant="ghost" size="sm" onClick={handleLogin} className="text-sm">
                      {t('signIn')}
                    </Button>
                    <Button size="sm" onClick={handleLogin} className="text-sm">
                      {t('getStarted')}
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
