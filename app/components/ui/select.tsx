
import { type ComponentProps, useId } from "react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface SelectProps extends ComponentProps<"select"> {
  label: string;
  error?: string;
  options: { label: string; value: string }[];
  placeholder?: string;
  sideAction?: React.ReactNode;
}

export function Select({
  label,
  error,
  options,
  placeholder = "選択してください",
  className,
  sideAction,
  ...props
}: SelectProps) {
  const generatedId = useId();
  const selectId = props.id ?? generatedId;

  return (
    <div className="flex flex-col gap-1.5 w-full">
      <label
        htmlFor={selectId}
        className="text-base font-medium text-black"
      >
        {label}
      </label>
      <div className="flex gap-2 items-stretch">
        <div className="relative w-full">
          <select
            id={selectId}
            className={cn(
              "w-full rounded-md border border-green-500 bg-green-50 px-3 py-2 text-sm text-black placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50 appearance-none",
              error && "border-red-500 focus:ring-red-500 bg-red-50",
              className
            )}
            defaultValue=""
            {...props}
          >
            <option value="" disabled className="text-black">
              {placeholder}
            </option>
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
            <svg className="h-4 w-4 fill-current" viewBox="0 0 20 20">
              <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
            </svg>
          </div>
        </div>
        {sideAction && (
            <div className="flex-none flex items-center">
                {sideAction}
            </div>
        )}
      </div>
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
}
