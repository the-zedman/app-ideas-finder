export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <img 
                src="/App Ideas Finder - logo - 200x200.png" 
                alt="App Ideas Finder" 
                className="h-8 w-8 rounded-lg"
              />
              <span className="text-xl font-bold text-gray-900">APP IDEAS FINDER</span>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left Column - Text */}
          <div>
            <h1 className="text-gray-900 mb-6 text-5xl lg:text-6xl font-black leading-tight">
              The super fast app ideas generator!
            </h1>
            <p className="text-lg text-gray-600 mb-8">
              Discover your next app idea by analyzing real user feedback from the App Store. Get insights in seconds, not weeks.
            </p>
          </div>
          
          {/* Right Column - Image */}
          <div className="hidden lg:block">
            <img 
              src="/ideas-devices-compressed.png" 
              alt="App Ideas Finder on devices" 
              className="w-full h-auto"
            />
          </div>
        </div>
      </section>
    </div>
  );
}
