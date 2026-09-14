-- CreateEnum
CREATE TYPE "Role" AS ENUM ('MASTER_ADMIN', 'SUPER_ADMIN', 'ADMIN_STAFF', 'TEACHER', 'STUDENT', 'PARENT', 'ACCOUNTANT', 'LIBRARIAN', 'STORE_MANAGER');

-- CreateEnum
CREATE TYPE "BookStatus" AS ENUM ('AVAILABLE', 'ISSUED', 'LOST');

-- CreateEnum
CREATE TYPE "PaymentMode" AS ENUM ('CASH', 'UPI', 'ONLINE', 'CHEQUE');

-- CreateEnum
CREATE TYPE "ScheduleType" AS ENUM ('EXAM', 'HOLIDAY', 'EVENT');

-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('PRESENT', 'ABSENT', 'LATE', 'HALF_DAY');

-- CreateEnum
CREATE TYPE "ExamType" AS ENUM ('UNIT_TEST', 'MID_TERM', 'FINAL');

-- CreateEnum
CREATE TYPE "FeeType" AS ENUM ('TUITION', 'TRANSPORT', 'LIBRARY', 'SPORTS');

-- CreateEnum
CREATE TYPE "FeeFrequency" AS ENUM ('MONTHLY', 'QUARTERLY', 'ANNUAL');

-- CreateEnum
CREATE TYPE "FeeStatus" AS ENUM ('PAID', 'PARTIAL', 'PENDING', 'OVERDUE');

-- CreateEnum
CREATE TYPE "LeaveType" AS ENUM ('SICK', 'CASUAL', 'PERSONAL');

-- CreateEnum
CREATE TYPE "LeaveStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "AdmissionStatus" AS ENUM ('ENQUIRY', 'APPLIED', 'ADMITTED', 'REJECTED');

-- CreateEnum
CREATE TYPE "AdmissionSource" AS ENUM ('MANUAL', 'QR_CODE', 'BULK_IMPORT');

-- CreateEnum
CREATE TYPE "AdmissionFeeStatus" AS ENUM ('PAID', 'PARTIAL', 'PENDING', 'WAIVED');

