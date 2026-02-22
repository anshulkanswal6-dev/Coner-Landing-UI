import React from "react";
import { cn } from "../lib/utils";

export const NoiseBackground = ({
    children,
    className,
    containerClassName,
    gradientColors = ["rgb(108, 99, 255)", "rgb(150, 100, 255)", "rgb(100, 150, 255)", "rgba(243, 136, 48, 1)"],
}) => {
    return (
        <div
            className={cn(
                "relative overflow-hidden",
                containerClassName
            )}
        >
            <div
                className="absolute inset-0 z-0 opacity-30 blur-[2px] pointer-events-none"
                style={{
                    background: `linear-gradient(to right, ${gradientColors.join(", ")})`,
                    backgroundSize: "200% 200%",
                    animation: "gradient 5s ease infinite",
                }}
            />
            <div
                className="absolute inset-0 z-1 pointer-events-none opacity-20"
                style={{
                    backgroundImage: `url("https://grainy-gradients.vercel.app/noise.svg")`,
                    backgroundSize: "100px 100px",
                }}
            />
            <div className={cn("relative z-10", className)}>{children}</div>
            <style>{`
        @keyframes gradient {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
      `}</style>
        </div>
    );
};
