"use client";

import { useState, useTransition, use } from "react";
import { submitAdmissionApplication, getSchoolBySubdomain } from "@/app/actions/admissions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  GraduationCap,
  User,
  Phone,
  Mail,
  Calendar,
  BookOpen,
  Loader2,
  CheckCircle2,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { useEffect } from "react";

const CLASS_OPTIONS = [
  "Nursery", "LKG", "UKG",
  "1st", "2nd", "3rd", "4th", "5th",
  "6th", "7th", "8th", "9th", "10th",
  "11th (Science)", "11th (Commerce)", "11th (Arts)",
  "12th (Science)", "12th (Commerce)", "12th (Arts)",
];

export default function AdmissionPage({ params }: { params: Promise<{ domain: string }> }) {
  const { domain } = use(params);
  const [isPending, startTransition] = useTransition();
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [school, setSchool] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedClass, setSelectedClass] = useState("");

  const isClassAbove2 = (className: string) => {
    if (!className) return false;
    const below2 = ["Nursery", "LKG", "UKG", "1st", "2nd"];
    return !below2.includes(className);
  };

  const showStudentContact = isClassAbove2(selectedClass);

  useEffect(() => {
    getSchoolBySubdomain(domain).then((res) => {
      if (res.success) {
        setSchool(res.data);
      }
      setLoading(false);
    });
  }, [domain]);

  function handleSubmit(formData: FormData) {
    setError("");
    startTransition(async () => {
      const result = await submitAdmissionApplication({
        schoolId: school.id,
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

      if (result.error) {
        setError(result.error);
      } else {
        setSubmitted(true);
      }
    });
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  if (!school) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 via-pink-50 to-orange-50">
        <div className="text-center p-8">
          <h1 className="text-2xl font-bold text-red-600">School Not Found</h1>
          <p className="text-slate-600 mt-2">This admission link is invalid or expired.</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 p-4">
        <div className="max-w-md w-full bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl p-8 text-center border border-emerald-100">
          <div className="mx-auto w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mb-6">
            <CheckCircle2 className="w-10 h-10 text-emerald-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-3">Application Submitted!</h2>
          <p className="text-slate-600 leading-relaxed">
            Your admission application for <span className="font-semibold text-slate-900">{school.name}</span> has been received.
            The school administration will review your application and contact you soon.
          </p>
          <div className="mt-6 p-4 bg-emerald-50 rounded-xl border border-emerald-100">
            <p className="text-sm text-emerald-700 font-medium">
              Please keep your phone handy. The school will call you for the next steps.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
      <div className="max-w-lg w-full">
        {/* School Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-200 mb-4">
            <GraduationCap className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">{school.name}</h1>
          <p className="text-slate-500 mt-1">Online Admission Application</p>
          <div className="flex items-center justify-center gap-1.5 mt-3 text-indigo-600">
            <Sparkles className="w-4 h-4" />
            <span className="text-xs font-medium">Quick & Easy — Takes less than 2 minutes</span>
          </div>
        </div>

        {/* Form Card */}
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
                <label className="text-sm font-medium text-slate-700">
                  Gender <span className="text-red-500">*</span>
                </label>
                <select
                  name="gender"
                  required
                  className="flex h-12 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
                >
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
            </div>

            {/* Target Class */}
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
                className="flex h-12 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
              >
                <option value="">Select Class</option>
                {CLASS_OPTIONS.map((cls) => (
                  <option key={cls} value={cls}>{cls}</option>
                ))}
              </select>
            </div>

            {/* Conditional Student Fields */}
            {showStudentContact && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

            {/* Divider */}
            <div className="relative py-2">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-white px-3 text-slate-400 font-medium">Parent / Guardian Details</span>
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

            {/* Contact Details Grid */}
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
                <BookOpen className="w-4 h-4 text-slate-400" />
                Address <span className="text-red-500">*</span>
              </label>
              <Input
                name="address"
                required
                placeholder="Full residential address"
                className="h-12 rounded-xl border-slate-200 bg-slate-50/50 focus:bg-white transition-colors"
              />
            </div>


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
              className="w-full h-13 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium text-base transition-all shadow-lg hover:shadow-indigo-300 gap-2"
            >
              {isPending ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  Submit Application
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </Button>
          </form>
        </div>

        <p className="text-center text-xs text-slate-400 mt-6">
          Powered by SchoolSaathi — School Management System
        </p>
      </div>
    </div>
  );
}
