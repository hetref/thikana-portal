const Hero = () => (
    <div className="flex justify-between items-center px-6 py-16">
      <div className="w-1/2">
        <h1 className="text-5xl font-bold leading-tight mb-6">
          Navigating the digital landscape for success
        </h1>
        <p className="text-gray-600 mb-8">
          Our digital marketing agency helps businesses grow and succeed online through a range of 
          services including SEO, PPC, social media marketing, and content creation.
        </p>
        <button className="bg-black text-white px-6 py-3 rounded-full">
          Book a consultation
        </button>
      </div>
      <div className="w-1/2 flex justify-center">
        {/* Skeleton for megaphone illustration */}
        <div className="relative">
          <div className="w-64 h-64 bg-gray-200 rounded-full animate-pulse" />
          <div className="absolute top-0 right-0 flex space-x-2">
            {/* Skeleton for floating icons */}
            <div className="w-8 h-8 bg-gray-300 rounded-full animate-pulse" />
            <div className="w-8 h-8 bg-gray-300 rounded-full animate-pulse" />
            <div className="w-8 h-8 bg-gray-300 rounded-full animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  );
  export default Hero;
