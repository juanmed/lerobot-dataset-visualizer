import type { Metadata } from "next";
import { Inter } from "next/font/google";
import ManifestDatasetInit from "@/components/manifest-dataset-init";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "LeRobot Dataset Tool and Visualizer",
  description: "Tool and Visualizer for LeRobot Datasets",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ManifestDatasetInit />
        {children}
      </body>
    </html>
  );
}
