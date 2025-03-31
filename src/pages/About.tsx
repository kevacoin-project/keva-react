import { Link } from 'react-router-dom';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';

function About() {
  return (
    <div className="max-w-4xl mx-auto p-4">
      <Link
        to="/"
        className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
      >
        <ArrowLeftIcon className="h-5 w-5 mr-1" />
        Back to Posts
      </Link>
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-2xl font-bold mb-4">About</h1>
        <p className="text-gray-700 mb-4">
          Keva Onchain Blog is a decentralized blogging platform built on the Kevacoin blockchain. It enables users to read and interact with blockchain-hosted content, demonstrating the power of decentralized content storage and retrieval.
        </p>
        <p className="text-gray-700">
          The source code for this web application is available on{' '}
          <a
            href="https://github.com/kevacoin-project/keva-react"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 underline"
          >
            GitHub
          </a>
          .
        </p>
      </div>
    </div>
  );
}

export default About; 