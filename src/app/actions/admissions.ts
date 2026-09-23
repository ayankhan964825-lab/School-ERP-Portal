"use server";

import { db } from "@/lib/db";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { sendWelcomeCredentials } from "@/lib/notifications";

// ─────────────────────────────────────────────
// 1. PUBLIC: Submit Admission Application (QR Form)
// ─────────────────────────────────────────────
export async function submitAdmissionApplication(data: {
  schoolId: string;
  studentName: string;
  dob: string;
  gender: string;
  parentName: string;
  parentPhone: string;
  parentEmail?: string;
  address: string;
  studentPhone?: string;
  studentEmail?: string;
  appliedForClass: string;
  source?: string;
}) {
  try {
    if (!data.studentName || !data.parentName || !data.parentPhone || !data.appliedForClass) {
      return { error: "Student Name, Parent Name, Phone, and Target Class are required." };
    }

    const enquiry = await db.admissionEnquiry.create({
      data: {
        schoolId: data.schoolId,
        studentName: data.studentName,
        dob: new Date(data.dob),
        gender: data.gender || "MALE",
        parentName: data.parentName,
        parentPhone: data.parentPhone,
        parentEmail: data.parentEmail || null,
        address: data.address,
        studentPhone: data.studentPhone || null,
        studentEmail: data.studentEmail || null,
        appliedForClass: data.appliedForClass,
        source: (data.source as any) || "QR_CODE",
        status: "APPLIED",
      },
    });

    return { success: true, data: enquiry };
  } catch (error: any) {
    console.error("Error submitting admission:", error);
    return { error: error.message || "Failed to submit admission application." };
  }
}

// ─────────────────────────────────────────────
// 2. ADMIN: Get All Admission Enquiries
// ─────────────────────────────────────────────
export async function getAdmissionEnquiries(schoolId: string, status?: string) {
  try {
    const where: any = { schoolId };
    if (status) {
      where.status = status;
    }

    const enquiries = await db.admissionEnquiry.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    return { success: true, data: enquiries };
  } catch (error: any) {
    console.error("Error fetching admissions:", error);
    return { error: error.message || "Failed to fetch admission enquiries." };
  }
}

// ─────────────────────────────────────────────
// 3. ADMIN: Update Enquiry Details (Interview Stage)
// ─────────────────────────────────────────────
export async function updateAdmissionEnquiry(
  enquiryId: string,
  data: {
    studentName?: string;
    dob?: string;
    gender?: string;
    parentName?: string;
    parentPhone?: string;
    parentEmail?: string;
    previousSchool?: string;
    previousClass?: string;
    appliedForClass?: string;
    notes?: string;
    documents?: any;
    documentsPending?: boolean;
  }
) {
  try {
    const updateData: any = { ...data };
    if (data.dob) {
      updateData.dob = new Date(data.dob);
    }

    const updated = await db.admissionEnquiry.update({
      where: { id: enquiryId },
      data: updateData,
    });

    revalidatePath("/[domain]/(dashboard)/admin/admissions", "page");
    return { success: true, data: updated };
  } catch (error: any) {
    console.error("Error updating admission:", error);
    return { error: error.message || "Failed to update admission." };
  }
}

// ─────────────────────────────────────────────
// 4. ADMIN: Reject Application
// ─────────────────────────────────────────────
export async function rejectAdmission(enquiryId: string, reason?: string) {
  try {
    const updated = await db.admissionEnquiry.update({
      where: { id: enquiryId },
      data: {
        status: "REJECTED",
        notes: reason || "Application rejected by admin.",
      },
    });

    revalidatePath("/[domain]/(dashboard)/admin/admissions", "page");
    return { success: true, data: updated };
  } catch (error: any) {
    return { error: error.message || "Failed to reject admission." };
  }
}

