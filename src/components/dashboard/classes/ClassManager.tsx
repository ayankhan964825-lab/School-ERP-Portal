"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2, Search, BookOpen, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import ClassFormModal from "./ClassFormModal";
import DeleteClassDialog from "./DeleteClassDialog";

type ClassType = {
  id: string;
  name: string;
  section: string;
  academicYear: string;
  studentCount: number;
  subjectCount: number;
};

interface ClassManagerProps {
  schoolId: string;
  initialClasses: ClassType[];
}

export default function ClassManager({ schoolId, initialClasses }: ClassManagerProps) {
  const [classes, setClasses] = useState<ClassType[]>(initialClasses);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Modal states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  
  const [selectedClass, setSelectedClass] = useState<ClassType | null>(null);

  // Filter classes based on search
  const filteredClasses = classes.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.section.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.academicYear.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreate = () => {
    setSelectedClass(null);
    setIsFormOpen(true);
  };

  const handleEdit = (c: ClassType) => {
    setSelectedClass(c);
    setIsFormOpen(true);
  };

  const handleDelete = (c: ClassType) => {
    setSelectedClass(c);
    setIsDeleteOpen(true);
  };

  const handleSaveSuccess = (savedClass: any) => {
    // Optimistic UI update or trigger refresh
    setClasses((prev) => {
      const exists = prev.find((c) => c.id === savedClass.id);
      if (exists) {
        return prev.map((c) => (c.id === savedClass.id ? { ...c, ...savedClass } : c));
      } else {
        return [...prev, { ...savedClass, studentCount: 0, subjectCount: 0 }];
      }
    });
  };

  const handleDeleteSuccess = (id: string) => {
    setClasses((prev) => prev.filter((c) => c.id !== id));
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
      {/* Toolbar */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search classes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700"
          />
        </div>
        <Button onClick={handleCreate} className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white">
          <Plus className="mr-2 h-4 w-4" /> Add Class
        </Button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <Table>
          <TableHeader className="bg-slate-50 dark:bg-slate-900/50">
            <TableRow>
              <TableHead className="font-semibold text-slate-600 dark:text-slate-300">Name</TableHead>
              <TableHead className="font-semibold text-slate-600 dark:text-slate-300">Section</TableHead>
              <TableHead className="font-semibold text-slate-600 dark:text-slate-300 hidden md:table-cell">Academic Year</TableHead>
              <TableHead className="font-semibold text-slate-600 dark:text-slate-300 text-center">Students</TableHead>
              <TableHead className="font-semibold text-slate-600 dark:text-slate-300 text-center">Subjects</TableHead>
              <TableHead className="text-right font-semibold text-slate-600 dark:text-slate-300">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredClasses.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center text-slate-500">
                  No classes found.
                </TableCell>
              </TableRow>
            ) : (
              filteredClasses.map((c) => (
                <TableRow key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <TableCell className="font-medium text-slate-900 dark:text-slate-100">{c.name}</TableCell>
                  <TableCell>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300">
                      {c.section}
                    </span>
                  </TableCell>
                  <TableCell className="text-slate-500 hidden md:table-cell">{c.academicYear}</TableCell>
                  <TableCell>
                    <div className="flex items-center justify-center gap-1.5 text-slate-600 dark:text-slate-400">
                      <Users className="h-4 w-4" />
                      <span>{c.studentCount}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-center gap-1.5 text-slate-600 dark:text-slate-400">
                      <BookOpen className="h-4 w-4" />
                      <span>{c.subjectCount}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(c)}
                        className="h-8 w-8 text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(c)}
                        className="h-8 w-8 text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Modals */}
      <ClassFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        initialData={selectedClass}
        schoolId={schoolId}
        onSuccess={handleSaveSuccess}
      />
      
      {selectedClass && (
        <DeleteClassDialog
          isOpen={isDeleteOpen}
          onClose={() => setIsDeleteOpen(false)}
          classData={selectedClass}
          schoolId={schoolId}
          onSuccess={() => handleDeleteSuccess(selectedClass.id)}
        />
      )}
    </div>
  );
}
