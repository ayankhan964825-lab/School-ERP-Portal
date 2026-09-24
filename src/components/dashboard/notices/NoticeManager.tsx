"use client";

import { useState } from "react";
import { format } from "date-fns";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trash2, Edit, AlertCircle, Pin } from "lucide-react";
import { deleteNotice } from "@/app/actions/notices";
import { toast } from "sonner";
import { CreateNoticeDialog } from "./CreateNoticeDialog";

interface NoticeManagerProps {
  schoolId: string;
  notices: any[];
  systemRoles: any[];
  classes: any[];
}

export function NoticeManager({ schoolId, notices, systemRoles, classes }: NoticeManagerProps) {
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this notice?")) return;
    
    setIsDeleting(id);
    try {
      const res = await deleteNotice(schoolId, id);
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success("Notice deleted successfully");
      }
    } catch (error) {
      toast.error("Failed to delete notice");
    } finally {
      setIsDeleting(null);
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "URGENT":
        return <Badge variant="destructive" className="flex items-center gap-1"><AlertCircle className="w-3 h-3"/> Urgent</Badge>;
      case "PINNED":
        return <Badge variant="secondary" className="flex items-center gap-1 bg-blue-100 text-blue-800 hover:bg-blue-200 border-blue-200"><Pin className="w-3 h-3"/> Pinned</Badge>;
      default:
        return <Badge variant="outline">Normal</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Notice Board</h2>
          <p className="text-muted-foreground">Manage and publish announcements for your school.</p>
        </div>
        <CreateNoticeDialog 
          schoolId={schoolId} 
          systemRoles={systemRoles} 
          classes={classes} 
        />
      </div>

      <div className="border rounded-md bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Published By</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {notices.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">
                  No notices found.
                </TableCell>
              </TableRow>
            ) : (
              notices.map((notice) => {
                const isScheduled = notice.isPublished && notice.publishDate && new Date(notice.publishDate) > new Date();
                
                return (
                  <TableRow key={notice.id}>
                    <TableCell className="font-medium max-w-[200px] truncate" title={notice.title}>
                      {notice.title}
                    </TableCell>
                    <TableCell>
                      {getPriorityBadge(notice.priority)}
                    </TableCell>
                    <TableCell>
                      {!notice.isPublished ? (
                        <Badge variant="outline" className="text-yellow-600 border-yellow-300 bg-yellow-50">Draft</Badge>
                      ) : isScheduled ? (
                        <Badge variant="outline" className="text-blue-600 border-blue-300 bg-blue-50">Scheduled</Badge>
                      ) : (
                        <Badge variant="outline" className="text-green-600 border-green-300 bg-green-50">Published</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {notice.publisher?.name || notice.publisher?.email || "Unknown"}
                    </TableCell>
                    <TableCell className="text-sm">
                      {format(new Date(notice.createdAt), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {/* 
                          We would typically add an Edit button here that opens a similar dialog with pre-filled data.
                          For now, keeping it simple with just delete.
                        */}
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => handleDelete(notice.id)}
                          disabled={isDeleting === notice.id}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
