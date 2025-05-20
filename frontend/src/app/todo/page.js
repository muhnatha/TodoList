import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import PageLayout from "@/components/PageLayout"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

export default function TodoPage() {
  return (
    <PageLayout title="TODO">
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
    </PageLayout>
  )
}
