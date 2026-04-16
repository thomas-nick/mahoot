import Link from "next/link";
import { notFound } from "next/navigation";
import { getCourseByDocumentId } from "@/lib/strapi";
import { EditCourseForm } from "./EditCourseForm";

export const dynamic = "force-dynamic";

type EditCoursePageProps = {
  params: Promise<{ documentId: string }>;
};

export default async function EditCoursePage({ params }: EditCoursePageProps) {
  const { documentId } = await params;
  const course = await getCourseByDocumentId(documentId);

  if (!course) {
    notFound();
  }

  return (
    <div className="space-y-5">
      <header className="space-y-2">
        <Link href={`/courses/${documentId}`} className="inline-block text-sm text-slate-600 hover:text-slate-900">
          ← Back to course
        </Link>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Edit Course</h1>
        <p className="text-sm text-slate-600">{course.name}</p>
      </header>
      <EditCourseForm course={course} />
    </div>
  );
}
