import { useEffect, useState } from "react";

export function AnimatedCounter({ value, duration = 1.5 }: { value: number, duration?: number }) {
    const [count, setCount] = useState(0);

    useEffect(() => {
        let startTime: number | null = null;
        let animationFrame: number;

        const animate = (timestamp: number) => {
            if (!startTime) startTime = timestamp;
            const progress = timestamp - startTime;
            const progressRatio = Math.min(progress / (duration * 1000), 1);

            const ease = 1 - Math.pow(1 - progressRatio, 3);

            setCount(Math.floor(ease * value));

            if (progressRatio < 1) {
                animationFrame = requestAnimationFrame(animate);
            } else {
                setCount(value);
            }
        };

        animationFrame = requestAnimationFrame(animate);

        return () => cancelAnimationFrame(animationFrame);
    }, [value, duration]);

    return <>{count}</>;
}
