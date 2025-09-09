import React from 'react';
import { Facebook, Instagram, Search, ArrowRight } from 'lucide-react';
import IslamicQuotes from './IslamicQuotes';
import MajlisGrid from './MajlisGrid';

const HomePage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section with Floating Pictures Slider */}
      <section className="py-5 px-5">
        <div className="container mx-auto text-center">
          <div className="max-w-4xl mx-auto">
            <img 
              src="/Head.png" 
              alt="The Majlis - Gerbang Taman Syurga Anda" 
              className="mx-auto max-w-full h-auto mb-4"
            />
          </div>
        </div>
      </section>

   
      {/* Islamic Quotes Section */}
      <IslamicQuotes />

    

      {/* Majlis Grid */}
      <MajlisGrid />
    </div>
  );
};

export default HomePage;