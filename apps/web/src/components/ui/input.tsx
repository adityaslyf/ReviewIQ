import * as React from "react";

import { cn } from "@/lib/utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
	return (
		<input
			type={type}
			data-slot="input"
			className={cn(
				"bg-white text-gray-900 placeholder:text-gray-500 border-gray-300 flex h-9 w-full min-w-0 rounded-md border px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
				"focus-visible:border-blue-500 focus-visible:ring-blue-500/50 focus-visible:ring-[3px]",
				"aria-invalid:ring-red-500/20 aria-invalid:border-red-500",
				className,
			)}
			{...props}
		/>
	);
}

export { Input };
