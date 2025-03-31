import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import About from './pages/About'
import BlogPost from './pages/BlogPost'
import Navbar from './components/Navbar'
import { WebSocketProvider } from './contexts/WebSocketContext'

function App() {
  return (
    <WebSocketProvider>
      <Router>
        <div className="min-h-screen w-full bg-gray-50">
          <Navbar />
          <main className="container mx-auto px-4 py-8 h-full">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/about" element={<About />} />
              <Route path="/post/:id" element={<BlogPost />} />
            </Routes>
          </main>
        </div>
      </Router>
    </WebSocketProvider>
  )
}

export default App
