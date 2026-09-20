"use client";

import { useState, useTransition } from "react";
import {
  X,
  Loader2,
  User,
  Phone,
  BookOpen,
  Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/toast";
import { submitAdmissionApplication } from "@/app/actions/admissions";

const CLASS_OPTIONS = [
  "Nursery", "LKG", "UKG",
  "1st", "2nd", "3rd", "4th", "5th",
  "6th", "7th", "8th", "9th", "10th",
  "11th (Science)", "11th (Commerce)", "11th (Arts)",
  "12th (Science)", "12th (Commerce)", "12th (Arts)",
];

interface ManualEntryModalProps {
  schoolId: string;
  onClose: () => void;
  onSuccess: (newEnquiry: any) => void;
}

export default function ManualEntryModal({
  schoolId,
  onClose,
  onSuccess,
}: ManualEntryModalProps) {
  const [isPending, startTransition] = useTransition();
  const [selectedClass, setSelectedClass] = useState("");

  const isClassAbove2 = (className: string) => {
    if (!className) return false;
    const below2 = ["Nursery", "LKG", "UKG", "1st", "2nd"];
    return !below2.includes(className);
  };
  
  const showStudentContact = isClassAbove2(selectedClass);

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await submitAdmissionApplication({
        schoolId,
        studentName: formData.get("studentName") as string,
        dob: formData.get("dob") as string,
        gender: formData.get("gender") as string,
        parentName: formData.get("parentName") as string,
        parentPhone: formData.get("parentPhone") as string,
        parentEmail: formData.get("parentEmail") as string,
        address: formData.get("address") as string,
        studentPhone: (formData.get("studentPhone") as string) || undefined,
        studentEmail: (formData.get("studentEmail") as string) || undefined,
        appliedForClass: formData.get("appliedForClass") as string,
        source: "MANUAL",
      });

      if (result.error) {
        toast.add({ title: "Error", description: result.error, type: "error" });
      } else {
        toast.add({ title: "Success", description: "Application added to Pending list." });
        onSuccess(result.data);
      }
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md border border-slate-200 dark:border-slate-700">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-700">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Quick Add Application</h2>
            <p className="text-xs text-slate-500 mt-0.5">Walk-in parent ke liye manual entry</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form action={handleSubmit} className="p-5 space-y-4">
          {/* Student Name */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-slate-400" />
              Student Name <span className="text-red-500">*</span>
            </label>
            <Input
              name="studentName"
              required
              placeholder="Full name"
              className="h-10 rounded-lg"
            />
          </div>

          {/* DOB & Gender */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                DOB <span className="text-red-500">*</span>
              </label>
              <Input
                name="dob"
                type="date"
                required
                className="h-10 rounded-lg"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Gender <span className="text-red-500">*</span>
              </label>
              <select
                name="gender"
                required
                className="flex h-10 w-full rounded-lg border border-slate-200 bg-white dark:bg-slate-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
          </div>

          {/* Class */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-slate-400" />
              Target Class <span className="text-red-500">*</span>
            </label>
            <select
              name="appliedForClass"
              required
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="flex h-10 w-full rounded-lg border border-slate-200 bg-white dark:bg-slate-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Select Class</option>
              {CLASS_OPTIONS.map((cls) => (
                <option key={cls} value={cls}>{cls}</option>
              ))}
            </select>
          </div>

          {/* Separator */}
          <div className="relative py-1">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200 dark:border-slate-700" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-white dark:bg-slate-900 px-2 text-slate-400">Parent Info</span>
            </div>
          </div>

          {/* Parent Name */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-slate-400" />
              Parent Name <span className="text-red-500">*</span>
            </label>
            <Input
              name="parentName"
              required
              placeholder="Guardian's full name"
              className="h-10 rounded-lg"
            />
          </div>

          {/* Parent Phone & Email */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                Parent Phone <span className="text-red-500">*</span>
              </label>
              <Input
                name="parentPhone"
                type="tel"
                required
                placeholder="98XXXXXXXX"
                className="h-10 rounded-lg"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                Email <span className="text-red-500">*</span>
              </label>
              <Input
                name="parentEmail"
                type="email"
                required
                placeholder="email@example.com"
                className="h-10 rounded-lg"
              />
            </div>
          </div>

          {/* Address */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              Address <span className="text-red-500">*</span>
            </label>
            <Input
              name="address"
              required
              placeholder="Full residential address"
              className="h-10 rounded-lg"
            />
          </div>

          {/* Conditional Student Contact */}
          {showStudentContact && (
            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-200 dark:border-slate-700">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  Student Phone <span className="text-red-500">*</span>
                </label>
                <Input
                  name="studentPhone"
                  type="tel"
                  required
                  placeholder="98XXXXXXXX"
                  className="h-10 rounded-lg bg-indigo-50/50 dark:bg-indigo-900/20"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  Student Email <span className="text-red-500">*</span>
                </label>
                <Input
                  name="studentEmail"
                  type="email"
                  required
                  placeholder="student@example.com"
                  className="h-10 rounded-lg bg-indigo-50/50 dark:bg-indigo-900/20"
                />
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1 rounded-lg"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isPending}
              className="flex-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white gap-2"
            >
              {isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Add to Pending"
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
