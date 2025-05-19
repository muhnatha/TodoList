import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Bell, FileText, Grid, Calendar, MessageSquare, Settings, PenSquare } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"

export default function TodoPage() {
  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div className="w-20 bg-white flex flex-col items-center py-6 border-r">
        <div className="mb-8">
          <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
            <FileText className="text-blue-500 rotate-12" />
          </div>
          <div className="text-xs font-semibold mt-1 text-center">TOOGAS</div>
        </div>
        <nav className="flex flex-col items-center space-y-6 flex-1">
          <Link href="#" className="p-3 rounded-lg hover:bg-gray-100">
            <Grid size={20} className="text-gray-500" />
          </Link>
          <Link href="#" className="p-3 rounded-lg hover:bg-gray-100">
            <Calendar size={20} className="text-gray-500" />
          </Link>
          <Link href="#" className="p-3 rounded-lg bg-blue-100 hover:bg-blue-200">
            <MessageSquare size={20} className="text-blue-500" />
          </Link>
          <Link href="#" className="p-3 rounded-lg hover:bg-gray-100">
            <PenSquare size={20} className="text-gray-500" />
          </Link>
          <Link href="#" className="p-3 rounded-lg hover:bg-gray-100 mt-auto">
            <Settings size={20} className="text-gray-500" />
          </Link>
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-white p-4 border-b flex items-center justify-between">
          <div className="w-32"></div> {/* Spacer to center the title */}
          <h1 className="text-xl font-semibold">TO-DO LIST</h1>
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="icon" className="relative">
              <Bell size={20} />
              <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs">3</Badge>
            </Button>
            <Avatar className="h-8 w-8">
              <AvatarImage src="/placeholder.svg" alt="User" />
              <AvatarFallback>U</AvatarFallback>
            </Avatar>
          </div>
        </header>

        {/* Task Board */}
        <div className="flex-1 p-6 overflow-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-full">
            {/* To Do Column */}
            <div className="flex flex-col h-full">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-medium">To Do</h2>
                <Button variant="ghost" size="icon" className="h-6 w-6 text-blue-500">
                  <span className="text-lg">+</span>
                </Button>
              </div>
              <Card className="flex-1">
                <CardContent className="p-4">
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Add task</p>
                      <Input placeholder="Type name..." className="text-sm mb-2" />
                      <Textarea placeholder="Type description..." className="text-sm mb-2 min-h-[60px]" />
                      <Button variant="outline" size="sm" className="text-xs">
                        Add Deadline
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* In Progress Column */}
            <div className="flex flex-col h-full">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-medium">In Progress</h2>
                <Button variant="ghost" size="icon" className="h-6 w-6 text-blue-500">
                  <span className="text-lg">+</span>
                </Button>
              </div>
              <Card className="flex-1">
                <CardContent className="p-4">{/* Empty state */}</CardContent>
              </Card>
            </div>

            {/* Completed Column */}
            <div className="flex flex-col h-full">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-medium">Completed</h2>
                <Button variant="ghost" size="icon" className="h-6 w-6 text-blue-500">
                  <span className="text-lg">+</span>
                </Button>
              </div>
              <Card className="flex-1">
                <CardContent className="p-4">{/* Empty state */}</CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
