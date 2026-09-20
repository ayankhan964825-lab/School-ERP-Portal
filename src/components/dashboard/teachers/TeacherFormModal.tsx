"use client";

import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Upload, Loader2, User } from "lucide-react";
import { createTeacher, updateTeacher } from "@/app/actions/teachers";
import { uploadImageAsWebP } from "@/lib/image-upload";
import { toast } from "@/components/ui/toast";

interface TeacherFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData: any | null;
  schoolId: string;
  onSuccess: (data: any) => void;
}

export default function TeacherFormModal({ isOpen, onClose, initialData, schoolId, onSuccess }: TeacherFormModalProps) {
  const [formData, setFormData] = useState({ 
    name: "", 
    email: "", 
    phone: "", 
    empId: "", 
    qualification: "",
    profileImage: ""
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const isEditing = !!initialData;

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setFormData({
          name: initialData.name || "",
          email: initialData.email || "",
          phone: initialData.phone || "",
          empId: initialData.teacherProfile?.empId || "",
          qualification: initialData.teacherProfile?.qualification || "",
          profileImage: initialData.profileImage || ""
        });
      } else {
        setFormData({ name: "", email: "", phone: "", empId: "", qualification: "", profileImage: "" });
      }
      setError(null);
    }
  }, [isOpen, initialData]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size (max 5MB before compression)
    if (file.size > 5 * 1024 * 1024) {
      toast.add({ title: "Error", description: "File is too large (max 5MB)", type: "error" });
      return;
    }

    try {
      setIsUploading(true);
      setError(null);
      const bucketName = "school-erp-assets"; // Note: User must have created this bucket in Supabase
      const folderPath = `schools/${schoolId}/teachers`;
      
      const publicUrl = await uploadImageAsWebP(file, bucketName, folderPath);
      setFormData({ ...formData, profileImage: publicUrl });
      toast.add({ title: "Success", description: "Photo uploaded and compressed successfully!" });
    } catch (err: any) {
      setError(err.message || "Failed to upload image. Have you setup the Supabase bucket?");
    } finally {
      setIsUploading(false);
      // Reset input so they can upload same file again if needed
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      let res;
      if (isEditing) {
        res = await updateTeacher(schoolId, initialData.id, formData);
      } else {
        res = await createTeacher(schoolId, formData);
      }

      if (res.error) {
        setError(res.error);
      } else if (res.success) {
        toast.add({ title: "Success", description: `Teacher ${isEditing ? "updated" : "added"} successfully.` });
        onSuccess(res.data);
        onClose();
      }
    } catch (err) {
      setError("An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Teacher" : "Add New Teacher"}</DialogTitle>
          <DialogDescription>
            {isEditing ? "Modify the teacher's profile and details." : "Enter the details to create a new teacher account. A default password 'Teacher@123' will be generated."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          {error && (
            <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
              {error}
            </div>
          )}

          {/* Profile Photo Upload Section */}
          <div className="flex flex-col items-center justify-center space-y-3 mb-6">
            <div className="relative group">
              <Avatar className="h-24 w-24 border-2 border-slate-200">
                <AvatarImage src={formData.profileImage || ""} alt="Profile" />
                <AvatarFallback className="bg-slate-100">
                  {isUploading ? <Loader2 className="h-8 w-8 animate-spin text-slate-400" /> : <User className="h-10 w-10 text-slate-400" />}
                </AvatarFallback>
              </Avatar>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="absolute inset-0 flex items-center justify-center bg-black/40 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Upload className="h-6 w-6" />
              </button>
            </div>
            <input
              type="file"
              ref={fileInputRef}
              accept="image/png, image/jpeg, image/jpg"
              className="hidden"
              onChange={handleFileChange}
            />
            <span className="text-xs text-slate-500 text-center">
              Click photo to upload.<br />Auto-compressed to WebP format.
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="John Doe"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="john@example.com"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Phone (Optional)</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+91 9876543210"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="empId">Employee ID (Optional)</Label>
              <Input
                id="empId"
                value={formData.empId}
                onChange={(e) => setFormData({ ...formData, empId: e.target.value })}
                placeholder="EMP001"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="qualification">Qualification (Optional)</Label>
            <Input
              id="qualification"
              value={formData.qualification}
              onChange={(e) => setFormData({ ...formData, qualification: e.target.value })}
              placeholder="M.Sc. Mathematics, B.Ed."
            />
          </div>

          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={isLoading || isUploading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || isUploading} className="bg-blue-600 hover:bg-blue-700 text-white">
              {isLoading ? "Saving..." : isEditing ? "Save Changes" : "Add Teacher"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