-- CreateTable
CREATE TABLE "School" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "logo" TEXT,
    "address" TEXT,
    "contact" TEXT,
    "subscriptionPlan" TEXT NOT NULL DEFAULT 'FREE',
    "academicYearStart" TIMESTAMP(3) NOT NULL,
    "academicYearEnd" TIMESTAMP(3) NOT NULL,
    "settings" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "School_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "profileImage" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Class" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "section" TEXT NOT NULL,
    "academicYear" TEXT NOT NULL,

    CONSTRAINT "Class_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubjectMaster" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,

    CONSTRAINT "SubjectMaster_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subject" (
    "id" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "subjectMasterId" TEXT NOT NULL,

    CONSTRAINT "Subject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClassTeacher" (
    "id" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "isClassTeacher" BOOLEAN NOT NULL DEFAULT false,
    "assignedBy" TEXT NOT NULL,

    CONSTRAINT "ClassTeacher_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TimetablePeriod" (
    "id" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "dayOfWeek" TEXT NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "room" TEXT,
    "isAiGenerated" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "TimetablePeriod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AcademicSchedule" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "type" "ScheduleType" NOT NULL,
    "description" TEXT,

    CONSTRAINT "AcademicSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Syllabus" (
    "id" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "academicYear" TEXT NOT NULL,
    "topics" JSONB NOT NULL,
    "uploadedBy" TEXT NOT NULL,

    CONSTRAINT "Syllabus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeacherProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "empId" TEXT,
    "qualification" TEXT,

    CONSTRAINT "TeacherProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "rollNumber" INTEGER NOT NULL,
    "parentId" TEXT,
    "virtualAccountId" TEXT,

    CONSTRAINT "StudentProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ParentProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "address" TEXT,

    CONSTRAINT "ParentProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TransportStaff" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "licenseNumber" TEXT,
    "aadharNumber" TEXT,
    "experienceYears" INTEGER,
    "policeVerified" BOOLEAN NOT NULL DEFAULT false,
    "role" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "TransportStaff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Attendance" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "status" "AttendanceStatus" NOT NULL,
    "markedBy" TEXT NOT NULL,
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Attendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Exam" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "totalMarks" INTEGER NOT NULL,
    "passingMarks" INTEGER NOT NULL,
    "type" "ExamType" NOT NULL,

    CONSTRAINT "Exam_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Result" (
    "id" TEXT NOT NULL,
    "examId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "marksObtained" DOUBLE PRECISION NOT NULL,
    "grade" TEXT,
    "remarks" TEXT,
    "uploadedBy" TEXT NOT NULL,

    CONSTRAINT "Result_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Homework" (
    "id" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "dueDate" DATE NOT NULL,
    "attachments" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Homework_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vehicle" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "busNumber" TEXT NOT NULL,
    "capacity" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "driverId" TEXT,

    CONSTRAINT "Vehicle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Route" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "stops" JSONB NOT NULL,
    "conductorId" TEXT,

    CONSTRAINT "Route_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeeStructure" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "academicYear" TEXT NOT NULL,
    "feeType" "FeeType" NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "dueDate" DATE NOT NULL,
    "frequency" "FeeFrequency" NOT NULL,
    "lateFeePerDay" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "FeeStructure_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeePayment" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "feeStructureId" TEXT NOT NULL,
    "amountPaid" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "paymentDate" TIMESTAMP(3),
    "paymentMethod" TEXT,
    "transactionId" TEXT,
    "receiptNumber" TEXT,
    "status" "FeeStatus" NOT NULL DEFAULT 'PENDING',
    "onlineReceiptUrl" TEXT,

    CONSTRAINT "FeePayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Expense" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "description" TEXT,
    "date" DATE NOT NULL,
    "approvedBy" TEXT,
    "receiptAttachment" TEXT,

    CONSTRAINT "Expense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notice" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "targetRoles" JSONB,
    "targetClasses" JSONB,
    "publishedBy" TEXT NOT NULL,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "publishDate" TIMESTAMP(3),
    "attachments" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeaveApplication" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "leaveType" "LeaveType" NOT NULL,
    "role" "Role" NOT NULL,
    "fromDate" DATE NOT NULL,
    "toDate" DATE NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "LeaveStatus" NOT NULL DEFAULT 'PENDING',
    "approvedBy" TEXT,
    "aiSubstituteSuggestion" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeaveApplication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdmissionEnquiry" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "studentName" TEXT NOT NULL,
    "dob" DATE NOT NULL,
    "gender" TEXT NOT NULL,
    "parentName" TEXT NOT NULL,
    "parentPhone" TEXT NOT NULL,
    "parentEmail" TEXT,
    "previousSchool" TEXT,
    "previousClass" TEXT,
    "appliedForClass" TEXT NOT NULL,
    "source" "AdmissionSource" NOT NULL DEFAULT 'MANUAL',
    "status" "AdmissionStatus" NOT NULL DEFAULT 'ENQUIRY',
    "documents" JSONB,
    "documentsPending" BOOLEAN NOT NULL DEFAULT true,
    "admissionFeeStatus" "AdmissionFeeStatus" NOT NULL DEFAULT 'PENDING',
    "admissionFeeAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "admissionFeePaid" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "admissionFeeDiscount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "admissionFeeDiscountReason" TEXT,
    "notes" TEXT,
    "siblingStudentId" TEXT,
    "createdStudentId" TEXT,
    "createdParentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdmissionEnquiry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Book" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "isbn" TEXT,
    "title" TEXT NOT NULL,
    "author" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "totalCopies" INTEGER NOT NULL DEFAULT 1,
    "availableCopies" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Book_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookCopy" (
    "id" TEXT NOT NULL,
    "bookId" TEXT NOT NULL,
    "barcodeId" TEXT NOT NULL,
    "status" "BookStatus" NOT NULL DEFAULT 'AVAILABLE',

    CONSTRAINT "BookCopy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookIssue" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "copyId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "issueDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "returnDate" TIMESTAMP(3),
    "fineAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "finePaid" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "BookIssue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryItem" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "variant" TEXT,
    "price" DOUBLE PRECISION NOT NULL,
    "stockCount" INTEGER NOT NULL DEFAULT 0,
    "lowStockAlert" INTEGER NOT NULL DEFAULT 5,

    CONSTRAINT "InventoryItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StoreSale" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "studentId" TEXT,
    "parentPhone" TEXT,
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "paymentMode" "PaymentMode" NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PAID',
    "receiptUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StoreSale_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SaleItem" (
    "id" TEXT NOT NULL,
    "saleId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "SaleItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StaffSalary" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "baseSalary" DOUBLE PRECISION NOT NULL,
    "hra" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "allowances" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "pfDeduction" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "tdsDeduction" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "StaffSalary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payslip" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "salaryId" TEXT NOT NULL,
    "monthYear" TEXT NOT NULL,
    "payableDays" INTEGER NOT NULL,
    "grossSalary" DOUBLE PRECISION NOT NULL,
    "totalDeductions" DOUBLE PRECISION NOT NULL,
    "netSalary" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'GENERATED',
    "pdfUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Payslip_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IssuedCertificate" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "qrHash" TEXT NOT NULL,
    "pdfUrl" TEXT NOT NULL,
    "issuedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IssuedCertificate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReportCard" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "term" TEXT NOT NULL,
    "totalMarks" DOUBLE PRECISION NOT NULL,
    "percentage" DOUBLE PRECISION NOT NULL,
    "grade" TEXT NOT NULL,
    "aiRemarks" TEXT,
    "pdfUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReportCard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComplianceExportLog" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "requestedBy" TEXT NOT NULL,
    "reportType" TEXT NOT NULL,
    "academicYear" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "downloadUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ComplianceExportLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_schoolId_role_idx" ON "User"("schoolId", "role");

-- CreateIndex
CREATE INDEX "User_schoolId_email_idx" ON "User"("schoolId", "email");

-- CreateIndex
CREATE UNIQUE INDEX "Class_schoolId_name_section_academicYear_key" ON "Class"("schoolId", "name", "section", "academicYear");

-- CreateIndex
CREATE UNIQUE INDEX "SubjectMaster_schoolId_code_key" ON "SubjectMaster"("schoolId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "ClassTeacher_teacherId_classId_subjectId_key" ON "ClassTeacher"("teacherId", "classId", "subjectId");

-- CreateIndex
CREATE UNIQUE INDEX "TimetablePeriod_classId_dayOfWeek_startTime_key" ON "TimetablePeriod"("classId", "dayOfWeek", "startTime");

-- CreateIndex
CREATE UNIQUE INDEX "Syllabus_classId_subjectId_academicYear_key" ON "Syllabus"("classId", "subjectId", "academicYear");

-- CreateIndex
CREATE UNIQUE INDEX "TeacherProfile_userId_key" ON "TeacherProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "StudentProfile_userId_key" ON "StudentProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "StudentProfile_virtualAccountId_key" ON "StudentProfile"("virtualAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "StudentProfile_classId_rollNumber_key" ON "StudentProfile"("classId", "rollNumber");

-- CreateIndex
CREATE UNIQUE INDEX "ParentProfile_userId_key" ON "ParentProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Attendance_studentId_date_key" ON "Attendance"("studentId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "Result_examId_studentId_key" ON "Result"("examId", "studentId");

-- CreateIndex
CREATE UNIQUE INDEX "FeePayment_receiptNumber_key" ON "FeePayment"("receiptNumber");

-- CreateIndex
CREATE UNIQUE INDEX "FeePayment_studentId_feeStructureId_key" ON "FeePayment"("studentId", "feeStructureId");

-- CreateIndex
CREATE INDEX "AdmissionEnquiry_schoolId_status_idx" ON "AdmissionEnquiry"("schoolId", "status");

-- CreateIndex
CREATE INDEX "AdmissionEnquiry_schoolId_parentPhone_idx" ON "AdmissionEnquiry"("schoolId", "parentPhone");

-- CreateIndex
CREATE INDEX "AdmissionEnquiry_schoolId_source_idx" ON "AdmissionEnquiry"("schoolId", "source");

-- CreateIndex
CREATE UNIQUE INDEX "BookCopy_barcodeId_key" ON "BookCopy"("barcodeId");

-- CreateIndex
CREATE UNIQUE INDEX "IssuedCertificate_qrHash_key" ON "IssuedCertificate"("qrHash");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Class" ADD CONSTRAINT "Class_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubjectMaster" ADD CONSTRAINT "SubjectMaster_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subject" ADD CONSTRAINT "Subject_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subject" ADD CONSTRAINT "Subject_subjectMasterId_fkey" FOREIGN KEY ("subjectMasterId") REFERENCES "SubjectMaster"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassTeacher" ADD CONSTRAINT "ClassTeacher_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "TeacherProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassTeacher" ADD CONSTRAINT "ClassTeacher_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimetablePeriod" ADD CONSTRAINT "TimetablePeriod_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimetablePeriod" ADD CONSTRAINT "TimetablePeriod_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimetablePeriod" ADD CONSTRAINT "TimetablePeriod_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "TeacherProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcademicSchedule" ADD CONSTRAINT "AcademicSchedule_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Syllabus" ADD CONSTRAINT "Syllabus_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Syllabus" ADD CONSTRAINT "Syllabus_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherProfile" ADD CONSTRAINT "TeacherProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentProfile" ADD CONSTRAINT "StudentProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentProfile" ADD CONSTRAINT "StudentProfile_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentProfile" ADD CONSTRAINT "StudentProfile_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "ParentProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParentProfile" ADD CONSTRAINT "ParentProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransportStaff" ADD CONSTRAINT "TransportStaff_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Exam" ADD CONSTRAINT "Exam_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Exam" ADD CONSTRAINT "Exam_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Result" ADD CONSTRAINT "Result_examId_fkey" FOREIGN KEY ("examId") REFERENCES "Exam"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Result" ADD CONSTRAINT "Result_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "StudentProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Homework" ADD CONSTRAINT "Homework_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Homework" ADD CONSTRAINT "Homework_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "TransportStaff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Route" ADD CONSTRAINT "Route_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Route" ADD CONSTRAINT "Route_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Route" ADD CONSTRAINT "Route_conductorId_fkey" FOREIGN KEY ("conductorId") REFERENCES "TransportStaff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeeStructure" ADD CONSTRAINT "FeeStructure_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeePayment" ADD CONSTRAINT "FeePayment_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "StudentProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeePayment" ADD CONSTRAINT "FeePayment_feeStructureId_fkey" FOREIGN KEY ("feeStructureId") REFERENCES "FeeStructure"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notice" ADD CONSTRAINT "Notice_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notice" ADD CONSTRAINT "Notice_publishedBy_fkey" FOREIGN KEY ("publishedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaveApplication" ADD CONSTRAINT "LeaveApplication_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdmissionEnquiry" ADD CONSTRAINT "AdmissionEnquiry_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Book" ADD CONSTRAINT "Book_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookCopy" ADD CONSTRAINT "BookCopy_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookIssue" ADD CONSTRAINT "BookIssue_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookIssue" ADD CONSTRAINT "BookIssue_copyId_fkey" FOREIGN KEY ("copyId") REFERENCES "BookCopy"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookIssue" ADD CONSTRAINT "BookIssue_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "StudentProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryItem" ADD CONSTRAINT "InventoryItem_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoreSale" ADD CONSTRAINT "StoreSale_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoreSale" ADD CONSTRAINT "StoreSale_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "StudentProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleItem" ADD CONSTRAINT "SaleItem_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "StoreSale"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleItem" ADD CONSTRAINT "SaleItem_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "InventoryItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffSalary" ADD CONSTRAINT "StaffSalary_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffSalary" ADD CONSTRAINT "StaffSalary_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payslip" ADD CONSTRAINT "Payslip_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payslip" ADD CONSTRAINT "Payslip_salaryId_fkey" FOREIGN KEY ("salaryId") REFERENCES "StaffSalary"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IssuedCertificate" ADD CONSTRAINT "IssuedCertificate_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IssuedCertificate" ADD CONSTRAINT "IssuedCertificate_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "StudentProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportCard" ADD CONSTRAINT "ReportCard_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportCard" ADD CONSTRAINT "ReportCard_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "StudentProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplianceExportLog" ADD CONSTRAINT "ComplianceExportLog_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
