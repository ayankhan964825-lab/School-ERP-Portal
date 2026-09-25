"use client";

import { useState } from "react";
import { Plus, CheckCircle, XCircle, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import SessionFormModal from "./SessionFormModal";
import { toggleSessionStatus } from "@/app/actions/sessions";

interface SessionsManagerProps {
  schoolId: string;
  initialSessions: any[];
}

export default function SessionsManager({ schoolId, initialSessions }: SessionsManagerProps) {
  const [sessions, setSessions] = useState(initialSessions);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [sessionToEdit, setSessionToEdit] = useState<any>(null);

  const handleSaveSuccess = (savedSession: any) => {
    setSessions((prev) => {
      // If it's a new session, it becomes the ONLY active session by default in backend.
      // So we must mark all existing as inactive if the new one is active.
      let updatedList = prev;
      
      const exists = prev.find((s) => s.id === savedSession.id);
      if (exists) {
        // It's an update (like name edit)
        updatedList = prev.map((s) => (s.id === savedSession.id ? { ...s, ...savedSession } : s));
      } else {
        // It's a new session. Since createSession sets isActive: true for new and false for others:
        if (savedSession.isActive) {
          updatedList = prev.map(s => ({ ...s, isActive: false }));
        }
        updatedList = [savedSession, ...updatedList].sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
      }
      return updatedList;
    });
  };

  const handleToggle = async (session: any) => {
    const newStatus = !session.isActive;
    const res = await toggleSessionStatus(schoolId, session.id, newStatus);
    if (res.success) {
      setSessions((prev) =>
        prev.map((s) => {
          if (s.id === session.id) {
            return { ...s, isActive: newStatus };
          }
          // If we are turning this session ON, all others must be turned OFF
          if (newStatus === true) {
            return { ...s, isActive: false };
          }
          return s;
        })
      );
    }
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
      <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-end">
        <Button onClick={() => { setSessionToEdit(null); setIsFormOpen(true); }} className="bg-blue-600 hover:bg-blue-700 text-white">
          <Plus className="mr-2 h-4 w-4" /> Add Session
        </Button>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader className="bg-slate-50 dark:bg-slate-900/50">
            <TableRow>
              <TableHead>Session Name</TableHead>
              <TableHead>Start Date</TableHead>
              <TableHead>End Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sessions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-32 text-center text-slate-500">
                  No academic sessions found.
                </TableCell>
              </TableRow>
            ) : (
              sessions.map((session) => (
                <TableRow key={session.id}>
                  <TableCell className="font-medium">{session.name}</TableCell>
                  <TableCell>{new Date(session.startDate).toLocaleDateString("en-IN", { day: '2-digit', month: 'short', year: 'numeric' })}</TableCell>
                  <TableCell>{new Date(session.endDate).toLocaleDateString("en-IN", { day: '2-digit', month: 'short', year: 'numeric' })}</TableCell>
                  <TableCell>
                    {session.isActive ? (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                        <CheckCircle className="w-3 h-3 mr-1" /> Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300">
                        <XCircle className="w-3 h-3 mr-1" /> Inactive
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => { setSessionToEdit(session); setIsFormOpen(true); }}
                        title="Edit Session Name"
                      >
                        <Edit className="h-4 w-4 text-blue-500" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleToggle(session)}
                      >
                        {session.isActive ? "Deactivate" : "Activate"}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <SessionFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        schoolId={schoolId}
        onSuccess={handleSaveSuccess}
        sessionToEdit={sessionToEdit}
      />
    </div>
  );
}
