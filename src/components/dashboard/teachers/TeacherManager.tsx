"use client";

import { useState } from "react";
import { Plus, Search, Edit2, Trash2, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "@/components/ui/toast";
import TeacherFormModal from "./TeacherFormModal";
import TeacherAssignmentModal from "./TeacherAssignmentModal";
import { deleteTeacher } from "@/app/actions/teachers";

interface TeacherManagerProps {
  schoolId: string;
  initialTeachers: any[];
}

export default function TeacherManager({ schoolId, initialTeachers }: TeacherManagerProps) {
  const [teachers, setTeachers] = useState(initialTeachers);
  const [search, setSearch] = useState("");
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState<any>(null);
  
  const [isAssignOpen, setIsAssignOpen] = useState(false);

  const filteredTeachers = teachers.filter((t: any) =>
    (t.name || "").toLowerCase().includes(search.toLowerCase()) ||
    (t.email || "").toLowerCase().includes(search.toLowerCase()) ||
    (t.teacherProfile?.empId && t.teacherProfile.empId.toLowerCase().includes(search.toLowerCase()))
  );

  const handleEdit = (teacher: any) => {
    setSelectedTeacher(teacher);
    setIsFormOpen(true);
  };

  const handleAssign = (teacher: any) => {
    setSelectedTeacher(teacher);
    setIsAssignOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this teacher?")) return;

    const res = await deleteTeacher(schoolId, id);
    if (res.error) {
      toast.add({ title: "Error", description: res.error, type: "error" });
    } else {
      toast.add({ title: "Success", description: "Teacher deleted successfully." });
      setTeachers(teachers.filter((t: any) => t.id !== id));
    }
  };

  const onFormSuccess = (updatedTeacher: any) => {
    if (selectedTeacher) {
      setTeachers(teachers.map((t) => (t.id === updatedTeacher.id ? updatedTeacher : t)));
    } else {
      setTeachers([updatedTeacher, ...teachers]);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search teachers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button onClick={() => { setSelectedTeacher(null); setIsFormOpen(true); }} className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700">
          <Plus className="h-4 w-4 mr-2" />
          Add Teacher
        </Button>
      </div>

      <Card className="overflow-hidden border-slate-200">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500">
              <tr>
                <th className="px-6 py-4 font-medium">Profile</th>
                <th className="px-6 py-4 font-medium">Name & Email</th>
                <th className="px-6 py-4 font-medium">Emp ID</th>
                <th className="px-6 py-4 font-medium">Qualification</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredTeachers.map((teacher: any) => (
                <tr key={teacher.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={teacher.profileImage || ""} alt={teacher.name} />
                      <AvatarFallback>{(teacher.name || "T").substring(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-medium text-slate-900">{teacher.name || "Unknown"}</div>
                    <div className="text-slate-500">{teacher.email}</div>
                  </td>
                  <td className="px-6 py-4 text-slate-600">{teacher.teacherProfile?.empId || "N/A"}</td>
                  <td className="px-6 py-4 text-slate-600">{teacher.teacherProfile?.qualification || "N/A"}</td>
                  <td className="px-6 py-4">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="icon" onClick={() => handleAssign(teacher)} title="Manage Assignments">
                        <BookOpen className="h-4 w-4 text-slate-600" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(teacher)} title="Edit">
                        <Edit2 className="h-4 w-4 text-slate-600" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(teacher.id)} title="Delete">
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredTeachers.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                    No teachers found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <TeacherFormModal 
        isOpen={isFormOpen} 
        onClose={() => setIsFormOpen(false)} 
        initialData={selectedTeacher}
        schoolId={schoolId}
        onSuccess={onFormSuccess}
      />

      {selectedTeacher && (
        <TeacherAssignmentModal
          isOpen={isAssignOpen}
          onClose={() => setIsAssignOpen(false)}
          teacher={selectedTeacher}
          schoolId={schoolId}
        />
      )}
    </div>
  );
}
