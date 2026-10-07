import type { Metadata } from "next";
import Dashboard from "./Dashboard";

export const metadata: Metadata = {
  title: "Your boards · Inkboard",
};

const DashboardPage = () => {
  return <Dashboard />;
};

export default DashboardPage;
