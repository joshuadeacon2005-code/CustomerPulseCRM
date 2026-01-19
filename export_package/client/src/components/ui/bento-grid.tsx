import { ReactNode } from "react";
import { ArrowRightIcon } from "@radix-ui/react-icons";

import { cn } from "@/lib/utils";

const BentoGrid = ({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) => {
  return (
    <div
      className={cn(
        "grid w-full auto-rows-[22rem] grid-cols-3 gap-4",
        className,
      )}
    >
      {children}
    </div>
  );
};

const BentoCard = ({
  name,
  className,
  background,
  Icon,
  description,
  href,
  cta,
}: {
  name: string;
  className: string;
  background: ReactNode;
  Icon: any;
  description: string;
  href: string;
  cta: string;
}) => (
  <a
    href={href}
    className={cn(
      "group relative col-span-3 flex flex-col justify-between overflow-hidden rounded-xl cursor-pointer",
      "bg-card border border-border hover-elevate",
      "transform-gpu dark:bg-card dark:border-border",
      "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
      className,
    )}
    data-testid={`bento-card-${name.toLowerCase().replace(/\s+/g, '-')}`}
  >
    <div>{background}</div>
    <div className="z-10 flex transform-gpu flex-col gap-1 p-6 transition-all duration-300 group-hover:-translate-y-2">
      <Icon className="h-12 w-12 origin-left transform-gpu text-primary transition-all duration-300 ease-in-out group-hover:scale-90" />
      <h3 className="text-xl font-semibold text-foreground">
        {name}
      </h3>
      <p className="max-w-lg text-muted-foreground">{description}</p>
    </div>

    <div
      className={cn(
        "absolute bottom-0 flex w-full transform-gpu flex-row items-center p-4 transition-all duration-300",
      )}
    >
      <span className="inline-flex items-center text-sm font-medium text-primary">
        {cta}
        <ArrowRightIcon className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
      </span>
    </div>
    <div className="pointer-events-none absolute inset-0 transform-gpu transition-all duration-300 group-hover:bg-primary/[.03] group-hover:dark:bg-primary/[.05]" />
  </a>
);

export { BentoCard, BentoGrid };
