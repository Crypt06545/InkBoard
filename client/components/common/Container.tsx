import type { ReactNode } from "react";

type ContainerProps = {
  children: ReactNode;
  className?: string;
};

/** One shared page container: max width + px-6 on mobile, px-8 from md up. */
const Container = ({ children, className = "" }: ContainerProps) => (
  <div className={`mx-auto w-full max-w-6xl px-6 md:px-8 ${className}`}>
    {children}
  </div>
);

export default Container;
