import type { Metadata } from "next";
import { CoursesPage } from "@/components/courses/CoursesPage";

export const metadata: Metadata = {
  title: "Opening courses | Knightly",
  description: "Learn a chess opening one line at a time, then keep it fresh with spaced practice, drills and timed runs.",
};

export default function Page() {
  return <CoursesPage />;
}
