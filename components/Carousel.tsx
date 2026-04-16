'use client'
import React, { useEffect, useState, useRef } from "react";
import Image from "next/image";

export interface CarouselSlide {
  image: string;
  title: string;
  description: string;
}

interface CarouselProps {
  slides: CarouselSlide[];
}

const Carousel: React.FC<CarouselProps> = ({ slides }) => {
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!paused) {
      timeoutRef.current = setTimeout(() => {
        setCurrent((prev) => (prev + 1) % slides.length);
      }, 4500);
    }
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [current, paused, slides.length]);

  return (
    <div
      className="relative w-full h-96 lg:h-full rounded-lg overflow-hidden shadow-lg animate-fade-in"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      tabIndex={0}
      aria-label="Image carousel"
    >
      {slides.map((slide, idx) => (
        <div
          key={idx}
          className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${idx === current ? "opacity-100 z-10" : "opacity-0 z-0"}`}
          aria-hidden={idx !== current}
        >
          <Image
            src={slide.image}
            alt={slide.title}
            fill
            className="object-cover object-center"
            priority={idx === 0}
            sizes="(max-width: 1024px) 100vw, 50vw"
          />
          <div className="absolute inset-0 bg-black/40 flex flex-col justify-end p-8">
            <h2 className="text-white text-2xl font-bold mb-2 drop-shadow-lg">{slide.title}</h2>
            <p className="text-white text-base drop-shadow-lg">{slide.description}</p>
          </div>
        </div>
      ))}
      {/* Dots */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-20">
        {slides.map((_, idx) => (
          <button
            key={idx}
            className={`w-3 h-3 rounded-full border border-white transition bg-white/60 ${idx === current ? "bg-blue-600 border-blue-600" : "hover:bg-blue-400"}`}
            aria-label={`Go to slide ${idx + 1}`}
            aria-current={idx === current}
            onClick={() => setCurrent(idx)}
          />
        ))}
      </div>
    </div>
  );
};

export default Carousel;