// ─────────────────────────────────────────────
// 5. SMART: Suggest Section & Roll Number
// ─────────────────────────────────────────────
export async function suggestSectionAndRoll(schoolId: string, className: string) {
  try {
    // Get all classes and filter in JS to allow flexible matching (e.g., "11th - Science" vs "11th (Science)")
    const allClasses = await db.class.findMany({
      where: { schoolId },
      include: {
        _count: { select: { students: true } },
      },
      orderBy: { section: "asc" },
    });

    const normalize = (str: string) => str.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
    const getBase = (str: string) => str.split(/[\s-(]+/)[0].toLowerCase();

    // 1. Try exact normalized match
    let classes = allClasses.filter((c) => normalize(c.name) === normalize(className));
    
    // 2. If no exact match, fallback to base name (e.g., "11th")
    if (classes.length === 0) {
      classes = allClasses.filter((c) => getBase(c.name) === getBase(className));
    }

    if (classes.length === 0) {
      return {
        success: true,
        data: {
          suggestedSection: "A",
          suggestedRollNo: 1,
          classId: null,
          availableSections: [],
          message: `No sections found for Class ${className}. A new section "A" will be created.`,
        },
      };
    }

    // Find the first section that is not full (capacity assumed 40 for now)
    const MAX_CAPACITY = 40;
    let suggestedClass = classes[0];
    let suggestedRollNo = 1;

    for (const cls of classes) {
      if (cls._count.students < MAX_CAPACITY) {
        suggestedClass = cls;
        suggestedRollNo = cls._count.students + 1;
        break;
      }
    }

    // If all sections are full, suggest next section letter
    const allFull = classes.every((cls) => cls._count.students >= MAX_CAPACITY);
    let suggestedSection = suggestedClass.section;
    if (allFull) {
      const lastSection = classes[classes.length - 1].section;
      suggestedSection = String.fromCharCode(lastSection.charCodeAt(0) + 1);
      suggestedRollNo = 1;
    }

    const availableSections = classes.map((cls) => ({
      classId: cls.id,
      section: cls.section,
      studentCount: cls._count.students,
    }));

    return {
      success: true,
      data: {
        suggestedSection,
        suggestedRollNo,
        classId: allFull ? null : suggestedClass.id,
        availableSections,
        message: allFull
          ? `All sections full. Suggest creating new section "${suggestedSection}".`
          : `Section ${suggestedSection} has space (${suggestedClass._count.students}/${MAX_CAPACITY}).`,
      },
    };
  } catch (error: any) {
    return { error: error.message || "Failed to suggest section." };
  }
}

// ─────────────────────────────────────────────
// 6. ADMIN: Approve & Admit (THE MAGIC BUTTON)
// ─────────────────────────────────────────────
export async function approveAndAdmit(
  enquiryId: string,
  data: {
    classId: string;
    rollNumber: number;
    schoolId: string;
    documentsChecklist?: Record<string, boolean>;
  }
) {
  try {
    const enquiry = await db.admissionEnquiry.findUnique({
      where: { id: enquiryId },
    });

    if (!enquiry) {
      return { error: "Admission enquiry not found." };
    }

    if (enquiry.status === "ADMITTED") {
      return { error: "This student has already been admitted." };
    }

    const result = await db.$transaction(async (tx: any) => {
      // 1. Create or find Parent user & profile
      let parentUser = await tx.user.findFirst({
        where: {
          schoolId: data.schoolId,
          phone: enquiry.parentPhone,
          userType: "PARENT",
        },
      });

      if (!parentUser) {
        const parentEmail = `parent_${enquiry.parentPhone}@school.erp`;
        const parentHash = await bcrypt.hash("Parent@123", 10);

        parentUser = await tx.user.create({
          data: {
            schoolId: data.schoolId,
            name: enquiry.parentName,
            email: parentEmail,
            phone: enquiry.parentPhone,
            passwordHash: parentHash,
            userType: "PARENT",
            parentProfile: {
              create: {
                address: enquiry.address || "Address not provided",
              },
            },
          },
          include: { parentProfile: true },
        });
      }

      const parentProfile = parentUser.parentProfile || await tx.parentProfile.findUnique({
        where: { userId: parentUser.id },
      });

      // 2. Create Student user & profile
      const studentEmail = enquiry.studentEmail || `student_${enquiry.parentPhone}_${Date.now()}@school.erp`;
      const studentHash = await bcrypt.hash("Student@123", 10);

      const studentUser = await tx.user.create({
        data: {
          schoolId: data.schoolId,
          name: enquiry.studentName,
          email: studentEmail,
          phone: enquiry.studentPhone || null,
          passwordHash: studentHash,
          userType: "STUDENT",
        },
      });

      const studentProfile = await tx.studentProfile.create({
        data: {
          userId: studentUser.id,
          classId: data.classId,
          rollNumber: data.rollNumber,
          parentId: parentProfile?.id || null,
          documentsPending: data.documentsChecklist
            ? Object.values(data.documentsChecklist).some((v) => !v)
            : true,
          documentsChecklist: data.documentsChecklist || null,
          status: "CURRENT",
          customFields: enquiry.customFields || null,
        },
      });

      // 3. Update the enquiry status
      await tx.admissionEnquiry.update({
        where: { id: enquiryId },
        data: {
          status: "ADMITTED",
          createdStudentId: studentProfile.id,
          createdParentId: parentProfile?.id || null,
        },
      });

      return {
        studentUser,
        studentProfile,
        parentUser,
      };
    });

    revalidatePath("/[domain]/(dashboard)/admin/admissions", "page");

    // Send welcome credentials notification
    const school = await db.school.findUnique({ where: { id: data.schoolId }, select: { name: true } });
    await sendWelcomeCredentials({
      schoolName: school?.name || "School",
      studentName: enquiry.studentName,
      parentName: enquiry.parentName,
      parentPhone: enquiry.parentPhone,
      parentEmail: enquiry.parentEmail,
      studentLoginId: result.studentUser.email,
      studentPassword: "Student@123",
      parentLoginId: result.parentUser.email,
      parentPassword: "Parent@123",
    });

    return {
      success: true,
      data: result,
      message: `${enquiry.studentName} has been successfully admitted with Roll No. ${data.rollNumber}!`,
    };
  } catch (error: any) {
    console.error("Error approving admission:", error);
    if (error.code === "P2002") {
      return { error: "This roll number is already taken in this class. Please choose another." };
    }
    return { error: error.message || "Failed to approve admission." };
  }
}

// ─────────────────────────────────────────────
// 7. ADMIN: Get school info by subdomain (for public form)
// ─────────────────────────────────────────────
export async function getSchoolBySubdomain(subdomain: string) {
  try {
    const school = await db.school.findUnique({
      where: { subdomain },
      select: {
        id: true,
        name: true,
        logo: true,
        address: true,
      },
    });

    if (!school) {
      return { error: "School not found." };
    }

    return { success: true, data: school };
  } catch (error: any) {
    return { error: error.message || "Failed to fetch school." };
  }
}

// ─────────────────────────────────────────────
// 8. ADMIN: Bulk Import & Direct Admit
// ─────────────────────────────────────────────
export async function bulkAdmitStudents(
  schoolId: string,
  students: {
    studentName: string;
    dob: string;
    gender: string;
    parentName: string;
    parentPhone: string;
    parentEmail?: string;
    classId: string;
    rollNumber: number;
  }[]
) {
  try {
    if (!students || students.length === 0) {
      return { error: "No students to import." };
    }

    const school = await db.school.findUnique({
      where: { id: schoolId },
      select: { name: true },
    });

    let admitted = 0;
    const errors: string[] = [];

    for (const student of students) {
      try {
        await db.$transaction(async (tx: any) => {
          // 1. Create or find Parent
          let parentUser = await tx.user.findFirst({
            where: {
              schoolId,
              phone: student.parentPhone,
              userType: "PARENT",
            },
          });

          if (!parentUser) {
            const parentEmail = student.parentEmail || `parent_${student.parentPhone}@school.erp`;
            const parentHash = await bcrypt.hash("Parent@123", 10);
            parentUser = await tx.user.create({
              data: {
                schoolId,
                name: student.parentName,
                email: parentEmail,
                phone: student.parentPhone,
                passwordHash: parentHash,
                userType: "PARENT",
              },
            });
            await tx.parentProfile.create({
              data: { userId: parentUser.id, address: null },
            });
          }

          const parentProfile = await tx.parentProfile.findUnique({
            where: { userId: parentUser.id },
          });

          // 2. Create Student
          const studentEmail = `student_${student.parentPhone}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}@school.erp`;
          const studentHash = await bcrypt.hash("Student@123", 10);

          const studentUser = await tx.user.create({
            data: {
              schoolId,
              name: student.studentName,
              email: studentEmail,
              phone: null,
              passwordHash: studentHash,
              userType: "STUDENT",
            },
          });

          await tx.studentProfile.create({
            data: {
              userId: studentUser.id,
              classId: student.classId,
              rollNumber: student.rollNumber,
              parentId: parentProfile?.id || null,
              documentsPending: true,
              documentsChecklist: { tc: false, marksheet: false, photo: false, aadhar: false, birth_cert: false },
              status: "CURRENT",
            },
          });

          // 3. Send notification
          await sendWelcomeCredentials({
            schoolName: school?.name || "School",
            studentName: student.studentName,
            parentName: student.parentName,
            parentPhone: student.parentPhone,
            parentEmail: student.parentEmail,
            studentLoginId: studentUser.email,
            studentPassword: "Student@123",
            parentLoginId: parentUser.email,
            parentPassword: "Parent@123",
          });
        });

        admitted++;
      } catch (err: any) {
        errors.push(`${student.studentName}: ${err.message}`);
      }
    }

    revalidatePath("/[domain]/(dashboard)/admin/admissions", "page");
    return {
      success: true,
      data: { admitted, total: students.length, errors },
      message: `${admitted} out of ${students.length} students admitted successfully!`,
    };
  } catch (error: any) {
    console.error("Bulk admit error:", error);
    return { error: error.message || "Bulk import failed." };
  }
}
