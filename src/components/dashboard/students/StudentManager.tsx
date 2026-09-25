"use client";

import { useState, useEffect, useTransition } from "react";
import {
  Search,
  Filter,
  User,
  GraduationCap,
  AlertCircle,
  MoreVertical,
  CheckCircle2,
  XCircle,
  Eye,
  Edit
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { toast } from "@/components/ui/toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getStudents } from "@/app/actions/students";
import StudentProfileModal from "./StudentProfileModal";

interface StudentManagerProps {
  schoolId: string;
  sessions: any[];
  activeSessionId: string;
  classes: any[];
  initialStudents: any[];
}

export default function StudentManager({
  schoolId,
  sessions,
  activeSessionId,
  classes,
  initialStudents,
}: StudentManagerProps) {
  const [students, setStudents] = useState(initialStudents);
  const [selectedSessionId, setSelectedSessionId] = useState(activeSessionId);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [classFilter, setClassFilter] = useState("ALL");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedEnrollment, setSelectedEnrollment] = useState<any>(null);
  const [modalMode, setModalMode] = useState<"view" | "edit" | null>(null);
  const [isPending, startTransition] = useTransition();

  const isArchiveMode = selectedSessionId !== activeSessionId;

  // Fetch students when session changes
  useEffect(() => {
    if (selectedSessionId === activeSessionId && initialStudents.length > 0) {
      // Don't refetch if it's the initial load for the active session
      return;
    }
    
    async function fetchStudents() {
      setIsLoading(true);
      const res = await getStudents(schoolId, selectedSessionId);
      if (res.success) {
        setStudents(res.data || []);
      } else {
        toast.add({ title: "Error", description: "Failed to load students.", type: "error" });
      }
      setIsLoading(false);
    }

    fetchStudents();
  }, [selectedSessionId, schoolId, activeSessionId, initialStudents]);

  const filteredStudents = students.filter((enrollment: any) => {
    const studentName = enrollment.student.user.name || "";
    const parentName = enrollment.student.parent?.user.name || "";
    
    const matchesSearch = 
      studentName.toLowerCase().includes(search.toLowerCase()) ||
      parentName.toLowerCase().includes(search.toLowerCase()) ||
      enrollment.rollNumber.toString().includes(search);
      
    const matchesStatus = statusFilter === "ALL" || enrollment.status === statusFilter;
    const matchesClass = classFilter === "ALL" || enrollment.classId === classFilter;

    return matchesSearch && matchesStatus && matchesClass;
  });

  return (
    <div className="space-y-6">
      {isArchiveMode && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-500 shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-medium text-amber-800 dark:text-amber-400">Read-Only Archive Mode</h3>
            <p className="text-sm text-amber-700 dark:text-amber-500/80 mt-1">
              You are viewing student enrollments from a past academic session. Editing profiles or changing statuses is disabled.
            </p>
          </div>
        </div>
      )}

      {/* Filters & Actions */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search name, roll no..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-white dark:bg-slate-900"
            />
          </div>
          <Select value={selectedSessionId} onValueChange={(val) => setSelectedSessionId(val as string)}>
            <SelectTrigger className="w-full sm:w-48 bg-white dark:bg-slate-900">
              <SelectValue placeholder="Academic Session" />
            </SelectTrigger>
            <SelectContent>
              {sessions.map((s: any) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name} {s.isActive ? "(Active)" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <Select value={classFilter} onValueChange={(val) => setClassFilter(val as string)}>
            <SelectTrigger className="w-full sm:w-40 bg-white dark:bg-slate-900">
              <SelectValue placeholder="All Classes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Classes</SelectItem>
              {classes.map((c: any) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name} - {c.section}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={(val) => setStatusFilter(val as string)}>
            <SelectTrigger className="w-full sm:w-40 bg-white dark:bg-slate-900">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Status</SelectItem>
              <SelectItem value="CURRENT">Current</SelectItem>
              <SelectItem value="ALUMNI">Alumni</SelectItem>
              <SelectItem value="DROPOUT">Dropout</SelectItem>
              <SelectItem value="EXPELLED">Expelled</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Directory Table */}
      <Card className="overflow-hidden border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 font-medium border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-6 py-4">Student Name</th>
                <th className="px-6 py-4">Class & Roll</th>
                <th className="px-6 py-4">Parent details</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                    Loading directory...
                  </td>
                </tr>
              ) : filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                    <User className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p>No students found for the selected filters.</p>
                  </td>
                </tr>
              ) : (
                filteredStudents.map((enrollment: any) => (
                  <tr key={enrollment.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-900 dark:text-white">
                        {enrollment.student.user.name}
                      </div>
                      <div className="text-xs text-slate-500">ID: {enrollment.student.user.email?.split("@")[0]}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <GraduationCap className="w-4 h-4 text-slate-400" />
                        <span>{enrollment.class.name} - {enrollment.class.section}</span>
                      </div>
                      <div className="text-xs text-slate-500 mt-1">Roll: {enrollment.rollNumber}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-slate-900 dark:text-slate-300">
                        {enrollment.student.parent?.user.name || "N/A"}
                      </div>
                      <div className="text-xs text-slate-500">
                        {enrollment.student.parent?.user.phone || "No phone"}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium
                        ${enrollment.status === 'CURRENT' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                          enrollment.status === 'ALUMNI' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                          'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                        }
                      `}>
                        {enrollment.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-slate-400 hover:text-indigo-600"
                          onClick={() => { setSelectedEnrollment(enrollment); setModalMode("view"); }}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        {!isArchiveMode && (
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-slate-400 hover:text-indigo-600"
                            onClick={() => { setSelectedEnrollment(enrollment); setModalMode("edit"); }}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Profile Modal */}
      {selectedEnrollment && modalMode && (
        <StudentProfileModal
          enrollment={selectedEnrollment}
          mode={modalMode}
          onClose={() => {
            setSelectedEnrollment(null);
            setModalMode(null);
          }}
          onUpdate={(updatedEnrollment) => {
            setStudents((prev) => 
              prev.map((s) => s.id === updatedEnrollment.id ? updatedEnrollment : s)
            );
            setSelectedEnrollment(null);
            setModalMode(null);
          }}
        />
      )}
    </div>
  );
}
