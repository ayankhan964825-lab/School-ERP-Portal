"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Bell, AlertCircle, Pin, Calendar, ChevronRight } from "lucide-react";
import { getMyNotices } from "@/app/actions/notices";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";

interface NoticeWidgetProps {
  schoolId: string;
}

export function NoticeWidget({ schoolId }: NoticeWidgetProps) {
  const [notices, setNotices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedNotice, setSelectedNotice] = useState<any | null>(null);

  useEffect(() => {
    async function fetchNotices() {
      try {
        const res = await getMyNotices(schoolId);
        if (res.data) {
          setNotices(res.data);
        }
      } catch (error) {
        toast.error("Failed to load notices");
      } finally {
        setLoading(false);
      }
    }
    fetchNotices();
  }, [schoolId]);

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "URGENT":
        return <Badge variant="destructive" className="flex items-center gap-1 animate-pulse"><AlertCircle className="w-3 h-3"/> Urgent</Badge>;
      case "PINNED":
        return <Badge variant="secondary" className="flex items-center gap-1 bg-blue-100 text-blue-800"><Pin className="w-3 h-3"/> Pinned</Badge>;
      default:
        return null; // Don't clutter UI with 'Normal' badges
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-muted-foreground" />
            Notice Board
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse flex flex-col gap-2 p-3 border rounded-lg">
                <div className="h-4 bg-muted rounded w-3/4"></div>
                <div className="h-3 bg-muted rounded w-1/4 mt-2"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-school-primary" />
              Notice Board
            </CardTitle>
            <Badge variant="secondary" className="rounded-full">{notices.length}</Badge>
          </div>
          <CardDescription>Latest announcements and updates</CardDescription>
        </CardHeader>
        <CardContent>
          {notices.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <Bell className="w-8 h-8 mx-auto mb-2 opacity-20" />
              <p>No new notices</p>
            </div>
          ) : (
            <div className="space-y-3">
              {notices.slice(0, 5).map((notice) => (
                <div 
                  key={notice.id} 
                  className={`group relative flex flex-col gap-1 p-3 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer ${
                    notice.priority === "URGENT" ? "border-red-200 bg-red-50/50 hover:bg-red-50" : ""
                  }`}
                  onClick={() => setSelectedNotice(notice)}
                >
                  <div className="flex justify-between items-start gap-2">
                    <h4 className="font-medium text-sm line-clamp-1 group-hover:text-school-primary transition-colors">
                      {notice.title}
                    </h4>
                    <div className="shrink-0 mt-0.5">
                      {getPriorityBadge(notice.priority)}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {format(new Date(notice.createdAt), "MMM d")}
                    </span>
                    <span className="truncate max-w-[100px]">
                      By {notice.publisher?.name || notice.publisher?.email?.split('@')[0]}
                    </span>
                  </div>
                  
                  <ChevronRight className="w-4 h-4 text-muted-foreground absolute right-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              ))}
              
              {notices.length > 5 && (
                <Button variant="ghost" className="w-full text-sm text-school-primary mt-2">
                  View All Notices
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selectedNotice} onOpenChange={() => setSelectedNotice(null)}>
        <DialogContent className="sm:max-w-[600px] max-h-[85vh] flex flex-col">
          {selectedNotice && (
            <>
              <DialogHeader className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  {getPriorityBadge(selectedNotice.priority)}
                  <span className="text-xs text-muted-foreground ml-auto">
                    {format(new Date(selectedNotice.createdAt), "MMMM d, yyyy 'at' h:mm a")}
                  </span>
                </div>
                <DialogTitle className="text-xl leading-tight">
                  {selectedNotice.title}
                </DialogTitle>
                <div className="text-sm text-muted-foreground pt-1">
                  Published by {selectedNotice.publisher?.name || selectedNotice.publisher?.email}
                </div>
              </DialogHeader>
              
              <ScrollArea className="flex-1 -mx-6 px-6">
                {/* 
                  Security Note: HTML is generated securely via TipTap on the admin side.
                  Using dangerouslySetInnerHTML is required to render rich text.
                */}
                <div 
                  className="prose prose-sm sm:prose-base dark:prose-invert max-w-none pb-6"
                  dangerouslySetInnerHTML={{ __html: selectedNotice.content }}
                />
              </ScrollArea>
              
              <div className="flex justify-end pt-4 border-t mt-auto">
                <Button variant="outline" onClick={() => setSelectedNotice(null)}>
                  Close
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
