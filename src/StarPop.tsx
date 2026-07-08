import { motion } from 'motion/react';

interface StarProps {
  x: number;
  y: number;
  key?: string | number;
}

export function StarPop({ x, y }: StarProps) {
  // Gerar 12 partículas de brilho com ângulos aleatórios
  const particles = Array.from({ length: 12 });

  return (
    <div className="absolute pointer-events-none z-50" style={{ top: y, left: x }}>
      {particles.map((_, index) => {
        // Ângulo e distância aleatórios para cada partícula voar
        const angle = (index * 360) / particles.length + Math.random() * 20;
        const distance = 60 + Math.random() * 60;
        const radian = (angle * Math.PI) / 180;
        
        const targetX = Math.cos(radian) * distance;
        const targetY = Math.sin(radian) * distance;

        return (
          <motion.span
            key={index}
            className="absolute text-yellow-300 text-lg selection:bg-transparent flex justify-center items-center"
            initial={{ x: 0, y: 0, scale: 0.2, opacity: 1 }}
            animate={{
              x: targetX,
              y: targetY,
              scale: [1, 1.2, 0],
              opacity: [1, 1, 0],
              rotate: Math.random() * 360,
            }}
            transition={{
              duration: 0.6,
              ease: "easeOut",
            }}
          >
            ✨
          </motion.span>
        );
      })}
    </div>
  );
}
