import { Link, useLocation } from 'react-router-dom'
import { COLORS } from '../constants/theme'

function Navbar() {
  const location = useLocation();

  return (
    <nav className="bg-white shadow-lg">
      <div className="container mx-auto px-4">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="text-xl font-bold" style={{ color: COLORS.brand }}>
              <span className="text-xl font-bold">Keva Onchain Blog</span>
            </Link>
          </div>
          <div className="flex items-center space-x-4">
            <Link
              to="/"
              className={`px-3 py-2 rounded-md text-sm transition-colors ${
                location.pathname === '/' ? 'font-bold' : 'font-medium'
              }`}
              style={{
                color: location.pathname === '/' ? COLORS.brand : '#4B5563',
              }}
            >
              Home
            </Link>
            <Link
              to="/about"
              className={`px-3 py-2 rounded-md text-sm transition-colors ${
                location.pathname === '/about' ? 'font-bold' : 'font-medium'
              }`}
              style={{
                color: location.pathname === '/about' ? COLORS.brand : '#4B5563',
              }}
            >
              About
            </Link>
          </div>
        </div>
      </div>
    </nav>
  )
}

export default Navbar 