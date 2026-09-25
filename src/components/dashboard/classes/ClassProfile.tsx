"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, BookOpen, UserPlus, CheckCircle2, Clock } from "lucide-react";

type ClassProfileProps = {
  classData: any;
};

export default function ClassProfile({ classData }: ClassProfileProps) {
  const [activeTab, setActiveTab] = useState("students");

  return (
    <div className="space-y-6">
      {/* Class Header Card */}
      <Card className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-lg border-0 overflow-hidden relative">
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <Users className="w-48 h-48" />
        </div>
        <CardHeader className="relative z-10 pb-2">
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-4xl font-extrabold tracking-tight">
                Class {classData.name} - {classData.section}
              </CardTitle>
              <CardDescription className="text-blue-100 mt-2 text-lg">
                Academic Year {classData.academicYear}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" className="bg-white text-blue-700 hover:bg-blue-50 font-semibold shadow-sm">
                <UserPlus className="w-4 h-4 mr-2" />
                Assign Teacher
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="relative z-10 pt-4">
          <div className="flex gap-8">
            <div className="flex items-center gap-3 bg-white/10 px-4 py-3 rounded-xl backdrop-blur-sm border border-white/20">
              <div className="p-2 bg-white/20 rounded-lg">
                <Users className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-sm text-blue-100 font-medium">Total Students</p>
                <p className="text-2xl font-bold">{classData._count.studentEnrollments}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 bg-white/10 px-4 py-3 rounded-xl backdrop-blur-sm border border-white/20">
              <div className="p-2 bg-white/20 rounded-lg">
                <BookOpen className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-sm text-blue-100 font-medium">Subjects</p>
                <p className="text-2xl font-bold">{classData._count.subjects}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs Section */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:w-[400px] bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
          <TabsTrigger value="students" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <Users className="w-4 h-4 mr-2" />
            Students Directory
          </TabsTrigger>
          <TabsTrigger value="subjects" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <BookOpen className="w-4 h-4 mr-2" />
            Subjects
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="students" className="mt-6">
          <Card className="border-slate-200 shadow-sm overflow-hidden rounded-xl">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50 dark:bg-slate-800/50">
                  <TableRow>
                    <TableHead className="w-[100px] font-semibold">Roll No</TableHead>
                    <TableHead className="font-semibold">Student Name</TableHead>
                    <TableHead className="font-semibold">Parent Contact</TableHead>
                    <TableHead className="font-semibold">Status</TableHead>
                    <TableHead className="text-right font-semibold">Documents</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {!classData.studentEnrollments || classData.studentEnrollments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="h-32 text-center text-slate-500">
                        No students enrolled in this class yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    classData.studentEnrollments.map((enrollment: any) => (
                      <TableRow key={enrollment.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                        <TableCell className="font-medium text-slate-900 dark:text-slate-100">
                          {enrollment.rollNumber}
                        </TableCell>
                        <TableCell>
                          <div className="font-medium text-slate-900 dark:text-slate-100">{enrollment.student.user.name}</div>
                          <div className="text-sm text-slate-500">{enrollment.student.user.email}</div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium text-slate-700 dark:text-slate-300">
                            {enrollment.student.parent?.user?.name || "N/A"}
                          </div>
                          <div className="text-sm text-slate-500">
                            {enrollment.student.parent?.user?.phone || "-"}
                          </div>
                        </TableCell>
                        <TableCell>
                          {enrollment.student.user.isActive ? (
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Active</Badge>
                          ) : (
                            <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Inactive</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {enrollment.student.documentsPending ? (
                            <Badge variant="secondary" className="bg-amber-100 text-amber-800 hover:bg-amber-100">
                              <Clock className="w-3 h-3 mr-1" />
                              Pending
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">
                              <CheckCircle2 className="w-3 h-3 mr-1" />
                              Verified
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="subjects" className="mt-6">
          <Card className="border-slate-200 shadow-sm overflow-hidden rounded-xl">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50 dark:bg-slate-800/50">
                  <TableRow>
                    <TableHead className="font-semibold">Subject Code</TableHead>
                    <TableHead className="font-semibold">Subject Name</TableHead>
                    <TableHead className="font-semibold">Assigned Teachers</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {classData.subjects.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="h-32 text-center text-slate-500">
                        No subjects assigned to this class yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    classData.subjects.map((subject: any) => (
                      <TableRow key={subject.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                        <TableCell className="font-medium text-slate-900 dark:text-slate-100">
                          {subject.subjectMaster.code}
                        </TableCell>
                        <TableCell className="font-medium text-slate-700 dark:text-slate-300">
                          {subject.subjectMaster.name}
                        </TableCell>
                        <TableCell>
                          {subject.classTeachers.length === 0 ? (
                            <span className="text-slate-400 text-sm italic">Not assigned</span>
                          ) : (
                            <div className="flex flex-wrap gap-2">
                              {subject.classTeachers.map((ct: any) => (
                                <Badge key={ct.id} variant="secondary" className="bg-blue-50 text-blue-700 hover:bg-blue-100">
                                  {ct.teacher.user.name}
                                  {ct.isClassTeacher && " (Class Teacher)"}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
