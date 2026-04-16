import React from "react";
import LoginForm from "../../components/loginForm";
import Carousel from "../../components/Carousel";
import type { CarouselSlide } from "../../components/Carousel";

const slides: CarouselSlide[] = [
  {
    image: "/labp.jpg",
    title: "Fast, Reliable Results",
    description: "Get your lab results quickly and securely, anytime, anywhere."
  },
  {
    image: "/labp2.jpg",
    title: "Modern Lab Experience",
    description: "Experience seamless test ordering and tracking with our digital platform."
  },
  {
    image: "/labp3.webp",
    title: "Expert Care",
    description: "Our team of professionals ensures accuracy and confidentiality for every test."
  }
];

const LoginPage = () => {
  return (
    <main className="min-h-screen flex flex-col lg:flex-row bg-gray-50">
      {/* Left: Login Form */}
      <section className="w-full lg:w-1/2 flex items-center justify-center py-12 px-4 lg:px-12 bg-gray-50">
        <div className="w-full max-w-md">
          <LoginForm />
        </div>
      </section>
      {/* Right: Carousel */}
      <section className="w-full lg:w-1/2 hidden lg:flex items-center justify-center bg-blue-100 relative min-h-[320px] lg:min-h-screen">
        <div className="w-full h-96 lg:h-full p-8 flex items-center justify-center">
          <Carousel slides={slides} />
        </div>
      </section>
    </main>
  );
};

export default LoginPage;
