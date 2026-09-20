"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { deleteClass } from "@/app/actions/classes";

interface DeleteClassDialogProps {
  isOpen: boolean;
  onClose: () => void;
  classData: any;
  schoolId: string;
  onSuccess: () => void;
}

export default function DeleteClassDialog({ isOpen, onClose, classData, schoolId, onSuccess }: DeleteClassDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await deleteClass(schoolId, classData.id);
      
      if (res.error) {
        setError(res.error);
      } else if (res.success) {
        onSuccess();
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
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-red-600">Delete Class</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete <strong>{classData?.name} - {classData?.section}</strong>? 
            This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="p-3 mt-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
            {error}
          </div>
        )}

        <DialogFooter className="pt-4">
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={isLoading} className="bg-red-600 hover:bg-red-700 text-white">
            {isLoading ? "Deleting..." : "Delete Class"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
