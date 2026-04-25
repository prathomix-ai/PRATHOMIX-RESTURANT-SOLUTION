import { Suspense } from 'react';
import Navbar from '@/components/Navbar';
import ChatInterface from '@/components/ChatInterface';
import HeroSection from '@/components/HeroSection';
import FeaturedMenu from '@/components/FeaturedMenu';
import BookingBanner from '@/components/BookingBanner';

export default function HomePage() {
  return (
    <>
      <Navbar />
      <main className="pt-16">
        <HeroSection />
        <Suspense
          fallback={
            <div className="h-96 flex items-center justify-center">
              <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
            </div>
          }>
          <FeaturedMenu />
        </Suspense>
        <BookingBanner />
      </main>
      <ChatInterface />
    </>
  );
}
