import React from "react";
import Image from "next/image";
import Link from "next/link";

const Banner: React.FC = () => {
  return (
    <section className="relative w-full min-h-[340px] md:min-h-[420px] flex items-center justify-center overflow-hidden rounded-lg shadow-lg mt-20 mb-8">
      <Image
        src="/elabp2.png"
        alt="Lab Banner"
        fill
        priority
        className="object-cover object-center w-full h-full opacity-80"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-blue-900/70 via-blue-700/40 to-blue-400/20" />
      <div className="relative z-10 flex flex-col items-center justify-center text-center px-4 py-12 w-full">
        <h1 className="text-3xl md:text-5xl font-bold text-white drop-shadow-lg mb-4">
      Lab Information Management System
        </h1>
        <p className="text-lg md:text-xl text-blue-100 mb-6 max-w-2xl mx-auto">
          Streamline your laboratory operations, manage patient data, and access results securely with our modern LIMS platform.
        </p>
        <Link href="/login">
          <button className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8 py-3 rounded-lg shadow transition text-lg">
            Get Started
          </button>
        </Link>
      </div>
    </section>
  );
};

export default Banner;
