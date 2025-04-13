import { useParams, useNavigate } from 'react-router-dom';
import { HeartIcon, ShareIcon, ChatBubbleLeftIcon, ArrowLeftIcon } from '@heroicons/react/24/outline';
import { BlogPost, ReactionsData } from '../types/blog';
import { useBlogStore } from '../store/blogStore';
import { useState, useEffect } from 'react';
import KevaWS from '../utils/KevaAPI';
import { useWebSocket } from '../contexts/WebSocketContext';
import { sanitizeHtml } from '../utils/sanitizeHtml';

function BlogPostPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { posts } = useBlogStore();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reactions, setReactions] = useState<ReactionsData | null>(null);
  const { wsRef, isConnected } = useWebSocket();

  const post = posts[Number(id)];

  useEffect(() => {
    if (isConnected && post?.tx_hash) {
      fetchReactions(post.tx_hash);
    }
  }, [isConnected, post?.tx_hash]);

  const fetchReactions = async (tx_hash: string) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      setError('WebSocket not connected');
      return;
    }

    setIsLoading(true);
    try {
      const kevaWS = new KevaWS(wsRef.current);
      const response = await kevaWS.getReactions(tx_hash) as { data: ReactionsData };
      setReactions(response.data);
    } catch (err) {
      setError('Failed to fetch reactions');
      console.error('Error fetching reactions:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const decodeBase64 = (base64String: string | undefined): string => {
    if (!base64String) return '';
    try {
      // Add padding if needed
      const paddedString = base64String.padEnd(base64String.length + (4 - (base64String.length % 4)) % 4, '=');
      // Decode base64 to binary string
      const binaryString = atob(paddedString);
      // Convert binary string to UTF-8
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      // Decode UTF-8
      return new TextDecoder().decode(bytes);
    } catch (error) {
      console.error('Error decoding base64:', error);
      return base64String;
    }
  };

  const getAvatarColor = (name: string) => {
    const colors = [
      { bg: 'bg-blue-100', text: 'text-blue-600' },
      { bg: 'bg-green-100', text: 'text-green-600' },
      { bg: 'bg-purple-100', text: 'text-purple-600' },
      { bg: 'bg-pink-100', text: 'text-pink-600' },
      { bg: 'bg-yellow-100', text: 'text-yellow-600' },
      { bg: 'bg-red-100', text: 'text-red-600' },
      { bg: 'bg-indigo-100', text: 'text-indigo-600' },
      { bg: 'bg-teal-100', text: 'text-teal-600' },
    ];

    // Generate a consistent index based on the name
    const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  };

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
    <div className="max-w-4xl mx-auto p-0">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
      >
        <ArrowLeftIcon className="h-5 w-5 mr-1" />
        Back to Posts
      </button>
      <div className="bg-white rounded-lg shadow-lg p-5">
        <div className="mb-4">
          <h1 className="text-2xl sm:text-3xl font-bold mb-2">{post.title}</h1>
          <div className="text-sm text-gray-500 flex items-center space-x-4">
            {post.time && (
              <span className="whitespace-nowrap">{new Date(post.time * 1000).toLocaleString()}</span>
            )}
            {post.height && (
              <span className="whitespace-nowrap">Block #{post.height}</span>
            )}
          </div>
        </div>
        <div className="prose max-w-none mb-6">
          <div
            className="text-gray-700"
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(post.content) }}
          />
        </div>
        <div className="flex items-center space-x-6 text-gray-500 mb-8">
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

        {isLoading && (
          <div className="text-gray-500 text-center py-4">Loading replies...</div>
        )}

        {error && (
          <div className="text-red-500 text-center py-4">{error}</div>
        )}

        {reactions?.replies && reactions.replies.length > 0 && (
          <div className="mt-8">
            <h2 className="text-xl font-semibold mb-4">Replies</h2>
            <div className="space-y-6">
              {reactions.replies
                .filter(reply => reply.type !== 'DEL')
                .map((reply, index) => (
                <div key={index} className="bg-gray-50 rounded-lg p-2 shadow-sm">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center space-x-3">
                      <div className={`w-12 h-12 rounded-full ${getAvatarColor(reply.sender.displayName).bg} flex items-center justify-center`}>
                        <span className={`${getAvatarColor(reply.sender.displayName).text} text-lg font-medium`}>
                          {reply.sender.displayName[0].toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{reply.sender.displayName}@{reply.sender.shortCode}</div>
                        <div className="text-sm text-gray-500">
                          {new Date(reply.time * 1000).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="pl-14">
                    <p className="text-gray-700 leading-relaxed">{decodeBase64(reply.value)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default BlogPostPage;