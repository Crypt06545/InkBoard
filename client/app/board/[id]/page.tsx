import type { Metadata } from "next";
import CanvasPage from "./CanvasPage";


export const metadata: Metadata = {
  title: "Canvas · Inkboard",
};

const BoardPage = () => {
  return <CanvasPage />;
};

export default BoardPage;
