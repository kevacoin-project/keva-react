import React from 'react'

function About() {
  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-4xl font-bold text-gray-900 mb-8">About</h1>
      <div className="prose lg:prose-xl">
        <p className="text-lg text-gray-700 mb-6">
          This is a modern Single Page Application (SPA) built with React and
          other cutting-edge technologies. It demonstrates best practices in React
          development, including:
        </p>
        <ul className="list-disc list-inside space-y-2 text-gray-700">
          <li>Component-based architecture</li>
          <li>Modern React hooks and patterns</li>
          <li>Type-safe development with TypeScript</li>
          <li>Responsive design with Tailwind CSS</li>
          <li>Client-side routing</li>
        </ul>
      </div>
    </div>
  )
}

export default About 