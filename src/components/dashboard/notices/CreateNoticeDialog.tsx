"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogDescription
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { 
  Form, 
  FormControl, 
  FormDescription, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { RichTextEditor } from "./RichTextEditor";
import { createNotice, editNotice } from "@/app/actions/notices";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Loader2, Edit } from "lucide-react";
import { Badge } from "@/components/ui/badge";

// Dynamic schema
const formSchema = z.object({
  title: z.string().min(1, "Title is required"),
  content: z.string().min(1, "Content is required"),
  priority: z.enum(["NORMAL", "URGENT", "PINNED"]),
  targetRoles: z.array(z.string()),
  targetClasses: z.array(z.string()),
  isPublished: z.boolean(),
  publishDate: z.string().optional(),
}).refine((data) => data.targetRoles.length > 0 || data.targetClasses.length > 0, {
  message: "Please select at least one role or class to target.",
  path: ["targetRoles"],
});

type FormValues = z.infer<typeof formSchema>;

interface CreateNoticeDialogProps {
  schoolId: string;
  systemRoles: { id: string; name: string }[];
  classes: { id: string; name: string; section: string }[];
  noticeToEdit?: any;
}

export function CreateNoticeDialog({ schoolId, systemRoles, classes, noticeToEdit }: CreateNoticeDialogProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEditing = !!noticeToEdit;

  // Standard roles that always exist
  const standardRoles = [
    { id: "TEACHER", name: "All Teachers" },
    { id: "STUDENT", name: "All Students" },
    { id: "PARENT", name: "All Parents" },
    { id: "STAFF", name: "All Staff" }
  ];

  const defaultPublishDate = noticeToEdit?.publishDate 
    ? new Date(noticeToEdit.publishDate).toISOString().slice(0, 16) 
    : "";

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: noticeToEdit?.title || "",
      content: noticeToEdit?.content || "",
      priority: noticeToEdit?.priority || "NORMAL",
      targetRoles: noticeToEdit?.targetRoles || [],
      targetClasses: noticeToEdit?.targetClasses || [],
      isPublished: noticeToEdit ? noticeToEdit.isPublished : true,
      publishDate: defaultPublishDate,
    },
  });

  async function onSubmit(data: FormValues) {
    setIsSubmitting(true);
    try {
      const parsedDate = data.publishDate ? new Date(data.publishDate) : null;
      
      const payload = {
        title: data.title,
        content: data.content,
        priority: data.priority,
        targetRoles: data.targetRoles,
        targetClasses: data.targetClasses,
        isPublished: data.isPublished,
        publishDate: parsedDate,
        attachments: noticeToEdit?.attachments || [], 
      };

      let response;
      if (isEditing) {
        response = await editNotice(schoolId, noticeToEdit.id, payload);
      } else {
        response = await createNotice(schoolId, payload);
      }

      if (response.error) {
        toast.error(response.error);
      } else {
        toast.success(isEditing ? "Notice updated successfully!" : "Notice published successfully!");
        setOpen(false);
        if (!isEditing) form.reset();
      }
    } catch (error) {
      toast.error("An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {isEditing ? (
        <DialogTrigger render={<Button variant="ghost" size="icon" />}>
          <Edit className="h-4 w-4 text-blue-500" />
        </DialogTrigger>
      ) : (
        <DialogTrigger render={<Button />}>
          <Plus className="mr-2 h-4 w-4" />
          Create Notice
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Notice" : "Create New Notice"}</DialogTitle>
          <DialogDescription>
            {isEditing ? "Make changes to your announcement." : "Publish announcements to specific roles or classes."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notice Title</FormLabel>
                  <FormControl>
                    <Input placeholder="E.g., Annual Sports Day 2026" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Priority</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select priority" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="NORMAL">Normal</SelectItem>
                        <SelectItem value="URGENT">Urgent (Highlighted)</SelectItem>
                        <SelectItem value="PINNED">Pinned to Top</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="publishDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Schedule Publication (Optional)</FormLabel>
                    <FormControl>
                      <Input type="datetime-local" {...field} />
                    </FormControl>
                    <FormDescription>Leave empty to publish immediately.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Content</FormLabel>
                  <FormControl>
                    <RichTextEditor 
                      value={field.value} 
                      onChange={field.onChange} 
                      placeholder="Write your announcement here..."
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-4 p-4 border rounded-md bg-muted/20">
              <div className="text-sm font-medium">Target Audience</div>
              
              <FormField
                control={form.control}
                name="targetRoles"
                render={() => (
                  <FormItem>
                    <div className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Standard Roles</div>
                    <div className="flex flex-wrap gap-3">
                      {standardRoles.map((item) => (
                        <FormField
                          key={item.id}
                          control={form.control}
                          name="targetRoles"
                          render={({ field }) => {
                            return (
                              <FormItem
                                key={item.id}
                                className="flex flex-row items-start space-x-2 space-y-0"
                              >
                                <FormControl>
                                  <Checkbox
                                    checked={field.value?.includes(item.id)}
                                    onCheckedChange={(checked) => {
                                      return checked
                                        ? field.onChange([...field.value, item.id])
                                        : field.onChange(
                                            field.value?.filter(
                                              (value) => value !== item.id
                                            )
                                          )
                                    }}
                                  />
                                </FormControl>
                                <FormLabel className="font-normal cursor-pointer">
                                  {item.name}
                                </FormLabel>
                              </FormItem>
                            )
                          }}
                        />
                      ))}
                    </div>

                    {systemRoles.length > 0 && (
                      <>
                        <div className="mt-4 mb-2 text-xs font-semibold uppercase text-muted-foreground">Custom Staff Roles</div>
                        <div className="flex flex-wrap gap-3">
                          {systemRoles.map((item) => (
                            <FormField
                              key={item.id}
                              control={form.control}
                              name="targetRoles"
                              render={({ field }) => {
                                return (
                                  <FormItem
                                    key={item.id}
                                    className="flex flex-row items-start space-x-2 space-y-0"
                                  >
                                    <FormControl>
                                      <Checkbox
                                        checked={field.value?.includes(item.id)}
                                        onCheckedChange={(checked) => {
                                          return checked
                                            ? field.onChange([...field.value, item.id])
                                            : field.onChange(
                                                field.value?.filter(
                                                  (value) => value !== item.id
                                                )
                                              )
                                        }}
                                      />
                                    </FormControl>
                                    <FormLabel className="font-normal cursor-pointer">
                                      {item.name}
                                    </FormLabel>
                                  </FormItem>
                                )
                              }}
                            />
                          ))}
                        </div>
                      </>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="w-full h-px bg-border my-4" />

              <FormField
                control={form.control}
                name="targetClasses"
                render={() => (
                  <FormItem>
                    <div className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Specific Classes (Students)</div>
                    <div className="flex flex-wrap gap-3 max-h-32 overflow-y-auto p-1">
                      {classes.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No active classes found.</p>
                      ) : (
                        classes.map((cls) => (
                          <FormField
                            key={cls.id}
                            control={form.control}
                            name="targetClasses"
                            render={({ field }) => {
                              return (
                                <FormItem
                                  key={cls.id}
                                  className="flex flex-row items-start space-x-2 space-y-0"
                                >
                                  <FormControl>
                                    <Checkbox
                                      checked={field.value?.includes(cls.id)}
                                      onCheckedChange={(checked) => {
                                        return checked
                                          ? field.onChange([...field.value, cls.id])
                                          : field.onChange(
                                              field.value?.filter(
                                                (value) => value !== cls.id
                                              )
                                            )
                                      }}
                                    />
                                  </FormControl>
                                  <FormLabel className="font-normal cursor-pointer whitespace-nowrap">
                                    <Badge variant="outline">{cls.name} {cls.section}</Badge>
                                  </FormLabel>
                                </FormItem>
                              )
                            }}
                          />
                        ))
                      )}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="isPublished"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>
                      Publish Immediately
                    </FormLabel>
                    <FormDescription>
                      If unchecked, the notice will be saved as a draft.
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Notice
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
