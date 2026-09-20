"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/components/ui/toast";
import { Trash2, Loader2 } from "lucide-react";
import { getClasses } from "@/app/actions/classes";
import { getSubjects } from "@/app/actions/subjects";
import { assignTeacherToClass, getTeacherAssignments, removeTeacherAssignment } from "@/app/actions/teachers-assignments";

interface TeacherAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  teacher: any;
  schoolId: string;
}

export default function TeacherAssignmentModal({ isOpen, onClose, teacher, schoolId }: TeacherAssignmentModalProps) {
  const [classes, setClasses] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [isClassTeacher, setIsClassTeacher] = useState(false);
  
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);

  useEffect(() => {
    if (isOpen && teacher) {
      fetchInitialData();
    }
  }, [isOpen, teacher]);

  const fetchInitialData = async () => {
    setIsFetching(true);
    try {
      const [clsRes, subRes, assignRes] = await Promise.all([
        getClasses(schoolId),
        getSubjects(schoolId),
        getTeacherAssignments(teacher.teacherProfile?.id || "") // Note: classTeacher uses teacherId which points to TeacherProfile
      ]);
      
      if (clsRes.success) setClasses(clsRes.data);
      if (subRes.success) setSubjects(subRes.data);
      if (assignRes.success) setAssignments(assignRes.data);
    } catch (error) {
      toast.add({ title: "Error", description: "Failed to load assignment data.", type: "error" });
    } finally {
      setIsFetching(false);
    }
  };

  const handleAssign = async () => {
    if (!selectedClass || !selectedSubject) {
      toast.add({ title: "Warning", description: "Please select both a class and a subject.", type: "error" });
      return;
    }

    setIsLoading(true);
    // SuperAdmin making the assignment => using their user id?
    // We don't have the current user's ID here on the client side directly unless passed. 
    // We'll pass a placeholder or get it via session for `assignedById`. For now we pass a placeholder "admin".
    const res = await assignTeacherToClass(
      teacher.teacherProfile.id,
      selectedClass,
      selectedSubject,
      isClassTeacher,
      schoolId // Placeholder for assignedBy
    );

    setIsLoading(false);
    if (res.error) {
      toast.add({ title: "Error", description: res.error, type: "error" });
    } else {
      toast.add({ title: "Success", description: "Teacher assigned successfully." });
      setSelectedClass("");
      setSelectedSubject("");
      setIsClassTeacher(false);
      fetchInitialData(); // Refresh assignments list
    }
  };

  const handleRemove = async (assignmentId: string) => {
    if (!confirm("Remove this assignment?")) return;
    const res = await removeTeacherAssignment(assignmentId);
    if (res.error) {
      toast.add({ title: "Error", description: res.error, type: "error" });
    } else {
      toast.add({ title: "Success", description: "Assignment removed." });
      setAssignments(assignments.filter(a => a.id !== assignmentId));
    }
  };

  if (!teacher?.teacherProfile) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent>
          <div className="p-4 text-center text-red-500">
            Error: Teacher profile not found. Cannot manage assignments.
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Manage Assignments: {teacher.name}</DialogTitle>
          <DialogDescription>
            Assign {teacher.name} to specific classes and subjects.
          </DialogDescription>
        </DialogHeader>

        {isFetching ? (
          <div className="py-8 flex justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Assignment Form */}
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-4">
              <h3 className="text-sm font-semibold text-slate-900">New Assignment</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Class</Label>
                  <Select value={selectedClass} onValueChange={(val) => setSelectedClass(val || "")}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select Class" />
                    </SelectTrigger>
                    <SelectContent>
                      {classes.map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.name} {c.section}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Subject</Label>
                  <Select value={selectedSubject} onValueChange={(val) => setSelectedSubject(val || "")}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select Subject" />
                    </SelectTrigger>
                    <SelectContent>
                      {subjects.map(s => (
                        <SelectItem key={s.id} value={s.id}>{s.name} ({s.code})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Switch id="is-class-teacher" checked={isClassTeacher} onCheckedChange={setIsClassTeacher} />
                  <Label htmlFor="is-class-teacher">Assign as Class Teacher?</Label>
                </div>
                <Button onClick={handleAssign} disabled={isLoading} className="bg-blue-600 hover:bg-blue-700">
                  {isLoading ? "Assigning..." : "Assign"}
                </Button>
              </div>
            </div>

            {/* Current Assignments List */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-slate-900">Current Assignments</h3>
              {assignments.length === 0 ? (
                <p className="text-sm text-slate-500 italic">No assignments yet.</p>
              ) : (
                <div className="border border-slate-200 rounded-md divide-y divide-slate-100 overflow-hidden">
                  {assignments.map(a => (
                    <div key={a.id} className="flex items-center justify-between p-3 bg-white hover:bg-slate-50">
                      <div>
                        <div className="font-medium text-slate-900 text-sm">
                          {a.class.name} {a.class.section} • {a.subject.name}
                        </div>
                        {a.isClassTeacher && (
                          <span className="inline-block mt-1 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full font-medium">
                            Class Teacher
                          </span>
                        )}
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => handleRemove(a.id)}>
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
