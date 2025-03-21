import { useState, useEffect, useCallback } from 'react';
import { BlogPost, Comment } from '../types/blog';

const KEVACOIN_WS = 'ws://ec.kevacoin.org:50002';

function BlogPanel() {
  const [blogPost, setBlogPost] = useState<BlogPost | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ws, setWs] = useState<WebSocket | null>(null);

  // Initialize WebSocket connection
  useEffect(() => {
    const socket = new WebSocket(KEVACOIN_WS);
    
    socket.onopen = () => {
      console.log('Connected to Kevacoin WebSocket');
      setIsLoading(false);
      // Send initial request for data
      socket.send(JSON.stringify({
        method: 'subscribe',
        params: ['blog_updates']
      }));
    };

    socket.onclose = () => {
      console.log('Disconnected from Kevacoin WebSocket');
      setError('Connection closed');
      setIsLoading(false);
    };

    socket.onerror = (error) => {
      console.error('WebSocket error:', error);
      setError('Failed to connect to Kevacoin');
      setIsLoading(false);
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('Received data:', data);
        
        // Handle different types of messages
        if (data.type === 'blog_post') {
          setBlogPost({
            id: data.id,
            title: data.title,
            content: data.content,
            date: data.date || new Date().toISOString(),
            author: data.author
          });
        } else if (data.type === 'comments') {
          setComments(data.comments.map((comment: any) => ({
            id: comment.id,
            author: comment.author,
            content: comment.content,
            date: comment.date || new Date().toISOString(),
            postId: comment.postId
          })));
        }
      } catch (err) {
        console.error('Error processing message:', err);
      }
    };

    setWs(socket);

    // Cleanup on unmount
    return () => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.close();
      }
    };
  }, []);

  // Function to request blog data
  const requestBlogData = useCallback(() => {
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        method: 'get_blog_post',
        params: { id: 1 }
      }));
      
      ws.send(JSON.stringify({
        method: 'get_comments',
        params: { postId: 1 }
      }));
    }
  }, [ws]);

  // Request initial data when WebSocket is connected
  useEffect(() => {
    if (ws?.readyState === WebSocket.OPEN) {
      requestBlogData();
    }
  }, [ws, requestBlogData]);

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-3/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded w-full"></div>
            <div className="h-4 bg-gray-200 rounded w-full"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="text-red-600">
          {error}
          <button 
            onClick={requestBlogData}
            className="ml-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!blogPost) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
      {/* Blog Content Section */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex justify-between items-start mb-4">
          <h2 className="text-2xl font-bold text-gray-800">
            {blogPost.title}
          </h2>
          <div className="text-sm text-gray-500">
            {new Date(blogPost.date).toLocaleDateString()}
          </div>
        </div>
        <div className="prose max-w-none">
          {blogPost.content.split('\n\n').map((paragraph, index) => (
            <p key={index} className="text-gray-600 mb-4">
              {paragraph}
            </p>
          ))}
        </div>
        <div className="text-sm text-gray-500 mt-4">
          Written by {blogPost.author}
        </div>
      </div>

      {/* Comments Section */}
      <div className="bg-gray-50 p-6">
        <h3 className="text-xl font-semibold text-gray-800 mb-4">
          Comments ({comments.length})
        </h3>
        <div className="space-y-4">
          {comments.map((comment) => (
            <div key={comment.id} className="bg-white p-4 rounded-lg shadow">
              <div className="flex justify-between items-start mb-2">
                <span className="font-medium text-gray-800">{comment.author}</span>
                <span className="text-sm text-gray-500">
                  {new Date(comment.date).toLocaleDateString()}
                </span>
              </div>
              <p className="text-gray-600">{comment.content}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default BlogPanel; 