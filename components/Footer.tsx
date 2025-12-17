export default function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-300 py-12 mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start mb-8">
          <div>
            <h3 className="font-bold text-white mb-4">Company</h3>
            <ul className="space-y-2 text-sm">
              <li><a href="/pricing" className="hover:text-white">Pricing</a></li>
              <li><a href="/gallery" className="hover:text-white">App Showcase</a></li>
              <li><a href="/terms-of-service" className="hover:text-white">Terms of Service</a></li>
              <li><a href="/privacy-policy" className="hover:text-white">Privacy Policy</a></li>
              <li><a href="/contact" className="hover:text-white">Contact</a></li>
            </ul>
          </div>
          
          {/* Badges Section */}
          <div className="flex flex-col items-start md:items-end">
            <h3 className="font-bold text-white mb-4">Featured On</h3>
            <div className="flex flex-wrap gap-4">
              <a href="https://huzzler.so/products/J8grXvhghC/app-ideas-finder?utm_source=huzzler_product_website&utm_medium=badge&utm_campaign=badge" target="_blank" rel="noopener noreferrer" className="hover:opacity-80 transition-opacity">
                <img alt="Featured on Huzzler" src="https://huzzler.so/assets/images/embeddable-badges/featured.png" className="h-12" />
              </a>
              <a href="https://indiewait.com/waitlist/app-ideas-finder" target="_blank" rel="noopener noreferrer" className="hover:opacity-80 transition-opacity">
                <img alt="Featured on IndieWait" src="/featured-on-indiewait.png" className="h-12" />
              </a>
            </div>
          </div>
        </div>
        
        <div className="border-t border-gray-800 pt-8 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-sm text-center sm:text-left">© 2025 App Ideas Finder — elevating creators, one idea at a time.</p>
          <div className="flex gap-4">
            <a href="https://x.com/appideasfinder" target="_blank" rel="noopener noreferrer" className="hover:text-white">
              𝕏
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

