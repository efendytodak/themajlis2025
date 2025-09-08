import React from 'react';
import { Facebook, Instagram, Search, ArrowRight } from 'lucide-react';
import IslamicQuotes from './IslamicQuotes';
import MajlisGrid from './MajlisGrid';

const HomePage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section with Floating Pictures Slider */}
      <section className="py-20 px-6">
        <div className="container mx-auto text-center">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-7xl font-bold text-gray-900 mb-0 leading-tight">
             the
              <span className="~`` text-emerald-600">majlis</span>
            </h1>
            <p className="text-l font-medium text-gray-600 mb-1 max-w-2xl mx-auto leading-relaxed">
              Gerbang Taman Syurga Anda <span className="~`` text-emerald-600">#themajlis</span>
              <br />
              بَابُ رَوْضَةٍ مِنْ رِيَاضِ الْجَنَّةِ
            </p>
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