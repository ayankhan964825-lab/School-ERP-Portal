"use client";

import { useState, useTransition } from "react";
import { User, Calendar, BookOpen, Phone, Mail, Sparkles, MapPin } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { submitAdmissionApplication } from "@/app/actions/admissions";
import { useRouter } from "next/navigation";

interface AdmissionFormClientProps {
  schoolId: string;
  classes: { id: string; name: string }[];
}

export default function AdmissionFormClient({ schoolId, classes }: AdmissionFormClientProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [selectedClass, setSelectedClass] = useState("");
  const router = useRouter();

  const isClassAbove2 = (className: string) => {
    if (!className) return false;
    const below2 = ["Nursery", "LKG", "UKG", "1st", "2nd"];
    return !below2.includes(className);
  };

  const showStudentContact = isClassAbove2(selectedClass);

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const res = await submitAdmissionApplication({
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
        source: "QR_CODE",
      });

      if (res.error) {
        setError(res.error);
      } else {
        setSuccess(true);
      }
    });
  }

  if (success) {
    return (
      <div className="text-center p-8 bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/50">
        <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <Sparkles className="w-10 h-10 text-emerald-600" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">
          Application Submitted!
        </h2>
        <p className="text-slate-600 mb-8">
          Thank you. Your admission request has been sent to the administration. We will contact you shortly.
        </p>
        <Button 
          onClick={() => {
            setSuccess(false);
            router.refresh();
          }}
          className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl h-12 px-8"
        >
          Submit Another
        </Button>
        <div className="mt-6 p-4 bg-emerald-50 rounded-xl border border-emerald-100">
          <p className="text-sm text-emerald-700 font-medium">
            Please keep your phone handy. The school will call you for the next steps.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/50 p-8">
      <form action={handleSubmit} className="space-y-5">
        {/* Student Name */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
            <User className="w-4 h-4 text-slate-400" />
            Student&apos;s Full Name <span className="text-red-500">*</span>
          </label>
          <Input
            name="studentName"
            required
            placeholder="Enter student's full name"
            className="h-12 rounded-xl border-slate-200 bg-slate-50/50 focus:bg-white transition-colors"
          />
        </div>

        {/* DOB & Gender Row */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-slate-400" />
              Date of Birth <span className="text-red-500">*</span>
            </label>
            <Input
              name="dob"
              type="date"
              required
              className="h-12 rounded-xl border-slate-200 bg-slate-50/50 focus:bg-white transition-colors"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
              Gender <span className="text-red-500">*</span>
            </label>
            <select
              name="gender"
              required
              className="flex h-12 w-full rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
            >
              <option value="MALE">Male</option>
              <option value="FEMALE">Female</option>
              <option value="OTHER">Other</option>
            </select>
          </div>
        </div>

        {/* Applying For Class */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-slate-400" />
            Applying for Class <span className="text-red-500">*</span>
          </label>
          <select
            name="appliedForClass"
            required
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="flex h-12 w-full rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
          >
            <option value="">Select Class</option>
            {classes.map((cls) => (
              <option key={cls.id} value={cls.name}>
                {cls.name}
              </option>
            ))}
          </select>
        </div>

        <div className="relative py-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="bg-white/50 px-2 text-slate-500 font-medium">
              Parent / Guardian Details
            </span>
          </div>
        </div>

        {/* Parent Name */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
            <User className="w-4 h-4 text-slate-400" />
            Parent / Guardian Name <span className="text-red-500">*</span>
          </label>
          <Input
            name="parentName"
            required
            placeholder="Enter parent's full name"
            className="h-12 rounded-xl border-slate-200 bg-slate-50/50 focus:bg-white transition-colors"
          />
        </div>

        {/* Parent Phone & Email */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
              <Phone className="w-4 h-4 text-slate-400" />
              Parent Phone <span className="text-red-500">*</span>
            </label>
            <Input
              name="parentPhone"
              type="tel"
              required
              placeholder="98XXXXXXXX"
              className="h-12 rounded-xl border-slate-200 bg-slate-50/50 focus:bg-white transition-colors"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
              <Mail className="w-4 h-4 text-slate-400" />
              Email <span className="text-red-500">*</span>
            </label>
            <Input
              name="parentEmail"
              type="email"
              required
              placeholder="email@example.com"
              className="h-12 rounded-xl border-slate-200 bg-slate-50/50 focus:bg-white transition-colors"
            />
          </div>
        </div>

        {/* Address */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-slate-400" />
            Residential Address <span className="text-red-500">*</span>
          </label>
          <Input
            name="address"
            required
            placeholder="Full Residential Address"
            className="h-12 rounded-xl border-slate-200 bg-slate-50/50 focus:bg-white transition-colors"
          />
        </div>

        {/* Conditional Student Contact */}
        {showStudentContact && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-slate-200">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                <Phone className="w-4 h-4 text-indigo-400" />
                Student Phone <span className="text-red-500">*</span>
              </label>
              <Input
                name="studentPhone"
                type="tel"
                required
                placeholder="98XXXXXXXX"
                className="h-12 rounded-xl border-indigo-200 bg-indigo-50/50 focus:bg-white transition-colors"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                <Mail className="w-4 h-4 text-indigo-400" />
                Student Email <span className="text-red-500">*</span>
              </label>
              <Input
                name="studentEmail"
                type="email"
                required
                placeholder="student@example.com"
                className="h-12 rounded-xl border-indigo-200 bg-indigo-50/50 focus:bg-white transition-colors"
              />
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
            {error}
          </div>
        )}

        {/* Submit */}
        <Button
          type="submit"
          disabled={isPending}
          className="w-full h-12 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-lg mt-4 transition-all active:scale-[0.98]"
        >
          {isPending ? "Submitting..." : "Submit Application"}
        </Button>
      </form>
    </div>
  );
}
