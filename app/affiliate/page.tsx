import Link from 'next/link';
import Footer from '@/components/Footer';

export default function AffiliatePage() {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-14 sm:h-16">
            <Link href="/" className="flex items-center gap-2">
              <img 
                src="/App Ideas Finder - logo - 200x200.png" 
                alt="App Ideas Finder" 
                className="h-7 w-7 sm:h-8 sm:w-8 rounded-lg"
              />
              <span className="text-sm sm:text-lg lg:text-xl font-bold text-gray-900">APP IDEAS FINDER</span>
            </Link>
            <div className="flex items-center gap-3 sm:gap-6">
              <Link href="/pricing" className="text-gray-700 hover:text-gray-900 text-sm sm:text-base">Pricing</Link>
              <Link href="/contact" className="text-gray-700 hover:text-gray-900 text-sm sm:text-base">Contact</Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="text-center max-w-2xl">
          <div className="text-6xl mb-6">🚀</div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
            Affiliate Program
          </h1>
          <div className="inline-block bg-yellow-100 text-yellow-800 px-4 py-2 rounded-full text-sm font-semibold mb-6">
            COMING SOON
          </div>
          <p className="text-lg sm:text-xl text-gray-600 mb-8">
            We're working on an exciting affiliate program that will let you earn commissions 
            by sharing App Ideas Finder with fellow developers.
          </p>
          <p className="text-gray-500 mb-8">
            Want to be notified when it launches? Drop us a message!
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link 
              href="/contact" 
              className="bg-[#88D18A] hover:bg-[#88D18A]/90 text-white px-8 py-3 rounded-lg font-semibold transition-colors"
            >
              Contact Us
            </Link>
            <Link 
              href="/" 
              className="bg-gray-100 hover:bg-gray-200 text-gray-900 px-8 py-3 rounded-lg font-semibold transition-colors"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
