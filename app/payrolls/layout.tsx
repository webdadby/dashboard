import { Metadata } from "next";
import Sidebar from "@/components/kokonutui/sidebar";
import { ThemeProvider } from "@/components/theme-provider";

export const metadata: Metadata = {
  title: "Зарплаты",
  description: "Управление зарплатами сотрудников",
};

export default function PayrollsLayout({
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
        <div className="flex-1">{children}</div>
      </div>
    </ThemeProvider>
  );
}
