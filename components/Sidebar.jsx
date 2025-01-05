"use client"

import { useAuth } from "@/context/AuthContext"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { MapPinIcon, LinkIcon } from "lucide-react"
import Link from "next/link"

function DefaultSidebar() {
  return (
    <div className="sticky top-20">
      <Card>
        <CardHeader>
          <CardTitle className="text-center text-xl font-semibold">Welcome Back!</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground mb-4">
            Login to access your profile and connect with others.
          </p>
          <Link href="/login">
            <Button className="w-full" variant="outline">
              Login
            </Button>
          </Link>
          <Link href="/signUp">
            <Button className="w-full mt-2" variant="default">
              Sign Up
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}

export default function Sidebar() {
  const { user } = useAuth()

  if (!user) return <DefaultSidebar />

  return (
    <div className="sticky top-20">
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col items-center text-center">
            <Link href="/profile" className="flex flex-col items-center justify-center">
              <Avatar className="w-20 h-20 border-2">
                <AvatarImage src={user.photoURL || ''} alt={user.displayName} />
              </Avatar>
              <div className="mt-4 space-y-1">
                <h3 className="font-semibold">{user.displayName || 'User'}</h3>
                <p className="text-sm text-muted-foreground">{user.email}</p>
              </div>
            </Link>
            <p className="mt-3 text-sm text-muted-foreground">
              {user.emailVerified ? 'Verified User' : 'Email not verified'}
            </p>
            <div className="w-full">
              <Separator className="my-4" />
              <div className="flex justify-between">
                <div>
                  <p className="font-medium">{user.displayName || 'User'}</p>
                  <p className="text-xs text-muted-foreground">Following</p>
                </div>
                <Separator orientation="vertical" />
                <div>
                  <p className="font-medium">{user.displayName || 'User'}</p>
                  <p className="text-xs text-muted-foreground">Followers</p>
                </div>
              </div>
              <Separator className="my-4" />
            </div>
            <div className="w-full space-y-2 text-sm">
              <div className="flex items-center text-muted-foreground">
                <MapPinIcon className="w-4 h-4 mr-2" />
                {user.location || "No location"}
              </div>
              <div className="flex items-center text-muted-foreground">
                <LinkIcon className="w-4 h-4 mr-2 shrink-0" />
                {user.website || "No website"}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 