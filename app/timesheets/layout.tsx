import { Metadata } from "next";
import Sidebar from "@/components/kokonutui/sidebar";
import { ThemeProvider } from "@/components/theme-provider";

export const metadata: Metadata = {
  title: "Табель учета рабочего времени",
  description: "Учет рабочего времени сотрудников",
};

export default function TimesheetsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="flex-1 overflow-auto">
          {children}
        </div>
      </div>
    </ThemeProvider>
  );
}
