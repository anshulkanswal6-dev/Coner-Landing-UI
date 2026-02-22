"use client";
import React, { useRef } from "react";
import { useScroll, useTransform, motion } from "motion/react";

export const ContainerScroll = ({
    titleComponent,
    children
}) => {
    const containerRef = useRef(null);
    const { scrollYProgress } = useScroll({
        target: containerRef,
    });
    const [isMobile, setIsMobile] = React.useState(false);

    React.useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth <= 768);
        };
        checkMobile();
        window.addEventListener("resize", checkMobile);
        return () => {
            window.removeEventListener("resize", checkMobile);
        };
    }, []);

    const scaleDimensions = () => {
        return isMobile ? [0.7, 0.9] : [1.05, 1];
    };

    const rotate = useTransform(scrollYProgress, [0, 1], [20, 0]);
    const scale = useTransform(scrollYProgress, [0, 1], scaleDimensions());
    const translate = useTransform(scrollYProgress, [0, 1], [0, -100]);

    return (
        <div
            className="h-[40rem] md:h-[55rem] flex items-center justify-center relative p-2 md:p-10"
            ref={containerRef}>
            <div
                className="py-10 md:py-20 w-full relative"
                style={{
                    perspective: "1000px",
                }}>
                <Header translate={translate} titleComponent={titleComponent} />
                <Card rotate={rotate} translate={translate} scale={scale}>
                    {children}
                </Card>
            </div>
        </div>
    );
};

export const Header = ({
    translate,
    titleComponent
}) => {
    if (!titleComponent) return null;
    return (
        <motion.div
            style={{
                translateY: translate,
            }}
            className="div max-w-5xl mx-auto text-center">
            {titleComponent}
        </motion.div>
    );
};

export const Card = ({
    rotate,
    scale,
    children
}) => {
    return (
        <motion.div
            style={{
                rotateX: rotate,
                scale,
            }}
            className="max-w-7xl mx-auto w-full">
            {children}
        </motion.div>
    );
};
