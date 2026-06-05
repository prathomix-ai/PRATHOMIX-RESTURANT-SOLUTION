import { Suspense } from 'react';
import dynamic from 'next/dynamic';
import Navbar from '@/components/Navbar';
import HeroSection from '@/components/HeroSection';
import FeaturedMenu from '@/components/FeaturedMenu';
import BookingBanner from '@/components/BookingBanner';

const ChatInterface = dynamic(() => import('@/components/ChatInterface'), {
  ssr: false,
  loading: () => null,
});

export default function HomePage() {
  return (
    <>
      <Navbar />
      <main>
        <HeroSection />
        <Suspense
          fallback={
            <div className="h-96 flex items-center justify-center">
              <div className="w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
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
