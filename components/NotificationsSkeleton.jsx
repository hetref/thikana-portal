import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { ScrollArea } from './ui/scroll-area';
import { Skeleton } from './ui/skeleton';

function NotificationsSkeleton() {
  const skeletonItems = Array.from({ length: 5 }, (_, i) => i);

  return (
    <div className="space-y-4 w-full mt-12">
      <Card>
        <CardHeader className="border-b">
          <div className="flex items-center justify-between">
            <CardTitle>Notifications</CardTitle>
            <Skeleton className="h-4 w-20" />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[calc(100vh-12rem)] md:h-[calc(100vh-14rem)]">
            {skeletonItems.map((index) => (
              <div key={index} className="flex items-start gap-4 p-4 border-b hover:bg-muted/50 transition-colors">
                <Skeleton className="h-10 w-10 rounded-full flex-shrink-0" />
                <div className="flex-1 space-y-2 min-w-0">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-4 w-4 flex-shrink-0" />
                    <Skeleton className="h-4 w-full max-w-[160px]" />
                  </div>
                  <div className="pl-6 space-y-2">
                    <Skeleton className="h-20 w-full" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                </div>
              </div>
            ))}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}

export default NotificationsSkeleton; 