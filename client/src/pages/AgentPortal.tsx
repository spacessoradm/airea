import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Building, BarChart3, Settings, FileText } from "lucide-react";

export default function AgentPortal() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Agent Portal</h1>
          <p className="text-gray-600 dark:text-gray-400">Manage your property listings and grow your business</p>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Link href="/agent/create-listing">
            <Card className="cursor-pointer hover:shadow-lg transition-shadow border-2 border-dashed border-primary/30 hover:border-primary">
              <CardContent className="flex flex-col items-center justify-center p-6">
                <Plus className="h-12 w-12 text-primary mb-4" />
                <h3 className="font-semibold text-lg mb-2">Create New Listing</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 text-center">Add a new property to your portfolio</p>
              </CardContent>
            </Card>
          </Link>

          <Card className="cursor-pointer hover:shadow-lg transition-shadow">
            <CardContent className="flex flex-col items-center justify-center p-6">
              <Building className="h-12 w-12 text-blue-600 mb-4" />
              <h3 className="font-semibold text-lg mb-2">My Listings</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 text-center">View and manage your properties</p>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-lg transition-shadow">
            <CardContent className="flex flex-col items-center justify-center p-6">
              <BarChart3 className="h-12 w-12 text-green-600 mb-4" />
              <h3 className="font-semibold text-lg mb-2">Analytics</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 text-center">Track views and performance</p>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-lg transition-shadow">
            <CardContent className="flex flex-col items-center justify-center p-6">
              <Settings className="h-12 w-12 text-gray-600 mb-4" />
              <h3 className="font-semibold text-lg mb-2">Settings</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 text-center">Configure your profile</p>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Recent Activity
            </CardTitle>
            <CardDescription>Your latest property listings and updates</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div>
                  <h4 className="font-medium">Apartment @ Mont Kiara</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Listed 2 hours ago</p>
                </div>
                <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">Active</span>
              </div>
              
              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div>
                  <h4 className="font-medium">Shop Lot @ Damansara</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Updated 1 day ago</p>
                </div>
                <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">Updated</span>
              </div>
              
              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div>
                  <h4 className="font-medium">Factory @ Kepong</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Listed 3 days ago</p>
                </div>
                <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs">Pending</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}