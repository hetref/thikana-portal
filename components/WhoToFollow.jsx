"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarImage } from "@/components/ui/avatar"
import Map from "./Map"

export default function WhoToFollow() {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Who to Follow</CardTitle>
          <hr></hr>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Avatar className="h-10 w-10">
                <AvatarImage src="/avatar.png" />
              </Avatar>
              <div className="grid gap-0.5 text-sm">
                <span className="font-medium">User Name</span>
                <span className="text-muted-foreground">@username</span>
              </div>
            </div>
            <Button size="sm" variant="outline">Follow</Button>
          </div>
          <hr></hr>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Avatar className="h-10 w-10">
                <AvatarImage src="/avatar.png" />
              </Avatar>
              <div className="grid gap-0.5 text-sm">
                <span className="font-medium">User Name</span>
                <span className="text-muted-foreground">@username</span>
              </div>
            </div>
            <Button size="sm" variant="outline">Follow</Button>
          </div>
          <hr></hr>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Avatar className="h-10 w-10">
                <AvatarImage src="/avatar.png" />
              </Avatar>
              <div className="grid gap-0.5 text-sm">
                <span className="font-medium">User Name</span>
                <span className="text-muted-foreground">@username</span>
              </div>
            </div>
            <Button size="sm" variant="outline">Follow</Button>
          </div>
        </CardContent>
      </Card>

      <Map />
    </div>
  )
} 