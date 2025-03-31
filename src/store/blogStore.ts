import { create } from 'zustand';
import { BlogPost } from '../types/blog';

interface BlogStore {
  posts: BlogPost[];
  setPosts: (posts: BlogPost[]) => void;
  inputValue: string;
  setInputValue: (value: string) => void;
}

export const useBlogStore = create<BlogStore>((set) => ({
  posts: [],
  setPosts: (posts) => set({ posts }),
  inputValue: '',
  setInputValue: (value) => set({ inputValue: value }),
})); 