import { useParams, useNavigate } from 'react-router-dom';
import { HeartIcon, ShareIcon, ChatBubbleLeftIcon, ArrowLeftIcon } from '@heroicons/react/24/outline';
import { BlogPost } from '../types/blog';
import { useBlogStore } from '../store/blogStore';

function BlogPostPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { posts } = useBlogStore();
  
  const post = posts[Number(id)];

  if (!post) {
    return (
      <div className="max-w-4xl mx-auto p-4">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeftIcon className="h-5 w-5 mr-1" />
          Back to Posts
        </button>
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h1 className="text-2xl font-bold text-red-600">Post not found</h1>
          <p className="text-gray-600 mt-2">The requested post could not be found.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
      >
        <ArrowLeftIcon className="h-5 w-5 mr-1" />
        Back to Posts
      </button>
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex justify-between items-start mb-4">
          <h1 className="text-3xl font-bold">{post.title}</h1>
          <div className="text-sm text-gray-500 flex flex-col items-end">
            {post.time && (
              <span>{new Date(post.time * 1000).toLocaleString()}</span>
            )}
            {post.height && (
              <span>Block #{post.height}</span>
            )}
          </div>
        </div>
        <div className="prose max-w-none mb-6">
          <p className="text-gray-700 whitespace-pre-wrap">{post.content}</p>
        </div>
        <div className="flex items-center space-x-6 text-gray-500">
          <div className="flex items-center space-x-1">
            <HeartIcon className="h-5 w-5" />
            <span>{post.likes}</span>
          </div>
          <div className="flex items-center space-x-1">
            <ShareIcon className="h-5 w-5" />
            <span>{post.shares}</span>
          </div>
          <div className="flex items-center space-x-1">
            <ChatBubbleLeftIcon className="h-5 w-5" />
            <span>{post.replies}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default BlogPostPage; 